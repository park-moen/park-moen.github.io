---
title: "테스트 코드 작성 가이드"
description: "UNIBUSK 프로젝트에서 Vitest, Playwright, Storybook을 활용한 테스트 파일 위치, 책임 분리, 작성 패턴을 정리합니다."
pubDate: 2026-05-12T00:00:00+09:00
slug: "2026/05/12/testing-guide"
tags: ["Testing", "Vitest", "Playwright", "Storybook"]
draft: true
---

## 이 문서의 목적

UNIBUSK 프로젝트에서 사용하는 **Vitest, Playwright, Storybook** 테스트 도구의 다음 항목을 정리합니다.

- **위치**: 어떤 테스트 파일을 어느 폴더에 두는가?
- **책임**: 어떤 종류의 검증을 어떤 도구로 하는가?
- **작성 패턴**: 실제로 어떻게 쓰는가?

이 가이드는 [폴더 아키텍처 가이드](./folder-architecture-guide.md)와 함께 읽으세요. 테스트 코드의 위치는 폴더 아키텍처와 동일한 원칙 — _함께 변경되는 코드는 함께 둡니다_ — 을 따릅니다.

---

## 결론 먼저

| 테스트 유형          | 도구         | 위치                                                           |
| -------------------- | ------------ | -------------------------------------------------------------- |
| **단위 테스트**      | Vitest       | 대상 파일 옆에 co-location                                     |
| **통합 테스트**      | Vitest + RTL | 대상 컴포넌트 옆에 co-location                                 |
| **Storybook 스토리** | Storybook    | 대상 컴포넌트 옆에 co-location                                 |
| **E2E 테스트**       | Playwright   | 최상위 `e2e/` 폴더에 분리                                      |
| **Mock 데이터**      | —            | 사용 범위에 따라 `domains/.../__mocks__/` 또는 `shared/mocks/` |

> **핵심 원칙**: _함께 변경되는 것은 함께 둡니다._
> 테스트 코드는 운영 코드와 함께 변경되므로 **단위/통합 테스트는 반드시 co-location**입니다.
> E2E만 예외 — 여러 페이지/도메인을 횡단하므로 어느 한 폴더에 둘 수 없습니다.

---

## 폴더 구조 예시

폴더 아키텍처 마이그레이션 후 테스트 파일이 배치된 모습입니다.

```
src/
├── app/
│   ├── busking-map/
│   │   ├── _components/
│   │   │   ├── map-controls.tsx
│   │   │   ├── map-controls.test.tsx       ← 통합 테스트
│   │   │   └── map-controls.stories.tsx    ← Storybook
│   │   ├── page.tsx
│   │   └── page.test.tsx                   ← 페이지 통합 테스트 (선택)
│   └── performance-detail/
│       └── [performanceId]/
│           ├── _components/
│           │   ├── performance-info.tsx
│           │   └── performance-info.test.tsx
│           └── page.tsx
│
├── domains/
│   ├── performance/
│   │   ├── api/
│   │   │   ├── performance.api.ts
│   │   │   ├── performance.api.test.ts     ← 단위 테스트 (MSW 활용)
│   │   │   ├── performance.schema.ts
│   │   │   └── performance.schema.test.ts  ← Zod 스키마 단위 테스트
│   │   ├── components/
│   │   │   ├── performance-card.tsx
│   │   │   ├── performance-card.test.tsx
│   │   │   └── performance-card.stories.tsx
│   │   ├── hooks/
│   │   │   ├── use-performance-list.ts
│   │   │   └── use-performance-list.test.ts
│   │   ├── utils/
│   │   │   ├── format-duration.ts
│   │   │   └── format-duration.test.ts     ← 순수 함수 단위 테스트
│   │   └── __mocks__/                      ← 도메인 전용 fixture
│   │       └── performance.fixtures.ts
│   └── auth/
│       └── ...
│
├── shared/
│   ├── ui/
│   │   ├── button/
│   │   │   ├── button.tsx
│   │   │   ├── button.test.tsx
│   │   │   └── button.stories.tsx
│   │   └── ...
│   ├── lib/
│   │   ├── cn.ts
│   │   └── cn.test.ts
│   └── mocks/                              ← 도메인 무관 mock (MSW handlers 등)
│       ├── handlers.ts
│       └── server.ts
│
└── ...

e2e/                                        ← ⚠️ 최상위에 분리
├── busking-map.spec.ts
├── performance-flow.spec.ts                ← 등록 → 상세 → 수정 흐름
└── auth.spec.ts
```

