/**
 * 비밀번호 규칙 — 한 곳에서만 정한다.
 *
 * 규칙이 화면마다 흩어져 있으면 갈라진다. 실제로 가입 화면에만 정규식이
 * 인라인으로 있었고, 재설정·변경 화면이 생기는 순간 세 벌이 될 참이었다.
 * 서버(Supabase `password_min_length`)는 6자만 요구하므로, 실질적인 기준은
 * 여기다 — 그래서 더욱 한 벌이어야 한다.
 */

/** 화면에 그대로 보여주는 규칙 설명. 오류 문구와 안내 문구가 어긋나지 않게 공유한다. */
export const PASSWORD_RULE_TEXT = '8자 이상, 영문 소문자와 숫자를 포함';

/** 가입·재설정·변경이 모두 쓰는 기본 규칙 */
export const isValidPassword = (v) => /^(?=.*[a-z])(?=.*\d).{8,}$/.test(v ?? '');

/**
 * 새 비밀번호 검증 — 재설정·변경 화면 공용.
 *
 * 기본 규칙에 더해 두 가지를 본다:
 *   - 확인란 일치. 비밀번호는 화면에 안 보이므로 오타를 잡아줄 곳이 여기뿐이다.
 *   - 이메일 아이디와 같은지. 규칙은 통과하지만 사실상 공개된 문자열이다
 *     (`hong1234@example.com` -> `hong1234`).
 *
 * @param {string} password
 * @param {string} confirm
 * @param {{ email?: string, currentPassword?: string }} [context]
 * @returns {{ password?: string, confirm?: string }} 필드별 오류. 빈 객체면 통과.
 */
export const validateNewPassword = (password, confirm, context = {}) => {
  const errors = {};

  if (!password) {
    errors.password = '새 비밀번호를 입력해주세요.';
  } else if (!isValidPassword(password)) {
    errors.password = `${PASSWORD_RULE_TEXT}해야 합니다.`;
  } else if (context.email && isEmailLocalPart(password, context.email)) {
    errors.password = '이메일 주소와 너무 비슷합니다. 다른 비밀번호를 사용해주세요.';
  } else if (context.currentPassword && password === context.currentPassword) {
    errors.password = '현재 비밀번호와 다른 것을 사용해주세요.';
  }

  if (!confirm) {
    errors.confirm = '새 비밀번호를 한 번 더 입력해주세요.';
  } else if (password !== confirm) {
    errors.confirm = '비밀번호가 일치하지 않습니다.';
  }

  return errors;
};

/** 'hong1234@example.com'의 'hong1234'와 같은가 (대소문자 무시) */
const isEmailLocalPart = (password, email) => {
  const local = String(email).split('@')[0]?.trim().toLowerCase();
  return !!local && local.length >= 4 && local === password.toLowerCase();
};
