# 단일 루트 Hook Host 구조의 한계

## 요약

- 현재 `mini-react`는 앱 전체에서 하나의 `FunctionComponent` 인스턴스만 Hook host로 사용한다.
- 모든 훅 슬롯은 이 단일 인스턴스의 `hooks[]` 배열에 순서대로 저장된다.
- 함수형 자식 컴포넌트는 독립 인스턴스로 마운트되지 않고, 루트 렌더 중 일반 함수처럼 즉시 실행된다.
- 따라서 리스트 아이템이나 조건부 자식 컴포넌트에서 훅을 사용하면 호출 횟수 변화에 따라 슬롯 정렬이 깨질 수 있다.

## 현재 구조

### 1. Hook host는 루트 하나뿐이다

- `FunctionComponent`는 `hooks: HookSlot[] = []`를 가진다.
- 렌더 시작 시 `setCurrentComponent(this)`가 호출되고, 렌더 종료 시 `clearCurrentComponent()`가 호출된다.
- 이때 `currentComponent`는 항상 루트 `FunctionComponent` 인스턴스를 가리킨다.

관련 코드:
- `src/mini-react/component.ts`
- `src/mini-react/hooks.ts`

### 2. 자식 함수형 컴포넌트는 별도 인스턴스를 만들지 않는다

- `createElement()`는 `type`이 함수면 새 컴포넌트를 만들지 않고 그 함수를 바로 호출한다.
- 즉 `<TodoItem />`, `<TodoList />` 같은 자식은 독립적인 `hooks[]` 저장소를 갖지 않는다.
- 자식 컴포넌트 안에서 훅을 호출하면 그 슬롯도 루트 `hooks[]`에 쌓인다.

관련 코드:
- `src/mini-react/vdom.ts`

## 왜 문제가 되는가

훅은 매 렌더마다 같은 순서로 호출되어야 한다. 하지만 현재 구조에서는 자식 함수 호출 횟수가 바뀌면 루트 `hooks[]`의 슬롯 배치가 달라진다.

예시:

```ts
function TaskItem({ task, onToggle }) {
  const label = useMemo(() => `${task.id}`, [task.id]); // unsafe in current architecture

  return <button onClick={() => onToggle(task.id)}>{label}</button>;
}
```

`TaskItem`이 3개 렌더될 때와 4개 렌더될 때는 `useMemo()` 호출 횟수가 달라진다. 이 라이브러리에서는 이 호출들이 전부 루트 `hooks[]`에 기록되므로, 다음과 같은 문제가 생긴다.

- 리스트 길이 변경 시 이후 훅 슬롯이 밀릴 수 있다.
- 조건부 렌더링 여부에 따라 자식 훅 순서가 달라질 수 있다.
- per-item 훅(`useMemo`, `useEffect`, 추후 `useCallback`)을 안전하게 사용할 수 없다.

## 현재 Todo 앱이 괜찮은 이유

- 현재 `App`만 `useState`, `useMemo`, `useEffect`를 사용한다.
- `TodoInput`, `TodoList`, `TodoItem`, `TodoFooter`는 props-only 순수 함수다.
- 즉 문제를 해결한 것이 아니라, PRD 제약에 맞춰 문제를 피하고 있는 상태다.

관련 코드:
- `src/app/App.tsx`
- `src/app/components/TodoItem.tsx`

## 실질적인 영향

- 자식 컴포넌트 단위의 로컬 상태를 도입하기 어렵다.
- 아이템별 메모이제이션/이펙트/콜백 최적화를 안전하게 추가할 수 없다.
- 향후 복잡한 리스트 UI나 중첩 컴포넌트 구조로 확장할 때 아키텍처 한계에 부딪힌다.

## 해결 방향

가능한 방향은 두 가지다.

1. 제약을 명시적으로 유지한다.
- 훅은 루트 컴포넌트에서만 사용하고, 자식은 stateless pure function으로 제한한다.

2. 아키텍처를 확장한다.
- 함수형 자식 컴포넌트마다 독립적인 인스턴스 또는 hook context를 갖게 한다.
- 렌더 트리 단위로 컴포넌트 인스턴스를 보존하고, 각 인스턴스가 자신의 `hooks[]`를 소유하게 만든다.
- keyed reconciliation과 연결해 자식 컴포넌트 인스턴스도 재사용할 수 있도록 확장한다.
