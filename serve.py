#!/usr/bin/env python3
"""cafe ADM 사내망 프로덕션 서버 — SPA 정적 빌드 + API 프록시 + 이미지 중계를 단일 오리진에서 서빙.

한 프로세스가:
  - /            → ./dist (Vite 빌드된 SPA)  [SPA 폴백 포함]
  - /api/popular/* → cbt2-cafe-popular-api.dev.daum.net (사내망) 포워딩  [GET, /popular/* 만 허용]
  - /img?u=<url>   → daum CDN 이미지 중계(Referer 부여)  [daumcdn/kakaocdn 호스트만 허용]
  - POST /auth     → LDAP 로그인 검증(helloMIS). env CAFEADM_HELLOMIS_URL/KEY 설정 시 실검증, 미설정 시 데모 통과.
                      성공 시 HMAC 서명 세션 쿠키(cafeadm_sess) 발급.
  - /trend?key=<ymdh> → 실시간 트렌드 키워드(adm-table) 중계. loginToken은 env CAFEADM_TREND_TOKEN.
  - POST /write/popular/{ban|unban} → 인기글 제외(P)/복원(S). 세션 필수. 기본 dry-run,
                      env CAFEADM_WRITE_ENABLED=1 일 때만 cafe-popular-api 어드민에 실제 반영.

보안: /api·/img 는 화이트리스트로 제한(오픈 프록시·SSRF 차단).
⚠️ 접근 인증은 이 서버에 없음 — 실서비스는 리버스 프록시(SSO)·사내망 IP 제한 뒤에 두세요.

사용:  npm run build && python3 serve.py [PORT]   → http://<이 호스트>:<PORT>/
"""
import base64
import hashlib
import hmac
import json
import os
import re
import sys
import time
import http.server
import urllib.error
import urllib.parse
import urllib.request

UPSTREAM = "http://cbt2-cafe-popular-api.dev.daum.net"
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
DIST = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dist")
UA = {"User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)"}

# 화이트리스트
ALLOWED_API_PREFIXES = ("/popular/",)                    # 인기글 조회 API만
ALLOWED_IMG_HOSTS = (".daumcdn.net", ".kakaocdn.net")    # 카페 첨부 CDN만

# helloMIS(사내 LDAP 인증) — URL·authkey는 env로 주입(레포에 시크릿 미포함).
# 미설정 시 데모 통과 모드(비어있지 않은 입력만 허용). 운영에선 반드시 설정.
HELLOMIS_URL = os.environ.get("CAFEADM_HELLOMIS_URL", "").rstrip("/")
HELLOMIS_KEY = os.environ.get("CAFEADM_HELLOMIS_KEY", "")

# 실시간 트렌드 키워드(adm-table) — loginToken은 env로만 주입(레포/로그 금지).
TREND_UPSTREAM = os.environ.get("CAFEADM_TREND_URL", "https://adm-table.onkakao.net/realtime-trend")
TREND_TOKEN = os.environ.get("CAFEADM_TREND_TOKEN", "")

# ── 쓰기(인기글 상태변경) ──
# 로그인 세션을 HMAC 서명 쿠키로 발급하고, 쓰기 요청은 유효 세션이 있어야만 허용한다.
# SESSION_SECRET 미설정 시 프로세스 기동마다 무작위 생성(재기동 시 기존 세션 무효화).
SESSION_SECRET = os.environ.get("CAFEADM_SESSION_SECRET") or base64.b64encode(os.urandom(32)).decode()
SESSION_TTL = int(os.environ.get("CAFEADM_SESSION_TTL", str(8 * 3600)))
# 실제 업스트림 반영 스위치. 기본 off = dry-run(프록시·UI 플로우만 검증, 프로덕션 미반영).
WRITE_ENABLED = os.environ.get("CAFEADM_WRITE_ENABLED", "").lower() in ("1", "true", "yes", "on")
# 허용 쓰기 액션 → cafe-popular-api 어드민 엔드포인트 (P:제외 / S:노출복원)
ALLOWED_WRITE = {
    "/write/popular/ban": "/admin/articles/popular/ban",           # status=P (인기글 제외)
    "/write/popular/unban": "/admin/articles/popular/ban/remove",  # status=S (노출 복원)
}


def _make_session(user):
    exp = str(int(time.time()) + SESSION_TTL)
    raw = "%s|%s" % (user, exp)
    sig = hmac.new(SESSION_SECRET.encode(), raw.encode(), hashlib.sha256).hexdigest()
    return base64.urlsafe_b64encode(("%s|%s" % (raw, sig)).encode()).decode()


