# 수집 대기함

자동 수집이 아직 안 되는 고시·공고는 여기에 CSV로 넣는다. `npm run info:collect`가 읽어 `projects/*.json`에 합친다.

열: `project_id,project_name,type,operator,sido,sigungu,date,stage,title,url,period_from,period_to`

- `stage`: ontology.json의 단계 id (designation, survey, plan, appraisal, negotiation, adjudication, objection)
- 같은 `project_id`의 행은 한 사업으로 묶인다. 같은 날짜·제목의 고시는 한 번만 들어간다.
