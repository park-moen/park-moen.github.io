---
title: "FSD 레이어 구조와 의존성 규칙 완전 정복"
description: "Feature-Sliced Design의 6개 레이어 구조를 이해하고, 모듈 간 의존성 방향 규칙과 같은 레이어 참조 금지 원칙을 예시와 함께 완전히 정리합니다."
pubDate: 2025-05-04T00:00:00+09:00
slug: "2025/05/04/fsd-layer-dependency-rules"
tags: ["FSD", "Architecture"]
---

## 1. FSD 레이어 구조 한눈에 보기

FSD는 프로젝트를 6개의 레이어로 나눕니다. 레이어는 위에서 아래로 갈수록 더 범용적이고 추상적입니다.

```
app       ← 앱 초기화, 라우팅, 전역 설정
pages     ← 사용자에게 보이는 각 페이지
widgets   ← 여러 페이지에서 재사용되는 큰 UI 블록
features  ← 비즈니스 기능 단위 (로그인, 검색 등)
entities  ← 도메인 모델 중심의 데이터 컴포넌트 (user, product 등)
shared    ← 모든 레이어에서 사용하는 공통 요소
```

이 구조에서 핵심 규칙은 **의존성의 방향**입니다.

---

## 2. 의존성 방향 규칙: 위에서 아래로만

FSD의 가장 중요한 규칙입니다. **상위 레이어는 하위 레이어를 참조할 수 있지만, 하위 레이어는 상위 레이어를 참조할 수 없습니다.**

```
app
 ↓ (참조 가능)
pages
 ↓
widgets
 ↓
features
 ↓
entities
 ↓
shared
```

예를 들어 `features` 레이어는 `entities`와 `shared`를 가져올 수 있지만, `pages`나 `widgets`를 가져오는 것은 금지됩니다.

```ts
// ✅ 올바른 참조: features → entities (하위 레이어)
import { UserCard } from "@entities/user";

// ❌ 잘못된 참조: features → pages (상위 레이어)
import { ProfilePage } from "@pages/profile"; // 규칙 위반
```

### 왜 이 규칙이 필요한가?

`features/login`이 `pages/home`을 참조한다고 가정해봅시다. `pages/home`이 수정되면 `features/login`에도 영향이 생깁니다. 이런 역방향 의존성이 쌓이면 코드 한 곳을 바꿀 때 예상치 못한 곳에서 버그가 터지는 **스파게티 코드**가 됩니다.

단방향 의존성을 유지하면 `pages/home`을 수정해도 `features/login`에는 절대 영향을 주지 않습니다. 각 레이어를 **안전하게 격리**할 수 있습니다.

---

## 3. 같은 레이어 간 참조 금지

같은 레이어 안에서도 **다른 슬라이스를 직접 참조하는 것은 금지**됩니다.

```ts
// ❌ 잘못된 참조: features/cart → features/login (같은 레이어 내 다른 슬라이스)
import { useLoginStatus } from "@features/login";
```

**왜 금지될까요?**

`features/cart`가 `features/login`을 참조하면 두 기능 사이에 의존성이 생깁니다. `login` 기능을 수정할 때 `cart` 기능에도 영향이 생길 수 있습니다. FSD는 각 슬라이스가 독립적으로 개발·테스트·배포될 수 있도록 이 참조를 금지합니다.

같은 레이어의 두 슬라이스가 공통으로 필요한 기능이 있다면, 그 기능을 **하위 레이어(entities 또는 shared)** 로 내려야 합니다.

```
✅ 해결 방법: 공통 로직을 entities 또는 shared로 이동

features/cart   →  entities/user  ← features/login
```

---

## 4. 슬라이스 내 파일 참조는 자유롭게

같은 슬라이스 내부에서는 파일 간 자유롭게 참조할 수 있습니다.

```
features/
└── cart/
    ├── api/
    │   └── request.ts
    ├── model/
    │   └── cartSlice.ts
    └── ui/
        └── CartItem.tsx
```

`features/cart/ui/CartItem.tsx`에서 `features/cart/model/cartSlice.ts`를 참조하는 것은 완전히 허용됩니다. 같은 슬라이스 안이기 때문입니다.

---

## 5. App과 Shared 계층의 예외 규칙

`app`과 `shared`는 일반 레이어 규칙의 예외입니다.

| 레이어   | 특징                                                                                                 |
| -------- | ---------------------------------------------------------------------------------------------------- |
| `shared` | 비즈니스 도메인에 독립적. 모든 레이어에서 자유롭게 참조 가능. 내부에서도 세그먼트 간 자유 참조 허용. |
| `app`    | 앱의 최상위 레이어. 모든 비즈니스 도메인을 통합. 내부에서도 세그먼트 간 자유 참조 허용.              |

---

## 6. 규칙을 지켰을 때 vs 어겼을 때 비교

| 상황                  | 규칙 준수                                       | 규칙 위반                                                 |
| --------------------- | ----------------------------------------------- | --------------------------------------------------------- |
| `features/login` 수정 | `cart`, `product` 등 다른 슬라이스에 영향 없음  | `features/cart`가 `features/login`을 참조했다면 함께 영향 |
| `entities/user` 수정  | `features`와 `pages`에서 API만 다시 확인하면 됨 | 역방향 참조 시 변경 범위를 예측할 수 없음                 |
| 새 기능 추가          | 기존 슬라이스에 영향 없이 새 슬라이스를 추가    | 기존 코드와 얽혀 있어 추가 시 기존 기능에 영향 가능       |

---

## 7. 린터로 의존성 규칙 자동 검사하기

의존성 규칙 위반은 `eslint-plugin-boundaries`를 사용해 자동으로 감지할 수 있습니다.

```bash
npm install --save-dev eslint-plugin-boundaries
```

```js
// .eslintrc.js
module.exports = {
  plugins: ["boundaries"],
  rules: {
    "boundaries/element-types": [
      "error",
      {
        default: "disallow",
        rules: [
          { from: "pages", allow: ["widgets", "features", "entities", "shared"] },
          { from: "widgets", allow: ["features", "entities", "shared"] },
          { from: "features", allow: ["entities", "shared"] },
          { from: "entities", allow: ["shared"] },
          { from: "shared", allow: ["shared"] },
        ],
      },
    ],
  },
};
```

이 설정을 추가하면 규칙을 위반하는 import 구문에서 lint 오류가 발생합니다.

---

## 8. 정리

FSD의 의존성 규칙을 한 문장으로 요약하면 다음과 같습니다.

> **"자신과 하위 레이어만 참조할 수 있다. 상위 레이어와 같은 레이어의 다른 슬라이스는 참조할 수 없다."**

이 규칙 하나로 모듈 간 결합도가 낮아지고, 각 슬라이스를 독립적으로 수정·테스트·삭제할 수 있게 됩니다.

---

**참고 자료**

- [FSD 공식 문서 - 레이어 Import 규칙](https://feature-sliced.design/kr/docs/reference/layers#import-rule-on-layers)
