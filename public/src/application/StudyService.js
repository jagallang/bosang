/**
 * 학습 유스케이스 모음. 화면은 이 클래스만 부르고, 이 클래스는 포트로만 바깥과 통신한다.
 */
import { DEFAULT_STAGE, STAGES, STAGE_IDS, isStageId } from '../domain/constants.js';
import { QuestionBank, isEssay, isMcq } from '../domain/question.js';
import {
  accuracyPct, applyResult, blankStageProgress, currentStreak, dueQuestions, examSummary, markStudied,
  recordExam,
  masteryOf, unresolvedWrongQuestions, weakQuestions, wrongNoteQuestions,
} from '../domain/progress.js';
import { normalizeProgress } from '../domain/migration.js';
import { SessionMode, buildBalancedExam, buildQueue, filterDifficulty } from '../domain/selection.js';
import { essayPassed, essayScore, examPoints, isCorrectChoice, passFail } from '../domain/grading.js';
import { StudySession } from '../domain/session.js';

export class StudyService {
  /**
   * @param {object} deps
   * @param {import('./ports.js').QuestionRepository} deps.questions
   * @param {import('./ports.js').ProgressRepository} deps.progress
   * @param {import('./ports.js').PreferenceRepository} deps.preferences
   * @param {import('./ports.js').Clock} deps.clock
   * @param {() => number} [deps.rng]
   */
  constructor({ questions, progress, preferences, clock, rng = Math.random }) {
    this._questions = questions;
    this._progressRepo = progress;
    this._prefs = preferences;
    this._clock = clock;
    this._rng = rng;
    this.bank = new QuestionBank([]);
    this.progress = null;
    this.stage = DEFAULT_STAGE;
  }

  /** 문제은행·단계·진도를 불러온다. 로그인 상태가 바뀌면 다시 부른다 */
  async load() {
    this.bank = new QuestionBank(await this._questions.loadAll());
    const saved = await this._prefs.getStage();
    if (isStageId(saved)) this.stage = String(saved);
    this.progress = normalizeProgress(await this._progressRepo.load(), this.bank);
    await this._save();
  }

  /** 의존성을 바꿔 끼운다 (로그인/로그아웃 시) */
  rebind({ questions, progress }) {
    if (questions) this._questions = questions;
    if (progress) this._progressRepo = progress;
  }

  get stageInfo() { return STAGES[this.stage]; }
  get today() { return this._clock.today(); }
  stageQuestions(stage = this.stage) { return this.bank.stage(stage); }
  stageProgress(stage = this.stage) { return this.progress[stage]; }
  question(id) { return this.bank.get(id); }
  card(id) { return this.stageProgress().cards[id] || null; }

  async switchStage(stage) {
    if (!isStageId(stage) || stage === this.stage) return false;
    this.stage = String(stage);
    await this._prefs.setStage(this.stage);
    return true;
  }

  // ------------------------------------------------------------------ 조회

  /** 대시보드·현황·메뉴가 쓰는 요약 */
  overview({ difficulty = 0 } = {}) {
    const qs = this.stageQuestions();
    const sp = this.stageProgress();
    const today = this.today;
    return {
      stage: this.stage,
      label: this.stageInfo.label,
      examSize: this.stageInfo.examSize,
      total: qs.length,
      stageCounts: Object.fromEntries(STAGE_IDS.map((s) => [s, this.bank.stage(s).length])),
      mastery: masteryOf(sp, qs),
      accuracy: accuracyPct(sp),
      streak: currentStreak(sp, today),
      totalAnswered: sp.totalAnswered,
      dueCount: filterDifficulty(dueQuestions(sp, qs, today), difficulty).length,
      weakCount: filterDifficulty(weakQuestions(sp, qs), difficulty).length,
      wrongCount: unresolvedWrongQuestions(sp, qs).length,
      subjects: this.bank.subjects(this.stage).map((name) => ({ name, ...masteryOf(sp, qs.filter((q) => q.subject === name)) })),
      difficulties: [1, 2, 3].map((d) => ({ level: d, ...masteryOf(sp, filterDifficulty(qs, d)) })),
      typeCounts: { mcq: qs.filter(isMcq).length, essay: qs.filter(isEssay).length },
      hasMcq: qs.some(isMcq),
      hasEssay: qs.some(isEssay),
      exams: examSummary(sp),
    };
  }

