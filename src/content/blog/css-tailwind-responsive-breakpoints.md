---
title: "Tailwind CSS v4 반응형 Breakpoint 완전 가이드"
description: "Tailwind CSS v4에서 @theme 블록으로 breakpoint를 커스터마이징하는 방법과, Mobile-First 전략·CSS 미디어 쿼리·useBreakpoint 훅까지 반응형 구현의 전체 흐름을 정리합니다."
pubDate: 2026-04-19T00:00:00+09:00
slug: "2026/04/19/css-tailwind-responsive-breakpoints"
tags: ["CSS", "Tailwind", "Responsive"]
---

## 1. 들어가며

Tailwind CSS로 반응형 UI를 만들 때 가장 먼저 마주치는 질문은 "breakpoint를 어디서, 어떻게 설정하나?"입니다. Tailwind v3까지는 `tailwind.config.js`에서 설정했지만, v4부터는 방식이 완전히 바뀌었습니다.

이 글에서는 Tailwind v4의 breakpoint 설정 방식, Mobile-First 전략의 원리, 그리고 CSS와 JavaScript에서 breakpoint를 다루는 실용적인 패턴을 정리합니다.

---

## 2. Tailwind v4에서 Breakpoint 커스터마이징

### `tailwind.config.js`가 없는 이유

Tailwind CSS v4는 `tailwind.config.js` 방식을 버리고, **CSS 파일 안의 `@theme` 블록**으로 모든 토큰을 설정합니다.

```
Tailwind v3 방식 → tailwind.config.js의 theme.extend.screens
Tailwind v4 방식 → globals.css의 @theme 블록의 --breakpoint-* 변수
```

### Tailwind v4 기본 Breakpoint

| 이름 | 기본값 |
| ---- | ------ |
| sm   | 640px  |
| md   | 768px  |
| lg   | 1024px |
| xl   | 1280px |
| 2xl  | 1536px |

### 커스텀 Breakpoint 설정

`globals.css`의 `@theme` 블록에 `--breakpoint-*` CSS 변수를 추가합니다.

```css
/* globals.css */
@theme inline {
  /* ... 기존 토큰들 ... */

  /* 반응형 Breakpoint 커스터마이징 */
  --breakpoint-sm: 576px;
  --breakpoint-md: 768px;
  --breakpoint-lg: 1024px;
  --breakpoint-xl: 1200px;
}
```

> **📌 참고:** `@theme inline`과 `@theme` 블록 모두 동작하지만, 프로젝트에서 이미 사용 중인 블록에 추가하는 것이 일관성상 좋습니다.

---

## 3. Mobile-First 전략

Tailwind는 **모바일 퍼스트(Mobile-First)** 방식으로 동작합니다.

```
접두사 없음 → 모든 화면 (모바일부터 적용)
sm:          → sm 이상
md:          → md 이상
lg:          → lg 이상
xl:          → xl 이상
```

### 올바른 방향

```tsx
// ❌ 잘못된 접근: 데스크탑 기준으로 시작하고 모바일을 예외 처리
<div className="flex-row sm:flex-col" />

// ✅ 올바른 접근: 모바일 기준으로 시작하고 점차 확장
<div className="flex-col sm:flex-row" />
```

### 왜 모바일 퍼스트인가?

Tailwind의 `sm:` 접두사는 `min-width: 576px` 미디어 쿼리를 생성합니다. 즉, `sm` **이상**일 때 적용됩니다. 아무 접두사도 없는 클래스는 **모든 크기에서** 적용되므로, 기본값을 모바일로 작성하고 큰 화면에서 override하는 흐름이 자연스럽습니다.

---

## 4. 실제 사용 예시

### 4-1. 레이아웃 (그리드/플렉스)

```tsx
// 모바일: 1열 → 태블릿: 2열 → 데스크탑: 3열
<div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
  <Card />
  <Card />
  <Card />
</div>
```

### 4-2. 텍스트 크기

```tsx
// 모바일: 작은 텍스트, 데스크탑: 큰 텍스트
<h1 className="text-xl lg:text-2xl xl:text-3xl">페이지 제목</h1>
```

### 4-3. 표시/숨김

```tsx
// 모바일에서는 숨기고, 태블릿 이상에서 표시
<aside className="hidden md:block">사이드바</aside>

// 모바일에서만 표시되는 햄버거 메뉴
<button className="block md:hidden">메뉴</button>
```

### 4-4. 간격 (padding / margin)

