# Mini React Todo Demo

<p align="center">
  <a href="https://github.com/chaekang/Jungle_React_W5/blob/main/README.md">
    <img src="docs/assets/readme-qr.svg" alt="README QR Code" width="180" />
  </a>
</p>

<p align="center">모바일에서 README를 바로 열 수 있는 QR 코드입니다.</p>



## 목차

1. [프로젝트 한 줄 소개](#프로젝트-한-줄-소개)
2. [발표 순서](#발표-순서)
3. [과제 요구사항 대응](#과제-요구사항-대응)
4. [프로젝트 구조](#프로젝트-구조)
5. [실제 동작 흐름](#실제-동작-흐름)
6. [데모에서 보여줄 포인트](#데모에서-보여줄-포인트)
7. [React와 Mini React의 차이](#react와-mini-react의-차이)
8. [테스트와 검증](#테스트와-검증)
9. [실행 방법](#실행-방법)


## 프로젝트 한 줄 소개
React의 핵심 개념인 `Component`, `State`, `Hooks`, `Virtual DOM + Diff + Patch`를 직접 구현하고 이를 직관적으로 이해할 수 있는 Todo 데모 페이지를 만든 프로젝트입니다.


### 1. 왜 이 프로젝트를 만들었는가
- 4주차 수요 코딩회에서는 Virtual DOM을 만들고, 이전 Virtual DOM과 새로운 Virtual DOM을 비교해 diff 알고리즘으로 달라진 부분을 찾은 뒤, patch를 통해 실제 DOM에 반영하는 렌더링 과정에 초점을 맞췄습니다.
- 5주차에는 그 흐름을 한 단계 더 확장해, 함수형 컴포넌트, FunctionComponent, hooks[], useState, useEffect, useMemo를 직접 구현하고, 상태 변경 이후 왜 새로운 Virtual DOM이 다시 만들어지는지까지 이해하고 구현하는 데 초점을 맞췄습니다.
- 특히 아래 질문에 답할 수 있는 결과물을 만드는 것이 목표였습니다.
  - 함수형 컴포넌트는 매번 다시 실행되는데 state는 어디에 저장될까?
  - `setState`가 호출되면 어떤 순서로 다시 렌더링될까?
  - 왜 Virtual DOM을 비교하고, 왜 필요한 부분만 patch할까?

### 2. 어떤 구조로 만들었는가

- `src/mini-react`: 직접 구현한 Mini React 코어
- `src/app`: 그 코어를 사용하는 Todo 데모 앱
- 루트 `App`이 모든 상태를 관리하고, 자식 컴포넌트는 props만 받는 stateless 구조로 설계했습니다.


## 과제 요구사항 대응

| 함수형 컴포넌트 | `App`, `TodoInput`, `TodoList`, `TodoItem`, `TodoFooter` 모두 함수형으로 작성 |
| `FunctionComponent` 클래스 | `src/mini-react/component.ts`에서 구현 |
| `hooks[]` 배열 | 루트 `FunctionComponent` 인스턴스가 모든 Hook 상태 보관 |
| `mount()` / `update()` | 최초 렌더와 상태 변경 후 재렌더 담당 |
| `useState` | 상태 저장 및 setter 호출 시 즉시 `update()` 실행 |
| `useEffect` | 의존성 비교 후 microtask 시점에 실행 |
| `useMemo` | 의존성 배열이 바뀔 때만 재계산 |
| 상태는 루트에서만 관리 | 모든 state는 `App`에 집중 |
| 자식 컴포넌트는 props only | 자식은 hooks 없이 순수 렌더링만 수행 |
| Virtual DOM + Diff + Patch | `vdom.ts`, `diff.ts`, `patch.ts`로 구현 |
| 동작하는 웹 페이지 | Todo 입력, 수정, 삭제, 필터링, 디버그 패널 제공 |

## 프로젝트 구조

```text
.
├─ src
│  ├─ app
│  │  ├─ App.tsx
│  │  ├─ main.ts
│  │  ├─ styles.css
│  │  ├─ types.ts
│  │  └─ components
│  │     ├─ TodoFooter.tsx
│  │     ├─ TodoInput.tsx
│  │     ├─ TodoItem.tsx
│  │     └─ TodoList.tsx
│  └─ mini-react
│     ├─ component.ts
│     ├─ diff.ts
│     ├─ hooks.ts
│     ├─ index.ts
│     ├─ logger.ts
│     ├─ patch.ts
│     └─ vdom.ts
└─ tests
   ├─ app.test.ts
   ├─ component.test.ts
   ├─ diff.test.ts
   ├─ hooks.test.ts
   ├─ patch.test.ts
   └─ vdom.test.ts
```

### 핵심 역할

- `FunctionComponent`
  - 루트 렌더러
  - `hooks[]` 저장소
  - `mount()`와 `update()` 담당
- `hooks.ts`
  - `useState`, `useEffect`, `useMemo`
  - 현재 렌더 중인 루트 컴포넌트와 `hookIndex` 관리
- `diff.ts`
  - 이전/다음 Virtual DOM 비교
  - key 기반 child 비교 지원
- `patch.ts`
  - 실제 DOM에 최소 변경만 반영
- `App.tsx`
  - 모든 state와 이벤트 핸들러 관리
  - 디버그 패널까지 포함한 발표용 데모 UI 구성

## 실제 동작 흐름

### 1. 초기 마운트

```text
main.ts
  -> new FunctionComponent(container, () => h(App, null))
  -> mount()
  -> render()
  -> App() 실행
  -> TodoInput / TodoList / TodoItem / TodoFooter 함수들 실행
  -> Virtual DOM 생성
  -> createDom()
  -> 실제 DOM 삽입
  -> scheduleEffectFlush()
  -> microtask 시점에 useEffect 실행
```

### 2. 상태 변경 이후 업데이트

```text
사용자 이벤트
  -> setState()
  -> hooks[slotIndex].value 갱신
  -> component.update()
  -> render()로 App 다시 실행
  -> 새 Virtual DOM 생성
  -> diff(oldVdom, newVdom)
  -> patch(rootNode, ops)
  -> scheduleEffectFlush()
  -> microtask 시점에 effect 실행
```

### 3. state가 유지되는 이유

- state는 함수 안에 저장되지 않습니다.
- 루트 `FunctionComponent` 인스턴스의 `hooks[]` 배열에 저장됩니다.
- 렌더링이 시작되면 `hookIndex = 0`부터 다시 읽기 때문에, 같은 순서로 호출된 Hook은 같은 칸을 재사용합니다.


## React와 Mini React의 차이

| 항목 | 실제 React | 이번 Mini React |
| --- | --- | --- |
| 컴포넌트 단위 상태 보관 | 컴포넌트마다 독립적인 상태 관리 가능 | 루트 `FunctionComponent` 하나가 모든 Hook 상태를 관리 |
| 렌더링 스케줄링 | Fiber, batching, concurrent rendering 등 고급 기능 존재 | 상태 변경 시 즉시 `update()` |
| Hook 사용 범위 | 규칙만 지키면 자식 컴포넌트에서도 사용 가능 | 현재 구조에서는 루트에서만 안전 |
| effect 처리 | 정교한 스케줄링과 commit 단계 존재 | patch 후 microtask에서 flush |
| diff 최적화 | 훨씬 복잡하고 다양한 최적화 존재 | 학습용으로 단순화된 diff/patch |

### diff 알고리즘을 더 확장하지 않은 이유

- 구현 과정에서 다른 프레임워크들의 diff 방식과 리스트 갱신 전략도 참고했습니다.
- 특히 key 기반 비교를 더 확장하거나, 컴포넌트 단위로 더 세밀하게 재사용하는 방향도 고려했습니다.
- 하지만 이번 과제는 `state`를 최상위 컴포넌트에서만 관리하고, 자식 컴포넌트는 props만 받는 구조를 전제로 했습니다.
- 그래서 자식 컴포넌트별 독립 state, 독립 Hook host, 인스턴스 재사용까지 포함한 고급 diff 전략은 이번 Mini React 구조에 그대로 반영하기 어려웠습니다.
- 대신 이번 프로젝트에서는 제약조건 안에서 `hooks[]` 배열, 상태 변경 이후 재렌더링, Virtual DOM diff/patch의 핵심 원리를 명확히 설명할 수 있는 구조를 우선했습니다.

### 왜 state를 최상위 컴포넌트만 갖게 했을까

- 이 제약의 의도는 기능을 줄이기 위한 것이라기보다, 상태 흐름을 단순하게 만들어 핵심 원리를 더 잘 보이게 하려는 데 있다고 해석했습니다.
- 부모만 state를 가지면 데이터 흐름이 한 방향으로 정리되고, 자식은 props만 보게 되므로 상태 변화 추적이 훨씬 쉬워집니다.
- 또한 자식 컴포넌트까지 각자 state를 가지게 하면 컴포넌트 인스턴스 보존, Hook host 분리, 렌더 순서 안정성 같은 문제가 한꺼번에 등장합니다.
- 이번 과제는 그 복잡함까지 한 번에 다루기보다, 먼저 `Hook은 어떤 슬롯에 저장되는가`, `setState 이후 어떤 순서로 다시 그려지는가`, `왜 lifting state up이 필요한가`를 이해하게 하려는 의도가 더 크다고 보았습니다.

### 우리가 구현에서 얻은 핵심 이해

- Hook의 본질은 "호출 순서에 따른 슬롯 재사용"이라는 점
- state를 부모로 올리면 데이터 흐름이 훨씬 명확해진다는 점
- key가 리스트 diff에서 왜 중요한지 직접 확인할 수 있다는 점
- React가 왜 내부적으로 더 복잡한 구조를 필요로 하는지 체감할 수 있었다는 점

## 테스트와 검증

`Vitest`로 코어 로직과 앱 동작을 함께 검증했습니다.

- `vdom.test.ts`: VNode 생성과 children 정규화
- `diff.test.ts`: props 변경, text 변경, key 기반 child diff
- `patch.test.ts`: 실제 DOM patch 반영과 이벤트/속성 처리
- `hooks.test.ts`: Hook slot 유지, memo 재사용, effect cleanup
- `component.test.ts`: mount/update/effect flush와 patch 로그
- `app.test.ts`: Todo 수정 저장/취소 시 UI가 깨지지 않는지 검증

검증 결과

- `npm run test`: 27개 테스트 통과
- `npm run build`: 프로덕션 빌드 성공

## 실행 방법

```bash
npm install
npm run dev
```

테스트 실행

```bash
npm run test
```

빌드 확인

```bash
npm run build
```
