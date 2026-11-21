# 수집 원자료

공공데이터포털에서 파일을 내려받아 아래 이름으로 둔다. 이 폴더의 CSV는 커밋하지 않는다. 파일 이름과 열 설정은 저장소 루트의 `collect.config.json`에 있다.

| 파일 | 내려받는 곳 | 갱신 |
|---|---|---|
| `토지이음_고시목록.csv` | 공공데이터포털 「국토교통부_토지이음_고시목록」 파일데이터 | 연 1회 (최근 고시는 빠질 수 있음) |
| `경북개발공사_보상계획공고.csv` | 공공데이터포털 「경상북도개발공사_보상계획공고」 파일데이터 | 기관 갱신 주기 |

EUC-KR, UTF-8 어느 쪽이든 읽는다.

## 실행

```
npm run collect
```

1. 원자료 CSV를 분류해 `inbox/auto-<원자료 id>.csv`(자동 반영)와 `review/<원자료 id>.csv`(검토 대기)로 나눈다.
   - 자동 반영: 이미 있는 사업과 이름이 같거나, 유형·단계·사업명·시도가 모두 확인된 것
   - 검토 대기: 사업명이나 지역을 못 뽑았거나, 도로·공원처럼 사업명이 모호한 것
2. `review/*.csv`의 `승인` 열에 `승인`(또는 O)을 적고 다시 돌리면 그 행이 자동 쪽으로 옮겨진다.
3. 이어서 inbox 전체를 `projects/*.json`에 합치고 검증한다.

분류는 제목 글자 규칙이라 틀릴 수 있다. 처음 돌린 뒤 자동 반영분도 한 번 훑어볼 것.

## 지도 (사업지구 경계)

- `content/info/geo/sigungu.json`: 통계청 SGIS 2018 시군구 경계를 단순화한 것 (원본 github.com/southkorea/southkorea-maps). 다시 만들 때 `node scripts/geo/sigungu.mjs <원본.json>`
- `content/info/geo/projects/<id>.geojson`: 사업지구 경계. `npm run collect:geo`가 브이월드에서 받는다 (`.env.local`에 `VWORLD_KEY`, `VWORLD_DOMAIN`)
  - 필지 PNU가 있으면 필지 경계(LP_PA_CBND_BUBUN), 없으면 유형별 지구 레이어(collect.config.json `geo.layers`)에서 이름이 맞는 경계
  - 못 찾은 지구는 지도에 시군구 범위로 표시된다. 고시 도면 등에서 직접 만든 GeoJSON을 같은 이름으로 넣어도 된다 (`precision`, `source` 속성 권장)
- 지도 배경: 빌드할 때 `.env.local`의 `VWORLD_MAP_KEY`(브라우저용 브이월드 키)가 있으면 브이월드, 없거나 불러오지 못하면 OpenStreetMap
