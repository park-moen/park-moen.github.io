---
title: "SVG 아이콘 접근성 완전 가이드 — aria-label, aria-labelledby, aria-hidden, role"
description: "스크린 리더가 SVG 아이콘을 올바르게 읽도록 aria-label, aria-labelledby, aria-hidden, role=img의 개념과 올바른 조합을 실제 컴포넌트 설계 예시와 함께 설명합니다."
pubDate: 2026-03-15T00:00:00+09:00
slug: "2026/03/15/accessibility-svg-icon-aria"
tags: ["Accessibility", "React", "SVG", "ARIA"]
---

## 1. 들어가며

아이콘 버튼이나 장식용 SVG를 쓸 때 `aria-hidden="true"` 하나만 붙이면 접근성은 끝났다고 생각하기 쉽습니다. 하지만 실무에서는 그 반대 상황도 자주 생깁니다. "이 아이콘 자체가 의미를 전달해야 하는데, 어떻게 해야 하지?" `role="img"`를 쓰면 되는 걸까? `aria-label`과 `aria-labelledby`는 언제 구분해서 쓰나?

이 글은 그 질문들에 순서대로 답합니다. ARIA 핵심 속성 세 가지의 개념을 먼저 정리하고, SVG의 특수한 접근성 문제와 `role="img"` · `aria-hidden`의 관계를 살펴본 뒤, 안전한 아이콘 컴포넌트를 설계하는 방법까지 이어집니다.

---

## 2. 접근성 트리 (Accessibility Tree)

브라우저는 DOM과 별도로 **접근성 트리(Accessibility Tree)** 를 만들어 스크린 리더에 전달합니다. ARIA 속성들은 이 접근성 트리를 제어하는 도구입니다.

```
DOM:
  <button>
    <svg>...</svg>
  </button>

접근성 트리:
  button "검색"
    └─ svg "검색"  ← 중복 발생 가능
```

이처럼 부모와 자식이 같은 내용을 중복으로 노출하는 문제가 ARIA를 잘못 쓸 때 흔히 발생합니다. 이후 설명하는 속성들은 이 트리를 의도대로 제어하는 방법입니다.

---

## 3. `aria-label`

### 개념

- 요소의 **접근 가능한 이름(accessible name)** 을 속성값으로 직접 지정합니다.
- 화면에는 표시되지 않고, 스크린 리더에만 전달됩니다.

### 사용 시점

화면에 텍스트 라벨이 **전혀 없는** 요소에 의미를 부여할 때 씁니다.

```tsx
// 텍스트 없는 아이콘 버튼
<button aria-label="검색">
  <SearchIcon aria-hidden="true" />
</button>

// 단독 의미를 가지는 아이콘
<SearchIcon aria-label="검색" role="img" />
```

### 주의사항

- 브라우저 자동 번역이 누락될 수 있음
- 화면에 보이는 텍스트와 중복되지 않도록 주의

---

## 4. `aria-labelledby`

### 개념

- DOM에 **이미 존재하는 요소의 `id`** 를 참조하여 접근 가능한 이름으로 사용합니다.
- 우선순위가 가장 높아 `aria-label`, `alt`, 내부 텍스트 모두 덮어씁니다.

### 사용 시점

1. 화면에 이미 보이는 텍스트를 라벨로 재활용할 때 → **중복 방지**
2. 여러 텍스트를 조합해서 하나의 라벨을 만들어야 할 때

```tsx
// 예시 1: 모달 제목 재활용
<div role="dialog" aria-labelledby="modal-title">
  <h2 id="modal-title">비밀번호 변경</h2>
  <p>새 비밀번호를 입력하세요.</p>
</div>

// 예시 2: 반복되는 "더 보기" 버튼에 맥락 부여
<article>
  <h3 id="news-1">오늘의 날씨</h3>
  <button aria-labelledby="news-1 btn-1" id="btn-1">더 보기</button>
</article>
<article>
  <h3 id="news-2">주요 뉴스</h3>
  <button aria-labelledby="news-2 btn-2" id="btn-2">더 보기</button>
</article>
// 스크린 리더: "오늘의 날씨 더 보기", "주요 뉴스 더 보기"
```