---

## 왜 이렇게 나누나요?

### 1. 단위/통합 테스트는 **반드시 co-location**

```
❌ Bad — 분리된 테스트 트리
src/
├── domains/performance/api/performance.api.ts
└── tests/domains/performance/api/performance.api.test.ts

✅ Good — co-location
src/domains/performance/
├── api/
│   ├── performance.api.ts
│   └── performance.api.test.ts        # 바로 옆
```

**분리 트리의 단점**:

- 파일을 옮길 때 **두 곳을 모두 옮겨야** 합니다 (자주 누락됨).
- 테스트 존재 여부 확인하려면 **다른 폴더로 점프**해야 합니다.
- 도메인을 통째로 이동하는 마이그레이션 시 **번거로움 2배**.

폴더 아키텍처와 동일한 원칙입니다: **함께 변경되니 함께 둡니다.**

### 2. E2E만 예외인 이유

E2E는 본질적으로 **여러 페이지/도메인을 횡단**합니다.

```typescript
// e2e/performance-flow.spec.ts
test("공연 등록 → 상세 보기 → 수정", async ({ page }) => {
  await page.goto("/login"); // app/login
  await page.goto("/performance"); // app/performance
  await page.goto("/performance-detail/123"); // app/performance-detail
  // ...
});
```

이 시나리오를 어느 한 폴더 옆에 둘 수 없습니다. 또한 도구 레벨에서도 분리되어 있습니다.

| 항목      | Vitest             | Playwright                     |
| --------- | ------------------ | ------------------------------ |
| 설정 파일 | `vitest.config.ts` | `playwright.config.ts`         |
| 실행 명령 | `pnpm test`        | `pnpm playwright test`         |
| 실행 환경 | Node + jsdom       | 실제 브라우저                  |
| CI 단계   | 빠른 피드백 단계   | 별도 단계 (브라우저 설치 필요) |

→ 도구가 분리되어 있으니 폴더도 분리하는 게 자연스럽습니다.

### 3. Mock 데이터의 위치

폴더 구조 결정과 동일한 기준 — _어디서 쓰이는가?_

| 사용 범위                      | 위치                               |
| ------------------------------ | ---------------------------------- |
| 한 도메인 안에서만             | `domains/<domain>/__mocks__/`      |
| 여러 도메인에서 공유           | `shared/mocks/`                    |
| MSW handlers (글로벌 API mock) | `shared/mocks/handlers.ts`         |
| 한 컴포넌트 테스트에서만       | 테스트 파일 내부 (분리하지 마세요) |

> 현재 프로젝트의 `src/mocks/`는 마이그레이션 시 **`shared/mocks/`로 이동**하면 됩니다.

---

## 테스트 종류별 책임 매트릭스

**어떤 종류의 검증을 어떤 도구로 하는가?** 가장 자주 헷갈리는 부분이라 표로 명확히 정리합니다.

| 테스트 종류                | 도구                  | 어디에?                            | 무엇을 검증?                         |
| -------------------------- | --------------------- | ---------------------------------- | ------------------------------------ |
| **순수 함수 단위 테스트**  | Vitest                | `domains/.../utils/*.test.ts`      | `formatDuration`, `parseLocation` 등 |
| **Zod 스키마 단위 테스트** | Vitest                | `domains/.../api/*.schema.test.ts` | 잘못된 응답 거부 검증                |
| **API 함수 단위 테스트**   | Vitest + MSW          | `domains/.../api/*.api.test.ts`    | fetch 모킹 후 호출 검증              |
| **훅 단위 테스트**         | Vitest + RTL          | `domains/.../hooks/*.test.ts`      | `renderHook`으로 훅 동작 검증        |
| **컴포넌트 통합 테스트**   | Vitest + RTL          | 컴포넌트 옆 `*.test.tsx`           | 사용자 인터랙션 + 렌더 결과          |
| **페이지 통합 테스트**     | Vitest + RTL          | `app/<route>/page.test.tsx` (선택) | 페이지 시나리오 (RSC는 제약 있음)    |
| **E2E 시나리오**           | Playwright            | `e2e/*.spec.ts`                    | 실제 브라우저, 실제 또는 mock API    |
| **시각적 회귀 테스트**     | Storybook + Chromatic | 컴포넌트 옆 `*.stories.tsx`        | UI 변경 감지                         |

