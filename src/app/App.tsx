import {
  getCurrentHookSnapshot,
  getLatestPatchLogLines,
  h,
  useEffect,
  useMemo,
  useState,
  type VNode,
} from '../mini-react';
import { TodoFooter } from './components/TodoFooter';
import { TodoInput } from './components/TodoInput';
import { TodoList } from './components/TodoList';
import type { Todo, TodoFilter } from './types';

const initialTodos: Todo[] = [
  { id: 1, text: 'mini-react 렌더 흐름 살펴보기', completed: false },
  { id: 2, text: 'useState가 hooks 배열에 저장되는지 설명하기', completed: true },
  { id: 3, text: 'TodoItem은 props만 받는다는 점 보여주기', completed: false },
  { id: 4, text: '필터 버튼으로 App state 변경 시연하기', completed: false },
  { id: 5, text: '이벤트 로그로 상태 변화 추적하기', completed: true },
];

let nextTodoId = initialTodos.length + 1;

export function App(): VNode {
  const [todos, setTodos] = useState<Todo[]>(initialTodos);
  const [inputText, setInputText] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');
  const [filter, setFilter] = useState<TodoFilter>('all');
  const [clickCount, setClickCount] = useState(0);
  const [inspectedTodoId, setInspectedTodoId] = useState<number | null>(initialTodos[2]?.id ?? null);
  const [debugTick, setDebugTick] = useState(0);
  const [eventLogs, setEventLogs] = useState<string[]>([
    'App가 모든 state를 관리합니다.',
    '자식 컴포넌트는 props만 받아서 렌더링합니다.',
  ]);

  const remainingCount = useMemo(
    () => todos.filter((todo) => !todo.completed).length,
    [todos],
  );
  const filteredTodos = useMemo(() => {
    if (filter === 'active') {
      return todos.filter((todo) => !todo.completed);
    }

    if (filter === 'completed') {
      return todos.filter((todo) => todo.completed);
    }

    return todos;
  }, [todos, filter]);

  useEffect(() => {
    document.title = `Todos (${remainingCount} left, ${filter})`;
  }, [remainingCount, filter]);

  function pushLog(message: string): void {
    setEventLogs((previousLogs) => {
      const timestamp = new Date().toLocaleTimeString('ko-KR');
      return [`${timestamp} - ${message}`, ...previousLogs].slice(0, 8);
    });
  }

  function scheduleDebugRefresh(): void {
    Promise.resolve().then(() => {
      setDebugTick((previous) => previous + 1);
    });
  }

  function handleAdd(): void {
    const trimmedText = inputText.trim();
    if (trimmedText.length === 0) {
      return;
    }

    const nextTodo: Todo = {
      id: nextTodoId++,
      text: trimmedText,
      completed: false,
    };

    setTodos((previousTodos) => [...previousTodos, nextTodo]);
    setInputText('');
    setInspectedTodoId(nextTodo.id);
    pushLog(`TodoInput -> App.handleAdd("${trimmedText}") -> todos state 업데이트`);
    scheduleDebugRefresh();
  }

  function handleToggle(id: number): void {
    setInspectedTodoId(id);
    setClickCount((previous) => previous + 1);
    setTodos((previousTodos) =>
      previousTodos.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo,
      ),
    );
    pushLog(`TodoItem -> App.handleToggle(${id}) -> completed 상태 토글`);
    scheduleDebugRefresh();
  }

  function handleDelete(id: number): void {
    setTodos((previousTodos) => previousTodos.filter((todo) => todo.id !== id));
    if (editingId === id) {
      setEditingId(null);
      setEditingText('');
    }

    if (inspectedTodoId === id) {
      const fallbackTodo = todos.find((todo) => todo.id !== id);
      setInspectedTodoId(fallbackTodo?.id ?? null);
    }

    pushLog(`TodoItem -> App.handleDelete(${id}) -> todos state에서 제거`);
    scheduleDebugRefresh();
  }

  function handleStartEdit(id: number): void {
    const targetTodo = todos.find((todo) => todo.id === id);
    if (!targetTodo) {
      return;
    }

    setInspectedTodoId(id);
    setEditingId(id);
    setEditingText(targetTodo.text);
    pushLog(`TodoItem -> App.handleStartEdit(${id}) -> editing state 설정`);
    scheduleDebugRefresh();
  }

  function handleEditSave(): void {
    const trimmedText = editingText.trim();
    if (editingId === null || trimmedText.length === 0) {
      return;
    }

    setTodos((previousTodos) =>
      previousTodos.map((todo) =>
        todo.id === editingId ? { ...todo, text: trimmedText } : todo,
      ),
    );
    pushLog(`TodoItem -> App.handleEditSave(${editingId}) -> text state 반영`);
    setEditingId(null);
    setEditingText('');
    scheduleDebugRefresh();
  }

  function handleEditCancel(): void {
    setEditingId(null);
    setEditingText('');
    pushLog('TodoItem -> App.handleEditCancel() -> editing state 초기화');
    scheduleDebugRefresh();
  }

  function handleInspect(id: number): void {
    setInspectedTodoId(id);
    pushLog(`TodoItem(${id}) -> App가 props 전달 구조를 보여주기 위해 선택`);
    scheduleDebugRefresh();
  }

  const hookSnapshot = getCurrentHookSnapshot();
  const patchLogLines = getLatestPatchLogLines();
  const inspectedTodo = todos.find((todo) => todo.id === inspectedTodoId) ?? todos[0] ?? null;
  const hookRoleSummary = [
    { index: 0, label: 'todos 상태', value: `${todos.length}개` },
    { index: 1, label: '입력창 상태', value: inputText || '(비어 있음)' },
    { index: 2, label: '수정 중 id', value: editingId ?? '없음' },
    { index: 3, label: '수정 중 텍스트', value: editingText || '(비어 있음)' },
    { index: 4, label: '필터 상태', value: filter },
    { index: 5, label: '카드 클릭 수', value: clickCount },
    { index: 6, label: '선택된 자식 id', value: inspectedTodoId ?? '없음' },
    { index: 7, label: '디버그 새로고침용 state', value: debugTick },
    { index: 8, label: '이벤트 로그 상태', value: `${eventLogs.length}개` },
    { index: 9, label: '남은 개수 memo', value: remainingCount },
    { index: 10, label: '필터링된 목록 memo', value: `${filteredTodos.length}개` },
    { index: 11, label: 'title effect', value: '문서 제목 동기화' },
  ];
  const hookCodeView = [
    'hooks = [',
    `  [0] state(todos): ${JSON.stringify(todos)},`,
    `  [1] state(inputText): ${JSON.stringify(inputText)},`,
    `  [2] state(editingId): ${JSON.stringify(editingId)},`,
    `  [3] state(editingText): ${JSON.stringify(editingText)},`,
    `  [4] state(filter): ${JSON.stringify(filter)},`,
    `  [5] state(clickCount): ${JSON.stringify(clickCount)},`,
    `  [6] state(inspectedTodoId): ${JSON.stringify(inspectedTodoId)},`,
    `  [7] state(debugTick): ${JSON.stringify(debugTick)},`,
    `  [8] state(eventLogs): ${JSON.stringify(eventLogs)},`,
    `  [9] memo(remainingCount): ${JSON.stringify(remainingCount)},`,
    `  [10] memo(filteredTodos): ${JSON.stringify(filteredTodos.map((todo) => ({ id: todo.id, text: todo.text, completed: todo.completed })))},`,
    `  [11] effect(title): ${JSON.stringify(hookSnapshot[11] ?? null)}`,
    ']',
  ].join('\n');
  const patchLogView = patchLogLines.join('\n');
  const childSignatureView = `function TodoItem(props) {
  // useState(...) 없음
  // useEffect(...) 없음
  // local hooks 배열 없음
  return UI(props.todo, props.isEditing, props.onToggle, ...);
}`;
  const childPropsView = inspectedTodo
    ? `TodoItem props = {
  todo: ${JSON.stringify(inspectedTodo)},
  isEditing: ${JSON.stringify(editingId === inspectedTodo.id)},
  editingText: ${JSON.stringify(editingId === inspectedTodo.id ? editingText : '')},
  onToggle: App.handleToggle,
  onDelete: App.handleDelete,
  onStartEdit: App.handleStartEdit
}`
    : '선택된 Todo가 없습니다.';

  return (
    <main className="app-shell">
      <section className="app-card">
        <p className="app-kicker">Week 5 Mini React</p>
        <h1 className="app-title">Mini React Todo Demo</h1>
        <p className="app-description">
          루트 App이 state를 관리하고, 자식은 props만 받아 렌더링합니다.
          아래 화면에서 hooks 배열, key 기반 child diff, 이벤트 흐름을 함께 확인할 수 있습니다.
        </p>
        <TodoInput value={inputText} onInput={setInputText} onAdd={handleAdd} />
        <div className="demo-counter">
          카드 클릭으로 완료 토글한 횟수: <strong>{clickCount}</strong>
        </div>
        <div className="filter-bar">
          <button
            className={filter === 'all' ? 'active' : ''}
            type="button"
            onClick={() => {
              setFilter('all');
              pushLog('Filter 버튼 -> App.filter = all');
              scheduleDebugRefresh();
            }}
          >
            전체
          </button>
          <button
            className={filter === 'active' ? 'active' : ''}
            type="button"
            onClick={() => {
              setFilter('active');
              pushLog('Filter 버튼 -> App.filter = active');
              scheduleDebugRefresh();
            }}
          >
            진행 중
          </button>
          <button
            className={filter === 'completed' ? 'active' : ''}
            type="button"
            onClick={() => {
              setFilter('completed');
              pushLog('Filter 버튼 -> App.filter = completed');
              scheduleDebugRefresh();
            }}
          >
            완료
          </button>
        </div>
        <section className="todo-stage">
          <div className="todo-column">
            <TodoList
              todos={filteredTodos}
              editingId={editingId}
              editingText={editingText}
              inspectedTodoId={inspectedTodoId}
              onEditInput={setEditingText}
              onEditCancel={handleEditCancel}
              onEditSave={handleEditSave}
              onInspect={handleInspect}
              onStartEdit={handleStartEdit}
              onToggle={handleToggle}
              onDelete={handleDelete}
            />
          </div>
          <aside className="event-log-panel">
            <pre className="event-code-block">{childSignatureView}</pre>
            <pre className="event-code-block">{childPropsView}</pre>
          </aside>
        </section>
        <TodoFooter remaining={remainingCount} total={todos.length} filter={filter} />
        <section className="hook-debug">
          <h2>Hooks 배열</h2>
          <p>아래 패널은 경계를 드래그해서 넓이나 높이를 조절할 수 있습니다.</p>
          <div className="hook-debug-grid">
            <div className="hook-panel resizable-panel">
              <h3>코드처럼 보는 hooks 배열</h3>
              <div className="hook-stack">
                <div className="hook-split top">
                  <div className="hook-scroll-area">
                    <pre>{hookCodeView}</pre>
                  </div>
                </div>
                <div className="hook-split bottom">
                  <h4>최근 diff / patch 로그</h4>
                  <div className="patch-scroll-area">
                    <pre>{patchLogView}</pre>
                  </div>
                </div>
              </div>
            </div>
            <div className="hook-panel easy resizable-panel">
              <h3>hooks 설명 카드</h3>
              <div className="easy-hook-list">
                {hookRoleSummary.map((item) => (
                  <div className="easy-hook-card" key={item.index}>
                    <strong>hooks[{item.index}]</strong>
                    <span>{item.label}</span>
                    <code>{String(item.value)}</code>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
