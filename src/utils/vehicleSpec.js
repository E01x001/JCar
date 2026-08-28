/**
 * 차량 제원 표시 — 조회처가 준 원문을 사람이 읽는 형태로 푼다.
 *
 * 값을 저장할 때 풀지 않고 표시할 때 푸는 이유: 원문은 조회처의 것이고,
 * 표시 형식은 우리 것이다. 저장 단계에서 가공하면 나중에 형식을 바꿀 때
 * 이미 저장된 행을 손댈 수 없다.
 */

/** 와이퍼 원문의 자리 코드 — 명세에 코드표는 없고 예시만 있다 */
const WIPER_POSITION = {
  D: '운전석',
  P: '조수석',
  R: '후면',
};

/**
 * 와이퍼 사이즈 원문을 푼다.
 *
 *   "D:600;P:400;R:전용"  ->  "운전석 600mm · 조수석 400mm · 후면 전용"
 *
 * 형식을 모르는 원문이 오면 **그대로 돌려준다.** 조회처가 형식을 바꿨을 때
 * 빈칸이 되는 것보다 원문이라도 보이는 편이 진단에 낫다.
 *
 * @param {string|null|undefined} raw
 * @returns {string|null}
 */
export const formatWiper = (raw) => {
  if (!raw) { return null; }

  const parts = String(raw).split(';').map((s) => s.trim()).filter(Boolean);
  const parsed = [];

  for (const part of parts) {
    const [code, value] = part.split(':').map((s) => s?.trim());
    const position = WIPER_POSITION[code?.toUpperCase()];
    if (!position || !value) { return String(raw); }

    // 숫자면 mm를 붙이고, "전용" 같은 말이면 그대로 둔다
    parsed.push(`${position} ${/^\d+$/.test(value) ? `${value}mm` : value}`);
  }

  return parsed.length > 0 ? parsed.join(' · ') : String(raw);
};

/**
 * 호환 배터리 목록을 표시용 줄로 만든다.
 *
 *   [{brand:'로케트', model:'56211', type:'DIN'}]  ->  ['로케트 56211 (DIN)']
 *
 * @param {Array<{brand?: string, model?: string, type?: string}>|null|undefined} list
 * @returns {string[]}
 */
export const formatBatteries = (list) => {
  if (!Array.isArray(list)) { return []; }

  return list
    .map(({ brand, model, type }) => {
      const name = [brand, model].filter(Boolean).join(' ');
      if (!name) { return null; }
      return type ? `${name} (${type})` : name;
    })
    .filter(Boolean);
};
