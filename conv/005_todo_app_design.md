# Todo 앱 설계

## 컴포넌트 분리 기준

**기준:** 재사용 가능한 UI 단위이거나, 명확히 다른 책임을 가지는가?

```
App (루트, 상태 소유)
 ├── TodoInput    — 입력창 + 추가 버튼
 ├── TodoList     — 항목 목록 렌더링
 │   └── TodoItem — 단일 항목 (완료 토글 + 삭제)
 └── TodoFooter   — 남은 항목 수 표시
```

---

## Lifting State Up 적용

**원칙:** 자식 컴포넌트는 상태를 가지지 않습니다. 모든 상태는 `App`에 있습니다.

```
App의 상태:
  - todos: Todo[]        ← 항목 목록
  - inputText: string    ← 입력창 텍스트

App의 핸들러:
  - handleAdd()          ← inputText → todos에 추가
  - handleToggle(id)     ← 해당 id의 completed 토글
  - handleDelete(id)     ← 해당 id 제거
  - handleInput(value)   ← inputText 업데이트
```

자식 컴포넌트는 **이벤트를 처리하지 않고, 핸들러를 props로 받아 호출**합니다.

---

## 각 컴포넌트 Props 명세

### App (루트, hooks 사용)

```ts
// 상태 (내부)
const [todos, setTodos] = useState<Todo[]>([]);
const [inputText, setInputText] = useState('');

// 파생 상태
const remainingCount = useMemo(
  () => todos.filter(t => !t.completed).length,
  [todos]
);

// 사이드 이펙트
useEffect(() => {
  document.title = `Todos (${remainingCount} left)`;
}, [remainingCount]);
```

### TodoInput

```ts
interface TodoInputProps {
  value: string;
  onInput: (value: string) => void;
  onAdd: () => void;
}
```

- `<input>` value 동기화: `onInput`으로 App 상태 업데이트
- Enter 키 또는 버튼 클릭 → `onAdd` 호출

### TodoList

```ts
interface TodoListProps {
  todos: Todo[];
  onToggle: (id: number) => void;
  onDelete: (id: number) => void;
}
```

- `todos.map()`으로 `TodoItem` VNode 배열 생성
- 각 아이템에 `key={todo.id}` 전달 (diff 최적화)

### TodoItem

```ts
interface TodoItemProps {
  todo: Todo;
  onToggle: (id: number) => void;
  onDelete: (id: number) => void;
}
```

- `todo.completed`에 따라 CSS class 조건부 적용
- 텍스트 클릭 → `onToggle(todo.id)`
- 삭제 버튼 → `onDelete(todo.id)`

### TodoFooter

```ts
interface TodoFooterProps {
  remaining: number;
  total: number;
}
```

- `"N / M 완료"` 형식 텍스트 표시
- 순수 표시 컴포넌트, 이벤트 없음

---

## hooks 활용 지점

| Hook | 사용 위치 | 목적 |
|---|---|---|
| `useState` | App | todos 배열, inputText 관리 |
| `useMemo` | App | 남은 항목 수 계산 최적화 |
| `useEffect` | App | 브라우저 탭 타이틀 업데이트 |

**useMemo 사용 이유:**
`remainingCount`는 `todos`에서 파생되는 값입니다. 매 렌더마다 `filter()`를 재실행하는 대신, `todos`가 변경될 때만 재계산합니다. (항목이 많아질수록 효과적)

---

## 도메인 타입

```ts
// app/types.ts
export interface Todo {
  id: number;
  text: string;
  completed: boolean;
}
```

`id`는 단조 증가 카운터로 생성 (`nextId++`). App 상태와 함께 관리.

---

## 데이터 흐름 다이어그램

```
사용자 입력
    │
    ▼
TodoInput
    │ onInput(value) / onAdd()
    ▼
App (setState → update())
    │
    ├──▶ diff(oldVdom, newVdom)
    │
    ├──▶ patch(DOM)
    │
    └──▶ flushEffects()
              └─ document.title 업데이트
```

---

## 브라우저 확인 체크리스트

- [ ] Todo 추가 (버튼 클릭 / Enter)
- [ ] Todo 완료 토글 (텍스트 클릭)
- [ ] Todo 삭제 (버튼 클릭)
- [ ] Footer: 남은 개수 실시간 갱신
- [ ] 브라우저 탭 타이틀: `Todos (N left)` 형식
- [ ] DevTools Elements 탭: 변경된 부분만 하이라이트됨 (전체 재렌더 아님)
