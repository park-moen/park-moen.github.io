---
title: "FSD Public API와 Barrel File 패턴 완전 이해"
description: "FSD에서 index.ts를 활용한 Public API 설계 방법과 Barrel File 패턴의 장단점, 트리 셰이킹 성능 이슈 해결 방법까지 정리합니다."
pubDate: 2025-06-15T00:00:00+09:00
slug: "2025/06/15/fsd-public-api-barrel-file"
tags: ["FSD", "Architecture", "Barrel Export"]
---

## 1. Public API가 필요한 이유

FSD에서 각 슬라이스는 **외부에서 어떻게 사용될지**를 명확하게 정의해야 합니다. 이것이 **Public API**의 역할입니다.

Public API가 없다면 어떤 일이 벌어질까요?

```ts
// ❌ Public API 없이 내부 파일 직접 참조
import { getUserProfile } from "@entities/user/model/userModel";
import { UserCard } from "@entities/user/ui/components/UserCard";
import { USER_ROLES } from "@entities/user/model/constants/roles";
```

- `entities/user`의 내부 폴더 구조를 외부에서 모두 알아야 합니다.
- `userModel.ts`가 `userService.ts`로 이름이 바뀌면 이를 참조하는 모든 파일을 수정해야 합니다.
- 내부 구현과 외부 인터페이스의 경계가 없어집니다.

---

## 2. index.ts로 Public API 구현하기

각 슬라이스의 루트에 `index.ts` 파일을 두고, **외부에 공개할 것만 export** 합니다.

```ts
// entities/user/index.ts  ← Public API 진입점
export { getUserProfile, updateUserProfile } from "./model/userModel";
export { UserCard } from "./ui/UserCard";
export type { User } from "./model/types";
```

이제 외부에서는 `entities/user`의 내부 구조를 알 필요 없이 `index.ts`를 통해서만 접근합니다.

```ts
// ✅ Public API를 통한 참조
import { getUserProfile, UserCard } from "@entities/user";
```

`entities/user`의 내부 구조가 어떻게 바뀌어도, `index.ts`의 export가 유지되는 한 외부 코드는 수정할 필요가 없습니다.

---

## 3. Bad vs Good 비교

### Bad Example: 내부 파일 직접 참조

```ts
// features/userProfile/ui/UserProfile.tsx

// ❌ 내부 구현 경로 직접 접근
import { getUserProfile } from "@entities/user/model/userModel";
import { UserCard } from "@entities/user/ui/components/UserCard";
```

- `entities/user` 내부 폴더 구조가 바뀌면 이 파일도 수정 필요
- `entities/user`가 어떤 파일들을 가지고 있는지 외부에서 파악해야 함

### Good Example: Public API 통한 참조

```ts
// features/userProfile/ui/UserProfile.tsx

// ✅ Public API(index.ts)를 통해 접근
import { getUserProfile, UserCard } from "@entities/user";

function UserProfile() {
  const userProfile = getUserProfile();
  return <UserCard profile={userProfile} />;
}
```

- `entities/user` 내부가 어떻게 바뀌어도 이 파일은 영향 없음
- 외부에서는 `entities/user`가 무엇을 제공하는지만 알면 됨

---

## 4. Barrel File 패턴이란?

`index.ts`를 통해 여러 모듈을 한 곳에서 모아 내보내는 방식을 **Barrel File 패턴**이라고 합니다.

```
entities/user/
├── model/
│   ├── userModel.ts
│   └── types.ts
├── ui/
│   └── UserCard.tsx
└── index.ts         ← Barrel File
```

```ts
// entities/user/index.ts (Barrel File)
export { getUserProfile } from "./model/userModel";
export { UserCard } from "./ui/UserCard";
export type { User } from "./model/types";
```

### Barrel File의 장점

- **간결한 import**: 경로가 짧아지고 일관성이 생깁니다.
- **캡슐화**: 내부 구현을 감추고 필요한 것만 공개합니다.
- **리팩토링 용이**: 내부 파일을 이동하거나 이름을 바꿔도 외부 코드에 영향 없음.

---

## 5. 성능 이슈: 트리 셰이킹 문제

Barrel File 패턴에는 한 가지 주의사항이 있습니다. 번들러 설정에 따라 **트리 셰이킹(Tree Shaking)** 이 비효율적으로 동작할 수 있습니다.

트리 셰이킹이란 사용하지 않는 코드를 번들에서 제거하는 최적화 기법입니다.

```ts
// UserCard만 필요한데 index.ts 전체를 로드하면?
import { UserCard } from "@entities/user";
```

번들러가 `index.ts`의 모든 export를 분석하지 못하는 경우, 실제로 사용하지 않는 `getUserProfile` 등도 번들에 포함될 수 있습니다.

### 해결 방법 1: sideEffects 설정 (package.json)

```json
{
  "sideEffects": false
}
```

이 설정은 번들러에게 "이 패키지의 모든 모듈은 사이드 이펙트가 없으니 트리 셰이킹을 적극적으로 해도 된다"고 알립니다.

### 해결 방법 2: Vite / Rollup의 경우

Vite(Rollup 기반)는 ES Module을 기반으로 트리 셰이킹을 잘 처리합니다. `export` 구문이 올바르게 사용되면 대부분의 경우 자동으로 최적화됩니다.

### 해결 방법 3: 성능이 중요한 경우 직접 경로 사용

정말 번들 사이즈가 중요한 경우, 특정 모듈은 직접 경로로 가져올 수 있습니다.

```ts
// Barrel File 대신 직접 경로
import { UserCard } from "@entities/user/ui/UserCard";
```

다만 이 방식은 FSD의 캡슐화 원칙을 약화시키므로, 성능 측정 후 꼭 필요한 경우에만 사용하는 것을 권장합니다.

---

## 6. 정리

| 항목                | 내용                                                           |
| ------------------- | -------------------------------------------------------------- |
| **Public API 목적** | 슬라이스 내부 구현을 감추고 외부 인터페이스를 명확히 정의      |
| **구현 방법**       | 슬라이스 루트에 `index.ts` 생성, 공개할 것만 export            |
| **Barrel File**     | Public API를 구현하는 대표적인 패턴                            |
| **성능 이슈**       | `sideEffects: false` 설정, ES Module 기반 번들러 사용으로 대응 |

Public API는 FSD에서 모듈 간 경계를 명확히 하는 핵심 수단입니다. 슬라이스마다 `index.ts`를 작성하는 습관을 들이면 리팩토링 비용이 크게 줄어듭니다.

---

**참고 자료**

- [FSD 공식 문서 - 엄격한 Public API 정의](https://feature-sliced.design/kr/docs/get-started/tutorial#%EC%97%84%EA%B2%A9%ED%95%9C-%EA%B3%B5%EA%B0%9C-api-%EC%A0%95%EC%9D%98)
