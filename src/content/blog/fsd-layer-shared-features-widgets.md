---
title: "FSD Layer 비교: Shared vs Features vs Widgets"
description: "FSD(Feature-Sliced Design)의 Shared, Features, Widgets 레이어의 책임과 재사용 범위, 추상화 레벨을 예제와 함께 비교합니다."
pubDate: 2025-10-20T00:00:00+09:00
slug: "2026/03/17/fsd-layer-shared-features-widgets"
tags: ["FSD", "Architecture"]
---

### 1. 서론

대규모 프론트엔드 애플리케이션을 유지보수하기 위해선 **관심사의 분리(Separation of Concerns)** 와 **재사용성 관리**가 필수입니다. FSD(Feature‑Sliced Design)에서는 이를 위해 레이어를 구분하고, 각 레이어가 어떤 책임을 지며 어떻게 상호작용해야 하는지 엄격히 정의합니다. 이 글에선 그중에서도 **Shared**, **Features**, **Widgets** 레이어를 집중적으로 살펴보고, 각 레이어의 책임·재사용 범위·추상화 레벨을 예제와 함께 비교합니다.

---

## 2. Shared Layer: 순수 UI·유틸의 집합

- **주요 책임**
  - 애플리케이션 전역에서 사용되는 **스타일·인터페이스만** 정의
  - 비즈니스 로직이나 상태 관리 없이, Props 기반으로 순수 동작
- **재사용 범위**
  - 애플리케이션 내 **모든 레이어**(Entities, Features, Widgets, Pages, App)에서 자유롭게 import 가능
- **예시 컴포넌트 & 유틸**

  ```tsx
  // src/shared/ui/Button.tsx
  export interface ButtonProps {
    onClick: () => void;
    children: React.ReactNode;
  }
  export function Button({ onClick, children }: ButtonProps) {
    return <button className="btn">{children}</button>;
  }

  // src/shared/lib/formatDate.ts
  export function formatDate(date: Date): string {
    return date.toLocaleDateString();
  }
  ```

- **특징 요약**
  - 순수 프리미티브(버튼, 입력창, 스피너, 아이콘 등)
  - CSS 변수·테마·공통 인터페이스만 관리
  - **절대** 비즈니스 로직 포함 금지

---

## 3. Features Layer: 한 가지 기능 단위 책임

- **주요 책임**
  - **단일 비즈니스 액션**(Feature)에 집중
  - API 호출·상태 관리·검증 로직 등 해당 기능을 수행하는 **비즈니스 로직** 포함
  - Shared/ui 컴포넌트를 조합해 UI를 구성
- **재사용 범위**
  - **같은 슬라이스 내**에서만 import 가능
  - 서로 다른 Feature 슬라이스 간 참조 금지(독립성 보장)
- **예시: 로그인 기능**

  ```tsx
  // src/features/Auth/model/useLogin.ts
  import { useState } from "react";

  export function useLogin() {
    const [error, setError] = useState<string | null>(null);
    const handleSubmit = async (data: { email: string; pw: string }) => {
      try {
        // 로그인 API 호출...
      } catch {
        setError("로그인 실패");
      }
    };
    return { error, handleSubmit };
  }

  // src/features/Auth/ui/LoginForm.tsx
  import { Button, Input } from "~/shared/ui";
  import { useLogin } from "../model/useLogin";

  export function LoginForm() {
    const { error, handleSubmit } = useLogin();
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit({ email: "", pw: "" });
        }}
      >
        <Input placeholder="Email" />
        <Input placeholder="Password" type="password" />
        {error && <div className="error">{error}</div>}
        <Button onClick={() => handleSubmit({ email: "", pw: "" })}>로그인</Button>
      </form>
    );
  }
  ```

- **특징 요약**
  - 기능별 UI + 로직 묶음
  - Shared를 가져와 조합하고, 필요한 훅·슬라이스(API 호출·상태) 직접 사용
  - **작은 단위 기능** 단독 테스트 & 리팩토링 용이

---

## 4. Widgets Layer: 독립적·중간 단위 UI 블록

- **주요 책임**
  - 여러 페이지에서 재사용되는 **중간 단위 UI 블록**
  - 자체적으로 데이터 페칭·로딩·에러 경계 처리 가능
  - Features(혹은 Entities)의 기능들을 묶어 하나의 "완성된 컴포넌트"로 제공
- **재사용 범위**
  - 애플리케이션 **여러 페이지**에서 import 가능
  - Pages 레이어를 거치지 않고도 직접 사용 최적화
- **예시: 사용자 프로필 카드**

  ```tsx
  // src/widgets/UserProfileCard/model/userApi.ts
  import { useQuery } from "@tanstack/react-query";

  export function fetchUser(userId: string) {
    return useQuery(["user", userId], () => fetch(`/api/users/${userId}`).then((res) => res.json()));
  }

  // src/widgets/UserProfileCard/ui/UserProfileCard.tsx
  import { Spinner } from "~/shared/ui";
  import { fetchUser } from "../model/userApi";

  export function UserProfileCard({ userId }: { userId: string }) {
    const { data, isLoading } = fetchUser(userId);
    if (isLoading) return <Spinner />;
    return (
      <div className="card">
        <img src={data.avatar} alt="" />
        <h2>{data.name}</h2>
        <p>{data.bio}</p>
      </div>
    );
  }
  ```

- **특징 요약**
  - **코드 스플리팅**과 **lazy loading** 포인트
  - 자체 **Suspense**, **ErrorBoundary** 적용 가능
  - 복합 기능 묶음으로, Pages나 다른 Widgets에서 재사용

---

## 5. 세 레이어 비교 표

| Layer        | 책임                                | 포함 요소                             | 재사용 범위              | 로딩·에러 경계 |
| ------------ | ----------------------------------- | ------------------------------------- | ------------------------ | -------------- |
| **Shared**   | 순수 UI·유틸                        | Button, Input, Spinner, formatDate 등 | 애플리케이션 전역        | ×              |
| **Features** | 한 가지 비즈니스 기능               | useLogin, LoginForm 등                | 같은 Feature 슬라이스 내 | ◯(기능별)      |
| **Widgets**  | 중간 단위 복합 UI 블록(독립적 경계) | UserProfileCard, CommentsSection 등   | 여러 페이지(전역)        | ◯(독립적)      |

---

## 6. 결론

- **Shared** 는 **모양만** 관리하는 프리미티브 컴포넌트
- **Features** 는 **작은 기능 단위**로 비즈니스 로직과 UI를 결합
- **Widgets** 는 여러 기능을 묶어 **독립 로딩·에러 경계**를 제공하는 중간 단위 컴포넌트

이렇게 각 레이어의 **책임**과 **재사용 범위**, **추상화 레벨**을 명확히 분리하면, 코드베이스의 **유연성·확장성·유지보수성**을 동시에 높일 수 있습니다.
