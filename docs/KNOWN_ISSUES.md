# 알려진 미해결 이슈

> 발견됐으나 아직 처리하지 않은 항목. 처리되면 취소선 + ✅로 표시하고 커밋 해시를 남긴다.
> 형제 프로젝트(Taxitogether)의 `docs/KNOWN_ISSUES.md` 운영 방식을 따른다.

---

## [ISSUE-01] 비밀번호 재설정 웹 페이지에서 `setSession` 실패 🟡

**발견**: 2026-08-15 · **상태**: 미해결(보류) · **영향**: 비밀번호 재설정 플로우 전체

### 증상
`web/auth/reset-password.html`에 **유효한 복구 토큰을 실어 접속해도** 세션 확보에 실패하고
"세션을 확인하지 못했습니다"가 표시된다. 비밀번호 변경 폼까지 도달하지 못한다.

### 재현 방법
```bash
# 1. 복구 링크 발급 (redirect_to는 반드시 최상위 — options 안에 넣으면 무시됨)
curl -X POST "https://<ref>.supabase.co/auth/v1/admin/generate_link" \
  -H "apikey: $SERVICE_ROLE" -H "Authorization: Bearer $SERVICE_ROLE" \
  -d '{"type":"recovery","email":"<test>","redirect_to":"http://localhost:4321/auth/reset-password.html"}'

# 2. 정적 서버 기동
cd web && python -m http.server 4321

# 3. 발급된 action_link를 curl로 따라가 Location 헤더의 토큰을 얻어
#    브라우저로 http://localhost:4321/auth/reset-password.html#access_token=...&refresh_token=... 접속
```

### 확인된 사실
- 리디렉트는 **정상 도달**하며 `#access_token`·`refresh_token`·`type=recovery`가 모두 실려 온다
  (브라우저에서 해시 파싱 결과로 확인: `hasAccess: true`, `hasRefresh: true`)
- 페이지의 분기 로직은 정상 — 토큰이 없을 때/오류일 때 각각 올바른 안내를 낸다
- 콘솔 에러는 잡히지 않았다(브라우저 도구에서 로그 0건)
- 즉 **`supabase.auth.setSession()` 호출 자체가 error를 반환**하는 것으로 보이나 원인 미확인

### 의심 지점 (미검증)
1. 복구 링크는 **일회용**이라, 토큰 획득을 위해 `curl`로 먼저 따라간 시점에 소비됐을 가능성
   → 브라우저에서 **직접** 링크를 클릭하는 방식으로 재현해야 정확함
2. 클라이언트 옵션 `persistSession: false` + `detectSessionInUrl: false` 조합의 영향
3. `refresh_token`이 짧은 형식(`5l2jkjfnq4mx`)인데 이것이 정상인지 확인 필요

### 다음 단계
- `setSession` 반환 `error` 객체를 화면/콘솔에 그대로 출력하도록 임시 계측 후 재현
- 브라우저에서 링크를 직접 클릭하는 경로로 재현(일회용 토큰 소비 문제 배제)
- 그래도 실패하면 `detectSessionInUrl: true`로 두고 supabase-js가 자체 처리하도록 변경 검토

### 참고
- 파일: `web/auth/reset-password.html`
- **Supabase 리디렉트 허용목록**: `uri_allow_list`에 없는 주소는 조용히 `site_url`로 대체된다.
  현재 `http://localhost:4321/**,jcar://**` 등록됨. 배포 시 Vercel 도메인 추가 필요.

---

## [ISSUE-02] 이메일 인증이 비활성 상태 🟡

**상태**: 의도적 비활성 · **영향**: 아무 이메일로나 가입 가능

`mailer_autoconfirm=true`로 꺼둔 상태다. SMTP 미설정 + `site_url`이 `localhost:3000`이라
인증을 켜면 아무도 로그인할 수 없어 부득이하게 껐다(2026-08-15).

**해제 조건**: Vercel 배포 후 → `site_url`을 실제 도메인으로 변경 → 인증 재활성화.
SMTP는 초기엔 기본 메일러로도 가능(시간당 제한 있음).

---

## [ISSUE-03] 전화번호 인증 미구현 🟢

형식 검증(`^01[0-9]{8,9}$`)과 중복 방지(UNIQUE)만 있고 **실제 소유 인증은 없다.**
CLAUDE.md에 "Firebase Phone Auth" 서술이 남아 있으나 사실과 다르다 — 문서 정정 필요.

선택지: (A) 현행 유지 (B) SMS OTP(건당 과금) (C) 카카오싱크로 검증된 번호 수신(사업자등록 보유).
형제 프로젝트도 OTP 화면까지 만들어두고 **비용 때문에 비활성**한 상태다.
