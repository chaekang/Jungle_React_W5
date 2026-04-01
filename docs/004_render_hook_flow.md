# mini-react 렌더링 / Hook 동작 플로우

## 목적

- 이 문서는 현재 저장소의 `mini-react` 구현이 실제로 어떻게 동작하는지 설명한다.
- 특히 다음을 본다.
  - 앱이 처음 시작될 때 무슨 일이 일어나는가
  - `useState`, `useMemo`, `useEffect`가 `hooks[]` 배열의 각 칸에 어떻게 저장되는가
  - 컴포넌트 함수가 다시 실행될 때 자식 함수들이 어떻게 반복 호출되는가
  - 상태 변경 이후 `diff + patch + 예약된 effect 실행`이 어떤 순서로 이어지는가

## 현재 구현의 핵심 특징

- `setState()`는 변경이 있으면 즉시 `component.update()`를 호출한다.
- effect 실행만 현재 동기 코드가 끝난 직후로 미룬다.
- DOM 반영은 `update()` 안에서 바로 `diff()` 후 `patch()`로 수행된다.
- `hooks[]` 배열을 소유하는 인스턴스는 하나뿐이며, 루트 `FunctionComponent` 인스턴스가 모든 Hook 상태를 들고 있다.

관련 코드:

- `src/app/main.ts`
- `src/mini-react/component.ts`
- `src/mini-react/hooks.ts`
- `src/mini-react/vdom.ts`
- `src/mini-react/diff.ts`
- `src/mini-react/patch.ts`

## 전체 구조 한 줄 요약

```text
브라우저 시작
  -> FunctionComponent(App) 생성
  -> mount()
  -> render()
  -> App.tsx 같은 루트 컴포넌트 함수 실행
  -> 그 안에서 하위 컴포넌트 함수들 즉시 호출
  -> 각 함수가 반환한 가상 DOM을 조합해 UI 구조 완성
  -> createDom(가상 DOM)
  -> 실제 DOM 삽입
  -> 현재 동기 코드가 끝난 직후 effect 실행
```

## 1. 앱이 처음 시작될 때

시작점은 `src/app/main.ts`다.

```ts
const app = new FunctionComponent(container, () => h(App, null));
app.mount();
```

여기서 생기는 일:

1. `FunctionComponent` 인스턴스가 만들어진다.
2. 이 인스턴스는 앞으로 루트 렌더러이자, 모든 Hook 상태를 저장하는 유일한 객체가 된다.
3. 내부 초기 상태는 다음과 같다.

```ts
hooks = []
vdom = null
rootNode = null
```

4. `mount()`가 호출된다.
5. `mount()`는 `render()`를 호출해 첫 번째 가상 DOM(`VNode`, 화면 구조를 표현한 객체)을 만든다.
6. `createDom()`으로 실제 DOM을 만든 뒤 `container.replaceChildren(...)`로 화면에 붙인다.
7. 마지막으로 `scheduleEffectFlush(this)`가 호출되어 `useEffect` 실행을 현재 동기 코드가 끝난 직후로 예약한다.

초기 마운트 흐름:

```text
main.ts
  -> new FunctionComponent(container, () => h(App, null))
  -> app.mount()
       -> render()
       -> this.vdom = nextVdom
       -> this.rootNode = createDom(nextVdom)
       -> container.replaceChildren(this.rootNode)
       -> scheduleEffectFlush(this)
```

## 2. 첫 render()에서 Hook context가 열리는 방식

`FunctionComponent.render()`는 렌더 직전에 다음을 수행한다.

```ts
setCurrentComponent(this);
```

이 호출의 의미:

- 현재 렌더 중인 루트 컴포넌트 인스턴스를 전역 변수 `currentComponent`에 저장한다.
- `hookIndex = 0`으로 초기화한다.
- 이제 이번 렌더에서 호출되는 모든 Hook은 `this.hooks[hookIndex]`를 순서대로 사용한다.

렌더가 끝나면:

```ts
clearCurrentComponent();
```

이로 인해:

- `currentComponent = null`
- `hookIndex = 0`

즉, Hook은 컴포넌트 함수가 실행되는 렌더 도중에만 사용할 수 있다.

## 3. 첫 렌더에서 App이 실행될 때 `hooks[]` 배열이 채워지는 순서

루트 렌더 함수는 `() => h(App, null)` 이다.  
`h(App, null)`은 `type`이 함수이므로 `App()`을 즉시 실행한다.

현재 `App`의 Hook 호출 순서는 고정되어 있다.

```ts
const [todos, setTodos] = useState(...)
const [inputText, setInputText] = useState(...)
const remainingCount = useMemo(...)
useEffect(...)
```

