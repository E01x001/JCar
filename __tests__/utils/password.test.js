import { isValidPassword, validateNewPassword } from '../../src/utils/password';

describe('isValidPassword', () => {
  it('8자 이상 + 소문자 + 숫자를 요구한다', () => {
    expect(isValidPassword('abcd1234')).toBe(true);
    expect(isValidPassword('Passw0rd!')).toBe(true);
  });

  it('짧거나 소문자·숫자가 빠지면 거부한다', () => {
    expect(isValidPassword('abc123')).toBe(false);     // 7자 미만
    expect(isValidPassword('abcdefgh')).toBe(false);   // 숫자 없음
    expect(isValidPassword('12345678')).toBe(false);   // 소문자 없음
    expect(isValidPassword('ABCD1234')).toBe(false);   // 대문자만
  });

  it('빈 값에서 터지지 않는다', () => {
    expect(isValidPassword(null)).toBe(false);
    expect(isValidPassword(undefined)).toBe(false);
    expect(isValidPassword('')).toBe(false);
  });
});

describe('validateNewPassword', () => {
  it('규칙을 만족하고 확인란이 같으면 통과', () => {
    expect(validateNewPassword('abcd1234', 'abcd1234')).toEqual({});
  });

  it('확인란 불일치를 잡는다', () => {
    const errors = validateNewPassword('abcd1234', 'abcd12345');
    expect(errors.confirm).toBeTruthy();
    expect(errors.password).toBeUndefined();
  });

  it('빈 입력을 각각 잡는다', () => {
    const errors = validateNewPassword('', '');
    expect(errors.password).toBeTruthy();
    expect(errors.confirm).toBeTruthy();
  });

  // 규칙은 통과하지만 사실상 공개된 문자열이다
  it('이메일 아이디와 같은 비밀번호를 막는다', () => {
    const errors = validateNewPassword('hong1234', 'hong1234', { email: 'Hong1234@example.com' });
    expect(errors.password).toBeTruthy();
  });

  it('이메일 아이디와 다르면 통과한다', () => {
    expect(validateNewPassword('abcd1234', 'abcd1234', { email: 'hong1234@example.com' }))
      .toEqual({});
  });

  it('짧은 아이디(4자 미만)는 비교 대상에서 뺀다', () => {
    // 'ab1'은 어차피 규칙에서 걸리므로, 규칙을 통과하는 값으로 확인한다
    expect(validateNewPassword('abc12345', 'abc12345', { email: 'ab@example.com' }))
      .toEqual({});
  });

  it('현재 비밀번호와 같으면 막는다', () => {
    const errors = validateNewPassword('abcd1234', 'abcd1234', { currentPassword: 'abcd1234' });
    expect(errors.password).toBeTruthy();
  });
});
