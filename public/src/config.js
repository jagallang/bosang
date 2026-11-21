/**
 * 배포 설정. 코드 수정 없이 이 파일만 바꿔 동작 방식을 고른다.
 *
 * mode
 *   'local'    로그인 없이 이 기기에 진도 저장. data/questions.json(전체)이 있으면 쓰고,
 *              없으면 무료 샘플만 보여준다. 개발·오프라인 테스트용.
 *   'firebase' 구글 로그인 + 이용권 확인. 무료 샘플은 정적 파일, 유료 문항은 Firestore에서 받는다.
 *              진도는 로그인하면 클라우드에, 아니면 기기에 저장한다.
 */
export const config = Object.freeze({
  version: '8.0.0',
  mode: 'local',

  freeQuestionsUrl: 'data/questions.free.json',
  /** local 모드 전용. 배포본(public/)에는 올리지 않는다 (.gitignore, firebase.json ignore) */
  fullQuestionsUrl: 'data/questions.json',

  /** Firebase 콘솔 > 프로젝트 설정 > 웹 앱 구성 값 */
  firebase: {
    apiKey: '',
    authDomain: '',
    projectId: '',
    appId: '',
  },

  /** 이용권 안내 (비어 있으면 안내 버튼을 숨긴다) */
  purchase: {
    url: '../books/#pass',
    label: '전체 문항 이용권 안내',
  },

  feedbackEmail: 'episode0611@gmail.com',
});
