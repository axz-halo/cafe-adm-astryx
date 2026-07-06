#!/usr/bin/env python3
"""cafe ADM 사내망 프로덕션 서버 — SPA 정적 빌드 + API 프록시 + 이미지 중계를 단일 오리진에서 서빙.

한 프로세스가:
  - /            → ./dist (Vite 빌드된 SPA)  [SPA 폴백 포함]
  - /api/popular/* → cbt2-cafe-popular-api.dev.daum.net (사내망) 포워딩  [GET, /popular/* 만 허용]
  - /img?u=<url>   → daum CDN 이미지 중계(Referer 부여)  [daumcdn/kakaocdn 호스트만 허용]

보안: /api·/img 는 화이트리스트로 제한(오픈 프록시·SSRF 차단).
⚠️ 접근 인증은 이 서버에 없음 — 실서비스는 리버스 프록시(SSO)·사내망 IP 제한 뒤에 두세요.

사용:  npm run build && python3 serve.py [PORT]   → http://<이 호스트>:<PORT>/
"""
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
        # 쓰기/그 외 메서드는 프록시하지 않음(오픈 프록시 방지)
        self.send_error(405)

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
