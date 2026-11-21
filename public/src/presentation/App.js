/**
 * 화면 컨트롤러: UI 상태를 들고, 클릭·키보드를 유스케이스 호출로 바꾸고, 뷰를 그린다.
 * 도메인 규칙은 여기 두지 않는다.
 */
import { isEssay, isMcq } from '../domain/question.js';
import { EssayPhase } from '../domain/session.js';
import { topbar } from './views/common.js';
import { dashboard, records } from './views/home.js';
import { essay, exam, examResult, mcq, summary } from './views/study.js';
import { feedback, loadError, loading, wrongNote } from './views/pages.js';

const PAGES = { home: dashboard, records, wrong: wrongNote, feedback };
// 예전 화면 이름 (숙련도·현황은 '기록'으로 합쳤다)
const ALIAS = { mastery: 'records', status: 'records' };

export class App {
  /**
   * @param {object} deps
   * @param {HTMLElement} deps.root
   * @param {import('../application/StudyService.js').StudyService} deps.study
   * @param {import('../application/AccessService.js').AccessService} deps.access
   * @param {import('../application/ports.js').Dialogs} deps.dialogs
   * @param {object} deps.config
   * @param {() => Promise<void>} deps.reload 문제·진도 다시 불러오기 (로그인 변경, 오류 재시도)
   */
  constructor({ root, study, access, dialogs, config, reload }) {
    this.root = root;
    this.study = study;
    this.access = access;
    this.dialogs = dialogs;
    this.config = config;
    this.reload = reload;
    this.ui = {
      page: 'home',
      menuOpen: false,
      random: false,
      difficulty: 0, // 난이도 필터(현재 비활성: 문항 난이도 분류 후 사용)
      session: null,
      report: null, // 모의고사 성적표
      status: 'loading', // loading | ready | error
      error: '',
      busy: false,
    };
    this._actions = this._buildActions();
  }

  mount() {
    this.root.addEventListener('click', (e) => {
      const el = e.target.closest('[data-action]');
      if (!el || !this.root.contains(el) || el.disabled) return;
      this.dispatch(el.dataset.action, el.dataset);
    });
    document.addEventListener('keydown', (e) => this._onKey(e));
    this.render();
  }

  setStatus(status, error = '') {
    this.ui.status = status;
    this.ui.error = error;
    this.render();
  }

  async dispatch(name, data = {}) {
    const fn = this._actions[name];
    if (!fn || this.ui.busy) return;
    try {
      this.ui.busy = true;
      await fn(data);
    } catch (e) {
      console.error(e);
      this.dialogs.notify(`문제가 생겼습니다: ${e?.message || e}`);
    } finally {
      this.ui.busy = false;
    }
    this.render();
  }

  // ------------------------------------------------------------------ 렌더링

  render() {
    const { ui } = this;
    if (ui.status === 'loading') { this.root.innerHTML = loading(); return; }
    if (ui.status === 'error') { this.root.innerHTML = loadError(ui.error); return; }

    document.body.dataset.stage = this.study.stage;
    const s = ui.session;
    const vm = {
      ui: { ...ui, inSession: !!s },
      overview: this.study.overview({ difficulty: ui.difficulty }),
      access: this.access.state,
      config: this.config,
    };
    let body;
    if (s && ui.report) body = examResult({ ...vm, session: s, report: ui.report });
    else if (s && s.finished) body = summary({ ...vm, session: s });
    else if (s) {
      const q = this.study.question(s.currentId);
      const card = this.study.card(s.currentId);
      const view = s.examMode ? exam : isEssay(q) ? essay : isMcq(q) ? mcq : null;
      body = view ? view({ ...vm, session: s, question: q, card }) : '<div class="empty">지원하지 않는 문항 유형입니다.</div>';
    } else {
      if (ui.page === 'records') vm.cells = this.study.masteryCells();
      if (ui.page === 'wrong') vm.wrongNote = this.study.wrongNote();
      body = (PAGES[ui.page] || dashboard)(vm);
    }
    this.root.innerHTML = topbar(vm) + body;
  }

  // ------------------------------------------------------------------ 동작

