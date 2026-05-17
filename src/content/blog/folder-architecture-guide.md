---
title: "Next.js App Router 폴더 아키텍처 마이그레이션 가이드"
description: "역할 기반(role-based) 폴더 구조의 한계를 분석하고, Next.js App Router 환경에 맞는 Co-location + 도메인 기반 공유 레이어 구조로 점진적으로 전환하는 방법을 설명합니다."
pubDate: 2026-05-08T00:00:00+09:00
slug: "2026/05/08/folder-architecture-guide"
tags: ["Architecture", "Next.js", "FSD", "Co-location", "DDD"]
draft: true
---

## 이 문서의 목적

UNIBUSK 프로젝트가 초기 단계를 지나 도메인이 늘어나면서, 기존의 **기술 역할 기반(role-based) 폴더 구조**의 한계가 드러나고 있습니다. 이 문서는 그 한계를 정리하고, **Next.js App Router에 맞는 폴더 아키텍처**로 점진적으로 전환하기 위한 가이드입니다.

---

## 결론 먼저

UNIBUSK는 **"Next.js 네이티브 Co-location + 도메인(Feature) 기반 공유 레이어"** 구조로 점진적으로 전환합니다.

FSD(Feature-Sliced Design)나 DDD(Domain-Driven Design) 전체 형식은 채택하지 않습니다. 다만 두 방법론의 핵심 아이디어 — **도메인 단위 응집**과 **public API 기반 cross-import 규약**([FSD `@x` 패턴](https://feature-sliced.design/kr/docs/reference/public-api#public-api-for-cross-imports)) — 은 부분적으로 차용합니다. 자세한 이유는 [왜 FSD/DDD 전체를 채택하지 않았나?](#왜-fsddd-전체를-채택하지-않았나) 섹션에서 설명합니다.

---

## 현재 구조의 한계 (역할 기반 분리)

현재 프로젝트는 **기술적 역할(role)** 단위로 폴더를 나눕니다.

```
src/
├── apis/performance/
├── hooks/performance/
├── stores/performance/
├── queries/performance/
├── types/performance/
└── components/performance/
```

### 문제점

1. **응집도(cohesion) 낮음** — `performance` 도메인 하나를 수정하려면 6개 폴더를 동시에 열어야 합니다.
2. **함께 변경되는 코드가 분리되어 있음** — `performance.api.ts`를 수정하면 `performance.schema.ts`, 관련 훅, 타입을 같이 봐야 하는데, 각각 다른 폴더에 있어 PR 리뷰 시 맥락이 끊깁니다.
3. **도메인 단위로 코드를 파악하기 어려움** — "이 도메인이 어떤 데이터를 다루나요?"라는 질문에 답하려면 6개 위치를 모두 확인해야 합니다.

> **원칙**: _함께 변경되는 코드는 함께 둔다 (co-location)._

---

## 왜 FSD/DDD 전체를 채택하지 않았나?

### FSD 전체 구조의 부담

FSD의 권장 레이어는 다음과 같습니다.

```
app → pages → widgets → features → entities → shared
```

FSD 공식 문서는 [Next.js와 함께 쓰는 가이드](https://feature-sliced.design/kr/docs/guides/tech/with-nextjs)도 제공하므로 "Next.js와 호환되지 않는다"는 것은 사실이 아닙니다. UNIBUSK가 FSD 전체를 채택하지 않는 이유는 **호환성 문제가 아니라 현재 프로젝트 단계에 비해 추상화가 과하기 때문**입니다.

- 현재 도메인 수는 5개 내외, 작업 인원도 소규모입니다.
- 6개 레이어(app/pages/widgets/features/entities/shared)를 강제하면 코드 한 조각마다 "이게 feature인가 entity인가, widget으로 묶을 정도인가?" 같은 분류 비용이 늘어납니다.
- UNIBUSK는 RSC만 사용하므로 `app/` 라우트가 이미 "페이지/위젯 조립 지점" 역할을 합니다. FSD의 `pages/`·`widgets/` 레이어와 책임이 겹쳐 이중 관리가 발생합니다.

다만 FSD가 정리한 두 가지 규약은 그대로 차용합니다.

- **슬라이스(도메인) 단위 응집**
- **public API와 cross-import 규약** (`index.ts` + `@x/`)

### DDD 전체 패턴의 부담

DDD는 **도메인 로직이 풍부한 백엔드/엔터프라이즈 시스템**에 적합한 방법론입니다. UNIBUSK처럼 UI 중심 프론트엔드에서는 다음과 같은 비용이 생깁니다.

- Aggregate, Value Object, Domain Service 같은 개념을 React 컴포넌트 트리에 1:1 매핑하기 어렵습니다.
- 비즈니스 로직 대부분이 서버에 있고, 프론트엔드는 그 결과를 표현하는 역할이 큽니다.
- 결과적으로 추상화 계층을 늘려도 얻는 이득이 적습니다.

도메인 단위 응집이라는 아이디어만 차용하고, DDD의 형식적 패턴(Aggregate, Repository 등)은 도입하지 않습니다.

---

## 추천 구조: Co-location First + Domain Sharing

```
src/
├── app/                          # 라우팅 + 라우트 전용 코드 (co-location)
│   ├── _components/              # 앱 전역 레이아웃 컴포넌트
│   ├── (root)/
│   ├── busking-map/
│   │   ├── _components/          # 이 페이지 전용 컴포넌트
│   │   ├── _hooks/               # 이 페이지 전용 훅
│   │   ├── _utils/               # 이 페이지 전용 유틸
│   │   └── page.tsx
│   ├── performance-detail/[performanceId]/
│   │   ├── _components/
│   │   └── page.tsx
│   └── api/
│
├── domains/                      # ⭐ 도메인 단위 응집
│   ├── performance/
│   │   ├── api/                  # performance.api.ts, performance.schema.ts, performance.lib.ts
│   │   ├── queries/              # queryOptions
│   │   ├── hooks/
│   │   ├── stores/
│   │   ├── components/           # 이 도메인 고유 UI (PerformanceCard 등)
│   │   ├── types/
│   │   ├── constants/
│   │   ├── utils/
│   │   ├── @x/                   # cross-import 전용 진입점 (필요 시)
│   │   └── index.ts              # 외부 노출 public API
│   ├── busking-map/
│   ├── user/
│   └── kakao-map/
│
└── shared/                       # 도메인 무관 공통 자원
    ├── ui/                       # Button, Input, Card (디자인 시스템)
    ├── lib/                      # cn, fetcher, parseApi
    ├── hooks/                    # useDebounce, useMediaQuery
    ├── config/                   # env, constants
    └── types/                    # 글로벌 타입
```

### 각 영역의 역할

| 영역       | 역할                      | 예시                                     |
| ---------- | ------------------------- | ---------------------------------------- |
| `app/`     | 라우팅 + 라우트 전용 코드 | `page.tsx`, `layout.tsx`, `_components/` |
| `domains/` | 비즈니스 도메인 단위 응집 | `performance`, `busking-map`, `user`     |
| `shared/`  | 도메인 무관 재사용 자원   | `Button`, `cn()`, `useDebounce`          |

---

## `app/`과 `domains/`의 책임 분리

두 폴더는 비슷해 보이지만 **서로 다른 책임**을 가집니다.

| 영역       | 무엇을 표현하는가?                | 기준이 되는 관점  |
| ---------- | --------------------------------- | ----------------- |
| `app/`     | **URL 구조 = 사용자 경험 흐름**   | 사용자 / 디자이너 |
| `domains/` | **비즈니스 도메인 = 데이터 모델** | 백엔드 API        |

### 왜 분리해야 하나요?

1. **URL은 외부에 노출되는 안정적인 인터페이스** — 사용자 북마크, SEO, 외부 링크가 의존하는 식별자이므로 백엔드 API보다 변경 빈도가 낮아야 합니다.
2. **한 페이지는 여러 도메인을 조합합니다** — 예: `busking-map` 페이지는 Performance Location + Performance + Member API를 동시에 호출합니다. 어느 한 도메인 폴더에만 둘 수 없습니다.
3. **백엔드 도메인 변경이 URL에 그대로 전파되면 안 됩니다** — 백엔드가 `Member`를 `User`로 리네이밍해도 `/profile` URL은 유지되어야 합니다. `domains/` 폴더가 그 변경을 흡수하는 어댑터 역할을 합니다.

### Swagger API 도메인 → `domains/` 미러링

UNIBUSK 백엔드의 Swagger 명세서(`/api/swagger-ui/index.html`)는 **`domains/`의 직접적인 출처**입니다. 백엔드 팀과 **동일한 용어**로 폴더를 구성하면 회의에서 "Performance Location 도메인 수정해야 해"라고 했을 때 양쪽이 즉시 같은 폴더를 떠올릴 수 있습니다.

| Swagger Tag          | `domains/` 폴더                  |
| -------------------- | -------------------------------- |
| Auth                 | `domains/auth/`                  |
| Member               | `domains/member/`                |
| Performance          | `domains/performance/`           |
| Performance Location | `domains/performance-locations/` |

### 사용자 경험 페이지 → 백엔드 도메인 매핑

```
사용자 경험 (app/)                  →   비즈니스 도메인 (domains/)
─────────────────────                   ─────────────────────────
/login, /auth/callback              →   domains/auth
/profile                            →   domains/member + domains/performance
/busking-map                        →   domains/performance-locations + domains/performance
/performance-list                   ─┐
/performance-detail/[id]            ─┼─→  domains/performance
/performance (등록/수정)            ─┘    + domains/performance-locations
```

한 페이지가 여러 도메인을 조합하는 것은 프론트엔드에서 자연스러운 패턴입니다.

> **원칙**: 백엔드 API 구조가 프론트엔드 URL을 결정하지 않습니다.
> `app/`은 **사용자 경험(URL/화면 흐름)** 을, `domains/`는 **데이터 모델(엔티티/API)** 을 표현합니다.
> 두 관심사를 분리하는 어댑터 레이어가 `domains/`입니다.

---

## 핵심 규칙 3가지

### 1. "한 곳에서만 쓰이면 `app/_*`, 여러 곳에서 쓰이면 `domains/`, 도메인 무관이면 `shared/`"

이 한 줄이 **모든 의사결정의 기준**입니다.

### 2. 도메인 간 의존은 public API(`index.ts`) 또는 cross-import 전용 진입점(`@x/`)을 통해서만

FSD의 [Public API for cross-imports](https://feature-sliced.design/kr/docs/reference/public-api#public-api-for-cross-imports) 규약을 차용합니다.

**기본 — 다른 도메인을 쓸 땐 해당 도메인의 public API만**

```typescript
// ✅ Good — public API를 통해서만 의존
import { fetchPerformance } from "@/domains/performance";

// ❌ Bad — 내부 파일 경로에 직접 의존
import { fetchPerformance } from "@/domains/performance/api/performance.api";
```

이렇게 하는 이유는 도메인 내부 구조가 바뀌어도 외부 사용처를 깨뜨리지 않기 위함입니다. 리팩토링 시 변경의 영향 범위가 도메인 내부로 한정됩니다.

**예외 — 도메인 간 결합이 본질적으로 필요한 경우 `@x/` 전용 진입점 사용**

`performance`와 `performance-locations`처럼 백엔드에서도 강하게 묶여 있는 도메인은, 다른 도메인 전용 진입점을 명시적으로 노출합니다.

```
domains/performance/
├── index.ts                              # 일반 외부 사용처용 public API
├── @x/
│   └── performance-locations.ts          # performance-locations 도메인 전용 진입점
└── ...
```

```typescript
// domains/performance-locations/hooks/usePerformanceWithLocation.ts
import { performanceFields } from "@/domains/performance/@x/performance-locations";
```

이 규약의 이점:

- 일반 사용처는 여전히 `index.ts` public API만 강제 — 캡슐화 유지
- `@x/` 하위 폴더명이 곧 "이 도메인을 쓰는 도메인" — 결합 관계를 코드 상에서 추적 가능
- 도메인 간 결합을 모두 `app/` 레이어로 떠넘기지 않아도 됨

도메인 간 양방향 결합은 피해야 합니다 (A가 B의 `@x/a.ts`를 쓰고 B가 A의 `@x/b.ts`를 쓰는 순환 의존).

### 3. 의존 방향: `app/` → `domains/` → `shared/` (한 방향)

- `app/`은 `domains/`와 `shared/`를 자유롭게 import 가능
- `domains/`는 `shared/`를 import 가능. 다른 `domains/`는 규칙 2에 따라 public API 또는 `@x/`를 통해서만
- `shared/`는 어디에도 의존하지 않음

> ESLint의 `import/no-restricted-paths` rule로 강제 가능합니다.

---

## 의사결정 예시

| 상황                                                            | 어디에 두나요?                                        |
| --------------------------------------------------------------- | ----------------------------------------------------- |
| `PerformanceCard` — 리스트, 상세, 검색 페이지에서 모두 사용     | `domains/performance/components/`                     |
| 상세 페이지의 `PerformanceLocationMap` — 상세 페이지에서만 사용 | `app/performance-detail/[performanceId]/_components/` |
| `Button`, `Modal` 같은 디자인 시스템                            | `shared/ui/`                                          |
| `useDebounce`, `useMediaQuery`                                  | `shared/hooks/`                                       |
| `usePerformanceLocations` 훅                                    | `domains/performance/hooks/`                          |
| `cn()`, `parseApi()`                                            | `shared/lib/`                                         |
| `KAKAO_MAP_DEFAULT_CENTER` 상수                                 | `domains/kakao-map/constants/`                        |
| `formatBuskingTime()` — 여러 도메인에서 시간 포맷팅 시 사용     | `shared/lib/`                                         |
| `formatPerformanceDuration()` — performance 도메인에서만 사용   | `domains/performance/utils/`                          |

### 판단이 애매할 때

> **"지금은 한 곳에서만 쓰이지만, 미래에 여러 곳에서 쓰일 것 같다"**

→ **지금은 `app/.../_components/`에 두세요.** 두 번째 사용처가 실제로 생겼을 때 `domains/`로 옮기면 됩니다. 미래의 사용 패턴을 미리 가정해 추상화하면 가정이 틀렸을 때 되돌리는 비용이 더 커집니다.

---

## 점진적 마이그레이션 전략

⚠️ **한 번에 갈아엎지 않습니다.** 도메인 단위로 점진적으로 옮기며 리스크를 분산합니다.

### Phase 1 — `domains/` 폴더 신설 + 한 도메인만 이동

가장 응집도가 높고 변경이 적은 도메인부터 시작합니다 (예: `kakao-map`).

```
src/
├── apis/kakao-map/        ─┐
├── hooks/kakao-map/        │  →  src/domains/kakao-map/
├── types/kakao-map/        │
└── constants/kakao-map/   ─┘
```

작업 내용:

1. `src/domains/kakao-map/` 폴더 생성
2. 관련 파일을 `api/`, `hooks/`, `types/`, `constants/` 하위로 이동
3. `index.ts`에서 public API 정리
4. import 경로 일괄 수정 (IDE의 "Move File" 기능 활용)

### Phase 2 — `shared/` 분리

```
src/components/common/    →  src/shared/ui/
src/utils/cn.ts           →  src/shared/lib/cn.ts
src/apis/api.instance.ts  →  src/shared/lib/api.instance.ts
src/apis/api.parse.ts     →  src/shared/lib/api.parse.ts
```

### Phase 3 — 페이지 전용 컴포넌트 정리

`src/components/performance/` 안의 컴포넌트를 분류:

- 한 페이지에서만 사용 → `app/.../_components/`
- 여러 페이지에서 사용 → `domains/performance/components/`

이 분류는 **사용처 검색(grep)** 으로 정확히 판단할 수 있습니다.

### Phase 4 — 나머지 도메인 순차 이동

`performance` → `busking-map` → `user` → `performance-locations` 순으로 이동.

각 도메인 이동은 **하나의 PR로** 처리하여 리뷰 부담을 줄입니다.

### Phase 5 — 기존 빈 폴더 제거

마이그레이션이 완료되면 `apis/`, `hooks/`, `stores/`, `queries/`, `types/`, `constants/` 등 비워진 폴더를 제거합니다.

---

## 자주 묻는 질문

### Q1. `app/_components/`와 `domains/.../components/`를 어떻게 구분하나요?

| 질문                                                               | 답이 Yes면                     |
| ------------------------------------------------------------------ | ------------------------------ |
| 이 컴포넌트가 **한 라우트에서만** 사용되는가?                      | `app/<route>/_components/`     |
| 이 컴포넌트가 **여러 라우트에서** 같은 도메인 데이터를 보여주는가? | `domains/<domain>/components/` |
| 이 컴포넌트가 **도메인 무관**한 UI 요소인가?                       | `shared/ui/`                   |

### Q2. 한 컴포넌트가 두 도메인을 동시에 사용하면 어디에 두나요?

→ **사용하는 쪽**(`app/.../_components/`)에 둡니다. 두 도메인을 조합하는 책임은 페이지가 가져갑니다. `domains/` 폴더는 자기 도메인의 데이터/UI만 담당합니다.

### Q3. `domains/` 내부에서 다른 도메인이 필요하면?

두 가지 선택지가 있습니다.

**1) 기본 — `app/` 레이어에서 조립**

도메인 간 결합이 특정 페이지에서만 발생한다면 페이지에서 조립합니다.

```typescript
// app/performance-detail/[id]/page.tsx
const performance = await fetchPerformance(id);
const user = await fetchUser(performance.userId);
```

**2) 도메인 간 결합이 본질적으로 필요한 경우 — `@x/` cross-import 전용 진입점**

`performance`와 `performance-locations`처럼 백엔드에서도 강하게 묶여 있는 관계라면, cross-import 전용 진입점을 명시적으로 노출합니다.

```typescript
// domains/performance-locations/hooks/usePerformanceWithLocation.ts
import { performanceFields } from "@/domains/performance/@x/performance-locations";

export { performanceFields } from "../constants/performance";
// domains/performance/@x/performance-locations.ts
export type { PerformanceSummary } from "../types/performance";
```

`@x/` 하위 파일명이 곧 "이 도메인을 사용하는 도메인"이므로, 결합 관계가 코드 상에서 명시적으로 추적됩니다. 단, 양방향 cross-import는 피해야 합니다 (순환 의존).

### Q4. `_components` 같은 언더스코어 prefix는 무슨 의미인가요?

Next.js의 [private folder 컨벤션](https://nextjs.org/docs/app/getting-started/project-structure#private-folders)입니다. **라우팅에서 제외**되는 폴더로, 내부 구현용 폴더임을 명시합니다.

```
app/busking-map/_components/Map.tsx  →  /busking-map/_components/Map URL은 생성되지 않음
app/busking-map/page.tsx             →  /busking-map URL 생성됨
```

### Q5. 백엔드 API 도메인 구조를 `app/`에 그대로 반영해도 되나요?

→ **❌ 안 됩니다.** `app/`은 URL이고 **사용자 경험**을 따라야 합니다. Swagger의 도메인은 **백엔드의 데이터 모델**이며, 이 둘은 자주 일치하지 않습니다.

| 안티패턴 (❌)                               | 권장 (✅)                           |
| ------------------------------------------- | ----------------------------------- |
| `app/auths/login/page.tsx` → `/auths/login` | `app/login/page.tsx` → `/login`     |
| `app/members/me/page.tsx` → `/members/me`   | `app/profile/page.tsx` → `/profile` |
| `app/performance-locations/page.tsx`        | `app/busking-map/page.tsx`          |

**왜 안티패턴인가?**

- `/auths/login` 같은 URL은 사용자 입장에서 어색하고 검색엔진 친화적이지 않습니다.
- 백엔드가 API 경로를 변경하면 사용자 URL까지 바뀌어 북마크와 SEO 기록이 깨집니다.
- 한 페이지가 여러 API 도메인을 사용하는 일반적인 경우를 표현할 수 없습니다.

대신 Swagger 도메인은 **`domains/` 폴더에서 미러링**하세요. 자세한 매핑 방법은 위 [`app/`과 `domains/`의 책임 분리](#app과-domains의-책임-분리) 섹션을 참고하세요.

---

## 참고 자료

- [Next.js — Project Organization and File Colocation](https://nextjs.org/docs/app/getting-started/project-structure)
- [Kent C. Dodds — Colocation](https://kentcdodds.com/blog/colocation)
- [Feature-Sliced Design — Official Documentation](https://feature-sliced.design/)
- [Feature-Sliced Design — With Next.js](https://feature-sliced.design/docs/guides/tech/with-nextjs)
- [Feature-Sliced Design — Public API for cross-imports](https://feature-sliced.design/kr/docs/reference/public-api#public-api-for-cross-imports)