따라서 첫 렌더에서 `hooks[]` 배열은 아래처럼 채워진다.

### 0번째 칸: `useState(todos)`

- 기존 칸이 없으므로 새 칸 생성
- 상태:

```ts
{
  type: 'state',
  value: [
    { id: 1, text: 'Build hooks from scratch', completed: true },
    { id: 2, text: 'Patch only the nodes that changed', completed: false }
  ]
}
```

### 1번째 칸: `useState(inputText)`

- 기존 칸이 없으므로 새 칸 생성
- 상태:

```ts
{
  type: 'state',
  value: ''
}
```

### 2번째 칸: `useMemo(remainingCount)`

- 기존 칸이 없으므로 `fn()`을 즉시 실행
- `todos.filter((todo) => !todo.completed).length` 결과는 `1`
- 상태:

```ts
{
  type: 'memo',
  deps: [todos],
  value: 1
}
```

### 3번째 칸: `useEffect(document.title 갱신)`

- 기존 칸이 없으므로 첫 실행 예약
- 아직 effect 본문은 즉시 실행되지 않는다
- 상태:

```ts
{
  type: 'effect',
  deps: [1],
  cleanup: undefined,
  pendingFn: () => {
    document.title = `Todos (${remainingCount} left)`;
  },
  needsRun: true
}
```

요약하면 첫 렌더 직후 `hooks[]` 배열은 개념적으로 아래와 같다.

```text
hooks[0] = state(todos)
hooks[1] = state(inputText)
hooks[2] = memo(remainingCount)
hooks[3] = effect(document.title)
```

## 4. render 중 자식 함수가 반복 호출되는 방식

현재 구조에서는 `App.tsx` 같은 루트 컴포넌트 함수가 실행되면, 그 함수 안에 적힌 하위 컴포넌트 함수들도 렌더 과정에서 연쇄적으로 호출된다. 이 호출 결과로 가상 DOM 트리(`VNode` 트리)가 만들어지고, 그 트리를 바탕으로 실제 UI가 그려진다.

이 구현에서 함수형 컴포넌트는 별도 인스턴스로 마운트되지 않는다. `createElement()`가 함수를 만나면 그 함수를 즉시 실행해 가상 DOM 객체를 받아온다.

즉 이런 JSX:

```tsx
<TodoList todos={todos} onToggle={handleToggle} onDelete={handleDelete} />
```

는 렌더 중 사실상 이런 식으로 처리된다.

```ts
TodoList({ todos, onToggle, onDelete, children: [] })
```

`TodoList` 안에서:

```tsx
{todos.map((todo) => (
  <TodoItem
    key={todo.id}
    todo={todo}
    onToggle={onToggle}
    onDelete={onDelete}
  />
))}
```

이 부분은 렌더마다 다시 평가된다. 즉 `todos`가 2개면:

```text
App()
  -> TodoInput(...)
  -> TodoList(...)
       -> TodoItem(todo #1)
       -> TodoItem(todo #2)
  -> TodoFooter(...)
```

`todos`가 3개로 늘어난 다음 렌더에서는:

```text
App()
  -> TodoInput(...)
  -> TodoList(...)
       -> TodoItem(todo #1)
       -> TodoItem(todo #2)
       -> TodoItem(todo #3)
  -> TodoFooter(...)
```

중요한 점:

- 자식 컴포넌트 함수는 매 렌더마다 다시 호출된다.
- 하지만 자식마다 독립적인 `hooks[]` 배열이 있는 것은 아니다.
- 만약 자식 컴포넌트 안에서 Hook을 쓰면 그 상태도 루트 `hooks[]` 배열에 기록된다.
- 그래서 자식 호출 횟수가 달라지는 구조에서는 Hook이 저장되는 칸의 순서가 깨질 수 있다.

이 제약은 별도 문서 `docs/003_hook_component_limitation.md`에 더 자세히 정리되어 있다.

## 5. 초기 렌더 후 effect는 언제 실행되는가

첫 렌더가 끝난 직후 `mount()`는 `scheduleEffectFlush(this)`를 호출한다.

이 함수는:

1. 현재 컴포넌트를 `pendingEffects` 집합에 넣고
2. 아직 예약이 없다면 `Promise.resolve().then(() => flushEffects())`를 건다

즉 effect는 현재 렌더와 DOM 삽입이 모두 끝난 뒤, 현재 동기 코드가 끝나는 시점에 실행된다.

초기 effect 실행 흐름:

