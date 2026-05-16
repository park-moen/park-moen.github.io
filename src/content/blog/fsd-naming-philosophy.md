---
title: "FSD 네이밍 철학: 목적(Why) 중심으로 코드 설계하기"
description: "본질(What) 중심 네이밍과 목적(Why) 중심 네이밍의 차이를 이해하고, FSD에서 슬라이스와 세그먼트의 이름을 짓는 실전 가이드라인을 제시합니다."
pubDate: 2025-04-20T00:00:00+09:00
slug: "2025/04/20/fsd-naming-philosophy"
tags: ["FSD", "Architecture"]
---

## 1. 네이밍이 아키텍처에 미치는 영향

폴더 이름이 왜 중요할까요? 코드를 작성할 때 이름은 단순한 레이블이 아닙니다. 이름만 보고도 **어디에 무엇이 있는지 파악**할 수 있어야 협업과 유지보수가 원활해집니다.

FSD는 이름 짓는 방식에 대해 명확한 철학을 가집니다. 바로 **"본질(What)이 아닌 목적(Why)"** 으로 이름을 짓는 것입니다.

---

## 2. 본질(What) 네이밍의 문제점

**본질 네이밍**은 파일이나 폴더가 **무엇인지** — 즉, 기술적 성격에 따라 이름을 짓는 방식입니다.

```
src/features/
├── components/     ← "컴포넌트들이 있어요"
│   ├── Button.tsx
│   ├── Modal.tsx
│   └── Input.tsx
├── hooks/          ← "훅들이 있어요"
│   ├── useFetch.ts
│   ├── useForm.ts
│   └── useAuth.ts
└── services/       ← "서비스들이 있어요"
    └── apiClient.ts
```

이 구조를 보면 "여기 컴포넌트가 있다", "여기 훅이 있다"는 것만 알 수 있습니다. **"어떤 기능을 위한 코드인가?"** 는 파악할 수 없습니다.

- `components/` 폴더에 파일이 50개 쌓이면 로그인 폼이 어디 있는지 찾기 어렵습니다.
- `FormContainer`, `DropdownHandler` 같은 이름은 "이게 무엇인지"는 알려주지만 "왜 만들었는지"는 모릅니다.
- 새로운 팀원이 "장바구니 기능 코드 어디 있어요?"라고 물으면 명확한 답을 주기 어렵습니다.

---

## 3. 목적(Why) 네이밍의 장점

**목적 네이밍**은 코드가 **왜 존재하는지** — 즉, 비즈니스 역할과 의도에 따라 이름을 짓는 방식입니다.

```
src/features/
├── loginForm/          ← "로그인 폼 기능을 위한 코드"
│   ├── ui/
│   │   └── LoginForm.tsx
│   ├── model/
│   │   └── loginSlice.ts
│   └── index.ts
├── userProfile/        ← "사용자 프로필 기능을 위한 코드"
│   ├── ui/
│   │   └── UserProfile.tsx
│   └── model/
│       └── userProfileApi.ts
└── searchBar/          ← "검색 기능을 위한 코드"
    └── ui/
        └── SearchBar.tsx
```

`loginForm/` 폴더를 보는 순간 "로그인 폼과 관련된 모든 코드가 여기 있구나"라는 것을 즉시 알 수 있습니다.

### 목적 네이밍의 구체적 장점

**1. 가독성 향상**
파일 트리만 훑어봐도 프로젝트에 어떤 기능이 구현되어 있는지 한눈에 파악됩니다.

**2. 탐색 생산성**
IDE에서 "userProfile"을 검색하거나 파일 트리에서 바로 찾을 수 있습니다. `components/` 폴더를 뒤질 필요가 없습니다.

**3. 변경 용이성**
비즈니스 목적이 같다면, 내부 구현(기술 스택, 라이브러리)이 바뀌어도 폴더 이름은 그대로 유지됩니다.

**4. 명확한 책임 분리**
각 폴더가 담당하는 기능이 분명하여, 코드 변경 시 어디를 수정해야 할지 즉시 알 수 있습니다.

---

## 4. 본질 vs 목적 네이밍 비교표

| 구분          | 본질(What) 네이밍                  | 목적(Why) 네이밍                           |
| ------------- | ---------------------------------- | ------------------------------------------ |
| 폴더 이름     | `components/`, `hooks/`, `modals/` | `loginForm/`, `userProfile/`, `searchBar/` |
| 컴포넌트 이름 | `FormContainer`, `ModalComponent`  | `UserAuthForm`, `UserProfileModal`         |
| 훅 이름       | `useFetch`, `useHandler`           | `useAuth`, `useCartSummary`                |
| 전달하는 정보 | "이건 컴포넌트야"                  | "이건 로그인 기능을 위한 거야"             |

---

## 5. FSD 슬라이스 네이밍 가이드라인

### 기능 단위 폴더 이름은 비즈니스 용어로

```
✅ features/loginForm      → 로그인 폼 기능
✅ features/productSearch  → 상품 검색 기능
✅ features/cartCheckout   → 장바구니 결제 기능

❌ features/form           → 어떤 폼인지 모름
❌ features/search         → 너무 추상적
❌ features/components     → 기술적 분류
```

### 동사 + 명사 조합을 활용

명확한 기능을 표현할 때 동사+명사 조합이 효과적입니다.

```
createPost       → 게시글 작성 기능
editProfile      → 프로필 수정 기능
deleteComment    → 댓글 삭제 기능
filterProducts   → 상품 필터링 기능
```

### Shared에는 진짜 공통만

`shared` 폴더는 **어디서든 쓸 수 있는 순수한 공통 코드**만 위치합니다. 특정 기능에만 쓰이는 코드가 `shared`에 있으면 안 됩니다.

```
shared/
├── ui/
│   ├── Button.tsx      ← 전역 버튼 컴포넌트
│   └── Input.tsx       ← 전역 인풋 컴포넌트
└── lib/
    ├── formatDate.ts   ← 날짜 포맷 유틸
    └── cn.ts           ← 클래스명 합성 유틸
```

---

## 6. 팀 합의와 린트 룰 적용

네이밍 가이드라인은 팀 전체가 공유해야 효과가 있습니다.

**PR 템플릿에 체크리스트 추가**

```markdown
## 체크리스트

- [ ] 새로 만든 슬라이스 이름이 비즈니스 목적을 반영하는가?
- [ ] `shared`에 특정 기능에만 쓰이는 코드가 들어가지 않았는가?
```

**ESLint로 폴더 구조 강제**

`eslint-plugin-boundaries`를 활용하면 잘못된 계층 구조를 자동으로 감지할 수 있습니다.

---

## 7. 정리

> 코드의 이름은 "이게 무엇인가(What)"가 아니라 "이게 왜 여기 있는가(Why)"를 설명해야 합니다.

작은 네이밍 습관 하나가 장기적으로 코드베이스의 가독성, 유지보수성, 협업 생산성을 모두 향상시킵니다. FSD의 네이밍 철학을 팀 문화로 정착시키면, 새로운 팀원이 합류해도 빠르게 코드 구조를 이해할 수 있습니다.
