---
title: "OAuth2 쿠키 인증 트러블슈팅: Cross-Domain Cookie 접근 불가 이슈"
description: "Kakao OAuth2 로그인 후 Cross-Domain 환경에서 HttpOnly 쿠키에 접근할 수 없는 문제를 분석하고, 4가지 해결 방법을 비교합니다."
pubDate: 2026-01-31T00:00:00+09:00
slug: "2026/01/31/oauth2-cross-domain-cookie-troubleshooting"
tags: ["OAuth2", "Cookie", "Next.js", "CORS", "Troubleshooting"]
---

## 1. 문제 상황

### 현재 아키텍처

- **Frontend**: `localhost:3000` (Next.js)
- **Backend**: `unibusk.site` (Spring Boot)
- **인증 방식**: Kakao OAuth2 + HttpOnly Cookie

### 발생한 문제

OAuth2 로그인 성공 후 FE 콜백 페이지에서 인증 쿠키에 접근할 수 없어 인증 상태 확인 및 API 요청이 불가능한 상황

---

## 2. 인증 플로우 (BE OAuth2 워크플로우 기반)

```
Step 1: 사용자 "로그인" 버튼 클릭

Step 2: FE - 로그인 버튼 클릭 시
└─ window.location.href = "<https://unibusk.site/api/auths/login?state=http%3A%2F%2Flocalhost%3A3000%2Fcallback>"
   → 브라우저가 BE 엔드포인트로 하드 리다이렉트 (FE 실행 종료)

Step 3: BE - RedirectUrlFilter에서 state 처리
└─ 내부적으로 /oauth2/authorization/kakao로 리다이렉트
   → state 쿠키에 FE callback URL 저장

Step 4: 사용자 카카오 로그인
└─ 카카오 인증 페이지에서 로그인 완료

Step 5: 카카오 → BE - 인증 코드 전달
└─ <https://unibusk.site/api/auths/login?code=xxx>

Step 6: BE - AuthService.handleLoginSuccess 호출
└─ 토큰 발급 (Access/Refresh Token)
   → TokenInjector를 통해 쿠키에 저장

Step 7: BE - OAuth2LoginSuccessHandler.redirectToSuccessUrl 호출
└─ HTTP/1.1 302 Found
   ├─ Set-Cookie: accessToken=xxx; Domain=unibusk.site; Secure; HttpOnly
   ├─ Set-Cookie: refreshToken=yyy; Domain=unibusk.site; Secure; HttpOnly
   └─ Location: <http://localhost:3000/oauth-callback/kakao>

   ❌ **문제 발생 지점**:
   브라우저가 쿠키를 unibusk.site 도메인에 저장한 후 localhost로 리다이렉트

Step 8: FE - /oauth-callback/kakao 페이지
└─ 쿠키 파라미터 및 쿠키 처리
   → 신규 사용자 → 회원가입 페이지
   → 기존 사용자 → 홈 화면

   ❌ localhost에서 unibusk.site 쿠키 접근 불가
```

---

## 3. 근본 원인: 리다이렉트 시점의 쿠키 도메인 격리

### 핵심 문제

`window.location.href`로 OAuth2 로그인 플로우를 시작하면, **BE가 로그인 성공 후 설정한 쿠키는 `unibusk.site` 도메인에 저장되지만, 리다이렉트로 `localhost`로 전환되는 순간 해당 쿠키에 접근할 수 있는 기술적 경로가 존재하지 않습니다**.

### 브라우저의 쿠키 저장 메커니즘

### 1. 쿠키는 정상적으로 저장됨

```
BE 응답 (Step 7):
HTTP/1.1 302 Found
Set-Cookie: accessToken=xxx; Domain=unibusk.site; Secure; HttpOnly
Location: <http://localhost:3000/oauth-callback/kakao>

→ 브라우저는 Set-Cookie를 보고 자동으로 쿠키 저장
→ 그 후 Location 헤더를 따라 localhost로 이동
```

**중요**: `window.location.href` 사용 시 FE 코드는 이 응답을 가로챌 수 없습니다. 모든 처리는 브라우저가 직접 수행합니다.

### 2. 쿠키 저장소는 도메인별로 격리됨

