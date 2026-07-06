#!/usr/bin/env python3
"""cafe ADM 사내망 프로덕션 서버 — SPA 정적 빌드 + API 프록시 + 이미지 중계를 단일 오리진에서 서빙.

한 프로세스가:
  - /            → ./dist (Vite 빌드된 SPA)  [SPA 폴백 포함]
  - /api/popular/* → cbt2-cafe-popular-api.dev.daum.net (사내망) 포워딩  [GET, /popular/* 만 허용]
  - /img?u=<url>   → daum CDN 이미지 중계(Referer 부여)  [daumcdn/kakaocdn 호스트만 허용]
  - POST /auth     → LDAP 로그인 검증(helloMIS). env CAFEADM_HELLOMIS_URL/KEY 설정 시 실검증, 미설정 시 데모 통과.

보안: /api·/img 는 화이트리스트로 제한(오픈 프록시·SSRF 차단).
⚠️ 접근 인증은 이 서버에 없음 — 실서비스는 리버스 프록시(SSO)·사내망 IP 제한 뒤에 두세요.

사용:  npm run build && python3 serve.py [PORT]   → http://<이 호스트>:<PORT>/
"""
import json
import os
import sys
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
        path = urllib.parse.urlparse(self.path).path
        fs = os.path.join(DIST, path.lstrip("/"))
        if path != "/" and not os.path.isfile(fs):
            self.path = "/index.html"   # SPA 폴백
        return super().do_GET()

    def do_POST(self):
        if urllib.parse.urlparse(self.path).path == "/auth":
            return self._auth()
        # 그 외 메서드/경로는 프록시하지 않음(오픈 프록시 방지)
        self.send_error(405)

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
            return self._json(200, {"ok": True, "id": uid, "name": uid, "mode": "dev"})
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
        return self._json(200, {"ok": True, "id": uid, "name": name, "dept": dept, "employeeNo": empno, "mode": "hellomis"})

    def _json(self, status, obj):
        self._reply(status, "application/json; charset=utf-8", json.dumps(obj, ensure_ascii=False).encode())

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
        httpd.serve_forever()
