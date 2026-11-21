# Firebase 연결과 배포

보상드림은 Firebase 하나로 사이트·학습앱 호스팅, 구글 로그인, 유료 문항, 진도 저장을 한다.
코드는 준비되어 있고, 아래 순서대로 콘솔 설정과 값만 넣으면 된다. 각 단계가 끝나면 `npm run firebase:check`로 남은 일을 확인한다.

## 1. 프로젝트 만들기 (콘솔, 약 10분)

1. [Firebase 콘솔](https://console.firebase.google.com)에서 프로젝트를 만든다. Google 애널리틱스는 꺼도 된다.
2. **Authentication** → 시작하기 → 로그인 방법 → **Google** 사용 설정.
3. **Firestore Database** → 데이터베이스 만들기 → 위치 `asia-northeast3`(서울) → 프로덕션 모드.
   규칙은 배포할 때 저장소의 `firestore.rules`로 덮어쓴다.
4. 프로젝트 설정(톱니바퀴) → 내 앱 → **웹 앱 추가**(호스팅 설정 체크는 안 해도 됨) → 나오는 `firebaseConfig` 값을
   저장소 루트의 `firebase.web.json`에 넣는다. 형식은 `firebase.web.example.json`과 같고, `siteUrl`에는 배포 주소를 넣는다.
   (웹앱 설정값은 공개되어도 되는 값이다. 접근 통제는 `firestore.rules`가 한다.)

## 2. 첫 배포 (내 컴퓨터)

```bash
npm i -g firebase-tools      # 한 번만
firebase login
npm run deploy -- --project <프로젝트ID>
```

`https://<프로젝트ID>.web.app` 에서 사이트, `/app/`에서 학습앱이 열린다.
`firebase.web.json`이 있으면 빌드할 때 학습앱이 자동으로 firebase 모드(구글 로그인)로 바뀐다. 저장소의 `public/src/config.js`는 local 모드 그대로 둔다.

## 3. 관리자 지정과 유료 문항 올리기

1. 배포된 학습앱에서 본인 구글 계정으로 로그인한다.
2. 콘솔 **Authentication → 사용자**에서 본인 UID를 복사한다.
3. 콘솔 **Firestore**에서 `admins` 컬렉션을 만들고, 문서 ID를 그 UID로 해서 빈 문서를 만든다.
4. 콘솔 프로젝트 설정 → **서비스 계정** → 새 비공개 키 생성. 받은 JSON은 저장소 밖에 둔다.

```bash
export GOOGLE_APPLICATION_CREDENTIALS=~/keys/bosang-admin.json
npm i -D firebase-admin
npm run content                                   # 문항 검증 + 유료 묶음 생성
node scripts/admin.mjs upload-questions           # 유료 문항 → Firestore
node scripts/admin.mjs grant 본인@gmail.com 30     # 이용권 시험 부여
```

다른 구글 계정으로도 로그인해 무료 40문항만 보이는지, 이용권을 준 뒤 전체 문항이 보이는지 확인한다.

## 4. 도메인

콘솔 **Hosting → 커스텀 도메인 추가**에서 도메인을 연결하고, **Authentication → 설정 → 승인된 도메인**에 같은 도메인을 넣는다.
빠뜨리면 그 도메인에서 구글 로그인이 실패한다.

## 5. 자동 배포와 매일 갱신 (GitHub Actions)

`.github/workflows/deploy.yml`이 main에 푸시할 때와 매일 05:07(KST)에 빌드·배포한다. 매일 빌드해야 보상정보의 D-day가 맞는다.
저장소 Settings → Secrets and variables → Actions 에서:

| 종류 | 이름 | 값 |
| --- | --- | --- |
| Secret | `FIREBASE_SERVICE_ACCOUNT` | 3-4에서 받은 서비스 계정 JSON 전체 |
| Secret | `FIREBASE_WEB_CONFIG` | `firebase.web.json` 내용 (파일을 저장소에 커밋했다면 생략) |
| Variable | `DEPLOY_ENABLED` | `true` (설정 전에는 워크플로가 돌지 않는다) |

## 6. 공개 전 마지막

- `site/lib/site.js`의 사업자 정보와 `legalDraft: false` (약관 법률 검토 후)
- 저장소 비공개 전환 (전체 문항 `content/questions.json`이 들어 있다)
- PR #1을 main에 합친다. 예전 GitHub Pages 주소는 새 주소로 안내한다.
- 운영 기관 계약: `node scripts/admin.mjs grant-bulk 직원.csv 365 --org=기관명`, 매달 `node scripts/admin.mjs report --org=기관명`

## 확인된 것과 아닌 것

- 로그인·이용권·유료 문항·진도 저장의 흐름은 가짜 Firebase로 자동 테스트한다 (`tests/firebase.test.js`, 보안 규칙의 핵심도 흉내 냄).
- 실제 Firebase 프로젝트와 `firestore.rules`는 아직 실제로 돌려 보지 않았다. 3단계의 두 계정 확인이 첫 실제 검증이다.