```
브라우저 쿠키 저장소:

[<https://unibusk.site>]
├─ accessToken: eyJhbGc...
└─ refreshToken: eyJhbGc...

[<http://localhost:3000>]
└─ (비어있음)

→ 브라우저 보안 정책: 각 도메인은 자신의 저장소만 접근 가능
→ localhost 컨텍스트에서는 unibusk.site 저장소를 볼 수 없음
```

### 3. 리다이렉트 후 상태

```
Step 8: FE (localhost:3000/oauth-callback/kakao)
현재 실행 컨텍스트:
├─ document.domain: "localhost"
├─ 쿠키 저장 위치: unibusk.site (다른 도메인)
└─ 결과: JavaScript/API 어떤 방법으로도 쿠키 접근 불가

// 콘솔 확인
console.log(document.cookie);  // "" (빈 문자열)
console.log(document.domain);  // "localhost"
```

### 왜 FE가 개입할 수 없는가?

```
[리다이렉트 체인]
FE (localhost)
    ↓ window.location.href 실행
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[브라우저가 직접 처리 - JS 코드 실행 권한 없음]
    ↓
BE (unibusk.site) OAuth 처리
    ↓
BE가 Set-Cookie + 302 Redirect 응답
    ↓
[브라우저가 직접 처리 - JS 코드 실행 권한 없음]
├─ 쿠키를 unibusk.site에 저장
└─ localhost:3000으로 이동
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    ↓
FE (localhost) 페이지 렌더링 시작
└─ 이미 localhost 컨텍스트로 전환됨
   → unibusk.site 쿠키는 접근 불가능한 영역
```

---

## 4. 시도한 해결 방법 및 실패 원인

### 4.1 Next.js Rewrites (Transparent Proxy)

**시도한 방법**:

```jsx
// next.config.js
module.exports = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "<https://unibusk.site/api/:path*>",
      },
    ];
  },
};
```

**실패 이유**:

- Rewrites는 **FE에서 시작한 fetch/axios 요청**만 프록시
- `window.location.href`는 브라우저가 직접 처리하여 Next.js 서버 자체에 접근 ❌
- OAuth 플로우 전체가 브라우저 레벨에서 발생하므로 프록시 개입 불가

```
실제 흐름:
브라우저 → unibusk.site (브라우저가 이동, 프록시 과정 생략)
         ↓
      OAuth 처리
         ↓
    쿠키 설정 + 리다이렉트
         ↓
브라우저 → localhost (브라우저가 이동, 프록시 과정 생략)

→ Next.js 서버는 이 과정에 전혀 관여하지 않음
```

---

### 4.2 Route Handler를 통한 쿠키 전달

**시도한 방법**:

```tsx
// app/api/members/me/route.ts
export async function GET() {
  const cookieStore = await cookies();
  // cookieStore에는 어떠한 cookie 값이 존재하지 않음

  const response = await fetch(`${ENV.API_URL}/api/members/me`, {
    method: "GET",
    headers: {
      Cookie: cookieStore.toString(),
    },
    cache: "no-store",
  });

  const data = await response.json();

  return NextResponse.json(data, { status: 200 });
}
```

**실패 이유**:

1. **Route Handler가 호출되지 않음**:
   - BE가 브라우저에게 `http://localhost:3000/oauth-callback`로 이동시킴 (Next 서버 자체가 실행되지 않음)
   - 브라우저가 **페이지를 직접 렌더링** (API Route 건너뜀)
   - Route Handler는 클라이언트가 명시적으로 요청할 때만 실행
2. **토큰 교환 API 부재**:
   - 현재 BE는 리다이렉트 응답에만 쿠키를 포함
   - 별도의 토큰을 조회할 수 있는 엔드포인트가 존재하지 않음
3. **쿠키가 이미 없음**:

```tsx
// Route Handler 내부에서
const cookies = request.cookies; // 비어있음

// 이유: 브라우저가 localhost 페이지를 요청할 때
// unibusk.site 쿠키는 전송되지 않음
```

---

### 4.3 Cloudflare Tunnel

**시도한 방법**:

```bash
cloudflared tunnel --url <http://localhost:3000>
```

**실패 이유**:

- 도메인은 BE에서 Cloudflare에서 배포한 기본 도메인을 CDN으로 설정함
- Cloudflare가 생성한 기본 도메인은 Cloudflare Zone 접근 불가

