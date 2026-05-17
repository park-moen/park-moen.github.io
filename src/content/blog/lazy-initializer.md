---
title: "React useState Lazy Initializer 패턴"
description: "useState에 초기값 대신 함수를 전달하는 Lazy Initializer 패턴의 동작 원리와 성능 이점을 실제 useMediaQuery 훅 코드를 통해 설명합니다."
pubDate: 2026-05-17T00:00:00+09:00
slug: "2026/05/17/lazy-initializer"
tags: ["React", "TypeScript", "Performance", "Hooks"]
draft: true
---

## 배경: 왜 이 패턴이 필요한가

React 컴포넌트는 리렌더링될 때마다 함수 본문 전체를 다시 실행합니다. `useState`의 초기값도 예외가 아닙니다.

```tsx
// 매 렌더마다 window.matchMedia(query)가 실행됩니다
const [matches, setMatches] = useState(window.matchMedia(query).matches);
```

위 코드에서 `window.matchMedia(query).matches`는 **값**이므로, React는 이를 매 렌더링마다 평가합니다. 단, 실제 `matches` 상태를 업데이트하는 데는 **첫 번째 렌더의 결과만** 사용합니다. 즉, 두 번째 렌더부터의 연산은 결과를 버리는 낭비가 됩니다.

---

## Lazy Initializer란

`useState`에 **함수 자체**를 초기값으로 전달하면, React는 해당 함수를 **마운트 시 딱 한 번만** 호출합니다.

```tsx
// 함수 참조를 전달 — React가 첫 렌더 때 한 번만 호출합니다
const [matches, setMatches] = useState(getInitialValue);
```

이를 **Lazy Initializer** (지연 초기화)라고 부릅니다. 함수 호출을 React가 필요한 시점까지 미룬다는 의미입니다.

### 핵심 차이 비교

| 방식             | 표현식           | 실행 시점                |
| ---------------- | ---------------- | ------------------------ |
| 즉시 평가        | `useState(fn())` | 매 렌더마다 실행         |
| Lazy Initializer | `useState(fn)`   | 마운트 시 **1회**만 실행 |

괄호 하나의 차이가 성능에 직결됩니다.

---

## 실제 코드: useMediaQuery 훅

아래는 `useMediaQuery` 훅에서 Lazy Initializer를 적용한 실제 코드입니다.

```tsx
// src/hooks/use-media-query.ts
import { useEffect, useState } from "react";

type UseMediaQueryOptions = {
  initializeWithValue?: boolean;
};

export function useMediaQuery(query: string, { initializeWithValue = false }: UseMediaQueryOptions = {}): boolean {
  const getInitialValue = () => {
    if (initializeWithValue && typeof window !== "undefined") {
      return window.matchMedia(query).matches;
    }
    return false;
  };

  // 함수 참조(getInitialValue)를 전달 → Lazy Initializer
  const [matches, setMatches] = useState<boolean>(getInitialValue);

  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);

    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [query]);

  return matches;
}
```

### 코드 흐름 설명

1. **마운트 시**: `getInitialValue()` 가 한 번 호출되어 `matches` 초기값을 결정합니다.
2. **리렌더 시**: `getInitialValue` 함수 참조만 전달되고, 실행되지 않습니다.
3. **`useEffect` 실행 후**: 실제 `window.matchMedia` 결과로 상태가 업데이트됩니다.
4. **이후 변화**: `addEventListener('change', listener)` 로 미디어 쿼리 변화를 구독합니다.

---

## 성능 최적화 관점

### 1. 불필요한 연산 제거

`window.matchMedia(query)` 는 브라우저가 미디어 쿼리 문자열을 파싱하고 현재 뷰포트와 대조하는 **동기 연산**입니다. 비용이 크지는 않지만, 이 훅이 사용되는 컴포넌트가 잦은 리렌더링을 겪는다면 누적 비용이 발생합니다.

Lazy Initializer를 적용하면 이 연산을 마운트 1회로 제한합니다.

```
리렌더 100회 기준

즉시 평가:        window.matchMedia 호출 100회 (결과는 99회 버려짐)
Lazy Initializer: window.matchMedia 호출  1회 (마운트 시에만)
```

### 2. SSR 안전성 확보

Next.js와 같은 SSR 환경에서 `window`는 서버에 존재하지 않습니다. Lazy Initializer와 조건부 분기를 함께 사용하면 서버 렌더링 시 `window` 접근을 원천 차단할 수 있습니다.

```ts
const getInitialValue = () => {
  // initializeWithValue가 false이면 window 접근 자체를 건너뜁니다
  if (initializeWithValue && typeof window !== "undefined") {
    return window.matchMedia(query).matches;
  }
  return false;
};
```

`initializeWithValue` 기본값을 `false`로 설정한 이유가 바로 이것입니다. SSR에서 안전하게 `false`를 반환하고, 클라이언트 `useEffect`에서 실제 값으로 동기화합니다.

### 3. Hydration Mismatch 방지

`initializeWithValue: true` 를 사용하면 클라이언트 첫 렌더에서 즉시 실제 값을 가져옵니다. 그러나 서버와 클라이언트의 초기값이 달라져 **hydration mismatch** 경고가 발생할 수 있습니다.

| 옵션                                | 서버 초기값 | 클라이언트 초기값                | Hydration 안전 |
| ----------------------------------- | ----------- | -------------------------------- | -------------- |
| `initializeWithValue: false` (기본) | `false`     | `false` → `useEffect` 후 실제 값 | 안전           |
| `initializeWithValue: true`         | `false`     | 실제 `matchMedia` 결과           | 불일치 가능    |

모바일뷰 대응처럼 레이아웃에 영향을 주는 경우 기본값(`false`)을 유지하고 `useEffect` 이후 UI를 렌더링하는 것이 권장됩니다.

> **📌 참고** `initializeWithValue: true`는 서버 측 렌더링이 없는 순수 CSR 환경, 또는 hydration mismatch가 허용되는 비중요 UI 요소에만 사용하십시오.

---

## 정리

Lazy Initializer는 작은 문법 차이지만 다음 세 가지 문제를 동시에 해결합니다.

1. **성능**: 비용이 드는 초기값 연산을 마운트 1회로 제한합니다.
2. **SSR 안전성**: 서버 환경에서 `window` 접근을 방지합니다.
3. **Hydration 일관성**: 서버와 클라이언트의 초기값을 일치시킵니다.

`useState`에 함수를 넘기는 패턴은 **브라우저 API 접근처럼 비용이 있거나 SSR 안전성이 필요한 초기값**에 한해 적용할 때 가장 효과적입니다. 단순 원시값 초기화에는 오히려 불필요한 복잡도를 더합니다.

---

**참고 자료**

- [React 공식 문서 - Avoiding recreating the initial state](https://react.dev/reference/react/useState#avoiding-recreating-the-initial-state)