```tsx
// 모바일: 작은 패딩, 데스크탑: 큰 패딩
<section className="px-5 md:px-10 xl:px-20">콘텐츠</section>
```

### 4-5. 컴포넌트 너비

```tsx
// 모바일: 전체 너비, 태블릿 이상: 자동 너비
<Button className="w-full md:w-auto">확인</Button>
```

---

## 5. 컴포넌트 라이브러리에서의 반응형

shadcn/ui 등 컴포넌트 라이브러리는 내부적으로 Tailwind 클래스를 사용합니다. `@theme`에 breakpoint를 등록하면 컴포넌트에 **추가 `className`을 prop으로 전달**하거나, 컴포넌트를 **감싸는 Wrapper**에서 반응형을 적용합니다.

### Dialog (모달) — 모바일에서 전체 너비

```tsx
<DialogContent className="w-full md:max-w-lg xl:max-w-2xl">
  <DialogHeader>
    <DialogTitle>상세 정보</DialogTitle>
  </DialogHeader>
</DialogContent>
```

### Sheet — 모바일 Bottom Sheet / 데스크탑 Side Sheet

```tsx
<Sheet>
  <SheetContent side="bottom" className="h-[80vh] md:h-full md:w-[400px]">
    필터 옵션
  </SheetContent>
</Sheet>
```

> **⚠️ 주의:** `side` prop은 동적으로 변경할 수 없습니다. 모바일/데스크탑에서 완전히 다른 방향이 필요하다면 breakpoint 값을 JS로 감지해 조건부 렌더링을 사용합니다.

### CVA와 조합

`cva` 패턴을 활용하면 반응형 variant를 명확하게 관리할 수 있습니다.

```tsx
const cardVariants = cva("rounded-lg border bg-card", {
  variants: {
    layout: {
      vertical: "flex flex-col",
      horizontal: "flex flex-col md:flex-row",
    },
  },
  defaultVariants: { layout: "vertical" },
});
```

---

## 6. CSS에서 직접 미디어 쿼리 사용

Tailwind 유틸리티 클래스로 해결하기 어려운 경우, CSS 파일에서 직접 미디어 쿼리를 작성합니다.

```css
.product-grid {
  display: grid;
  grid-template-columns: 1fr;
}

@media (min-width: 768px) {
  .product-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1200px) {
  .product-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

---

## 7. JavaScript/TypeScript에서 Breakpoint 활용

### 상수 정의

```ts
// constants/breakpoints.ts
export const BREAKPOINTS = {
  sm: 576,
  md: 768,
  lg: 1024,
  xl: 1200,
} as const;

export type BreakpointKey = keyof typeof BREAKPOINTS;
```

### `useBreakpoint` 훅

```ts
// hooks/use-breakpoint.ts
"use client";

import { useEffect, useState } from "react";
import { BREAKPOINTS, BreakpointKey } from "@/constants/breakpoints";

export function useBreakpoint(key: BreakpointKey) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(`(min-width: ${BREAKPOINTS[key]}px)`);
    setMatches(query.matches);

    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    query.addEventListener("change", handler);
    return () => query.removeEventListener("change", handler);
  }, [key]);

  return matches;
}
```

**사용 예시:**

```tsx
function FilterPanel() {
  const isMd = useBreakpoint("md");

  // 모바일: 하단 Sheet, 태블릿+: 사이드바
  if (isMd) {
    return <FilterSidebar />;
  }
  return <FilterBottomSheet />;
}
```

> **⚠️ 주의:** `useBreakpoint`는 `'use client'` 컴포넌트에서만 사용 가능합니다. SSR 환경에서는 초기값이 항상 `false`이므로 레이아웃 shift가 발생할 수 있습니다. 가능하면 CSS만으로 반응형을 구현하는 것을 우선합니다.

---

## 8. 적용 우선순위

```
1순위: Tailwind 반응형 접두사 (sm:, md:, lg:, xl:)
       → 대부분의 반응형은 이것으로 해결

2순위: CSS 파일의 @media 쿼리
       → 복잡한 레이아웃 변환, 의사 요소, Tailwind로 표현 불가한 경우

3순위: useBreakpoint 훅 (JS 기반 감지)
       → 렌더링할 컴포넌트 자체가 달라져야 하는 경우에만 사용
```

---

## 참고 자료

- [Tailwind CSS v4 — Responsive Design](https://tailwindcss.com/docs/responsive-design)
- [Tailwind CSS v4 — Theme variables](https://tailwindcss.com/docs/theme)
- [MDN — Using media queries](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_media_queries/Using_media_queries)