---

### 4.4 Self-signed HTTPS

**시도한 방법**:

```bash
next dev --experimental-https
```

**실패 이유**:

- 브라우저가 자체 서명 인증서를 신뢰하지 않음
- `NET::ERR_CERT_AUTHORITY_INVALID` 에러 발생
- HSTS 정책으로 인해 경고 우회 불가

---

### 4.5 IP 주소 기반 쿠키 설정

**시도한 방법**:
백엔드를 AWS EC2 IP 주소(`13.124.xxx.xxx`)로 배포하고, BE 설정에서 쿠키 도메인을 IP로 설정

```yaml
# Backend application.yml
cors:
  allowed-origins:
    - <http://localhost:3000>

cookie:
  domain: localhost
  secure: false
  sameSite: Lax
```

```tsx
// FE: localhost:3000
fetch("http://13.124.xxx.xxx:8080/api/members/me", {
  credentials: "include",
});
```

**실패 이유**:

1. **Public Suffix List 규칙 위반**:

```
브라우저의 Public Suffix List (PSL):
- 쿠키는 "유효한 도메인"에만 설정 가능
- IP 주소는 PSL에서 유효한 도메인으로 인정되지 않음
- 따라서 Set-Cookie 헤더를 브라우저가 무시

예시:
✅ Domain=.example.com → 유효한 eTLD+1
✅ Domain=.unibusk.site → 유효한 eTLD+1
❌ Domain=13.124.xxx.xxx → 유효하지 않음 (IP 주소)
❌ Domain=localhost → 유효하지 않음 (Public Suffix)
```

> Public Suffix List (PSL)란?
>
> Mozilla가 관리하는 "쿠키 공유가 허용되는 도메인 목록"입니다.
> `.com`, `.co.kr` 같은 최상위 도메인과 `.github.io`, `.cloudfront.net` 같은 공용 서브도메인을 정의하여, 악의적인 사이트가 다른 사이트의 쿠키를 탈취하는 것을 방지합니다.
>
> IP 주소와 `localhost`는 PSL에 포함되지 않아 쿠키 도메인으로 사용할 수 없습니다.

**Cross-Origin 쿠키 차단:**

```
요청 출처: <http://localhost:3000>
쿠키 도메인: 13.124.xxx.xxx

→ 브라우저는 이 두 주소를 완전히 다른 출처로 인식
→ localhost와 IP 주소는 "Same-Site" 관계가 아님
```

---

### 실패 사례 요약

| 방법              | 시도 내용                   | 실패 원인                               |
| ----------------- | --------------------------- | --------------------------------------- |
| Next.js Rewrites  | API 프록시 설정             | OAuth 리다이렉트는 브라우저가 직접 처리 |
| Route Handler     | Next.js 서버에서 쿠키 전달  | 리다이렉트 시점에 Next.js 서버 경유 ❌  |
| Cloudflare Tunnel | 로컬을 외부 도메인으로 노출 | Zone 접근 권한 부족                     |
| Self-signed HTTPS | 로컬 HTTPS 환경 구성        | 브라우저가 인증서 신뢰 거부             |
| IP 기반 쿠키      | BE IP로 개발 서버 배포      | Public Suffix List 규칙 위반            |

---

## 5. 왜 Proxy/Middleware도 동작하지 않는가?

### 핵심: 브라우저의 localhost 저장소에 쿠키가 없음

리다이렉트 완료 후 **브라우저의 localhost 저장소는 비어있으므로**, 어떤 기술을 사용해도 쿠키를 찾을 수 없습니다.

### 5.1 Proxy가 쿠키를 전달하지 못하는 이유

```jsx
// FE 코드
fetch("/api/user/profile", { credentials: "include" });

// Proxy가 요청을 전달:
// GET <https://unibusk.site/api/user/profile>
// Cookie: (비어있음)

// 문제: 브라우저가 요청에 첨부할 쿠키가 없음
// → localhost 저장소가 비어있기 때문
```

### 5.2 Middleware가 쿠키를 읽지 못하는 이유

```tsx
// middleware.ts
export function middleware(request: NextRequest) {
  const token = request.cookies.get("accessToken"); // undefined

  // 브라우저가 Next.js 서버로 요청할 때:
  // GET ap/members/me
  // Cookie: (비어있음) ← unibusk.site 쿠키는 전송 안됨
}
```

