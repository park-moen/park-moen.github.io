---
title: "CSS clamp()로 반응형 폰트 크기 한 줄에 해결하기"
description: "미디어 쿼리 없이 뷰포트에 따라 유동적으로 변하는 폰트 크기를 clamp() 함수로 구현하는 방법과, 모바일/데스크탑 고정값에서 clamp 공식을 유도하는 과정을 설명합니다."
pubDate: 2026-05-17T00:00:00+09:00
slug: "2026/05/17/css-clamp-fluid-typography"
tags: ["CSS", "Tailwind"]
---

## 1. 들어가며

반응형 폰트 크기를 구현할 때 전통적인 방법은 미디어 쿼리입니다.

```css
h1 {
  font-size: 12px;
}

@media (min-width: 1200px) {
  h1 {
    font-size: 18px;
  }
}
```

이 방법의 문제는 **계단식으로 크기가 바뀐다**는 점입니다. 1199px와 1200px에서 크기가 뚝 달라지고, 그 사이 뷰포트에서는 한쪽 크기가 고정됩니다. 미디어 쿼리를 여러 breakpoint에 걸쳐 반복하다 보면 코드도 길어집니다.

CSS `clamp()` 함수를 쓰면 이 문제를 **한 줄**로 해결할 수 있습니다.

---

## 2. clamp() 기본 문법

```css
font-size: clamp(최솟값, 선호값, 최댓값);
```

세 값의 역할:

| 인수   | 역할                                                     |
| ------ | -------------------------------------------------------- |
| 최솟값 | 이 값 이하로는 절대 줄어들지 않음                        |
| 선호값 | 뷰포트에 따라 유동적으로 변하는 값 (주로 `vw` 단위 사용) |
| 최댓값 | 이 값 이상으로는 절대 커지지 않음                        |

```css
font-size: clamp(0.75rem, 0.73vw + 0.58rem, 1.125rem);
                  ↑              ↑              ↑
              최소 12px      뷰포트 너비에        최대 18px
                            비례해 유동적으로 변함
```

동작 방식:

```
뷰포트가 좁을 때   → 최솟값에 걸려 12px 고정
뷰포트가 중간일 때 → 선호값(vw)에 따라 12px ~ 18px 사이를 유동적으로
뷰포트가 넓을 때   → 최댓값에 걸려 18px 고정
```

---

## 3. 고정값에서 clamp 공식 유도하기

실무에서는 디자인 시스템에 "모바일 12px, 데스크탑 18px"처럼 고정값이 먼저 정해집니다. 이 두 값에서 `clamp()`의 선호값을 계산하는 공식입니다.

### 공식

```
slope     = (최대 크기 - 최소 크기) / (최대 뷰포트 - 최소 뷰포트)
intercept = 최소 크기 - (slope × 최소 뷰포트)

선호값 = slope × 100vw + intercept
```

`slope`는 뷰포트 1px 변화에 따른 폰트 크기 변화율이고, `intercept`는 선형 보간의 y절편입니다. 두 점(최소 뷰포트, 최소 크기)과 (최대 뷰포트, 최대 크기)를 잇는 직선의 방정식을 구하는 것과 같습니다.

### 계산 예시

조건:

- 모바일(375px) → `12px`
- 데스크탑(1200px) → `18px`

```
slope     = (18 - 12) / (1200 - 375) = 6 / 825 ≈ 0.00727
intercept = 12 - (0.00727 × 375)    = 12 - 2.73 ≈ 9.27px

선호값    = 0.73vw + 9.27px
```

최종 결과:

```css
/* px 단위 */
font-size: clamp(12px, 0.73vw + 9.27px, 18px);

/* rem 단위 (16px 기준) */
font-size: clamp(0.75rem, 0.73vw + 0.58rem, 1.125rem);
```

### 검증

```
375px  → 0.73 × 3.75 + 9.27 = 11.997 ≈ 12px  ✅ (최솟값에 걸림)
768px  → 0.73 × 7.68 + 9.27 ≈ 14.9px         ✅ (유동적으로 변함)
1200px → 0.73 × 12   + 9.27 = 18.03 ≈ 18px   ✅ (최댓값에 걸림)
```

---

## 4. Tailwind v4에서 사용하는 방법

### 방법 1: 임의값으로 직접 (일회성 사용)

```html
<p class="text-[clamp(0.75rem,0.73vw+0.58rem,1.125rem)]">본문</p>
```

Tailwind 임의값 문법 `[]` 안에 그대로 넣습니다. 단, 클래스가 길어져 가독성이 떨어집니다.

### 방법 2: `@theme`에 토큰으로 등록

```css
/* globals.css */
@theme inline {
  --text-body-fluid: clamp(0.75rem, 0.73vw + 0.58rem, 1.125rem);
  --text-heading-fluid: clamp(1.5rem, 2vw + 0.5rem, 2.2rem);
  --text-title-fluid: clamp(1.6rem, 3.5vw + 0.3rem, 2.8rem);
}
```

토큰으로 등록하면 짧은 클래스명으로 재사용할 수 있습니다.

```html
<p class="text-body-fluid">본문 텍스트</p>
<h2 class="text-heading-fluid">소제목</h2>
<h1 class="text-title-fluid">페이지 제목</h1>
```

---

## 5. 계산 자동화 도구

공식을 직접 계산하기 번거롭다면 **[utopia.fyi](https://utopia.fyi/clamp/calculator/)** 를 활용합니다.

최소/최대 뷰포트와 폰트 크기를 입력하면 `clamp()` 값을 자동으로 생성해 줍니다. Type Scale 전체를 한 번에 생성하는 기능도 있어 디자인 시스템 초기 세팅에 유용합니다.

---

## 6. 미디어 쿼리 방식과 비교

| 항목          | 미디어 쿼리                   | `clamp()`                        |
| ------------- | ----------------------------- | -------------------------------- |
| 코드량        | breakpoint마다 선언 필요      | 한 줄                            |
| 전환 방식     | 특정 크기에서 계단식으로 변함 | 뷰포트에 따라 선형으로 변함      |
| 세밀한 제어   | breakpoint 단위로만 제어      | 뷰포트 px마다 미세하게 조정      |
| 브라우저 지원 | 모든 브라우저                 | IE 미지원 (현대 프로젝트는 무관) |
| 가독성        | 선언이 분산됨                 | 한 곳에 모임                     |

---

## 참고 자료

- [MDN — clamp()](https://developer.mozilla.org/en-US/docs/Web/CSS/clamp)
- [utopia.fyi — Fluid type scale 계산기](https://utopia.fyi)
- [Tailwind CSS v4 — Theme variables](https://tailwindcss.com/docs/theme)
