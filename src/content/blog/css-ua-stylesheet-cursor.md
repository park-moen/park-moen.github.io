---
title: "CSS User-Agent Stylesheet와 cursor 상속이 끊기는 이유"
description: "부모에 cursor-pointer를 줬는데 자식 button이나 SVG에서 적용이 안 되는 이유를 User-Agent Stylesheet와 CSS 캐스케이드·상속 우선순위로 설명합니다."
pubDate: 2026-03-12T00:00:00+09:00
slug: "2026/03/12/css-ua-stylesheet-cursor"
tags: ["CSS", "cursor-pointer"]
---

## 1. 문제 상황

> "왜 부모에 `cursor-pointer`를 줬는데 자식 SVG에선 적용이 안 될까?"

아래와 같은 Chip 컴포넌트가 있습니다.

```tsx
<span className="cursor-pointer ...">
  <span>{children}</span>
  <button type="button" className="flex items-center ...">
    <XIcon className="size-4" /> {/* SVG 아이콘 */}
  </button>
</span>
```

**현상**: `<span>` 위에서는 `cursor: pointer`가 잘 보이는데, `<XIcon />` (SVG) 위로 마우스를 올리면 커서가 기본 화살표로 돌아옵니다.

```
마우스 위치          cursor 결과
──────────────────────────────────
span 텍스트 위       👆 pointer   ✅
button / SVG 위      🖱️ default   ❌
```

`cursor`는 **상속 가능한 속성**인데 왜 이런 일이 생길까요?

---

## 2. CSS User-Agent Stylesheet란?

**User-Agent Stylesheet(UA 스타일시트)** 는 브라우저가 모든 웹 페이지에 자동으로 적용하는 **기본 스타일**입니다.

```
CSS를 전혀 작성하지 않아도,
<h1>은 크게, <strong>은 굵게, <a>는 파랗고 밑줄이 보이는 이유가
바로 UA 스타일 때문입니다.
```

### 브라우저별 UA 스타일

각 브라우저는 자체적인 UA 스타일을 가집니다.