### 비교표

| 접근 방법                              | 동작 여부 | 실패 이유                                                        |
| -------------------------------------- | --------- | ---------------------------------------------------------------- |
| `document.cookie`                      | ❌        | HttpOnly 설정으로 인해 FE에서 cookie에 접근할 수 없음            |
| `fetch(..., {credentials: 'include'})` | ❌        | 브라우저가 요청에 첨부할 쿠키가 없음 (localhost 저장소 비어있음) |
| Next.js Rewrites                       | ❌        | 브라우저 리다이렉트가 프록시가 아닌 브라우저가 http 통신을 함    |
| Route Handler                          | ❌        | 브라우저 리다이렉트가 프록시가 아닌 브라우저가 http 통신을 함    |
| Middleware                             | ❌        | `request.cookies`는 현재 도메인(localhost) 쿠키만 포함           |

---

## 6. 검증된 해결 방법

브라우저의 Cookie Domain Scope 정책을 만족시키기 위해서는 **도메인 통일** 또는 **프록시를 통한 출처 위장**이 필요합니다.

### 방법 1: 풀스택 로컬 환경

**개요**: FE와 BE를 모두 `localhost`에서 실행

**장점**:

- Cross-Domain 이슈 완전 제거
- 네트워크 상태 독립적
- 별도 시스템 설정 불필요

**단점**:

- JDK 17+, Gradle 등 Java 개발 환경 구성 필요
- 로컬 리소스 소모

**실행 방법**:

1. BE 저장소 클론
2. `application-local.yml` 설정:

```yaml
cookie:
  domain: localhost
  secure: false
  sameSite: Lax
```

1. Spring Boot 애플리케이션 실행
2. FE에서 `http://localhost:8080` (BE 포트)로 OAuth 시작

---

### 방법 2: DNS 등록 + mkcert

**개요**: 도메인 관리 사이트(가비아 등)에서 `dev.unibusk.site`를 `127.0.0.1`로 등록하여 로컬을 서브도메인화

**장점**:

- **팀원 간 설정 공유 용이**: hosts 파일 수정 없이 도메인만으로 접속 가능
- 운영 서버 데이터 사용 가능
- Java 환경 구성 불필요
- 실제 배포 환경과 동일한 테스트

**단점**:

- 도메인 DNS 관리 권한 필요
- 초기 인증서 발급 필요
- BE 측 CORS/Cookie 설정 변경 협의 필요

### 설정 단계

**1. DNS A 레코드 등록** (도메인 관리자만 1회 설정):

```
호스트: dev
타입: A
값: 127.0.0.1
TTL: 600 (10분)

→ 전 세계 어디서든 dev.unibusk.site 접속 시 로컬 서버로 연결
```

**2. mkcert로 로컬 인증서 발급** (각 개발자):

```bash
# macOS
brew install mkcert
mkcert -install

# Windows
choco install mkcert
mkcert -install

# 인증서 생성
mkcert dev.unibusk.site localhost 127.0.0.1

# 생성된 파일을 프로젝트 .cert 폴더에 저장:
# - dev.unibusk.site+2.pem (인증서)
# - dev.unibusk.site+2-key.pem (개인키)
```

**3. Next.js HTTPS 설정**:

```json
// package.json
{
  "scripts": {
    "dev-https": "NODE_TLS_REJECT_UNAUTHORIZED=0 next dev --experimental-https --experimental-https-key ./.cert/dev.unibusk.site+2-key.pem --experimental-https-cert ./.cert/dev.unibusk.site+2.pem"
  }
}
```

**4. 환경 변수 설정**:

```bash
# .env.local
NEXT_PUBLIC_APP_URL=https://dev.unibusk.site:3000
NEXT_PUBLIC_API_URL=https://unibusk.site
API_URL=https://unibusk.site
```

**5. BE 설정 변경 요청**:

```yaml
# Backend application.yml
cors:
  allowed-origins:
    - <https://dev.unibusk.site:3000>

cookie:
  domain: .unibusk.site # 서브도메인 공유
  secure: true
  sameSite: None

redirect:
  allowed-hosts:
    - dev.unibusk.site
```

**6. OAuth 로그인 실행**:

