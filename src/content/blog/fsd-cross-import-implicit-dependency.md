---
title: "FSD 심화: Cross-import와 암묵적 의존성 문제 해결"
description: "FSD에서 발생하는 Cross-import 패턴의 정의와 문제점을 살펴보고, 암묵적 의존성을 명시적으로 관리하는 방법과 린터를 활용한 자동화 전략을 소개합니다. (초안 - 내용 검수 진행 중)"
pubDate: 2025-07-13T00:00:00+09:00
slug: "2025/07/13/fsd-cross-import-implicit-dependency"
tags: ["FSD", "Architecture"]
draft: true
---

> **⚠️ 이 글은 현재 검수 진행 중인 초안입니다.** 코드 예시 검증 및 FSD 맥락과의 연결 강화 작업이 진행 중이며, 내용이 변경될 수 있습니다.

---

## 1. Cross-import란 무엇인가?

**Cross-import**는 FSD에서 **명확한 경계를 넘어 잘못된 방식으로 모듈을 참조**하는 것을 의미합니다. 주로 두 가지 형태로 나타납니다.

### 슬라이스 간 의존성 위반

```ts
// ❌ features/cart에서 features/login을 직접 참조
// features/cart/ui/CartItem.tsx
import { useLoginStatus } from "@features/login/model/store";
```

같은 `features` 레이어의 다른 슬라이스를 직접 참조하는 것은 FSD 규칙 위반입니다.

### 계층 간 역방향 참조

```ts
// ❌ entities에서 features를 참조 (역방향)
// entities/user/model/userModel.ts
import { useCartItems } from "@features/cart";
```

하위 레이어(`entities`)가 상위 레이어(`features`)를 참조하는 것도 위반입니다.

---

## 2. Cross-import의 문제점

| 문제               | 설명                                                          |
| ------------------ | ------------------------------------------------------------- |
| **높은 결합도**    | 슬라이스 하나를 수정하면 참조하는 다른 슬라이스도 영향을 받음 |
| **독립성 훼손**    | 슬라이스를 독립적으로 개발·테스트하기 어려워짐                |
| **순환 참조 위험** | A → B → A 참조가 생기면 빌드 실패 또는 런타임 오류 발생 가능  |

### 실제 영향 시나리오

`features/auth`를 리팩토링하거나 삭제하려고 했더니, `features/cart`, `features/order`, `features/product` 등이 모두 `features/auth`의 내부를 참조하고 있어 하나도 건드릴 수 없는 상황이 발생합니다. 이것이 Cross-import가 누적될 때 생기는 전형적인 문제입니다.

---

## 3. Cross-import 해결 방법

### 방법 1: 공통 로직을 하위 레이어로 이동

두 슬라이스에서 공통으로 필요한 것은 `entities` 또는 `shared`로 내립니다.

```ts
// 해결 전: features/cart가 features/auth에 의존
import { currentUser } from "@features/auth";

// 해결 후: 공통 user 정보를 entities/session으로 이동
import { useSession } from "@entities/session";
```

### 방법 2: Public API를 통한 간접 접근

슬라이스의 `index.ts`에서 공개한 API만 사용하도록 합니다. 내부 파일에 직접 접근하는 것은 의존성의 범위를 예측할 수 없게 만듭니다.

```ts
// ❌ 내부 파일 직접 접근
import { loginStore } from "@features/auth/model/store";

// ✅ Public API 통한 접근
import { useAuth } from "@features/auth"; // index.ts에서 공개된 것만
```

### 방법 3: 린터로 자동 감지

`eslint-plugin-boundaries`를 사용하면 Cross-import를 자동으로 감지할 수 있습니다.

```bash
npm install --save-dev eslint-plugin-boundaries
```

```js
// eslint.config.js (ESLint v9 flat config)
import boundaries from "eslint-plugin-boundaries";

export default [
  {
    plugins: { boundaries },
    rules: {
      "boundaries/element-types": [
        "error",
        {
          default: "disallow",
          rules: [
            { from: "features", allow: ["entities", "shared"] },
            { from: "entities", allow: ["shared"] },
          ],
        },
      ],
    },
  },
];
```