---

## Testing Trophy 관점

CLAUDE.md에 명시된 **Testing Trophy(Integration > E2E > Unit)** 와 폴더 위치는 다음과 같이 매핑됩니다.

```
        🏆 Testing Trophy 비중
       ┌──────────────────────┐
       │   E2E (소수)          │  →  e2e/  (별도 폴더)
       │                       │
       │   Integration (다수)  │  →  컴포넌트 옆 (co-location)
       │                       │
       │   Unit (적당)         │  →  유틸/훅 옆 (co-location)
       │                       │
       │   Static (TS/ESLint)  │  →  타입 시스템에 위임
       └──────────────────────┘
```

### 권장 투자 비율

| 레이어          | 비율 | 이유                                         |
| --------------- | ---- | -------------------------------------------- |
| **Integration** | ~60% | 사용자 시나리오에 가장 가깝고, 변경에 강함   |
| **Unit**        | ~25% | 순수 함수, 스키마, 복잡한 훅에만 작성        |
| **E2E**         | ~10% | Critical Path만 (로그인, 공연 등록 등)       |
| **Static**      | ~5%  | TypeScript + ESLint가 자동으로 잡아주는 영역 |

> **왜 Unit이 적은가?** 컴포넌트의 내부 구현이 바뀌면 단위 테스트가 함께 깨집니다.
> 단위 테스트가 많을수록 **리팩토링 비용**이 증가합니다.
> 사용자 입장의 통합 테스트는 내부 구현과 독립적이므로 **변경에 더 강합니다.**

---

## 도구 설정 시 주의사항

### 1. Vitest — co-location 패턴 인식

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.{test,spec}.{ts,tsx}"], // ✅ co-location 지원
    exclude: ["node_modules", "e2e", "dist"], // ✅ E2E 폴더 제외
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
  },
});
```

### 2. Playwright — Vitest와 영역 분리

```typescript
// playwright.config.ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e", // ✅ Vitest와 분리
  testMatch: "**/*.spec.ts",
  // ...
});
```

이렇게 하면 두 러너가 서로의 영역을 침범하지 않습니다.

### 3. Storybook — 컴포넌트 패턴 동일

```typescript
// .storybook/main.ts
const config: StorybookConfig = {
  stories: [
    "src/**/*.stories.@(ts|tsx|mdx)", // ✅ co-location 지원
  ],
  // ...
};
```

---

## 실전 예시

### 예시 1 — 순수 함수 단위 테스트

```typescript
// domains/performance/utils/format-duration.ts
// domains/performance/utils/format-duration.test.ts
import { describe, expect, it } from "vitest";
import { formatDuration } from "./format-duration";

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}시간 ${m}분` : `${m}분`;
}

describe("formatDuration", () => {
  it("1시간 미만은 분 단위로 표시", () => {
    expect(formatDuration(30)).toBe("30분");
  });

  it("1시간 이상은 시간과 분으로 표시", () => {
    expect(formatDuration(90)).toBe("1시간 30분");
  });
});
```

### 예시 2 — Zod 스키마 단위 테스트

```typescript
// domains/performance/api/performance.schema.test.ts
import { describe, expect, it } from "vitest";
import { performanceSchema } from "./performance.schema";

describe("performanceSchema", () => {
  it("필수 필드가 누락되면 거부", () => {
    const invalid = { id: "1" }; // title 누락
    expect(() => performanceSchema.parse(invalid)).toThrow();
  });

  it("잘못된 날짜 형식이면 거부", () => {
    const invalid = { id: "1", title: "공연", startDate: "not-a-date" };
    expect(() => performanceSchema.parse(invalid)).toThrow();
  });
});
```

### 예시 3 — 컴포넌트 통합 테스트