### `aria-label`과 비교

| 기준           | `aria-label`                   | `aria-labelledby`                |
| -------------- | ------------------------------ | -------------------------------- |
| 라벨 출처      | 속성에 직접 문자열 작성        | DOM의 다른 요소를 `id`로 참조    |
| 화면 표시 여부 | 보이지 않음 (스크린 리더 전용) | 화면에 보이는 텍스트 재활용      |
| 우선순위       | 두 번째                        | 가장 높음                        |
| 번역 지원      | 자동 번역 누락 가능            | 화면 텍스트 기반이므로 번역 적용 |
| 유지보수       | 간단, DOM 의존성 없음          | 참조 `id` 변경 시 연결 끊어짐    |

---

## 5. `aria-hidden`

### 개념

- `true`로 설정하면 해당 요소와 **모든 자식을 접근성 트리에서 제거**합니다.
- 스크린 리더가 완전히 무시하게 됩니다.

### 사용 시점

부모 요소가 이미 의미를 설명하고 있어 자식 요소가 **중복으로 읽히는 것을 방지**할 때 씁니다.

### `aria-hidden` 없을 때의 문제

```tsx
// ❌ aria-hidden 없음 — 내부 SVG에 title="검색" 있을 경우
<button aria-label="검색">
  <SearchIcon />
</button>
// 스크린 리더: "검색 검색 버튼" (중복 읽힘)
```

```
접근성 트리:
  button "검색"
    └─ svg "검색"  ← 중복
```

### `aria-hidden` 적용 후

```tsx
// ✅ aria-hidden 적용
<button aria-label="검색">
  <SearchIcon aria-hidden="true" />
</button>
// 스크린 리더: "검색 버튼"
```

```
접근성 트리:
  button "검색"
    └─ (없음)  ← svg가 트리에서 제거됨
```

---

## 6. SVG의 암묵적 role 문제

HTML `<img>`는 별도 선언 없이도 스크린 리더가 "이미지"로 인식합니다. 반면 `<svg>`의 암묵적 role은 공식 스펙상 `graphics-document`이지만, **브라우저마다 구현이 달라 스크린 리더가 제각각 해석합니다.**

| 브라우저 + 스크린 리더 | `role` 미지정 시 SVG 해석   |
| ---------------------- | --------------------------- |
| Chrome + NVDA          | "group" 또는 무시           |
| Safari + VoiceOver     | `<title>` 못 읽는 경우 있음 |
| Firefox + JAWS         | "graphics-document"로 읽힘  |

`role="img"`를 명시하면 브라우저 불일치를 덮어쓰고 **모든 환경에서 "image"로 통일**됩니다.

---

## 7. `role="img"`와 `aria-hidden`의 관계

### `role="img"` 단독 사용의 위험성

`role="img"`는 반드시 **accessible name과 세트**로 제공되어야 합니다. 이름 없이 `role="img"`만 선언하면 스크린 리더가 "image"라고만 읽고 내용을 전달하지 못합니다.

```tsx
// ❌ role만 있고 이름이 없음
<SearchIcon role="img" />
// 스크린 리더: "image" (무엇인지 알 수 없음)

// ✅ role + accessible name 세트
<SearchIcon role="img" aria-label="검색" />
// 스크린 리더: "검색, image"
```

### 두 속성은 정반대의 명령

`aria-hidden="true"`와 `role`은 **정반대의 명령**입니다.

- `role="img"` → "이 요소를 접근성 트리에 **이미지로 노출**해라"
- `aria-hidden="true"` → "이 요소를 접근성 트리에서 **완전히 제거**해라"

브라우저는 `aria-hidden`을 우선하므로, 두 속성이 함께 있으면 `role`은 무시됩니다.

```tsx
// ❌ 모순된 조합: aria-hidden이 role을 무효화
<SearchIcon aria-hidden="true" role="img" aria-label="검색" />
// 결과: 접근성 트리에서 제거됨, role과 aria-label 모두 무시

// ✅ 장식용: aria-hidden만
<SearchIcon aria-hidden="true" />

// ✅ 단독 의미: role="img" + aria-label
<SearchIcon role="img" aria-label="검색" />
```