def _verify_session(tok):
    try:
        raw = base64.urlsafe_b64decode(tok.encode()).decode()
        user, exp, sig = raw.rsplit("|", 2)
        expect = hmac.new(SESSION_SECRET.encode(), ("%s|%s" % (user, exp)).encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, expect) or int(exp) < int(time.time()):
            return None
        return user
    except Exception:
        return None


def _img_host_ok(url: str) -> bool:
    host = (urllib.parse.urlparse(url).hostname or "").lower()
    return bool(host) and any(host == h.lstrip(".") or host.endswith(h) for h in ALLOWED_IMG_HOSTS)


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIST, **kwargs)

    def do_GET(self):
        if self.path.startswith("/api/"):
            return self._proxy("GET")
        if self.path.startswith("/img"):
            return self._img()
        if self.path.startswith("/trend"):
            return self._trend()
        path = urllib.parse.urlparse(self.path).path
        fs = os.path.join(DIST, path.lstrip("/"))
        if path != "/" and not os.path.isfile(fs):
            self.path = "/index.html"   # SPA 폴백
        return super().do_GET()

    def do_POST(self):
        path = urllib.parse.urlparse(self.path).path
        if path == "/auth":
            return self._auth()
        if path in ALLOWED_WRITE:
            return self._write(path)
        # 그 외 메서드/경로는 프록시하지 않음(오픈 프록시 방지)
        self.send_error(405)

    def _session_user(self):
        for part in (self.headers.get("Cookie") or "").split(";"):
            part = part.strip()
            if part.startswith("cafeadm_sess="):
                return _verify_session(part[len("cafeadm_sess="):])
        return None

    def _write(self, path):
        """인기글 제외/복원 — 세션 필수, 엄격 검증, 기본 dry-run."""
        user = self._session_user()
        if not user:
            return self._json(401, {"ok": False, "error": "unauthorized"})
        length = int(self.headers.get("Content-Length") or 0)
        params = urllib.parse.parse_qs((self.rfile.read(length) or b"").decode("utf-8", "replace"))
        grpcode = params.get("grpcode", [""])[0].strip()
        fldid = params.get("fldid", [""])[0].strip()
        dataid = params.get("dataid", [""])[0].strip()
        if not (re.fullmatch(r"[A-Za-z0-9_-]{1,40}", grpcode) and re.fullmatch(r"[A-Za-z0-9]{1,20}", fldid) and re.fullmatch(r"[0-9]{1,20}", dataid)):
            return self._json(400, {"ok": False, "error": "bad params"})
        action = "ban" if path.endswith("/ban") else "unban"
        # 감사 로그(사용자·액션·대상만 — 토큰/비밀 없음)
        sys.stderr.write("[AUDIT] user=%s action=%s target=%s/%s/%s live=%s\n" % (user, action, grpcode, fldid, dataid, WRITE_ENABLED))
        sys.stderr.flush()
        if not WRITE_ENABLED:
            return self._json(200, {"ok": True, "mode": "dry-run", "action": action})
        form = urllib.parse.urlencode({"grpcode": grpcode, "fldid": fldid, "dataid": dataid}).encode()
        try:
            req = urllib.request.Request(
                UPSTREAM + ALLOWED_WRITE[path], data=form, method="POST",
                headers={"Content-Type": "application/x-www-form-urlencoded", "Accept": "application/json"})
            with urllib.request.urlopen(req, timeout=6) as resp:
                ok = 200 <= resp.status < 300
            return self._json(200, {"ok": ok, "mode": "live", "action": action})
        except Exception:
            return self._json(502, {"ok": False, "error": "write upstream"})

    def _auth(self):
        """LDAP 로그인 검증 — helloMIS로 id/pw 확인. 미설정 시 데모 통과."""
        length = int(self.headers.get("Content-Length") or 0)
        try:
            body = json.loads(self.rfile.read(length) or b"{}")
        except Exception:
            body = {}
        uid = str(body.get("id", "")).strip()
        pw = str(body.get("pw", ""))
        if not uid or not pw:
            return self._json(200, {"ok": False, "error": "empty"})
        if not (HELLOMIS_URL and HELLOMIS_KEY):
            return self._json(200, {"ok": True, "id": uid, "name": uid, "mode": "dev"}, session_user=uid)
        ip = self.client_address[0] if self.client_address else "unknown"
        try:
            form = urllib.parse.urlencode({"id": uid, "pw": pw, "userip": ip}).encode()
            req = urllib.request.Request(
                HELLOMIS_URL + "/rest/identity/members/auth", data=form, method="POST",
                headers={"authkey": HELLOMIS_KEY, "Content-Type": "application/x-www-form-urlencoded", "Accept": "application/json"})
            with urllib.request.urlopen(req, timeout=6) as resp:
                authres = json.loads(resp.read() or b"{}")
        except Exception:
            return self._json(502, {"ok": False, "error": "auth upstream"})
        if (authres.get("result") or {}).get("authcode") != "AUTH_SUCCESS":
            return self._json(200, {"ok": False})
        # 프로필(선택) — 이름·부서·사번
        name, dept, empno = uid, "", ""
        try:
            preq = urllib.request.Request(
                HELLOMIS_URL + "/rest/identity/members/id/" + urllib.parse.quote(uid),
                headers={"authkey": HELLOMIS_KEY, "Accept": "application/json"})
            with urllib.request.urlopen(preq, timeout=6) as presp:
                m = ((json.loads(presp.read() or b"{}").get("result") or {}).get("memberlist") or [{}])[0]
            name = m.get("personName") or uid
            dept = m.get("deptName") or ""
            empno = m.get("employeeNo") or ""
        except Exception:
            pass
        return self._json(200, {"ok": True, "id": uid, "name": name, "dept": dept, "employeeNo": empno, "mode": "hellomis"}, session_user=uid)

    def _json(self, status, obj, session_user=None):
        data = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        if session_user:
            self.send_header("Set-Cookie", "cafeadm_sess=%s; HttpOnly; SameSite=Strict; Path=/; Max-Age=%d" % (_make_session(session_user), SESSION_TTL))
        self.end_headers()
        self.wfile.write(data)

    def _trend(self):
        """실시간 트렌드 키워드 중계 — adm-table. loginToken은 서버 env로만 주입."""
        q = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        key = q.get("key", [""])[0]
        if not key.isdigit():
            return self._json(400, {"error": "bad key"})
        if not TREND_TOKEN:
            return self._json(503, {"error": "trend token not configured"})
        try:
            url = "%s?key=%s&loginToken=%s" % (TREND_UPSTREAM, key, urllib.parse.quote(TREND_TOKEN))
            req = urllib.request.Request(url, headers={"Accept": "application/json"})
            with urllib.request.urlopen(req, timeout=8) as resp:
                self._reply(200, "application/json; charset=utf-8", resp.read())
        except Exception:
            self._reply(502, "application/json", b'{"error":"trend upstream"}')

    def _proxy(self, method):
        path = self.path[len("/api"):]
        if method != "GET" or not path.startswith(ALLOWED_API_PREFIXES):
            return self._reply(403, "application/json", b'{"error":"forbidden"}')
        req = urllib.request.Request(UPSTREAM + path, method="GET", headers={"Accept": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=6) as resp:
                self._reply(resp.status, resp.headers.get("Content-Type", "application/json"), resp.read())
        except urllib.error.HTTPError as e:
            self._reply(e.code, e.headers.get("Content-Type", "application/json"), e.read())
        except Exception as e:
            self._reply(502, "application/json", ('{"proxyError":"%s"}' % str(e).replace('"', "'")).encode())

    def _img(self):
        q = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        u = q.get("u", [""])[0]
        if not (u.startswith("http") and _img_host_ok(u)):
            return self._reply(403, "text/plain", b"forbidden host")
        try:
            req = urllib.request.Request(u, headers={**UA, "Referer": "https://cafe.daum.net/"})
            with urllib.request.urlopen(req, timeout=6) as resp:
                data, ctype = resp.read(), resp.headers.get("Content-Type", "image/jpeg")
            if not ctype.startswith("image/"):
                return self._reply(415, "text/plain", b"not an image")
            self.send_response(200)
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Cache-Control", "public, max-age=86400")
            self.end_headers()
            self.wfile.write(data)
        except Exception:
            self._reply(502, "text/plain", b"img fetch failed")

    def _reply(self, status, ctype, data):
        self.send_response(status)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, fmt, *args):
        if self.path.startswith("/api/"):
            super().log_message(fmt, *args)


if __name__ == "__main__":
    if not os.path.isfile(os.path.join(DIST, "index.html")):
        print(f"[!] 빌드가 없습니다: {DIST}\n    먼저: npm run build")
        sys.exit(1)
    with http.server.ThreadingHTTPServer(("0.0.0.0", PORT), Handler) as httpd:
        print(f"cafe ADM 서빙: http://0.0.0.0:{PORT}/  (dist={DIST}, api→{UPSTREAM})")
        print("[i] /api=GET /popular/* 만, /img=daum CDN 호스트만 허용. 접근 인증은 리버스 프록시에서.")
        print(f"[i] 쓰기(/write/popular/*): 세션 필수 · {'실반영(live)' if WRITE_ENABLED else 'dry-run(미반영)'} · env CAFEADM_WRITE_ENABLED 로 전환")
        httpd.serve_forever()