```text
mount()
  -> render()
  -> createDom()
  -> container.replaceChildren(...)
  -> scheduleEffectFlush(this)
       -> Promise.resolve().then(flushEffects)

현재 동기 코드가 끝난 직후
  -> flushEffects()
       -> hooks[] 배열 순회
       -> effect가 저장된 칸 중 needsRun === true 인 것만 실행
       -> cleanup 있으면 먼저 실행
       -> pendingFn() 실행
       -> 반환값이 함수면 cleanup으로 저장
       -> pendingFn = undefined
       -> needsRun = false
```

현재 `App`의 effect는 cleanup을 반환하지 않으므로 실제로는:

```text
document.title = "Todos (1 left)"
```

만 수행하고 끝난다.

## 6. 이벤트가 발생해 `setState()`가 호출되면

예를 들어 사용자가 Todo 추가 버튼을 눌러 `handleAdd()`가 실행되면, 내부에서 `setTodos(...)`, `setInputText('')`가 호출될 수 있다.

`useState`의 setter는 아래 순서로 동작한다.

```text
[이벤트 발생]
  -> setter(next) 호출
       -> 현재 칸 조회
       -> next가 함수면 prev를 넣어 nextValue 계산
       -> Object.is(current, nextValue) 비교
            -> 같으면 종료
            -> 다르면 hooks[]의 해당 칸 값 갱신
            -> component.update()
```

현재 구현은 여기서 끝나지 않고 즉시 `update()`로 들어간다.

## 7. update() 한 번이 실제로 하는 일

`component.update()`는 다음 순서로 진행된다.

```text
update()
  -> render()로 새 가상 DOM 생성
  -> diff(이전 가상 DOM, 새 가상 DOM)
  -> this.vdom = newVdom
  -> patch(this.rootNode, ops)
  -> scheduleEffectFlush(this)
```

좀 더 자세히 보면:

### 1. `render()`로 컴포넌트 함수 재실행

- `setCurrentComponent(this)`
- `hookIndex = 0`
- 다시 `App()` 실행
- 그 과정에서 `TodoInput`, `TodoList`, `TodoItem`, `TodoFooter`도 전부 다시 호출
- `clearCurrentComponent()`

즉 "상태가 바뀐 컴포넌트만 함수 실행"이 아니라, 현재 구조에서는 루트 렌더 함수부터 다시 돈다.

### 2. `hooks[]` 배열의 기존 칸 재사용

재렌더 때 Hook은 새로 추가되지 않고 기존 칸을 같은 순서로 다시 사용한다.

예를 들어 `todos`만 바뀐 경우:

- `useState(todos)`는 `hooks[0]`에서 값을 읽는다
- `useState(inputText)`는 `hooks[1]`에서 값을 읽는다
- `useMemo(remainingCount)`는 `depsChanged(existing.deps, deps)`를 검사한다
- `useEffect(...)`도 `depsChanged(...)`를 검사한다

### 3. `useMemo`의 판단

`deps`가 바뀌었으면:

- `existing.value = fn()`
- `existing.deps = deps`

`deps`가 그대로면:

- 기존 `existing.value`를 그대로 반환

### 4. `useEffect`의 판단

`deps`가 바뀌었으면:

- `existing.deps = deps`
- `existing.pendingFn = fn`
- `existing.needsRun = true`

`deps`가 그대로면:

- 이전 effect 상태를 그대로 유지
- 재실행 예약도 하지 않음

### 5. `diff + patch`

렌더가 끝나면 이전 가상 DOM과 새 가상 DOM을 비교한다.

- 텍스트가 바뀌면 `UPDATE_TEXT`
- props가 바뀌면 `UPDATE_PROPS`
- 자식 변화가 있으면 `CHILDREN`
- 노드 종류나 태그가 바뀌면 `REPLACE`

그 다음 `patch()`가 실제 DOM에 최소 변경만 적용한다.

예를 들어 Todo를 하나 추가하면:

- `TodoList` 아래 `ul`의 children 비교가 일어나고
- 같은 `key`를 가진 기존 항목들은 재사용되며
- 새 항목 하나는 `INSERT`
- 최종 순서가 필요하면 재배치

## 8. `setTodos()` 이후 한 사이클을 실제 앱 기준으로 풀어쓰기

Todo 하나를 추가하는 상황을 실제 순서로 적으면:

```text
버튼 클릭
  -> onClick 리스너 실행
  -> handleAdd()
       -> setTodos(previous => [...previous, newTodo])
            -> hooks[0].value 갱신
            -> component.update()
                 -> setCurrentComponent(this), hookIndex = 0
                 -> App() 재실행
                      -> useState: hooks[0] 읽기
                      -> useState: hooks[1] 읽기
                      -> useMemo: hooks[2] deps 비교 후 필요시 재계산
                      -> useEffect: hooks[3] deps 비교 후 필요시 needsRun=true
                      -> TodoInput(...)
                      -> TodoList(...)
                           -> TodoItem(existing #1)
                           -> TodoItem(existing #2)
                           -> TodoItem(new #3)
                      -> TodoFooter(...)
                 -> clearCurrentComponent()
                 -> diff(oldVdom, newVdom)
                 -> patch(rootNode, ops)
                 -> scheduleEffectFlush(this)
  -> setInputText('')
       -> hooks[1].value 갱신
       -> component.update()
            -> 위 과정 한 번 더

현재 동기 코드가 끝난 직후
  -> flushEffects()
       -> hooks[3]가 needsRun=true 이면 cleanup 후 effect 실행
```