```tsx
// 로그인 버튼 클릭 시
window.location.href = "<https://unibusk.site/api/auths/login?state=https%3A%2F%2Fdev.unibusk.site%3A3000%2Fcallback>";
```

---

### 방법 3: hosts 파일 + mkcert

**개요**: `/etc/hosts` 파일을 수정하여 `dev.unibusk.site`를 로컬로 매핑

**장점**:

- DNS 관리 권한 불필요
- 개인 개발 환경 독립적 구성

**단점**:

- **각 팀원이 hosts 파일을 수동으로 수정**해야 함
- OS별 설정 방법이 다름
- 초기 인증서 발급 필요
- BE 측 CORS/Cookie 설정 변경 협의 필요

### 설정 단계

**1. Hosts 파일 수정** (각 개발자):

```bash
# macOS/Linux
sudo vi /etc/hosts

# Windows
notepad C:\\Windows\\System32\\drivers\\etc\\hosts

# 추가:
127.0.0.1 dev.unibusk.site
```

**2~6**: 방법 2의 2~6 단계와 동일

---

### 방법 4: Next.js Proxy + Authorization Code 교환 (코드만으로 해결 🚀)

**개요**: BE가 임시 코드만 전달하고, FE가 Next.js 프록시를 통해 토큰을 교환받아 쿠키 출처를 `localhost`로 위장

**핵심 아이디어**:

```
기존 방식 (실패):
BE → Set-Cookie + Redirect → FE (localhost)
❌ 브라우저가 도메인 불일치로 쿠키 차단
```

```bash
Proxy 방식 (성공):
Step 1: BE → 임시 코드를 query string으로 FE 콜백 URL로 Redirect
        Location: http://localhost:3000/oauth-callback/kakao?code=temp_abc123
        (Set-Cookie 없음)

Step 2: FE 콜백 페이지 렌더링
        → useEffect에서 searchParams.get('code')로 임시 코드 추출

Step 3: FE → Next.js 프록시로 POST 요청
        fetch('/api/auth/token/exchange', {
          method: 'POST',
          body: JSON.stringify({ code: 'temp_abc123' })
        })
        → 브라우저는 "localhost:3000/api/... 요청"으로 인식

Step 4: Next.js Rewrites → 실제 BE로 프록시
        POST https://unibusk.site/api/auth/token/exchange
        (브라우저는 이 과정을 모름)

Step 5: BE → 임시 코드 검증 후 Set-Cookie 응답
        200 OK
        Set-Cookie: accessToken=xxx; HttpOnly; Path=/; (Domain 없음)
        Set-Cookie: refreshToken=yyy; HttpOnly; Path=/; (Domain 없음)

Step 6: Next.js → 응답을 브라우저에 그대로 전달

Step 7: 브라우저 → "localhost:3000/api/... 요청의 응답"으로 인식
        ✅ Domain이 없는 Set-Cookie를 현재 출처(localhost)의 쿠키로 저장
```

**왜 프록시가 필요한가?:**

```bash
프록시 없이 직접 호출 시 (실패):
FE: fetch('https://unibusk.site/api/auth/token/exchange')
→ Cross-Origin 요청
→ BE가 Set-Cookie 응답 (Domain 없음)
→ 브라우저: "unibusk.site에서 온 응답이구나"
❌ unibusk.site 저장소에 저장 (localhost에서 접근 불가)
```

프록시 사용 시 (성공):

```bash
FE: fetch('/api/auth/token/exchange')
→ 브라우저는 "localhost:3000/api/... 요청"으로 인식
→ Next.js가 내부적으로 unibusk.site로 프록시
→ BE가 Set-Cookie 응답 (Domain 없음)
→ Next.js가 응답을 그대로 전달
→ 브라우저: "localhost:3000에서 온 응답이구나"
✅ Domain이 없으므로 요청 출처인 localhost에 저장
```

**장점**:

- ✅ **인프라 설정 Zero**: DNS, hosts, mkcert 불필요
- ✅ **빠른 구현**: 코드 몇 줄로 즉시 적용
- ✅ **HttpOnly 쿠키 보안 유지**
- ✅ **팀원 설정 최소화**: npm install만으로 시작

**단점**:

