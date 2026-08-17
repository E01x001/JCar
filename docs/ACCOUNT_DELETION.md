# 회원탈퇴와 데이터 보존

> 정책 한 줄: **기록은 남기고, 사람은 지운다.**
> 차량·거래·소유권 이전 이력은 회사가 보존해야 하는 자산이므로 삭제하지 않는다.
> 대신 개인 식별정보를 파기해서, 남는 기록이 개인정보가 아니게 만든다.

## 흐름

```
사용자 탈퇴
  → cascade-delete-user (Edge Function)
      profiles.account_status = 'pending_deletion'
      permanent_delete_date = now() + 30일
      소유 차량 hidden, 활성 상담 취소, fcm_token 제거
  → [30일 유예] 고객센터 문의로 복구 가능
  → pg_cron 매일 03:20 UTC
      app_private.dispatch_account_purge()  — 대상 있을 때만 pg_net으로 호출
  → purge-deleted-accounts (Edge Function, service_role 전용)
      public.anonymize_account(uid)  — public 스키마 개인정보 파기
      auth.admin.updateUserById      — 이메일 가명화 + 영구 ban
```

탈퇴 경로는 **하나뿐이다.** 예전에 즉시 hard delete하는 `delete-account`가 따로 있었고
관리자 화면이 그쪽을 호출했는데, 차량·상담·**소유권 이전 기록까지 실제로 삭제**해
보존 정책과 정면으로 충돌했다. 2026-08-18에 제거했다.

## 파기 / 보존 대상

| 대상 | 처리 | 근거 |
|---|---|---|
| `vehicle_private_contact` (판매자 이름·전화·이메일, 소유자명, VIN 등) | **행 삭제** | 개인정보가 가장 집중된 테이블 |
| `consultation_requests.user_name / user_phone` | **NULL** | 개인 식별정보 |
| `admin_owned_vehicles.previous_owner_name` | **NULL** | 개인 식별정보 |
| `notifications` | **행 삭제** | 개인 알림 이력 |
| `profiles` name/email/phone_number/fcm_token | **비움** (`name='탈퇴회원'`) | 식별정보 |
| `auth.users` 이메일 | **가명화 + 영구 ban** | 로그인 차단 및 식별정보 제거 |
| `vehicles` | **보존** | 차량 제원·이력, 개인정보 아님 |
| `ownership_transfers`, `*_audit_logs` | **보존** | 거래 기록 (append-only, 불변) |
| `consultation_requests` 본문 | **보존** | 상담 이력 |
| `admin_owned_vehicles` 본문 | **보존** | 매입·매각 기록 |

## 왜 profiles 행을 지우지 않는가

`vehicles.seller_id`, `consultation_requests.user_id`, `vehicle_private_contact.seller_id`가
`profiles(id)`를 **ON DELETE 절 없이**(=RESTRICT) 참조한다. 기록을 남기는 한 프로필 행은
물리적으로 지울 수 없다.

그래서 프로필을 **묘비(tombstone)** 로 남기고 내용만 비운다. 부수 효과로 서로 다른
탈퇴자를 uuid로 계속 구분할 수 있어 거래 이력이 온전해진다 — 모두를 하나의 '탈퇴회원'
계정으로 합쳤다면 "누가 누구에게 팔았는지"가 이력에서 사라졌을 것이다.

`auth.users`도 같은 이유로 삭제하지 않는다. 삭제하면 `profiles`가 cascade로 지워지고,
그건 위 FK에 걸려 실패한다. 대신 이메일을 `deleted-{uuid}@invalid.local`로 바꾸고
100년 ban을 걸어 사실상 영구 차단한다.

## 법적 고려 (엔지니어링 관점 정리 — 최종 확인은 법률 검토 필요)

한국 개인정보보호법 기준으로 원칙은 **목적 달성 시 지체 없이 파기**다.
약관 동의만으로 개인정보를 무기한 보관하는 것은 위험하다.

- 다른 법령(전자상거래법 등)에 보존 의무가 있는 항목은 그 기간 보관해야 하며,
  이때는 **다른 데이터와 분리 보관**하고 보유 항목·기간·근거를 개인정보처리방침에 명시한다.
- 마케팅 활용 등은 필수 동의로 묶을 수 없고 별도 선택 동의여야 한다.

**이 설계가 택한 해법은 "보관 기간을 길게 잡는 것"이 아니라 "개인정보가 아니게 만드는 것"이다.**
가명처리된 거래 이력은 개인정보가 아니므로 기간 제한 없이 보존할 수 있고,
약관으로 무리하게 방어할 필요가 없어진다.

앱 내 탈퇴 안내 문구(`MyPageScreen`)도 이 정책과 일치시켰다.
이전 문구는 "30일 후 모든 데이터 영구 삭제 (복구 불가)"였는데 사실과 달랐다.

## 운영 메모

- pg_cron 잡 이름: `purge-deleted-accounts`, 스케줄 `20 3 * * *` (UTC)
- Vault 시크릿 `supabase_function_url`, `service_role_key`가 없으면 디스패치는
  **조용히 건너뛴다**(다음 실행에서 재시도). 푸시 발송과 동일한 규약.
- `purge-deleted-accounts`는 **service_role 토큰만** 허용한다. anon 키 호출은 403,
  무인증은 401로 거부되는 것을 배포 후 확인했다.
- 복구는 현재 수동이다 — `account_status`, `deleted_at`, `permanent_delete_date`를 NULL로
  되돌리고 차량 `hidden`을 해제하면 된다. 복구 RPC는 아직 없다.
