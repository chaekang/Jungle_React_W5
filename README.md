# Mini React Todo Demo

TypeScript로 React의 핵심 개념을 직접 구현하고, 그 결과물을 브라우저에서 확인할 수 있는 Mini React Todo Demo 프로젝트입니다.

이번 프로젝트의 목표는 단순히 Todo 앱을 만드는 것이 아니라, 아래 질문에 직접 답할 수 있는 구현물을 만드는 것이었습니다.

- 함수형 컴포넌트에서 state는 어디에 저장되는가?
- `setState`가 호출되면 어떤 순서로 화면이 다시 그려지는가?
- Virtual DOM diff와 patch는 실제 DOM 업데이트를 어떻게 줄여 주는가?
- 부모와 자식 컴포넌트는 어떤 기준으로 역할을 나누는가?

이 프로젝트는 위 질문을 코드와 화면으로 함께 설명할 수 있도록 구성했습니다.

## 1. 프로젝트 소개

이 저장소는 외부 프레임워크 없이 React의 핵심 기능 일부를 직접 구현한 Mini React 라이브러리와, 이를 활용한 Todo 데모 애플리케이션으로 이루어져 있습니다.

핵심 구현 대상
- `FunctionComponent` 클래스
- `hooks` 배열 기반 상태 저장
- `useState`
- `useEffect`
- `useMemo`
- Virtual DOM 생성
- Diff 알고리즘
- Patch를 통한 최소 DOM 업데이트

데모 앱 특징
- Todo 추가, 완료 토글, 삭제, 수정
- 전체 / 진행 중 / 완료 필터
- `document.title` 동기화
- `hooks` 배열 시각화
- diff / patch 로그 패널
- 자식 컴포넌트 props 구조 확인 패널

## 2. 구현 목표

과제 요구사항에 맞춰 다음 원칙을 지켰습니다.

1. 모든 컴포넌트는 함수형으로 작성했습니다.
2. state와 hooks는 루트 컴포넌트인 `App`에서만 관리합니다.
3. 자식 컴포넌트는 props만 받아서 렌더링하는 Stateless Component로 구성했습니다.
4. 상태 변경 이후에는 전체 DOM을 다시 만드는 대신, 이전 Virtual DOM과 새로운 Virtual DOM을 비교한 뒤 바뀐 부분만 patch 합니다.

즉, 이 프로젝트는 "작동하는 결과물"과 "설명 가능한 구현"을 동시에 목표로 했습니다.

## 3. 기술 스택

- TypeScript
- Vite
- Vitest
- HTML / CSS
- Custom Mini React Runtime

## 4. 폴더 구조

```text
.
├─ src
│  ├─ mini-react
│  │  ├─ component.ts
│  │  ├─ diff.ts
│  │  ├─ hooks.ts
│  │  ├─ patch.ts
│  │  ├─ vdom.ts
│  │  └─ index.ts
│  └─ app
│     ├─ App.tsx
│     ├─ main.ts
│     ├─ styles.css
│     ├─ types.ts
│     └─ components
│        ├─ TodoFooter.tsx
│        ├─ TodoInput.tsx
│        ├─ TodoItem.tsx
│        └─ TodoList.tsx
├─ tests
│  ├─ app.test.ts
│  ├─ component.test.ts
│  ├─ diff.test.ts
│  ├─ hooks.test.ts
│  ├─ patch.test.ts
│  └─ vdom.test.ts
├─ docs
└─ conv
```

## 5. 핵심 설계

### 5-1. Component

루트 렌더링은 `FunctionComponent` 클래스가 담당합니다.

이 클래스는 다음 책임을 가집니다.
- `hooks[]` 배열을 보관
- `mount()`로 최초 렌더링 수행
- `update()`로 상태 변경 이후 재렌더링 수행
- 이전 Virtual DOM과 새로운 Virtual DOM 비교
- diff 결과를 patch로 실제 DOM에 반영

핵심 아이디어는 "컴포넌트 함수는 다시 실행되더라도, 상태는 클래스 인스턴스의 hooks 배열에 남아 있다"는 점입니다.

### 5-2. State

모든 상태는 루트 App에만 존재합니다.

App에서 관리하는 대표 상태
- `todos`
- `inputText`
- `editingId`
- `editingText`
- `filter`
- `clickCount`
- `inspectedTodoId`
- `debugTick`
- `eventLogs`

자식 컴포넌트인 `TodoInput`, `TodoList`, `TodoItem`, `TodoFooter`는 자체 state를 갖지 않고 props만 사용합니다.

이 구조를 통해 발표 때 "왜 state를 여기 두었는가?"를 명확하게 설명할 수 있습니다.

### 5-3. Hooks

구현한 Hooks는 아래 3가지입니다.

#### useState

- hooks 배열의 특정 인덱스에 state를 저장합니다.
- setter가 호출되면 값을 갱신하고 `component.update()`를 실행합니다.
- 함수형 업데이트도 지원합니다.

