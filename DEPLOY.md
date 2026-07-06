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

미설정 시 로그인은 데모 통과(빈 값만 거부). 운영에서는 반드시 설정.

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

## 접근 인증(중요)
`serve.py`에는 접근 게이트가 없음(로그인은 클라이언트/‑helloMIS 검증만). 정식 운영은
**사내 SSO 리버스 프록시 뒤 배치 + 사내망 IP 제한**을 전제로 한다.

## 참고
- `.github/workflows/deploy-pages.yml` 는 github.com 미러 데모 Pages 전용이며 GHE에서는 스킵된다.