```tsx
// domains/performance/components/performance-card.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PerformanceCard } from "./performance-card";

describe("PerformanceCard", () => {
  it("공연 정보를 표시하고 클릭 시 onSelect 호출", async () => {
    const onSelect = vi.fn();
    render(<PerformanceCard performance={fixture} onSelect={onSelect} />);

    expect(screen.getByText(fixture.title)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button"));
    expect(onSelect).toHaveBeenCalledWith(fixture.id);
  });
});
```

### 예시 4 — E2E 시나리오

```typescript
// e2e/performance-flow.spec.ts
import { expect, test } from "@playwright/test";

test("로그인한 사용자가 공연을 등록할 수 있다", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "카카오로 로그인" }).click();
  // ... OAuth flow

  await page.goto("/performance");
  await page.getByLabel("공연 제목").fill("Spring Concert");
  await page.getByRole("button", { name: "등록" }).click();

  await expect(page).toHaveURL(/\/performance-detail\/\d+/);
  await expect(page.getByText("Spring Concert")).toBeVisible();
});
```

---

## 자주 묻는 질문

### Q1. 모든 함수에 단위 테스트를 작성해야 하나요?

→ **아니요.** Testing Trophy에 따라 **로직이 복잡한 순수 함수, Zod 스키마, 커스텀 훅**에 집중하세요. 한 줄짜리 wrapper 함수나 단순 prop drilling 컴포넌트에는 단위 테스트가 오히려 비용입니다.

### Q2. Server Component(RSC)는 어떻게 테스트하나요?

→ **현재 RTL은 RSC를 제한적으로만 지원합니다.** 권장 전략:

- **데이터 페칭 로직**은 `domains/.../api/`로 분리하여 단위 테스트
- **렌더링 로직**은 Client Component로 분리하여 통합 테스트
- **End-to-End 검증**은 Playwright로

### Q3. MSW를 어디에 설정하나요?

→ `shared/mocks/`에 두고, `vitest.setup.ts`와 `playwright.config.ts`에서 각각 활성화합니다.

```tsx
// shared/mocks/handlers.ts
import { http, HttpResponse } from "msw";

export const handlers = [http.get("/api/performances", () => HttpResponse.json([]))];
```

```tsx
// shared/mocks/server.ts
import { setupServer } from "msw/node";
import { handlers } from "./handlers";

export const server = setupServer(...handlers);
```

```tsx
// vitest.setup.ts
import { server } from "./src/shared/mocks/server";

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### Q4. 테스트 파일에 fixture(목 데이터)를 인라인으로 두는 게 좋나요, 분리하는 게 좋나요?

→ **재사용 빈도**로 판단합니다.

| 상황                               | 위치                                  |
| ---------------------------------- | ------------------------------------- |
| 한 테스트 파일에서만 사용          | 인라인 (그 파일 내부)                 |
| 같은 도메인의 여러 테스트에서 사용 | `domains/.../__mocks__/*.fixtures.ts` |
| 여러 도메인에서 공유               | `shared/mocks/fixtures/`              |

### Q5. `*.stories.tsx`도 테스트인가요?

→ **간접적인 시각적 테스트**입니다.

- **수동 검증**: Storybook UI에서 디자이너/개발자가 시각적으로 확인
- **자동 검증**: Chromatic 같은 도구로 시각적 회귀 테스트 자동화
- **CSF 3.0 play 함수**: 인터랙션 테스트도 가능 (Vitest 통합 테스트와 중복되지 않게 주의)

`components/common/`의 모든 컴포넌트는 [폴더 아키텍처 가이드](./folder-architecture-guide.md)와 CLAUDE.md에 따라 **반드시 `*.stories.tsx`를 작성**합니다.

---

## 참고 자료

- [Testing Trophy — Kent C. Dodds](https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications)
- [Vitest — Official Documentation](https://vitest.dev/)
- [Testing Library — Guiding Principles](https://testing-library.com/docs/guiding-principles)
- [Playwright — Best Practices](https://playwright.dev/docs/best-practices)
- [MSW — Mock Service Worker](https://mswjs.io/)
- [Storybook — Component Story Format 3.0](https://storybook.js.org/docs/api/csf)