#### useEffect

- 의존성 배열을 비교해 effect 실행 여부를 결정합니다.
- DOM patch가 끝난 뒤 microtask 시점에 실행되도록 예약합니다.
- cleanup 함수도 지원합니다.

#### useMemo

- 의존성이 바뀌지 않으면 이전 계산값을 재사용합니다.
- Todo 개수 계산과 필터링 결과 계산에 활용했습니다.

### 5-4. Virtual DOM + Diff + Patch

렌더링 흐름은 아래와 같습니다.

1. 컴포넌트 함수 실행
2. 새로운 Virtual DOM 생성
3. 이전 Virtual DOM과 비교
4. 변경 사항 목록 생성
5. 실제 DOM에 필요한 부분만 반영

이 프로젝트에서는 다음 변경을 처리합니다.
- 텍스트 변경
- props 변경
- 자식 노드 추가
- 자식 노드 삭제
- 노드 교체

또한 key 기반 자식 비교를 통해 리스트 갱신 시 불필요한 교체를 줄이도록 설계했습니다.

## 6. 데모 페이지 설명

데모 페이지는 단순 Todo 앱이 아니라 "Mini React 내부 동작을 관찰할 수 있는 학습용 데모"에 가깝습니다.

사용자가 확인할 수 있는 요소
- Todo 추가
- Todo 완료 토글
- Todo 수정 / 취소 / 저장
- Todo 삭제
- 필터 변경
- 남은 Todo 개수 확인
- 현재 hooks 배열 상태 확인
- 최근 diff / patch 로그 확인
- 선택한 Todo가 자식 컴포넌트에 어떤 props로 전달되는지 확인

특히 hooks 패널과 patch 로그 패널은 발표에서 차별점으로 활용하기 좋습니다.

## 7. 컴포넌트 구조

```text
App
├─ TodoInput
├─ TodoList
│  └─ TodoItem
└─ TodoFooter
```

역할 분리
- `App`: 모든 state와 이벤트 핸들러를 관리하는 루트 컴포넌트
- `TodoInput`: 입력값 표시와 추가 이벤트 전달
- `TodoList`: 목록 렌더링
- `TodoItem`: 개별 Todo 카드 렌더링
- `TodoFooter`: 남은 개수와 필터 상태 표시

## 8. 실행 방법

```bash
npm install
npm run dev
```

빌드 확인

```bash
npm run build
```

테스트 실행

```bash
npm run test
```

## 9. 테스트 전략

이 프로젝트는 구현뿐 아니라 검증도 함께 진행했습니다.

테스트 범위
- `vdom.test.ts`: VNode 생성과 자식 정규화
- `diff.test.ts`: Virtual DOM 비교 결과 검증
- `patch.test.ts`: 실제 DOM 반영 검증
- `hooks.test.ts`: hook slot 유지, memoization, effect cleanup 검증
- `component.test.ts`: mount / update / effect flush 검증
- `app.test.ts`: Todo 수정 흐름과 버튼 상태 검증

발표 때는 "AI로 빨리 만들었다"보다 "테스트로 검증했다"를 꼭 강조하는 것이 좋습니다.

## 10. 발표에서 강조할 포인트

1. React를 그대로 쓴 것이 아니라 핵심 개념을 직접 구현했다는 점
2. state를 루트에만 두고 자식은 props만 쓰도록 제한한 점
3. hooks 배열을 눈으로 확인할 수 있게 만든 점
4. diff / patch 로그로 DOM 업데이트 과정을 보여줄 수 있다는 점
5. 테스트 코드로 구현을 검증했다는 점

## 11. 실제 React와의 차이

이번 구현은 학습과 데모를 위한 Mini React이기 때문에 실제 React와는 차이가 있습니다.

- 동시성 렌더링이 없습니다.
- Fiber 구조가 없습니다.
- 고급 스케줄링이 없습니다.
- Hook 규칙 검사가 매우 단순합니다.
- 최적화 전략이 제한적입니다.

하지만 상태 유지, 재렌더링, 의존성 비교, 최소 DOM 업데이트라는 핵심 원리는 직접 체험할 수 있습니다.

## 12. 회고

이번 프로젝트를 통해 단순히 Todo 앱을 완성한 것이 아니라, React가 왜 이렇게 설계되었는지를 코드 수준에서 체감할 수 있었습니다.

특히 아래 내용을 직접 설명할 수 있게 된 점이 가장 큰 성과입니다.

- state가 함수 바깥 어디에 저장되는지
- `setState` 이후 어떤 순서로 업데이트가 진행되는지
- 왜 state를 부모에 올리는지
- 왜 `key`가 리스트 렌더링에서 중요한지
- 왜 테스트가 필요한지

이 프로젝트는 구현 결과물과 학습 과정 모두를 보여줄 수 있는 Week 5 결과물입니다.