  _buildActions() {
    const ui = this.ui;
    const study = this.study;
    const begin = (session, emptyMsg = '해당하는 문항이 없습니다.') => {
      if (!session) { this.dialogs.notify(emptyMsg); return; }
      ui.session = session;
      ui.report = null;
      window.scrollTo({ top: 0 });
    };
    const endSession = () => { ui.session = null; ui.report = null; };

    return {
      go: ({ page }) => { endSession(); ui.page = ALIAS[page] || page; ui.menuOpen = false; window.scrollTo({ top: 0 }); },
      'toggle-menu': () => { ui.menuOpen = !ui.menuOpen; },
      'switch-stage': async ({ stage }) => {
        ui.menuOpen = false;
        if (await study.switchStage(stage)) endSession();
      },
      'toggle-random': () => { ui.random = !ui.random; },
      'set-difficulty': ({ level }) => { ui.difficulty = Number(level) || 0; },

      start: ({ mode, subject, type }) => begin(
        study.startSession({ mode, subject: subject || null, type: type || null, random: ui.random, difficulty: ui.difficulty }),
        mode === 'review' ? '오늘 복습할 문항이 없습니다. 모든 문항을 예정대로 학습했습니다 — 약점 집중이나 과목별 연습을 해보세요.' : undefined,
      ),
      'start-exam': () => begin(study.startExam({ difficulty: ui.difficulty })),
      'retry-item': ({ id }) => begin(study.startSingle(id)),
      repeat: () => {
        const prev = ui.session;
        endSession();
        if (prev) begin(study.restart(prev, { random: ui.random, difficulty: ui.difficulty }));
      },
      quit: () => { endSession(); ui.page = 'home'; },

      answer: ({ i }) => study.answerChoice(ui.session, Number(i)),
      next: () => {
        const s = ui.session;
        if (!s.advance()) s.finished = true;
        window.scrollTo({ top: 0 });
      },

      hint: ({ i }) => ui.session.revealHint(Number(i)),
      reveal: () => ui.session.revealModelAnswer(),
      kw: ({ i }) => ui.session.toggleKeyword(Number(i)),
      'grade-essay': () => study.gradeEssay(ui.session),

      'exam-pick': ({ i }) => ui.session.setAnswer(Number(i)),
      'exam-prev': () => ui.session.back(),
      'exam-next': async () => {
        const s = ui.session;
        if (!s.isAnswered()) return;
        if (!s.advance()) {
          ui.report = await study.submitExam(s);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      },

      reset: async () => {
        ui.menuOpen = false;
        if (!this.dialogs.confirm(`${study.stageInfo.label}의 모든 학습 기록을 초기화합니다. 계속할까요?`)) return;
        await study.resetStage();
        endSession();
      },

      'send-feedback': () => {
        const type = document.getElementById('fb-type')?.value || 'etc';
        const text = document.getElementById('fb-text')?.value || '';
        if (!text.trim()) { this.dialogs.notify('내용을 작성해주세요.'); return; }
        const label = { bug: '앱 오류', wrong: '문제·정답 오류', idea: '기능 제안', etc: '기타' }[type];
        const subject = encodeURIComponent(`[보상드림] ${label}`);
        const body = encodeURIComponent(`유형: ${label}\n단계: ${study.stageInfo.label}\n버전: v${this.config.version}\n\n${text}`);
        window.location.href = `mailto:${this.config.feedbackEmail}?subject=${subject}&body=${body}`;
      },

      'sign-in': async () => { ui.menuOpen = false; await this.access.signIn(); },
      'sign-out': async () => { ui.menuOpen = false; endSession(); await this.access.signOut(); },
      reload: () => this.reload(),
    };
  }

  _onKey(e) {
    const { ui } = this;
    if (e.key === 'Escape' && ui.menuOpen) { this.dispatch('toggle-menu'); return; }
    const s = ui.session;
    if (!s || s.finished || ui.report || ui.menuOpen) return;
    if (e.target.closest?.('input, textarea, select')) return;
    const digit = e.key >= '1' && e.key <= '5' ? Number(e.key) - 1 : -1;
    const q = this.study.question(s.currentId);

    if (s.examMode) {
      if (digit >= 0 && digit < (q.opt?.length || 0)) this.dispatch('exam-pick', { i: digit });
      else if (e.key === 'Enter' && s.isAnswered()) this.dispatch('exam-next');
      return;
    }
    if (isEssay(q)) {
      // 서술형은 채점을 마친 뒤에만 Enter로 넘어간다 (채점 전 건너뛰기 방지)
      if ((e.key === 'Enter' || e.key === ' ') && s.essay().phase === EssayPhase.GRADED) {
        e.preventDefault();
        this.dispatch('next');
      }
      return;
    }
    if (!s.isAnswered() && digit >= 0 && digit < (q.opt?.length || 0)) this.dispatch('answer', { i: digit });
    else if (s.isAnswered() && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      this.dispatch('next');
    }
  }
}
