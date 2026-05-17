---
title: "Tailwind CSS Named Group — 중첩 컴포넌트에서 부모 상태 정확히 참조하기"
description: "Tailwind의 group 유틸리티가 중첩 구조에서 모호해지는 문제를 Named Group 문법으로 해결하는 방법을 설명합니다. group/{name}과 group-data 조합을 실제 컴포넌트 설계 사례와 함께 정리합니다."
pubDate: 2026-05-10T00:00:00+09:00
slug: "2026/05/10/css-tailwind-named-group"
tags: ["CSS", "Tailwind"]
---

## 1. 들어가며

Tailwind의 `group` 유틸리티는 카드 hover 시 제목 색상 변경, 부모 포커스 시 자식 스타일 전환 같은 패턴을 CSS만으로 구현하게 해줍니다. 그런데 컴포넌트가 중첩되면 문제가 생깁니다. "어느 부모의 hover를 가리키는 건지" 특정할 수 없게 됩니다.

이 문제를 해결하는 것이 **Named Group** 문법입니다.

---

## 2. 기본 `group`

```html
<div class="group">
  <p class="group-hover:text-red-500">부모에 hover 시 빨간색</p>
</div>
```

부모에 `group`을 선언하고, 자식에서 `group-{modifier}:` 접두사로 부모 상태에 반응합니다.

### 한계: 중첩 시 모호함

```html
<!-- 어느 group의 hover인지 특정할 수 없음 -->
<div class="group">
  <div class="group">
    <p class="group-hover:text-red-500">???</p>
  </div>
</div>
```

`group-hover`는 **가장 가까운 조상의 `group`**에 반응합니다. `group`이 여러 개 중첩되면 의도한 것과 다른 부모를 가리킬 수 있습니다.

---

## 3. Named Group: `/이름`으로 부모를 명시

`group/{name}`으로 부모를 등록하고, `group-{modifier}/{name}:`으로 정확한 부모를 참조합니다.

```html
<div class="group/outer">
  <div class="group/inner">
    <p class="group-hover/outer:text-blue-500">outer hover 시 파란색</p>
    <p class="group-hover/inner:text-red-500">inner hover 시 빨간색</p>
  </div>
</div>
```

### 문법 구조

```
group-hover/card : underline
│     │     │       │
│     │     │       └─ 적용할 스타일
│     │     └─ 참조할 group 이름
│     └─ 조건 (hover, focus, data-* 등)
└─ group 참조 키워드
```

---

## 4. `group-data` 조합: 데이터 속성으로 분기

Named Group은 hover/focus 뿐만 아니라 `data-*` 속성 상태와도 조합할 수 있습니다. 이를 활용하면 **JS 상태를 CSS 조건으로 전달**하는 패턴이 가능합니다.

```
group-data-[size=default]/alert-dialog-content : flex-row
│     │                   │                      │
│     └─ 조건 (data 속성) │                      └─ 적용할 스타일
│                         └─ 참조할 group 이름
└─ group 참조 키워드
```

---

## 5. 실제 적용 사례: AlertDialog 크기별 레이아웃

`AlertDialog` 컴포넌트에서 `size` prop에 따라 Footer와 Header의 레이아웃이 달라져야 하는 요구사항이 있다고 가정합니다.

### 1단계: 부모에 Named Group 등록

```tsx
// AlertDialogContent
<AlertDialogPrimitive.Content
  data-size={size} // "default" | "sm"
  className="group/alert-dialog-content" // Named Group 등록
/>
```

`data-size`로 현재 크기 상태를 DOM에 노출하고, Named Group으로 하위 컴포넌트들이 이 부모를 정확히 참조할 수 있게 합니다.

### 2단계: 자식에서 Named Group 참조

```tsx
// AlertDialogFooter
className={`
  flex flex-col-reverse
  group-data-[size=default]/alert-dialog-content:flex-row
  group-data-[size=sm]/alert-dialog-content:grid
  group-data-[size=sm]/alert-dialog-content:grid-cols-2
`}

// AlertDialogHeader
className={`
  place-items-center text-center
  sm:group-data-[size=default]/alert-dialog-content:place-items-start
  sm:group-data-[size=default]/alert-dialog-content:text-left
`}
```

### 전체 흐름

```
<AlertDialogContent data-size="default" class="group/alert-dialog-content">
  │
  ├── <AlertDialogHeader>
  │     └── 모바일: text-center
  │         sm 이상 + size=default: text-left
  │
  └── <AlertDialogFooter>
        └── size=default: flex-row
            size=sm: grid grid-cols-2
```

---

## 6. Named Group이 필요한 시점

| 상황                                     | 권장 방식                       |
| ---------------------------------------- | ------------------------------- |
| `group`이 단일 계층                      | 기본 `group`                    |
| `group`이 2개 이상 중첩                  | Named Group (`group/{name}`)    |
| 특정 조상의 상태에만 반응해야 할 때      | Named Group                     |
| `data-*`로 상태를 CSS 조건으로 전달할 때 | `group-data-[key=value]/{name}` |

### 익명 `group`을 쓰면 안 되는 경우

```tsx
// ❌ 익명 group — 가장 가까운 group 부모에 반응 (의도치 않은 동작 가능)
className = "group-data-[size=default]:flex-row";

// ✅ Named group — alert-dialog-content 부모만 정확히 참조
className = "group-data-[size=default]/alert-dialog-content:flex-row";
```

재사용 가능한 공통 컴포넌트를 설계할 때, 사용처에서 어떤 `group`이 중첩될지 예측할 수 없습니다. 이런 경우 Named Group을 기본으로 사용하는 것이 안전합니다.

---

## 참고 자료

- [Tailwind CSS 공식 문서 — Styling based on parent state](https://tailwindcss.com/docs/hover-focus-and-other-states#styling-based-on-parent-state)
