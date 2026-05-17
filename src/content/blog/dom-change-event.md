---
title: "같은 이름, 다른 이벤트 — DOM 'change' 이벤트의 진실"
description: "'change'는 하나의 이벤트가 아닙니다. 어떤 객체에 리스너를 붙이느냐에 따라 완전히 다른 의미를 가지며, TypeScript 타입 시스템이 이를 정확히 구분합니다."
pubDate: 2026-05-17T00:00:00+09:00
slug: "2026/05/17/dom-change-event"
tags: ["DOM", "TypeScript", "Browser API", "Event"]
draft: true
---

## 배경: 오해가 생기는 이유

`addEventListener('change', handler)` 를 처음 배울 때는 보통 `<input>` 이나 `<select>` 같은 폼 요소에서 접합니다. 그래서 `'change'` 이벤트를 "사용자가 값을 입력하거나 선택했을 때 발생하는 것"으로 기억하기 쉽습니다.

그런데 `useMediaQuery` 훅 코드를 보면 이런 코드가 등장합니다.

```ts
const media = window.matchMedia(query);
media.addEventListener("change", listener);
```

`media`는 폼 요소가 아닌 `MediaQueryList` 객체입니다. 여기서 `'change'`는 타이핑이나 선택과 전혀 무관합니다.

---

## 이벤트 이름은 같아도, 주체가 다르면 의미가 다릅니다

DOM 이벤트 시스템에서 이벤트 이름은 단순한 **문자열 식별자**입니다. `addEventListener`는 호출된 객체를 기준으로 이벤트를 구독하기 때문에, 같은 이름이라도 주체에 따라 완전히 다른 상황에서 발생합니다.

| 발생 주체                                         | `'change'` 이벤트의 의미              | 이벤트 객체 타입      |
| ------------------------------------------------- | ------------------------------------- | --------------------- |
| `<input type="text">`, `<textarea>`               | 값이 변경되고 포커스를 잃을 때        | `Event`               |
| `<input type="checkbox">`, `<input type="radio">` | 선택 상태가 바뀔 때                   | `Event`               |
| `<select>`                                        | 선택된 옵션이 바뀔 때                 | `Event`               |
| `MediaQueryList`                                  | 미디어 쿼리 결과(`matches`)가 바뀔 때 | `MediaQueryListEvent` |

`MediaQueryList`의 `'change'`는 **뷰포트 크기가 변해 미디어 쿼리 조건의 참/거짓이 전환될 때** 발생합니다. 사용자 입력과는 완전히 무관합니다.

---

## TypeScript가 차이를 증명하는 방법

TypeScript의 타입 시스템은 이 차이를 이벤트 핸들러의 **파라미터 타입**으로 명확히 구분합니다.

### input 요소의 change 이벤트

```ts
const input = document.querySelector("input");

input.addEventListener("change", (event: Event) => {
  const target = event.target as HTMLInputElement;
  console.log(target.value); // 사용자가 입력한 값
});
```

이벤트 객체는 일반 `Event` 타입입니다. `event.matches` 같은 프로퍼티는 존재하지 않습니다.

### MediaQueryList의 change 이벤트

```ts
// src/hooks/use-media-query.ts
const media = window.matchMedia(query);
//    ^^^^^ 타입: MediaQueryList

const listener = (event: MediaQueryListEvent) => {
  //                        ^^^^^^^^^^^^^^^^^^
  //                        input의 change라면 Event 타입이어야 합니다
  setMatches(event.matches);
  //                  ^^^^^^^ MediaQueryListEvent에만 존재하는 프로퍼티
};

media.addEventListener("change", listener);
```

이벤트 객체는 `MediaQueryListEvent` 타입이며, `matches` 프로퍼티를 통해 현재 미디어 쿼리 결과를 직접 읽을 수 있습니다.

### 타입을 혼용하면 컴파일 에러가 납니다

```ts
const media = window.matchMedia("(max-width: 768px)");

// ❌ 잘못된 타입 — TypeScript가 오류를 발생시킵니다
media.addEventListener("change", (event: Event) => {
  console.log(event.matches); // Property 'matches' does not exist on type 'Event'
});

// ✅ 올바른 타입
media.addEventListener("change", (event: MediaQueryListEvent) => {
  console.log(event.matches); // boolean
});
```

TypeScript가 `MediaQueryList.addEventListener`의 시그니처를 알고 있기 때문에, 잘못된 이벤트 타입을 사용하면 즉시 컴파일 에러로 알려줍니다. 런타임이 아닌 **개발 단계에서** 오류를 잡아주는 것입니다.

---

## MediaQueryListEvent의 주요 프로퍼티

```ts
interface MediaQueryListEvent extends Event {
  readonly matches: boolean; // 현재 미디어 쿼리 결과 (true/false)
  readonly media: string; // 미디어 쿼리 문자열 (예: "(max-width: 768px)")
}
```

`useMediaQuery` 훅에서 `event.matches`를 직접 읽어 상태를 업데이트하는 이유가 여기에 있습니다. `window.matchMedia(query).matches`를 다시 호출하지 않아도 이벤트 객체 자체에 최신 결과가 담겨 있습니다.

---

## 실제 발생 시나리오

```ts
const isMobile = useMediaQuery("(max-width: 768px)");
```

위 훅을 사용하는 컴포넌트에서 `'change'` 이벤트는 다음 상황에서 발생합니다.

1. 브라우저 창을 **769px → 768px 이하**로 좁혔을 때 (`matches: false → true`)
2. 브라우저 창을 **768px 이하 → 769px 이상**으로 넓혔을 때 (`matches: true → false`)
3. 기기의 화면 방향이 바뀌었을 때 (세로 ↔ 가로)

조건의 경계를 **넘는 순간**에만 발생하므로, 경계 내에서 창 크기를 조절해도 이벤트는 발생하지 않습니다.

> **📌 참고** 이것이 매 픽셀마다 이벤트를 발생시키는 `window.addEventListener('resize', ...)` 와의 결정적 차이입니다. `MediaQueryList`의 `'change'`는 **조건 전환 시에만** 발생하므로 불필요한 리렌더링을 방지합니다.

---

## 정리

- `'change'`는 발생 주체에 따라 **완전히 다른 이벤트**입니다.
- `MediaQueryList`의 `'change'`는 폼 입력과 무관하며, **미디어 쿼리 결과가 바뀔 때** 발생합니다.
- TypeScript는 이벤트 핸들러의 파라미터 타입(`MediaQueryListEvent`)으로 이 차이를 명시하며, 타입이 맞지 않으면 컴파일 에러를 발생시킵니다.
- `event.matches`를 직접 읽으면 추가적인 DOM 접근 없이 최신 결과를 얻을 수 있습니다.

---

**참고 자료**

- [MDN - HTMLElement: change event](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/change_event)
- [MDN - MediaQueryList](https://developer.mozilla.org/en-US/docs/Web/API/MediaQueryList)
- [MDN - MediaQueryListEvent](https://developer.mozilla.org/en-US/docs/Web/API/MediaQueryListEvent)
- [MDN - Window: matchMedia() method](https://developer.mozilla.org/en-US/docs/Web/API/Window/matchMedia)
