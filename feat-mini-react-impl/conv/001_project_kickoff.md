# 프로젝트 시작 및 기술 스택 결정

## 배경

Week 5 수요 코딩회 과제로 React의 핵심 개념을 처음부터 구현해야 한다.
목요일 오전 발표까지 하루 안에 완성해야 하며, 포트폴리오 수준의 완성도가 요구된다.
Week 3/4에서 쓰던 Virtual DOM 코드가 없어 이번 레포에서 전부 새로 작성해야 한다.

## 요청 내용

`docs/001_TODO.md`를 기반으로 구현 계획 PRD 작성.
명확하지 않은 부분은 먼저 질문해서 확인.

## 고려한 선택지

### 언어/빌드

| 선택지 | 이유 |
|---|---|
| **TypeScript + Vite** (선택) | 복잡한 타입 구조(VNode, PatchOp 등) 명시 가능, JSX pragma 설정 용이, Vitest와 설정 공유 |
| JavaScript + Vite | 타입 없어 VNode/PatchOp 같은 유니온 타입 표현 어려움 |
| Vanilla JS (no bundler) | 모듈 시스템 없어 코드 분리 불편 |

### 테스트

| 선택지 | 이유 |
|---|---|
| **Vitest** (선택) | Vite와 설정 공유, jsdom 환경 기본 제공, Jest 호환 API |
| Jest | 별도 babel/ts-jest 설정 필요, Vite와 이원화 |

### 데모 앱 주제

| 선택지 | 이유 |
|---|---|
| **Todo List** (선택) | useState/useEffect/useMemo를 고르게 활용, 구현 범위 예측 가능 |
| 쇼핑 카트 | 복잡도 높아 하루 안에 완성 리스크 |
| 블로그/게시판 | 라우팅 개념 추가 필요 |

## 결정

TypeScript + Vite + Vitest, Todo List 데모.

발표 일정(목요일 오전)을 고려해 구현 범위가 명확하고 예측 가능한 주제를 선택했다.
TypeScript는 학습 비용보다 타입 안정성이 주는 이득이 크다고 판단 — 특히 VNode 같은 복잡한 유니온 타입을 다룰 때.

## 영향

모든 소스 파일이 `.ts` / `.tsx`가 된다. Vite + TS 설정이 초기 작업에 포함된다.
