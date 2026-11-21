/**
 * 보상경매 자동 경고 (순수 함수). 판정이 아니라 "확인하라"는 알림이다.
 * project: content/info 사업 JSON, ontology: 단계 정의, item: { acquireDate }, user: { publicOfficial }
 */
import { currentStage } from '../../site/lib/infoModel.mjs';

const addYears = (s, y) => `${Number(s.slice(0, 4)) + y}${s.slice(4)}`;

function firstNotice(project, stageId) {
  return (project.notices || []).filter((n) => n.stage === stageId).map((n) => n.date).sort()[0] || null;
}

export function checkWarnings({ project, ontology, acquireDate, user = {} }) {
  const out = [];
  const designation = project.publicViewDate || firstNotice(project, 'designation');
  const stage = currentStage(project, ontology);

  if (designation && acquireDate && acquireDate > addYears(designation, -1)) {
    out.push({
      level: 'high', key: 'housing-lot',
      text: `취득 예정일이 기준일(${designation})의 1년 전보다 늦습니다. 협의양도인택지·이주자택지는 보통 기준일 1년 전부터의 소유·거주를 요구하므로 공급 대상이 아닐 수 있습니다. 해당 사업의 공급 기준을 확인하세요.`,
    });
  }
  if (designation && acquireDate && acquireDate > addYears(designation, -2)) {
    out.push({
      level: 'mid', key: 'tax-relief',
      text: `사업인정고시일(추정 ${designation}) 2년 전보다 늦게 취득하면 공익사업 수용에 따른 양도세 감면을 받지 못할 수 있습니다. 세무사에게 확인하세요.`,
    });
  }
  if (!stage || stage.order < 5) {
    out.push({
      level: 'mid', key: 'timing',
      text: `아직 ${stage ? stage.name : '단계 정보 없음'} 단계입니다. 협의 전이라 보상 시기와 금액 추정의 오차가 큽니다.`,
    });
  }
  out.push({
    level: 'info', key: 'non-business-land',
    text: '보유 기간과 이용 상황에 따라 비사업용 토지로 보아 양도세가 무거워질 수 있습니다. 계산기의 양도세율 추정에 반영하세요.',
  });
  if (user.publicOfficial) {
    out.push({
      level: 'high', key: 'conflict',
      text: '공직자는 소속·관련 기관이 하는 사업지구 안의 부동산 보유·매수가 신고 대상일 수 있습니다. 이해충돌방지법과 소속 기관 기준을 먼저 확인하세요.',
    });
  }
  const order = { high: 0, mid: 1, info: 2 };
  return out.sort((a, b) => order[a.level] - order[b.level]);
}