  /** 숙련도 격자: 문항마다 상자 */
  masteryCells() {
    const sp = this.stageProgress();
    return this.stageQuestions().map((q) => ({ id: q.id, subject: q.subject, box: sp.cards[q.id]?.box || 0 }));
  }

  wrongNote() {
    const sp = this.stageProgress();
    return wrongNoteQuestions(sp, this.stageQuestions()).map((q) => {
      const c = sp.cards[q.id];
      return { question: q, card: c, accuracy: c.seen ? Math.round((c.correct / c.seen) * 100) : 0 };
    });
  }

  // ------------------------------------------------------------------ 세션 시작

  /** 복습·약점·과목별·유형별 세션. 낼 문항이 없으면 null */
  startSession({ mode, subject = null, type = null, random = false, difficulty = 0 }) {
    const qs = buildQueue({
      mode, subject, type, random, difficulty,
      questions: this.stageQuestions(), sp: this.stageProgress(), today: this.today, rng: this._rng,
    });
    if (!qs.length) return null;
    return new StudySession({ queue: qs.map((q) => q.id), mode, subject, type });
  }

  startExam({ difficulty = 0 } = {}) {
    const { questions, insufficient } = buildBalancedExam({
      subjects: this.bank.subjects(this.stage),
      questions: this.stageQuestions(),
      size: this.stageInfo.examSize,
      difficulty,
      rng: this._rng,
    });
    if (!questions.length) return null;
    return new StudySession({
      queue: questions.map((q) => q.id), mode: SessionMode.EXAM,
      subject: this.stageInfo.label, examMode: true, insufficient,
    });
  }

  startSingle(id) {
    if (!this.bank.has(id)) return null;
    return new StudySession({ queue: [id], mode: SessionMode.WRONG });
  }

  /** 같은 조건으로 한 번 더 */
  restart(session, opts = {}) {
    if (session.mode === SessionMode.EXAM) return this.startExam(opts);
    if (session.mode === SessionMode.WRONG) return this.startSingle(session.queue[0]);
    return this.startSession({ ...opts, mode: session.mode, subject: session.subject, type: session.type });
  }

  // ------------------------------------------------------------------ 풀이

  /** 선택형 한 문항 답하기. 이미 답했으면 무시 */
  async answerChoice(session, choice) {
    const id = session.currentId;
    if (session.isAnswered(id)) return null;
    const q = this.question(id);
    const ok = isCorrectChoice(q, choice);
    session.setAnswer(choice);
    this._record(session, id, ok);
    await this._save();
    return { ok, question: q };
  }

  /** 서술형 자가채점 확정 */
  async gradeEssay(session) {
    const id = session.currentId;
    const q = this.question(id);
    const score = essayScore(q.keywords, session.essay().checks);
    const ok = essayPassed(score);
    session.setEssayScore(score);
    this._record(session, id, ok);
    await this._save();
    return { score, ok };
  }

  /** 모의고사 제출: 전 문항 반영 후 성적표 */
  async submitExam(session) {
    const sp = this.stageProgress();
    const today = this.today;
    const questions = session.queue.map((id) => this.question(id));
    let correct = 0;
    for (const q of questions) {
      const ok = isCorrectChoice(q, session.answerOf(q.id));
      const change = applyResult(sp, q.id, ok, today);
      session.recordOutcome(ok, change);
      if (ok) correct++;
    }
    markStudied(sp, today);
    session.finished = true;
    const total = questions.length;
    const result = passFail({ subjects: this.bank.subjects(this.stage), questions, answers: session.answers });
    recordExam(sp, result, today);
    await this._save();
    return {
      correct, total,
      points: examPoints(correct, total),
      percent: Math.round((correct / total) * 100),
      passFail: result,
      rows: questions.map((q) => ({ question: q, chosen: session.answerOf(q.id), ok: isCorrectChoice(q, session.answerOf(q.id)) })),
    };
  }

  async resetStage() {
    this.progress[this.stage] = blankStageProgress(this.stageQuestions());
    await this._save();
  }

  _record(session, id, ok) {
    const sp = this.stageProgress();
    const change = applyResult(sp, id, ok, this.today);
    session.recordOutcome(ok, change);
    markStudied(sp, this.today);
  }

  async _save() {
    if (this.progress) await this._progressRepo.save(this.progress);
  }
}