- ❌ **BE API 변경 필수**: 임시 코드 생성/토큰 교환 엔드포인트 추가
- ❌ **임시 저장소 필요**: Redis 등 (코드 5분 TTL)
- ❌ **환경별 Cookie 설정**: 로컬/운영 분기 필요

---

### ⚠️ 방법 4 (Proxy) 사용 시 필수 체크리스트

**1. Domain 속성 절대 설정 금지**:

```java
// ❌ 이렇게 하면 실패
Cookie cookie = new Cookie("accessToken", token);
cookie.setDomain("unibusk.site"); // localhost에서 저장 안됨

// ✅ 이렇게 해야 성공
Cookie cookie = new Cookie("accessToken", token);
// setDomain() 호출하지 않음 → 브라우저가 localhost로 설정
```

**2. 임시 코드 보안**:

```java
// 1. 충분한 엔트로피
String code = UUID.randomUUID().toString();

// 2. 짧은 만료 시간 (5분)
redisTemplate.opsForValue().set(key, value, 5, TimeUnit.MINUTES);

// 3. 1회용: 사용 후 즉시 삭제
redisTemplate.delete(key);
```

**3. 환경별 Cookie 설정 분기(Host-only Cookie)**:

**핵심 포인트**

- `Domain` 속성을 설정하지 않으면 브라우저가 **현재 요청 도메인을 자동으로 쿠키 도메인으로 설정**
- `Domain=unibusk.site` 를 설정하면 프록시를 사용해도 브라우저가 차단

```java
// application-local.yml
cookie:
  secure: false
  # domain 설정하지 않음

// application-prod.yml
cookie:
  secure: true
  domain: .unibusk.site
```

---

### 방법 비교

| 항목               | 방법 1: 풀스택 로컬 | 방법 2: DNS + mkcert ⭐ | 방법 3: hosts + mkcert | 방법 4: Proxy 🚀  |
| ------------------ | ------------------- | ----------------------- | ---------------------- | ----------------- |
| **설정 난이도**    | 높음 (Java)         | 중간 (DNS)              | 중간 (OS별)            | **낮음 (코드만)** |
| **BE API 변경**    | 불필요              | 불필요                  | 불필요                 | **필요**          |
| **팀원 설정**      | BE 클론 + 실행      | mkcert만                | hosts + mkcert         | **npm install만** |
| **인프라 설정**    | 불필요              | DNS 레코드              | hosts 파일             | **불필요**        |
| **데이터**         | 로컬 DB             | 운영 서버               | 운영 서버              | 운영 서버         |
| **구현 속도**      | 느림                | 중간                    | 중간                   | **빠름**          |
| **운영 환경 일치** | 낮음                | 높음                    | 높음                   | 중간              |

---

### 권장 방법 선택 가이드

**방법 4 (Proxy) 추천 케이스**:

- ✅ **빠른 프로토타입** 개발이 필요할 때
- ✅ **BE 팀과 협업**이 원활하여 API 변경 가능
- ✅ **인프라 설정 권한**이 없거나 복잡도 회피
- ✅ 개발 초기 단계에서 빠른 검증

**방법 2 (DNS + mkcert) 추천 케이스**:

- ✅ **장기 프로젝트**에서 안정적인 환경 구축
- ✅ **운영 환경과 동일한** 테스트 필요
- ✅ **팀원 설정 최소화** (hosts 수정 불필요)
- ✅ BE API 변경이 어려운 경우

**방법 1 (풀스택 로컬) 추천 케이스**:

- ✅ BE/FE **모두 개발**하는 풀스택 개발자
- ✅ **네트워크 독립적** 개발 환경 필요
- ✅ 로컬 데이터로 개발 선호

**방법 3 (hosts + mkcert) 추천 케이스**:

- ✅ **DNS 관리 권한**이 없는 경우
- ✅ 개인 개발 환경 독립 구성 선호

---

### ⚠️ 방법 4 (Proxy) 사용 시 필수 체크리스트

**1. Domain 속성 절대 설정 금지**:

```java
// ❌ 이렇게 하면 실패
Cookie cookie = new Cookie("accessToken", token);
cookie.setDomain("unibusk.site"); // localhost에서 저장 안됨

// ✅ 이렇게 해야 성공
Cookie cookie = new Cookie("accessToken", token);
// setDomain() 호출하지 않음 → 브라우저가 localhost로 설정
```

