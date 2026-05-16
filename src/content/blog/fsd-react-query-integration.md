---
title: "FSD + React Query 통합: 데이터 관리 모범 사례"
description: "Feature-Sliced Design과 TanStack Query(React Query)를 함께 사용하는 방법을 설명합니다. Queries는 Entities에, Mutations는 Features에 두는 원칙과 세그먼트별 역할 분담을 코드 예시와 함께 정리합니다."
pubDate: 2025-06-29T00:00:00+09:00
slug: "2025/06/29/fsd-react-query-integration"
tags: ["FSD", "Architecture", "React Query"]
---

## 1. 왜 FSD와 React Query를 함께 사용하는가?

**React Query(TanStack Query)** 는 서버 상태를 관리하는 데 특화된 라이브러리입니다. 데이터 페칭, 캐싱, 동기화를 선언적으로 처리할 수 있어 프론트엔드 개발의 복잡성을 크게 줄여줍니다.

FSD와 React Query를 함께 쓸 때의 핵심 질문은 이것입니다.

> "Query와 Mutation을 어느 레이어에 두어야 할까?"

FSD는 이에 대해 명확한 원칙을 제시합니다.

- **Queries(읽기)** → `entities` 레이어
- **Mutations(쓰기)** → `features` 레이어

---

## 2. Queries → Entities 레이어에 정의하기

`entities` 레이어는 **도메인 데이터를 표현하고 관리**하는 레이어입니다. 서버에서 데이터를 조회하는 Query는 여러 `features`에서 공통으로 재사용될 수 있으므로 `entities`에 위치합니다.

```
entities/
└── user/
    ├── api/
    │   ├── userApi.ts      ← API 호출 함수
    │   └── hooks.ts        ← useQuery 훅
    ├── ui/
    │   └── UserCard.tsx
    └── index.ts
```

```ts
// entities/user/api/userApi.ts
export const fetchUserData = async (): Promise<User> => {
  const response = await fetch("/api/user");
  if (!response.ok) throw new Error("Failed to fetch user data");
  return response.json();
};
```

```ts
// entities/user/api/hooks.ts
import { useQuery } from "@tanstack/react-query";
import { fetchUserData } from "./userApi";

export const useUserData = () => {
  return useQuery({
    queryKey: ["user"],
    queryFn: fetchUserData,
  });
};
```

```ts
// entities/user/index.ts
export { useUserData } from "./api/hooks";
export { UserCard } from "./ui/UserCard";
export type { User } from "./model/types";
```

`useUserData`를 `entities/user`에 두면, `features/userProfile`, `features/userSettings` 등 여러 기능에서 중복 없이 재사용할 수 있습니다.

---

## 3. Mutations → Features 레이어에 정의하기

`features` 레이어는 **특정 비즈니스 기능의 사용자 상호작용**을 담당합니다. 데이터를 변경하는 Mutation은 특정 기능에 귀속되므로 `features`에 위치합니다.

```
features/
└── userProfile/
    ├── api/
    │   └── mutations.ts    ← useMutation 훅
    ├── ui/
    │   └── UpdateProfileForm.tsx
    └── index.ts
```

```ts
// features/userProfile/api/mutations.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";

const updateUserProfile = async (data: UpdateProfileInput) => {
  const response = await fetch("/api/user", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to update profile");
  return response.json();
};

export const useUpdateUserProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateUserProfile,
    onSuccess: () => {
      // 성공 후 user 쿼리 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });
};
```

---

## 4. 세그먼트(api/model/ui) 역할 분담

FSD의 각 슬라이스는 세그먼트로 더 세분화됩니다.

| 세그먼트 | 역할                     | 예시                                   |
| -------- | ------------------------ | -------------------------------------- |
| `api`    | 서버 통신 로직           | API 호출 함수, useQuery/useMutation 훅 |
| `model`  | 데이터 모델, 유효성 검사 | Zod 스키마, 상태 관리 슬라이스         |
| `ui`     | 사용자 인터페이스        | React 컴포넌트                         |

---

## 5. 폼 데이터 처리 실전 예시

프로필 수정 폼 전체 흐름을 예시로 살펴봅니다.

### features/userProfile/model/schema.ts — 유효성 검사

```ts
import { z } from "zod";

export const updateProfileSchema = z.object({
  name: z.string().min(1, "이름을 입력해주세요"),
  email: z.string().email("올바른 이메일 형식을 입력해주세요"),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
```

### features/userProfile/ui/UpdateProfileForm.tsx — UI

```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Input } from "@shared/ui";
import { useUserData } from "@entities/user";
import { useUpdateUserProfile } from "../api/mutations";
import { updateProfileSchema, type UpdateProfileInput } from "../model/schema";

export function UpdateProfileForm() {
  const { data: user } = useUserData(); // entities에서 Query 사용
  const { mutate, isPending } = useUpdateUserProfile(); // features 내 Mutation 사용

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: { name: user?.name, email: user?.email },
  });

  const onSubmit = (data: UpdateProfileInput) => mutate(data);

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Input {...register("name")} error={errors.name?.message} />
      <Input {...register("email")} error={errors.email?.message} />
      <Button type="submit" disabled={isPending}>
        {isPending ? "저장 중..." : "저장"}
      </Button>
    </form>
  );
}
```

이 구조에서:

- `shared/ui` → Button, Input 공통 컴포넌트
- `entities/user` → 사용자 데이터 Query
- `features/userProfile/model` → 유효성 검사 스키마
- `features/userProfile/api` → 프로필 수정 Mutation
- `features/userProfile/ui` → 폼 UI

각 역할이 명확하게 분리되어 있습니다.

---

## 6. Cross-import 없이 독립성 유지하기

React Query를 통합할 때 주의할 점은, **features 간 Mutation을 공유하지 않는 것**입니다.

```ts
// ❌ 잘못된 방법: features/userSettings에서 features/userProfile의 mutation 참조
import { useUpdateUserProfile } from "@features/userProfile/api/mutations";
```

`features/userSettings`가 `features/userProfile`에 의존하면 두 슬라이스가 강하게 결합됩니다. 두 기능에서 공통으로 필요한 API 호출 함수가 있다면 `entities` 레이어로 옮겨야 합니다.

```ts
// ✅ 올바른 방법: 공통 로직은 entities로 이동
import { fetchUserData } from "@entities/user/api/userApi";
```

---

## 7. 정리

| 항목                 | 위치             | 이유                                          |
| -------------------- | ---------------- | --------------------------------------------- |
| `useQuery` (읽기)    | `entities`       | 여러 features에서 재사용 가능한 도메인 데이터 |
| `useMutation` (쓰기) | `features`       | 특정 기능의 사용자 상호작용에 귀속            |
| API 호출 함수        | `api` 세그먼트   | 서버 통신 로직 분리                           |
| 유효성 검사 스키마   | `model` 세그먼트 | 데이터 모델 관련 로직                         |
| React 컴포넌트       | `ui` 세그먼트    | 시각적 표현과 사용자 상호작용                 |

---

**참고 자료**

- [TanStack Query 공식 문서](https://tanstack.com/query/latest)
- [FSD 공식 문서 - 튜토리얼](https://feature-sliced.design/kr/docs/get-started/tutorial)
- [FSD 공식 문서 - Usage with React Query](https://feature-sliced.design/kr/docs/guides/tech/with-react-query)
