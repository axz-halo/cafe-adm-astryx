# 배포 가이드 (cafe ADM)

배포 리포: **https://github.kakaocorp.com/halo-axz/cafeadmin** (사내 GHE)
실배포는 **사내망**에서 이루어져야 함 — `/api`(인기글 API)·helloMIS(LDAP 인증) 도달이 필요.

## 구성
단일 컨테이너/프로세스가 모두 서빙:
- `/` → 빌드된 SPA(`dist`)
- `/api/popular/*` → 인기글 API 프록시 (GET·화이트리스트)
- `/img?u=` → 카페 CDN 이미지 중계 (daumcdn/kakaocdn만, SSRF 차단)
- `POST /auth` → helloMIS LDAP 로그인 검증

## 환경변수 (실인증 활성화)
| 변수 | 설명 |
|---|---|
| `CAFEADM_HELLOMIS_URL` | helloMIS 베이스 URL (`hellomis.server.url`) |
| `CAFEADM_HELLOMIS_KEY` | helloMIS authkey (`hellomis.auth.key`, 시크릿) |
| `CAFEADM_TREND_TOKEN` | 실시간 트렌드(adm-table) loginToken JWT (시크릿) — 카페 트렌드 실데이터용 |
| `CAFEADM_TREND_URL` | (선택) 트렌드 업스트림. 기본 `https://adm-table.onkakao.net/realtime-trend` |
| `CAFEADM_WRITE_ENABLED` | 인기글 제외/복원 **실반영** 스위치. 기본 off(dry-run, 미반영). `1`일 때만 cafe-popular-api 어드민에 실제 반영 |
| `CAFEADM_SESSION_SECRET` | (권장) 세션 쿠키 HMAC 서명 키. 미설정 시 프로세스 기동마다 무작위(재기동 시 기존 세션 무효) |
| `CAFEADM_SESSION_TTL` | (선택) 세션 유효기간 초. 기본 28800(8h) |

미설정 시: 로그인은 데모 통과(빈 값만 거부), 카페 트렌드는 실시간 인기글 제목 파생으로 폴백. 운영에서는 반드시 설정.

> ⚠️ `CAFEADM_TREND_TOKEN` 은 SUPERADMIN JWT 이며 **만료(exp)** 가 있음. 만료 시
> 카페 트렌드가 폴백 모드로 전환되므로 토큰 갱신·주입 절차를 운영에 마련할 것.
> 절대 레포/이미지/로그에 하드코딩하지 말 것(env 전용).

## A. Docker (권장 — 사내 컨테이너 플랫폼/idock/k8s)
```bash
docker build -t cafeadmin .
docker run -d -p 8080:8080 \
  -e CAFEADM_HELLOMIS_URL=<url> -e CAFEADM_HELLOMIS_KEY=<key> \
  cafeadmin
# → http://<호스트>:8080/
```

## B. 직접 실행 (사내망 호스트)
```bash
npm ci && npm run build
CAFEADM_HELLOMIS_URL=<url> CAFEADM_HELLOMIS_KEY=<key> python3 serve.py 8080
```

## 쓰기(인기글 제외/복원)
- 경로: `POST /write/popular/{ban|unban}` → cafe-popular-api `/admin/articles/popular/ban[/remove]` (status P↔S).
- **세션 필수**: `/auth` 성공 시 발급되는 HMAC 서명 쿠키(cafeadm_sess)가 있어야 함(없으면 401).
- **기본 dry-run**: `CAFEADM_WRITE_ENABLED` 미설정 시 업스트림 미호출·응답만 시뮬레이션(안전).
  실제 반영은 운영자가 명시적으로 `=1` 설정한 사내망 배포에서만.
- 파라미터 엄격 검증(grpcode/fldid/dataid 화이트리스트) + 감사 로그(stderr: user·action·target, 비밀 미기록).
- ⚠️ 업스트림 어드민 API는 무인증이므로 **반드시 이 세션 게이트/사내망 뒤에서만** 노출할 것.

## 접근 인증(중요)
`serve.py`에는 접근 게이트가 없음(로그인은 클라이언트/‑helloMIS 검증 + 쓰기 전용 세션 쿠키). 정식 운영은
**사내 SSO 리버스 프록시 뒤 배치 + 사내망 IP 제한**을 전제로 한다.

## 참고
- `.github/workflows/deploy-pages.yml` 는 github.com 미러 데모 Pages 전용이며 GHE에서는 스킵된다.
