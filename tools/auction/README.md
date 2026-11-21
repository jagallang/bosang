# 보상경매 (개인용, 비공개)

배포본(`dist/`)에 들어가지 않는다. 내 컴퓨터에서만 연다.

```bash
npm run collect                          # content/info/index.json 생성 (사업지구 묶음)
DATA_GO_KR_KEY=… npm run collect:auction  # 온비드 토지 물건 → data/items.json (설정은 collect.config.json)
npm run tool                             # http://127.0.0.1:8090/tools/auction/
```

- 물건 목록: `tools/auction/data/items.json` (커밋 안 됨). 없으면 `items.sample.json`을 쓴다.
  형식은 sample과 같다: `case, address, pnu(19자리), landUse, areaM2, appraisal, minPrice, saleDate`
- 온비드에서 받은 물건(`source: "온비드"`)은 다시 받을 때마다 새것으로 바뀌고, 직접 넣은 물건은 그대로 남는다.
- 사업지구 필지: `content/info/projects/*.json`의 `parcels`에 `pnu` 또는 `address`를 넣으면 매칭된다.
- 계산·경고는 참고용이다. 세율·택지 공급 기준·감면 요건은 사업과 시점마다 다르니 직접 확인한다.
- 필지가 등록된 사업이 없으면 주소의 시·군·구가 같은 사업을 '같은 시군구'로 보여준다. 경계 안인지는 토지이음 지형도면으로 직접 확인한다.
