/**
 * 조립 지점(Composition Root). 설정을 보고 어댑터를 골라 유스케이스와 화면에 끼운다.
 * 계층 규칙: domain ← application ← (infrastructure, presentation) ← main
 */
import { config } from './config.js';
import { StudyService } from './application/StudyService.js';
import { AccessService } from './application/AccessService.js';
import { SafeLocalStorage, browserDialogs, systemClock } from './infrastructure/browser.js';
import {
  CompositeQuestionRepository, HttpQuestionRepository, HybridProgressRepository,
  LocalPreferenceRepository, LocalProgressRepository, allAccessEntitlement, disabledAuth, noAccessEntitlement,
} from './infrastructure/repositories.js';
import { App } from './presentation/App.js';

const store = new SafeLocalStorage({
  onFailure: () => browserDialogs.notify('저장 공간에 접근할 수 없습니다. 시크릿 모드이거나 저장 공간이 부족할 수 있습니다.\n학습 진도가 저장되지 않을 수 있습니다.'),
});
const localProgress = new LocalProgressRepository(store);
const preferences = new LocalPreferenceRepository(store);
const freeQuestions = new HttpQuestionRepository(config.freeQuestionsUrl);

/** firebase 모드면 SDK를 불러 로그인·이용권 어댑터를 만든다. 실패하면 무료 샘플만 쓴다 */
async function createAccess() {
  if (config.mode !== 'firebase') {
    return { access: new AccessService({ auth: disabledAuth, entitlement: allAccessEntitlement }), fb: null };
  }
  try {
    const { loadFirebase } = await import('./infrastructure/firebase/firebaseClient.js');
    const { FirebaseAuthService, FirestoreEntitlementService } = await import('./infrastructure/firebase/firebaseAdapters.js');
    const fb = await loadFirebase(config.firebase);
    return { access: new AccessService({ auth: new FirebaseAuthService(fb), entitlement: new FirestoreEntitlementService(fb) }), fb };
  } catch (e) {
    console.error('Firebase를 시작하지 못해 무료 샘플로 동작합니다:', e);
    return { access: new AccessService({ auth: disabledAuth, entitlement: noAccessEntitlement }), fb: null };
  }
}

/** 로그인·이용권 상태에 맞는 문항·진도 저장소 */
async function repositoriesFor(state, fb) {
  if (config.mode !== 'firebase') {
    return {
      questions: new HttpQuestionRepository([config.fullQuestionsUrl, config.freeQuestionsUrl]),
      progress: localProgress,
    };
  }
  const sources = [{ repo: freeQuestions }];
  let progress = localProgress;
  if (fb) {
    const { FirestoreQuestionRepository, FirestoreProgressRepository } = await import('./infrastructure/firebase/firebaseAdapters.js');
    if (state.paid) sources.push({ repo: new FirestoreQuestionRepository(fb), optional: true });
    if (state.user) progress = new HybridProgressRepository(new FirestoreProgressRepository(fb, state.user.uid), localProgress);
  }
  return { questions: new CompositeQuestionRepository(sources), progress };
}

async function boot() {
  const root = document.getElementById('root');
  const { access, fb } = await createAccess();
  const study = new StudyService({ questions: freeQuestions, progress: localProgress, preferences, clock: systemClock });
  let currentProgress = localProgress;

  const reload = async () => {
    app.setStatus('loading');
    try {
      await currentProgress.flush?.();
      const state = await access.refresh();
      const repos = await repositoriesFor(state, fb);
      currentProgress = repos.progress;
      study.rebind(repos);
      await study.load();
      app.setStatus('ready');
    } catch (e) {
      console.error(e);
      app.setStatus('error', e?.message || String(e));
    }
  };

  const app = new App({ root, study, access, dialogs: browserDialogs, config, reload });
  app.mount();

  await access.init();
  access.onChange(() => reload());
  await reload();

  // 탭을 닫거나 백그라운드로 갈 때 클라우드 진도를 바로 저장
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') currentProgress.flush?.();
  });
}

boot();
