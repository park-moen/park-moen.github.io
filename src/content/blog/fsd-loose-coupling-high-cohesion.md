---
title: "FSD에서 느슨한 결합과 높은 응집력 달성하기"
description: "소프트웨어 설계의 핵심 원칙인 Loose Coupling과 High Cohesion이 Feature-Sliced Design에서 어떻게 구현되는지 실제 코드 예시와 함께 살펴봅니다."
pubDate: 2025-06-01T00:00:00+09:00
slug: "2025/06/01/fsd-loose-coupling-high-cohesion"
tags: ["FSD", "Architecture"]
---

## 1. 들어가며

좋은 소프트웨어 아키텍처를 설명할 때 빠지지 않는 두 가지 원칙이 있습니다. **느슨한 결합(Loose Coupling)** 과 **높은 응집력(High Cohesion)** 입니다.

FSD는 이 두 원칙을 프론트엔드 아키텍처에 구체적으로 구현한 방법론입니다. 원칙이 어떤 의미인지, FSD가 어떻게 이를 실현하는지 살펴봅니다.

---

## 2. 느슨한 결합(Loose Coupling)이란?

**결합(Coupling)** 은 모듈 간 의존성의 정도를 의미합니다. 결합이 강하면 모듈 하나를 바꿀 때 연결된 다른 모듈도 함께 변경해야 합니다.

### 강한 결합의 문제

```ts
// ❌ 강한 결합: features/cart가 features/login 내부를 직접 참조
import { loginStore } from "@features/login/model/store";

export function CartItem() {
  const isLoggedIn = loginStore.getState().isLoggedIn;
  // ...
}
```

이 경우 `features/login`의 `store` 구조가 바뀌면 `features/cart`도 함께 수정해야 합니다.

### 느슨한 결합으로 개선

```ts
// ✅ 느슨한 결합: entities/session의 Public API를 통해 접근
import { useSession } from "@entities/session";

export function CartItem() {
  const { isLoggedIn } = useSession();
  // ...
}
```

`entities/session`이 내부 구현을 바꾸더라도, `useSession`의 반환값이 동일하다면 `CartItem`은 수정할 필요가 없습니다.

---

## 3. 높은 응집력(High Cohesion)이란?

**응집력(Cohesion)** 은 하나의 모듈 안에 관련된 코드가 얼마나 밀집해 있는가를 의미합니다. 응집력이 높을수록 모듈은 하나의 명확한 책임을 집니다.

### 낮은 응집력의 문제

```
features/
└── userStuff/        ← "사용자 관련 모든 것"이 뒤섞임
    ├── LoginForm.tsx
    ├── CartSummary.tsx   ← 장바구니인데 여기 왜 있지?
    ├── useAuth.ts
    └── formatPrice.ts    ← 가격 포맷팅인데 여기 왜 있지?
```

하나의 폴더에 서로 관련 없는 기능이 섞여 있으면, 수정 범위를 예측하기 어렵고 재사용도 힘들어집니다.

### 높은 응집력으로 개선

```
features/
├── auth/             ← 인증과 관련된 것만
│   ├── ui/LoginForm.tsx
│   └── model/useAuth.ts
└── cart/             ← 장바구니와 관련된 것만
    ├── ui/CartSummary.tsx
    └── model/useCart.ts

shared/lib/
└── formatPrice.ts    ← 전역 유틸은 shared로
```

각 슬라이스가 하나의 비즈니스 도메인에 집중하고 있어, 수정 범위가 명확합니다.

---

## 4. FSD가 두 원칙을 구현하는 방법

| 원칙               | FSD의 구현 방법                                                                                                     |
| ------------------ | ------------------------------------------------------------------------------------------------------------------- |
| **Loose Coupling** | 레이어 간 의존성 규칙(상위→하위만 허용), 같은 레이어 슬라이스 간 참조 금지, Public API(index.ts)를 통한 접근만 허용 |
| **High Cohesion**  | 슬라이스를 비즈니스 도메인 단위로 구성, 세그먼트(ui/model/api)로 역할 분리                                          |

---

## 5. Before / After 비교

### Before: 결합도 높고 응집력 낮은 구조

```ts
// pages/ProfilePage.tsx
import { loginStore } from "../features/login/store"; // 내부 구현 직접 접근
import { cartActions } from "../features/cart/actions"; // 다른 슬라이스에 의존

export function ProfilePage() {
  const user = loginStore.user;
  // ...
}
```

- `ProfilePage`가 `login`과 `cart`의 내부 구현에 직접 의존
- `login` 또는 `cart`의 내부가 바뀌면 `ProfilePage`도 수정 필요

### After: FSD 원칙 적용

```ts
// pages/ProfilePage.tsx
import { UserProfile } from "@widgets/user-profile"; // Public API만 사용

export function ProfilePage() {
  return <UserProfile />;
}
```

```ts
// widgets/user-profile/ui/UserProfile.tsx
import { useSession } from "@entities/session"; // 하위 레이어 참조

export function UserProfile() {
  const { user } = useSession();
  return <div>{user.name}</div>;
}
```

- `ProfilePage`는 `widgets/user-profile`의 Public API만 사용
- `entities/session`의 내부 변경이 `ProfilePage`에 영향 없음

---

## 6. 확장 가능한 아키텍처를 위한 결론

**느슨한 결합**과 **높은 응집력**은 프로젝트가 커질수록 빛을 발합니다.

- 새 기능을 추가할 때 기존 슬라이스에 영향을 주지 않고 독립적으로 추가할 수 있습니다.
- 특정 기능을 삭제할 때 다른 기능이 망가지지 않습니다.
- 팀이 커져도 각자의 슬라이스에서 독립적으로 작업할 수 있습니다.

FSD는 이 두 원칙을 레이어 구조, 의존성 규칙, Public API라는 구체적인 도구로 프론트엔드에 적용한 방법론입니다.

---

**참고 자료**

- [FSD 공식 문서 - 개요 및 장점](https://feature-sliced.design/kr/docs/get-started/overview#advantages)
