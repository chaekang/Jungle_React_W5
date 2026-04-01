# Mini React 구현 결정 로그

## 배경

PRD(docs/002_PRD.md)를 기반으로 feat/mini-react-impl 브랜치에서 전체 구현을 진행했다.

## 요청 내용

PRD 순서대로 vdom → diff → patch → hooks → component → app 순으로 구현, 각 단계별 테스트 통과 후 다음 단계 진행.

---

## 결정 1: h()에서 함수 컴포넌트 즉시 호출

### 고려한 선택지

1. **함수 컴포넌트를 VNode 타입에 추가** (type: string | FunctionComponent) → diff/patch가 함수 타입을 인식해야 하므로 복잡도 증가
2. **h()에서 함수 호출 시 즉시 실행** → 함수 컴포넌트를 호출해서 VNode를 반환, 기존 diff/patch 변경 불필요
3. **앱 컴포넌트에서 함수를 직접 호출** ({TodoInput(props)} 방식) → JSX 문법 활용 불가

### 결정

옵션 2 선택. `h(type, props, ...children)` 에서 `typeof type === 'function'`이면 즉시 호출.

### 이유

- PRD에서 App만 FunctionComponent로 감싸고, 하위 컴포넌트는 순수 함수로 설계되어 있음
- diff/patch 레이어를 건드리지 않고 함수 컴포넌트 JSX 지원 가능
- 빌드(6.41KB) 및 53개 테스트 전부 통과

### 영향

- 하위 컴포넌트(TodoInput, TodoList, TodoItem, TodoFooter)는 hooks 사용 불가 (순수 함수여야 함)
- hooks가 필요한 컴포넌트는 FunctionComponent로 별도 래핑해야 함

---

## 결정 2: useEffect 초기 deps 처리

### 문제

초기 슬롯 생성 시 `deps: []`로 초기화하면 첫 렌더 후 동일 deps로 호출해도 `depsChanged([], [1])`이 true가 되어 effect가 두 번 실행됨.

### 결정

초기화 시 `deps`를 실제 전달된 값으로 설정. scheduleEffect 후 deps 업데이트를 별도로 하지 않고 초기값에 반영.

### 영향

useEffect hooks.test.ts 14/14 통과.