- **Chrome / Edge**: [Chromium UA Stylesheet](https://chromium.googlesource.com/chromium/src/+/HEAD/third_party/blink/renderer/core/html/resources/html.css)
- **Firefox**: [Firefox UA Stylesheet](https://searchfox.org/mozilla-central/source/layout/style/res/html.css)
- **Safari**: [WebKit UA Stylesheet](https://trac.webkit.org/browser/trunk/Source/WebCore/css/html.css)

### 주요 UA 스타일 예시

```css
h1 {
  font-size: 2em;
  font-weight: bold;
}
a {
  color: -webkit-link;
  text-decoration: underline;
}

button {
  cursor: default; /* ← 핵심! */
  appearance: auto;
  background-color: buttonface;
}

ul,
ol {
  padding-inline-start: 40px;
}
```

### Tailwind CSS Preflight

Tailwind는 **Preflight**라는 CSS 리셋을 내장해 UA 스타일의 상당 부분을 초기화합니다.

```css
/* Tailwind Preflight 일부 */
button,
input,
optgroup,
select,
textarea {
  font-family: inherit;
  font-size: 100%;
  color: inherit;
  margin: 0;
  padding: 0;
}
```

하지만 Preflight가 **모든** UA 스타일을 제거하지는 않습니다. `button`의 `cursor: default`는 일부 브라우저에서 여전히 남아있습니다.

---

## 3. CSS 캐스케이드와 상속의 우선순위

### 캐스케이드(Cascade) 우선순위

CSS가 최종 값을 결정하는 순서입니다 (높을수록 우선).

```
1. 브라우저 !important
2. 사용자 !important
3. 작성자(개발자) !important
──── 일반적으로는 여기까지 신경 안 써도 됨 ────
4. CSS 애니메이션
5. 작성자 일반 스타일       ← Tailwind, 우리가 짜는 CSS
6. 사용자 일반 스타일
7. UA 일반 스타일           ← 브라우저 기본 스타일
8. CSS 트랜지션
```

**작성자 스타일이 UA 스타일보다 항상 우선합니다.**

### 상속(Inheritance)의 위치

상속은 캐스케이드와 **별개의 메커니즘**입니다.

```
어떤 요소의 최종 cursor 값 결정 순서:

① 내 자신에게 명시적으로 지정된 값이 있는가?
  → 있으면: 그 값 사용 (캐스케이드 적용)
  → 없으면: ②로 이동

② cursor는 상속 가능한 속성인가?
  → 맞으면: 부모의 computed value 상속
  → 아니면: 초기값(initial value) 사용
```

**핵심: 상속된 값은 UA 스타일보다도 우선순위가 낮습니다.**

```
명시적 값 (작성자 스타일 > UA 스타일)
    >
상속된 값
    >
초기값 (initial value)
```

---

## 4. 왜 button에서 상속이 끊기는가?

위 규칙을 적용하면 `cursor` 흐름이 이렇게 됩니다.

```
<span className="cursor-pointer">
│  ① 나에게 명시적 값? → 있음 (cursor: pointer)
│  ✅ cursor: pointer
│
├─ <span>{children}</span>
│    ① 나에게 명시적 값? → 없음
│    ② 상속 가능? → 맞음 → 부모(span)에서 상속
│    ✅ cursor: pointer (상속)
│
└─ <button>
     ① 나에게 명시적 값? → 있음! (UA: button { cursor: default })
     ✅ cursor: default  ← UA 스타일이 상속을 차단
     │
     └─ <svg> (XIcon)
          ① 나에게 명시적 값? → 없음
          ② 상속 가능? → 맞음 → 부모(button)에서 상속
          ❌ cursor: default (button의 UA 스타일에서 상속)
```

`<button>`에 UA 스타일이 `cursor: default`를 **명시적으로** 지정하기 때문에, `<span>`의 `cursor: pointer` 상속이 중단됩니다.

### 시각적 요약

```
span [cursor: pointer ← 작성자 스타일]
  │
  ├── span [cursor: pointer ← 상속] ✅
  │
  └── button [cursor: default ← UA 스타일이 상속 차단] ❌
        │
        └── svg [cursor: default ← button에서 상속] ❌
```

---

## 5. 해결 방법

### 방법 1: button에 `cursor-pointer` 직접 지정 (권장)

```tsx
<button type="button" className="flex items-center cursor-pointer">
  <XIcon />
</button>
```

작성자 스타일이 UA 스타일보다 우선하므로, `cursor-pointer`를 `button`에 직접 지정하면 해결됩니다.

```
button [cursor: pointer ← 작성자 스타일이 UA 스타일 덮어씀] ✅
  └── svg [cursor: pointer ← button에서 상속] ✅
```

### 방법 2: 전역 CSS 리셋

프로젝트 전역에서 `button`의 `cursor`를 리셋합니다.

```css
/* Tailwind @layer base */
@layer base {
  button {
    @apply cursor-pointer;
  }
}
```

> **⚠️ 주의:** 이 방법은 프로젝트 전체 버튼에 영향을 주므로, disabled 상태 버튼 등에도 적용될 수 있습니다.

### 방법 3: `pointer-events: none` 우회

```tsx
{
  /* SVG에 pointer-events: none을 주면 마우스 이벤트가 button으로 전달됨 */
}
<XIcon className="pointer-events-none" />;
```

cursor 문제를 직접 해결하지는 않지만, SVG 위에서도 `button`의 cursor 값이 적용되도록 우회합니다. SVG 자체에 이벤트 핸들러가 붙어있다면 사용할 수 없습니다.

---

## 6. 자주 겪는 UA 스타일 이슈 모음

`button`의 `cursor` 외에도 UA 스타일 때문에 자주 당황하는 상황들입니다.

### input placeholder 색상

```css
/* UA 스타일이 placeholder 색을 반투명하게 지정 */
input::placeholder {
  opacity: 0.54;
}

/* 해결: 명시적으로 지정 */
.input::placeholder {
  color: #9e9e9e;
  opacity: 1;
}
```

### `<a>` 태그 색상이 부모를 무시할 때

```css
/* UA 스타일: a { color: -webkit-link; } */
/* 부모에 color를 지정해도 a는 파란색으로 보임 */

/* 해결 */
a {
  color: inherit;
}
/* 또는 Tailwind: className="text-inherit" */
```

### 모바일에서 button/input 탭 시 파란 하이라이트

```css
/* 해결 */
button,
input {
  -webkit-tap-highlight-color: transparent;
}
```

### `<details>/<summary>` 기본 삼각형 아이콘

```css
/* 해결 */
summary {
  list-style: none;
}
summary::-webkit-details-marker {
  display: none;
}
```

### `<select>` 요소 기본 화살표

```css
/* 해결: 커스텀 화살표 사용 */
select {
  appearance: none;
}
```

---

## 7. 핵심 정리

### UA 스타일이란

- 브라우저가 기본으로 제공하는 CSS
- 개발자가 따로 작성하지 않아도 `<h1>`이 크고, `<button>`에 테두리가 있는 이유
- 브라우저마다 조금씩 다름 → CSS 리셋/Normalize가 필요한 이유

### 상속과 캐스케이드의 관계

```
명시적 값 (작성자 스타일 > UA 스타일)
    >
상속된 값
    >
초기값 (initial value)
```

상속된 값은 UA 스타일보다도 우선순위가 낮습니다. `<button>`에 UA 스타일이 있으면, 부모의 `cursor: pointer`가 상속되지 않습니다.

### cursor 문제 해결 원칙

```
cursor-pointer가 적용되길 원하는 요소에
직접 cursor-pointer 클래스를 붙이는 것이 가장 명확합니다.
```

---

## 참고 자료

- [MDN — Cascade, specificity, and inheritance](https://developer.mozilla.org/en-US/docs/Learn/CSS/Building_blocks/Cascade_and_inheritance)
- [MDN — cursor 속성](https://developer.mozilla.org/en-US/docs/Web/CSS/cursor)
- [Chromium UA Stylesheet 소스코드](https://chromium.googlesource.com/chromium/src/+/HEAD/third_party/blink/renderer/core/html/resources/html.css)
- [Tailwind Preflight](https://tailwindcss.com/docs/preflight)