이 관계를 이용하면 **`role="img"`를 기본값으로 설정**하는 설계가 가능합니다.

---

## 8. SVG Icon 컴포넌트 설계 패턴

아이콘 컴포넌트는 사용 목적에 따라 두 케이스로 구분합니다.

### 케이스 1: 장식용 아이콘 (Decorative Icon)

부모 요소가 의미를 설명하므로 아이콘 자체는 접근성 트리에서 숨깁니다.

```tsx
<button aria-label="검색">
  <SearchIcon aria-hidden="true" />
</button>

<a href="/home" aria-label="홈으로 이동">
  <HomeIcon aria-hidden="true" />
</a>
```

### 케이스 2: 단독 의미를 가진 아이콘 (Meaningful Icon)

아이콘 자체가 의미를 전달해야 할 때 `aria-label`과 `role="img"`를 부여합니다.

```tsx
<SearchIcon aria-label="검색" role="img" />
```

### 컴포넌트 구현 예시

`role="img"`를 기본값으로 두되, `aria-hidden` 또는 `aria-label` 유무로 동작을 자동 분기합니다.

```tsx
import type { SVGProps } from "react";
import { useId } from "react";

export function SearchIcon({
  className,
  title,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  "aria-hidden": ariaHidden,
  ...props
}: SVGProps<SVGSVGElement> & { title?: string }) {
  const titleId = useId();
  const hasLabel = Boolean(title || ariaLabel || ariaLabelledBy);

  return (
    <svg
      role={hasLabel ? "img" : undefined}
      aria-label={ariaLabel}
      aria-labelledby={title ? titleId : ariaLabelledBy}
      aria-hidden={ariaHidden ?? (!hasLabel ? true : undefined)}
      className={className}
      {...props}
    >
      {title ? <title id={titleId}>{title}</title> : null}
      {/* SVG paths */}
    </svg>
  );
}
```

### 사용처에서의 동작 흐름

| 사용처에서 전달하는 props | 동작                                         |
| ------------------------- | -------------------------------------------- |
| `aria-label="검색"`       | `role="img"` 활성화 → 단독 의미 아이콘       |
| `aria-hidden="true"`      | `role="img"` 무시 → 장식용 아이콘            |
| 아무것도 없음             | 방어 로직으로 `aria-hidden="true"` 자동 적용 |

```tsx
// 경로 1: 장식용 → aria-hidden이 role="img"를 덮어씀
<button aria-label="검색">
  <SearchIcon aria-hidden="true" />
</button>

// 경로 2: 단독 의미 → role="img" + aria-label 세트 완성
<SearchIcon aria-label="검색" />

// 경로 3: 실수로 둘 다 빠뜨림 → 방어 로직이 aria-hidden 자동 적용
<SearchIcon />
```

---

## 9. 올바른 조합 치트시트

| 조합                                | 결과                     | 권장 여부 |
| ----------------------------------- | ------------------------ | --------- |
| `role="img"` + `aria-label`         | "검색, image"            | ✅        |
| `aria-hidden="true"`                | 접근성 트리에서 제거     | ✅        |
| `role="img"` 단독                   | "image" (내용 불명)      | ❌        |
| `aria-hidden="true"` + `role="img"` | role 무시, 트리에서 제거 | ❌ 모순   |
| 아무 속성 없음                      | 브라우저마다 다르게 해석 | ❌        |

---

## 10. 의사결정 흐름도

```
아이콘을 사용할 때
│
├─ 부모 요소(button, a 등)가 의미를 설명하는가?
│   ├─ YES → aria-hidden="true" 를 아이콘에 적용
│   │         부모에 aria-label 또는 텍스트 제공
│   │
│   └─ NO  → 아이콘 자체에 aria-label + role="img" 적용
│
└─ 화면에 보이는 텍스트가 라벨 역할을 하는가?
    ├─ YES → aria-labelledby로 해당 요소 id 참조
    └─ NO  → aria-label로 직접 문자열 작성
```

---

## 참고 자료

- [MDN: aria-label](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-label)
- [MDN: aria-labelledby](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-labelledby)
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [Accessible SVG Icons - Fuzzy Logic](https://fuzzylogic.me/posts/accessible-scalable-icons/)