**2. 임시 코드 보안**:

```java
// 1. 충분한 엔트로피
String code = UUID.randomUUID().toString();

// 2. 짧은 만료 시간 (5분)
redisTemplate.opsForValue().set(key, value, 5, TimeUnit.MINUTES);

// 3. 1회용: 사용 후 즉시 삭제
redisTemplate.delete(key);
```

**3. 환경별 Cookie 설정 분기(Host-only Cookie)**:

**핵심 포인트**

- `Domain` 속성을 설정하지 않으면 브라우저가 **현재 요청 도메인을 자동으로 쿠키 도메인으로 설정**
- `Domain=unibusk.site` 를 설정하면 프록시를 사용해도 브라우저가 차단

```java
// application-local.yml
cookie:
  secure: false
  # domain 설정하지 않음

// application-prod.yml
cookie:
  secure: true
  domain: .unibusk.site
```

---

## 7. 검증 방법

### Chrome DevTools로 쿠키 격리 확인

**Application → Cookies**:

```
<https://unibusk.site>
├─ accessToken: eyJhbGc...
└─ refreshToken: eyJhbGc...

<http://localhost:3000>
└─ (비어있음)

→ 두 저장소는 완전히 격리됨
```

**Console 확인**:

```jsx
// localhost:3000/oauth-callback/kakao 페이지
console.log(document.domain); // "localhost"
console.log(document.cookie); // ""

// unibusk.site 쿠키는 DevTools에서 확인 가능하지만
// JavaScript로는 접근 불가
```

**Network 탭 - 리다이렉트 체인**:

```
Request: GET <https://unibusk.site/api/auths/login>
Response: 302 Found
├─ Set-Cookie: accessToken=xxx; Domain=unibusk.site; Secure; HttpOnly
└─ Location: <http://localhost:3000/oauth-callback/kakao>

→ 다음 요청:
Request: GET <http://localhost:3000/oauth-callback/kakao>
├─ Cookie: (비어있음)  ← unibusk.site 쿠키 미포함
└─ (페이지 렌더링)
```

---

## 8. 기술적 배경 지식

### Cookie Domain Scope

```
쿠키는 설정된 도메인과 그 서브도메인에서만 접근 가능:

Domain=unibusk.site:
✅ unibusk.site
✅ api.unibusk.site
✅ app.unibusk.site
❌ localhost
❌ example.com

→ 브라우저 보안 정책: 악의적인 사이트의 쿠키 탈취 방지
```

### eTLD+1 (Effective Top-Level Domain + 1)

```
unibusk.site        → eTLD+1: unibusk.site
dev.unibusk.site    → eTLD+1: unibusk.site (Same-Site)
localhost           → eTLD+1: localhost (Cross-Site)

→ 쿠키의 Domain=.unibusk.site 설정 시:
  dev.unibusk.site ↔ unibusk.site 간 쿠키 공유 가능
```

### SameSite vs Domain

**SameSite**: 쿠키가 존재할 때 언제 전송할지 결정

```
SameSite=Lax:
✅ unibusk.site → unibusk.site (Same-Site Navigation)
✅ dev.unibusk.site → api.unibusk.site (Same-Site)
❌ localhost → unibusk.site (Cross-Site)
```

**우리 문제**: Domain 자체가 달라서 쿠키가 존재하지 않음

```
❌ localhost 컨텍스트에서 unibusk.site 쿠키 접근 불가
→ SameSite 검사 이전에 "쿠키 없음" 상태
```

---

## 9. 결론

### 문제의 본질

`window.location.href` 기반 OAuth2 플로우에서:

1. **리다이렉트 중**: FE 코드가 실행되지 않아 응답 가로채기 불가
2. **쿠키 저장**: 브라우저가 자동으로 처리하지만 `unibusk.site` 도메인에만 저장
3. **리다이렉트 완료**: `localhost` 컨텍스트로 전환되어 쿠키 접근 불가
4. **결과**: 브라우저의 `localhost` 저장소에는 쿠키가 없음

### 해결책

**도메인 통일**만이 유일한 해결 방법:

- 풀스택 로컬 환경: 모두 `localhost`
- 서브도메인 구성: 모두 `.unibusk.site`
