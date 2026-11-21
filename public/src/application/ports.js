/**
 * 애플리케이션 계층이 바깥 세계에 요구하는 포트(인터페이스).
 * 구현은 infrastructure/ 에 있고, main.js(조립 지점)에서 주입한다.
 * JS에는 interface가 없으므로 JSDoc 타입으로 계약을 적는다.
 *
 * @typedef {Object} Question
 * @property {string} id            과목코드-일련번호 (civ-001)
 * @property {number} stage         1 | 2
 * @property {'mcq'|'essay'|'fill'} type
 * @property {string} q             문제 본문 (신뢰된 HTML)
 * @property {string[]} [opt]       선택지 (mcq)
 * @property {number} [a]           정답 0-based (mcq)
 * @property {string} [ex]          해설 (mcq, 신뢰된 HTML)
 * @property {string} [model]       모범답안 (essay)
 * @property {{term:string, weight:number}[]} [keywords] 채점 키워드 (essay)
 * @property {string} subject
 * @property {number} [diff]
 * @property {{type:string, year?:number, no?:number}[]} [source]
 * @property {{law:string, no:string}|null} [article]
 * @property {string|null} [revised]
 *
 * @typedef {Object} QuestionRepository
 * @property {() => Promise<Question[]>} loadAll
 *
 * @typedef {Object} ProgressRepository
 * @property {() => Promise<object|null>} load   저장된 원본(어떤 버전이든)
 * @property {(progress: object) => Promise<void>} save
 *
 * @typedef {Object} PreferenceRepository
 * @property {() => Promise<string|null>} getStage
 * @property {(stage: string) => Promise<void>} setStage
 *
 * @typedef {Object} User
 * @property {string} uid
 * @property {string|null} email
 * @property {string|null} displayName
 *
 * @typedef {Object} AuthService
 * @property {boolean} enabled                     로그인 기능 사용 여부
 * @property {() => User|null} currentUser
 * @property {() => Promise<User|null>} ready      첫 로그인 상태 확인
 * @property {() => Promise<void>} signIn
 * @property {() => Promise<void>} signOut
 * @property {(cb: (user: User|null) => void) => () => void} onChange
 *
 * @typedef {Object} EntitlementService
 * @property {(user: User|null) => Promise<{paid:boolean, until?:Date|null}>} check
 *
 * @typedef {Object} Clock
 * @property {() => number} today   Unix 일수
 *
 * @typedef {Object} Dialogs
 * @property {(msg:string) => void} notify
 * @property {(msg:string) => boolean} confirm
 */
export {};