> **📌 참고**: 위 린터 설정은 기본 예시이며, 실제 프로젝트 경로 매핑(`pathsMapper` 설정 등)이 추가로 필요합니다. 공식 문서를 참고해 설정을 보완하세요.

---

## 4. 암묵적 의존성이란?

**암묵적 의존성(Implicit Dependency)** 은 코드가 동작하기 위해 특정 조건이 필요하지만, 그 조건이 코드에 **명시적으로 드러나지 않는 경우**를 말합니다.

### 예시 1: Context Provider 암묵 의존

```tsx
// ThemeContext가 상위에 있어야만 동작하지만 코드에서 알 수 없음
function MyComponent() {
  const theme = useContext(ThemeContext); // 상위 Provider가 없으면 undefined
  return <div style={{ color: theme?.primary }}>Hello</div>;
}
```

### 예시 2: 환경 변수 암묵 의존

```ts
function fetchData() {
  // API_KEY가 없으면 런타임에서야 에러 발생
  return fetch(`/api/data?key=${process.env.API_KEY}`);
}
```

### 예시 3: FSD에서의 암묵적 의존

슬라이스가 전역 상태를 직접 참조할 때 발생합니다.

```ts
// features/cart/ui/CartItem.tsx
// 이 컴포넌트가 전역 Redux store의 특정 shape에 의존하지만 코드에서 명확하지 않음
import { store } from "@app/store";
const user = store.getState().auth.currentUser; // 암묵적 의존
```

---

## 5. 암묵적 의존성 해결 방법

### Props 또는 훅으로 의존성 명시

```tsx
// ✅ 의존성을 Props로 명시
function CartItem({ userId }: { userId: string }) {
  // userId가 필요하다는 것이 명확히 드러남
}

// ✅ 또는 훅을 통해 명시
function CartItem() {
  const { userId } = useSession(); // 어디서 데이터를 가져오는지 명확
}
```

### TypeScript로 의존성 강제

```ts
// ✅ 필수 환경 변수를 타입으로 강제
function createApiClient(config: { apiKey: string; baseUrl: string }) {
  return {
    get: (path: string) => fetch(`${config.baseUrl}${path}?key=${config.apiKey}`),
  };
}
```

---

## 6. FSD 도입 초기에 문제를 즉시 해결해야 하는 이유

FSD를 처음 도입할 때 Cross-import나 암묵적 의존성 문제를 발견하면 "나중에 고치자"는 유혹이 생깁니다. 하지만 이런 문제는 **복리처럼 쌓입니다.**

- 오늘 Cross-import 1개를 허용하면, 내일 그 슬라이스에 의존하는 코드가 3개 더 생깁니다.
- 한 달 뒤에는 그 슬라이스를 수정하는 것이 사실상 불가능해집니다.

FSD의 엄격한 규칙이 초기에는 번거롭게 느껴질 수 있지만, 이는 **기술 부채를 쌓지 않기 위한 장치**입니다. 규칙 위반을 발견했을 때 즉시 수정하는 습관이 장기적으로 코드베이스를 건강하게 유지합니다.

---

## 7. 정리

| 문제                          | 해결책                                      |
| ----------------------------- | ------------------------------------------- |
| Cross-import (슬라이스 간)    | 공통 로직을 `entities` 또는 `shared`로 이동 |
| Cross-import (계층 간 역방향) | 의존성 방향 규칙 준수, 린터로 자동 감지     |
| 암묵적 의존성                 | Props, 훅, TypeScript를 통해 의존성 명시    |
| 문제 누적                     | 발견 즉시 수정, 린터 규칙으로 사전 방지     |

---

**참고 자료**

- [FSD 공식 문서 - 레이어](https://feature-sliced.design/kr/docs/reference/layers)
- [eslint-plugin-boundaries 공식 문서](https://github.com/javierbrea/eslint-plugin-boundaries)
