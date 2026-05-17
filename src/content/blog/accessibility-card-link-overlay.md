---
title: "카드 전체를 링크로 만드는 법 — pseudo-content trick"
description: "카드 전체가 클릭 가능하면서 내부에 버튼이 공존해야 할 때, HTML 명세 위반 없이 구현하는 pseudo-content trick을 설명합니다. stretched link, block link로도 불리는 이 기법의 원리와 올바른 적용 방법을 다룹니다."
pubDate: 2026-05-08T00:00:00+09:00
slug: "2026/05/08/accessibility-card-link-overlay"
tags: ["Accessibility", "HTML", "CSS", "React"]
---

## 1. 문제 상황

카드 UI를 구현할 때 이런 요구사항이 자주 충돌합니다.

- 카드 영역 어디를 클릭해도 상세 페이지로 이동해야 함
- 카드 내부에 별도의 액션 버튼이 존재함 (더보기 메뉴, 좋아요, 북마크 등)
- 우클릭으로 새 탭 열기 / Cmd+클릭 같은 기본 링크 UX가 동작해야 함

이 문제를 해결하는 기법은 **pseudo-content trick**이라고 부릅니다([Inclusive Components, Heydon Pickering](https://inclusive-components.design/cards/)). Bootstrap에서는 **stretched link**, CSS-Tricks에서는 **block link**라고 부르기도 합니다. 표준 명세에 등록된 공식 패턴 이름은 아니지만, 실무에서 가장 널리 쓰이는 기법입니다.

직관적인 해결책처럼 보이는 "카드 전체를 `<Link>`로 감싸기"가 왜 잘못됐는지, 그리고 이 기법이 어떻게 문제를 해결하는지 살펴봅니다.

---

## 2. 안티패턴: 카드 전체를 `<Link>`로 감싸기

### 잘못된 코드

```tsx
<Link href="/detail/123">
  <article>
    <Image src="..." />
    <h3>공연 제목</h3>
    <button onClick={openMenu}>⋮</button> {/* ❌ */}
  </article>
</Link>
```

### 무엇이 문제인가

[HTML Living Standard §4.5.1](https://html.spec.whatwg.org/multipage/text-level-semantics.html#the-a-element)에 따르면 `<a>`는 **interactive content(`<a>`, `<button>`, `<input>` 등)를 후손으로 가질 수 없습니다.**

| 항목                                    | 영향                                                                                        |
| --------------------------------------- | ------------------------------------------------------------------------------------------- |
| **HTML 명세 위반**                      | `<a>` 안에 `<button>` → 브라우저별로 파싱 결과가 달라질 수 있음                             |
| **WCAG 4.1.1 (Parsing) 위반**           | invalid markup이 보조 기술 동작에 영향                                                      |
| **WCAG 1.3.1 (Info and Relationships)** | 스크린 리더 트리에서 두 인터랙티브 요소가 부모-자식으로 잡힘                                |
| **이벤트 처리 복잡도 폭증**             | 버튼 클릭 시 카드 navigation까지 트리거되어 `e.preventDefault() / e.stopPropagation()` 남발 |
| **React Hydration 경고**                | 일부 케이스에서 `validateDOMNesting` 경고                                                   |

### 흔한 우회 시도들 (모두 부적절)

| 시도                                                                         | 문제                                                    |
| ---------------------------------------------------------------------------- | ------------------------------------------------------- |
| `<button onClick={(e) => { e.preventDefault(); e.stopPropagation(); ... }}>` | 증상만 가림. HTML 명세 위반은 그대로.                   |
| 카드를 `<div onClick={() => router.push(...)}>` 로                           | 우클릭/Cmd+클릭/링크 미리보기 등 네이티브 `<a>` UX 손실 |
| `<a>` 안에 `<a>` 중첩                                                        | 더 명백한 명세 위반. 브라우저가 임의로 파싱 재구성.     |

---

## 3. 해결: Pseudo-element Link Overlay 패턴

### 핵심 원칙 두 가지

1. **`<a>`는 시맨틱하게 의미 있는 곳에만 둔다** — 보통 카드의 제목(`<h3>`) 안.
2. **시각적 클릭 영역은 CSS `::after` pseudo-element로 확장한다** — `::after`는 DOM 요소가 아니므로 nesting 위반이 발생하지 않는다.

### 패턴 적용

```tsx
<article className="relative">
  {/* 시각적 컨텐츠 - 정적, 클릭 안 받음 */}
  <Image src={thumbnail} alt={title} />

  <h3>
    {/* 진짜 <a> 는 여기 한 곳뿐 */}
    <Link href={`/detail/${id}`} className={`after:absolute after:inset-0 after:z-10 after:content-['']`}>
      {title}
    </Link>
  </h3>

  <p>날짜/장소 등 부가 정보</p>

  {/* z-20: ::after 위로 떠야 클릭이 트리거에 닿음 */}
  <div className="relative z-20">
    <button>⋮</button>
  </div>
</article>
```

---

## 4. 동작 원리

### DOM 트리 vs 시각적 렌더링

```
시각적으로 보이는 카드:
┌──────────────────────────────┐
│  ┌────┐  공연 제목   ⋮       │
│  │ 🖼 │  날짜/시간            │
│  │    │  📍 장소              │
│  └────┘                       │
└──────────────────────────────┘
   ::after 가 카드 전체 영역을 덮음

실제 HTML 트리:
<article>
├ <Image/>                  (정적, 클릭 안 받음)
├ <h3>
│   └ <a>"공연 제목"</a>    (진짜 링크 — ::after 가 여기서 확장)
├ <p>날짜/장소</p>           (정적)
└ <div z-20>
    └ <button>⋮</button>     (형제 관계, nesting 없음)
</article>
```

### `::after`가 안전한 이유

| 관점                 | `::after`             | `<a>` 안의 `<button>` |
| -------------------- | --------------------- | --------------------- |
| HTML 트리에 존재?    | ❌ (CSS only)         | ✅                    |
| Accessibility tree?  | ❌ (스크린 리더 무시) | ✅                    |
| HTML validator 위반? | ❌                    | ✅                    |
| 클릭 받을 수 있나?   | ✅                    | ✅                    |

`::after`는 CSS가 만들어내는 렌더링 트릭일 뿐, HTML 트리에는 존재하지 않습니다. 그래서 클릭 영역만 시각적으로 확장하면서 명세 위반은 피할 수 있습니다.

### Stacking Context

```
z-20:    버튼 wrapper       ← 가장 위, 트리거 클릭이 여기로
z-10:    ::after overlay    ← 카드 빈 영역 클릭이 여기로 → 상세 이동
z-auto:  썸네일/날짜/장소   ← 시각적 컨텐츠, 클릭 안 받음
```

`::after`의 z-index보다 액션 버튼의 z-index가 높아야 트리거 클릭이 정상 동작합니다.

### 스크린 리더가 보는 트리

```
article
├ link "공연 제목"        ← 제목만 링크로 인식
└ button "더보기"          ← 형제 버튼
```

두 인터랙티브 요소가 부모-자식이 아닌 **형제**로 인식되어 의미 구조가 명확해집니다.

---

## 5. 패턴 적용 후 달라지는 것들

이 패턴을 적용하면 외곽 `<a>` navigation을 방어하기 위한 코드가 자연스럽게 사라집니다.

```tsx
// Before — 외곽 <a> navigation 차단을 위한 방어 코드
<button
  onClick={(e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsMenuOpen((prev) => !prev);
  }}
>

// After — 그냥 버튼
<button onClick={() => setIsMenuOpen((prev) => !prev)}>
```

| 제거 가능                              | 이유                                                    |
| -------------------------------------- | ------------------------------------------------------- |
| `e.preventDefault()`                   | 외곽 `<a>`가 없음 → native navigation 자체가 발생 안 함 |
| `e.stopPropagation()`                  | 외곽 Link onClick이 없음 → bubble 차단 불필요           |
| `useState(isMenuOpen)` (Radix 사용 시) | Radix가 내부 상태 관리                                  |

---

## 6. 검증 체크리스트

브라우저에서 다음 동작을 직접 확인합니다.

| 동작                               | 기대 결과                                      |
| ---------------------------------- | ---------------------------------------------- |
| 카드 빈 영역 클릭                  | 상세 페이지 이동                               |
| 썸네일 클릭                        | 상세 페이지 이동                               |
| 제목 텍스트 클릭                   | 상세 페이지 이동                               |
| 액션 버튼 클릭                     | 액션 트리거 (드롭다운/모달 등). 상세 이동 X    |
| 우클릭 → 새 탭에서 열기            | 상세 페이지를 새 탭에서                        |
| Cmd/Ctrl + 클릭                    | 새 탭에서 열림                                 |
| 호버 시 브라우저 하단 URL 미리보기 | 상세 페이지 URL 표시                           |
| 키보드 Tab                         | 제목 링크 → 액션 버튼 순으로 자연스럽게        |
| 스크린 리더                        | "제목, 링크" + "더보기, 버튼" 으로 명확히 분리 |

---

## 7. 트레이드오프와 한계

### 텍스트 선택(드래그) 제한

`::after`가 카드 전체를 덮으면 카드 안 텍스트를 마우스로 드래그해서 복사할 수 없게 됩니다. 대부분의 카드 UI에서는 허용되는 트레이드오프지만 ([Inclusive Components 동일 결론](https://inclusive-components.design/cards/#theredundantclickevent)), 텍스트 복사가 중요한 경우 다음을 고려합니다.

```css
/* 호버 시 ::after 비활성화 → 드래그 허용 */
@media (hover: hover) {
  .card:hover .link-overlay::after {
    pointer-events: auto;
  }
}
```

또는 `::after` overlay를 포기하고 **제목/썸네일만 링크로 만드는 패턴**으로 전환합니다.

### `position: relative` 강제

- 외곽 `<article>`은 반드시 `relative` (또는 다른 positioned context)
- 액션 버튼 wrapper도 반드시 `relative` (`z-index` 적용 위해)

### 중첩된 stacking context 주의

카드 내부에 또 다른 `position: relative` + `z-index`가 있다면 stacking context가 의도와 다르게 형성될 수 있습니다. 적용 후 모든 인터랙티브 요소의 클릭 동작을 반드시 검증합니다.

---

## 8. 패턴이 적용되지 않는 경우

| 상황                                                               | 대안                                                 |
| ------------------------------------------------------------------ | ---------------------------------------------------- |
| 카드 내부에 인터랙티브 요소가 **여러 개** 있음 (수정/삭제/공유 등) | 카드 전체를 링크로 만들지 않고, 제목/썸네일만 링크로 |
| 카드 자체가 폼이거나 복잡한 인터랙션 컨테이너                      | 명시적인 "자세히 보기" 버튼/링크 추가                |
| 텍스트 선택과 카드 클릭이 모두 핵심 UX                             | `pointer-events: auto` 트릭 또는 부분 링크           |

---

## 참고 자료

- [HTML Living Standard §4.5.1 — The `<a>` element](https://html.spec.whatwg.org/multipage/text-level-semantics.html#the-a-element)
- [Inclusive Components: Cards (Heydon Pickering)](https://inclusive-components.design/cards/)
- [CSS-Tricks: Block Links — The Search for a Perfect Solution](https://css-tricks.com/block-links-the-search-for-a-perfect-solution/)
- [WCAG 2.1 SC 4.1.1 Parsing](https://www.w3.org/WAI/WCAG21/Understanding/parsing.html)