여기서 볼 수 있는 특징:

- `handleAdd()` 안의 setter 2개는 현재 구현에서는 각각 독립적으로 `update()`를 유발한다.
- 즉 React처럼 자동 batching되지 않는다.
- 대신 DOM 적용 자체는 `diff + patch`로 필요한 부분만 갱신한다.

## 9. Hook별 상태 변화 관점에서 보면

### `useState`

- 저장 위치: `hooks[]` 배열의 해당 칸의 `value`
- 변경 조건: `Object.is(oldValue, newValue)`가 `false`
- 변경 시 동작: 즉시 `component.update()`

### `useMemo`

- 저장 위치: `hooks[]` 배열의 해당 칸의 `value`, `deps`
- 렌더 중 동작
- `deps`가 바뀌었을 때만 다시 계산
- 렌더 함수가 실행되는 동안 바로 값이 결정된다

### `useEffect`

- 저장 위치:
  - `deps`
  - `cleanup`
  - `pendingFn`
  - `needsRun`
- 렌더 중 하는 일:
  - 실행 여부만 결정
  - 실제 `fn()` 실행은 하지 않음
- 예약된 effect 실행 시 하는 일:
  - 이전 cleanup 실행
  - 새 effect 본문 실행
  - 반환 cleanup 저장
  - `needsRun = false`

## 10. 이 프로젝트 기준으로 가장 중요한 이해 포인트

1. Hook 상태는 함수 안에 저장되지 않는다.
함수는 매 렌더마다 새로 실행되지만, 실제 상태는 루트 `FunctionComponent.hooks[]` 배열에 남아 있다.

2. Hook의 정체성은 "호출 순서"로 결정된다.
`useState`라는 이름이 아니라 `hooks[0]`, `hooks[1]`, `hooks[2]` 같은 칸의 순서로 상태가 유지된다.

3. 자식 컴포넌트도 렌더 때마다 그냥 다시 호출된다.
JSX 트리 아래에 있다고 해서 자식 함수가 따로 살아 있는 것이 아니다. 현재 구조에서는 렌더 중 계산되는 일반 함수 호출에 가깝다.

4. effect는 렌더 중이 아니라 렌더가 끝난 직후 실행된다.
그래서 렌더 단계는 가능한 한 순수하게 유지하고, 부수효과는 나중에 예약된 실행 단계로 미룬다.

5. 상태 변경마다 루트부터 다시 렌더한다.
현재 구조는 부분 컴포넌트 업데이트보다 구현 단순성을 우선한 형태다.

## 11. 현재 구현의 전체 흐름 요약

```text
[이벤트 발생]
    │
    └─ setter() 호출
         ├─ Object.is(old, new) → 같으면 종료
         ├─ hook.value 갱신
         └─ comp.update()
              │
              ├─ render()              ← 루트 컴포넌트 함수 재실행
              │    ├─ setCurrentComponent(comp)
              │    ├─ hookIndex = 0
              │    ├─ useState: 기존 칸 읽기
              │    ├─ useMemo: depsChanged 확인 → 필요시 재계산
              │    ├─ useEffect: depsChanged 확인 → pendingFn / needsRun 갱신
              │    ├─ 자식 함수형 컴포넌트 즉시 호출
              │    └─ clearCurrentComponent()
              │
              ├─ diff(이전 가상 DOM, 새 가상 DOM) → patches[]
              ├─ patch(rootNode, patches)
              ├─ this.vdom = 새 가상 DOM
              └─ scheduleEffectFlush(comp)
                   │
                   └─ 현재 동기 코드가 끝난 직후 flushEffects()
                        └─ pending effect 훅:
                             cleanup() -> fn() -> cleanup 갱신
```

## 참고 파일

- `src/app/main.ts`
- `src/app/App.tsx`
- `src/app/components/TodoList.tsx`
- `src/app/components/TodoItem.tsx`
- `src/mini-react/component.ts`
- `src/mini-react/hooks.ts`
- `src/mini-react/vdom.ts`
- `src/mini-react/diff.ts`
- `src/mini-react/patch.ts`
- `docs/003_hook_component_limitation.md`
