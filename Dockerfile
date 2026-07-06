# cafe ADM — 단일 컨테이너(SPA 빌드 + serve.py: /api 프록시 · /img 중계 · /auth LDAP)
# 사내망(Kakao 컨테이너 플랫폼)에서 실행. /api·helloMIS 도달을 위해 사내망에 배치.

# 1) 빌드
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# 2) 런타임 (정적 SPA + 프록시 서버)
FROM python:3.12-alpine AS runtime
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY serve.py ./
EXPOSE 8080
# helloMIS 실검증 활성화: 배포 시 아래 env 주입(미설정 시 로그인 데모 통과)
#   CAFEADM_HELLOMIS_URL=<helloMIS 베이스 URL>
#   CAFEADM_HELLOMIS_KEY=<authkey>
CMD ["python3", "serve.py", "8080"]
