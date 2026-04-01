import { h } from '../mini-react';
import {
  useState,
  useEffect,
  useMemo,
  getCurrentHookSnapshot,
  getLatestPatchLogLines,
} from '../mini-react';
import { Todo, TodoFilter } from './types';
import { TodoInput } from './components/TodoInput';
import { TodoList } from './components/TodoList';
import { TodoFooter } from './components/TodoFooter';

const initialTodos: Todo[] = [
  { id: 1, text: 'mini-react 렌더 흐름 살펴보기', completed: false },
  { id: 2, text: 'useState가 hooks 배열에 저장되는지 설명하기', completed: true },
  { id: 3, text: 'TodoItem은 props만 받는다는 점 보여주기', completed: false },
  { id: 4, text: '필터 버튼으로 App state 변경 시연하기', completed: false },
  { id: 5, text: '이벤트 로그로 상태 변화 추적하기', completed: true },
];

let nextId = initialTodos.length + 1;

export function App() {
  const [todos, setTodos] = useState<Todo[]>(initialTodos);
  const [inputText, setInputText] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');
  const [filter, setFilter] = useState<TodoFilter>('all');
  const [clickCount, setClickCount] = useState(0);
  const [inspectedTodoId, setInspectedTodoId] = useState<number>(initialTodos[2].id);
  const [debugTick, setDebugTick] = useState(0);
  const [eventLogs, setEventLogs] = useState<string[]>([
    'App가 모든 state를 관리합니다.',
    '자식 컴포넌트는 props만 받아서 렌더링합니다.',
  ]);

  const remainingCount = useMemo(
    () => todos.filter(t => !t.completed).length,
    [todos],
  );
  const filteredTodos = useMemo(() => {
    if (filter === 'active') {
      return todos.filter(todo => !todo.completed);
    }

    if (filter === 'completed') {
      return todos.filter(todo => todo.completed);
    }

    return todos;
  }, [todos, filter]);

  useEffect(() => {
    document.title = `Todos (${remainingCount} left, ${filter})`;
  }, [remainingCount, filter]);

  function pushLog(message: string) {
    setEventLogs(prev => [`${new Date().toLocaleTimeString('ko-KR')} - ${message}`, ...prev].slice(0, 8));
  }

  function scheduleDebugRefresh() {
    Promise.resolve().then(() => setDebugTick(prev => prev + 1));
  }

  function handleAdd() {
    const text = inputText.trim();
    if (!text) return;
    const newTodo = { id: nextId++, text, completed: false };
    setTodos(prev => [...prev, newTodo]);
    setInputText('');
    setInspectedTodoId(newTodo.id);
    pushLog(`TodoInput -> App.handleAdd("${text}") -> todos state 업데이트`);
    scheduleDebugRefresh();
  }

  function handleToggle(id: number) {
    setInspectedTodoId(id);
    setClickCount(prev => prev + 1);
    setTodos(prev =>
      prev.map(t => (t.id === id ? { ...t, completed: !t.completed } : t)),
    );
    pushLog(`TodoItem -> App.handleToggle(${id}) -> completed 상태 토글`);
    scheduleDebugRefresh();
  }

  function handleDelete(id: number) {
    setTodos(prev => prev.filter(t => t.id !== id));
    if (editingId === id) {
      setEditingId(null);
      setEditingText('');
    }
    if (inspectedTodoId === id) {
      const fallbackTodo = todos.find(todo => todo.id !== id);
      if (fallbackTodo) setInspectedTodoId(fallbackTodo.id);
    }
    pushLog(`TodoItem -> App.handleDelete(${id}) -> todos state에서 제거`);
    scheduleDebugRefresh();
  }

  function handleStartEdit(id: number) {
    const todo = todos.find(item => item.id === id);
    if (!todo) return;
    setInspectedTodoId(id);
    setEditingId(id);
    setEditingText(todo.text);
    pushLog(`TodoItem -> App.handleStartEdit(${id}) -> editing state 설정`);
    scheduleDebugRefresh();
  }

  function handleEditSave() {
    const text = editingText.trim();
    if (editingId === null || !text) return;

    setTodos(prev =>
      prev.map(todo => (todo.id === editingId ? { ...todo, text } : todo)),
    );
    setEditingId(null);
    setEditingText('');
    pushLog(`TodoItem -> App.handleEditSave(${editingId}) -> text state 반영`);
    scheduleDebugRefresh();
  }

  function handleEditCancel() {
    setEditingId(null);
    setEditingText('');
    pushLog('TodoItem -> App.handleEditCancel() -> editing state 초기화');
    scheduleDebugRefresh();
  }

  function handleInspect(id: number) {
    setInspectedTodoId(id);
    pushLog(`TodoItem(${id}) -> App가 props 전달 구조를 보여주기 위해 선택`);
    scheduleDebugRefresh();
  }

  const hookSnapshot = getCurrentHookSnapshot();
  const inspectedTodo =
    todos.find(todo => todo.id === inspectedTodoId) ??
    todos[0] ??
    null;
  const hookRoleSummary = [
    { index: 0, label: 'todos 상태', value: `${todos.length}개` },
    { index: 1, label: '입력창 상태', value: inputText || '(비어 있음)' },
    { index: 2, label: '수정 중 id', value: editingId ?? '없음' },
    { index: 3, label: '수정 중 텍스트', value: editingText || '(비어 있음)' },
    { index: 4, label: '필터 상태', value: filter },
    { index: 5, label: '카드 클릭 수', value: clickCount },
    { index: 6, label: '남은 개수 memo', value: remainingCount },
    { index: 7, label: '필터링된 목록 memo', value: `${filteredTodos.length}개` },
    { index: 8, label: 'title effect', value: '문서 제목 동기화' },
  ];
  const hookCodeView = [
    'hooks = [',
    `  [0] state(todos): ${JSON.stringify(todos)},`,
    `  [1] state(inputText): ${JSON.stringify(inputText)},`,
    `  [2] state(editingId): ${JSON.stringify(editingId)},`,
    `  [3] state(editingText): ${JSON.stringify(editingText)},`,
    `  [4] state(filter): ${JSON.stringify(filter)},`,
    `  [5] state(clickCount): ${JSON.stringify(clickCount)},`,
    `  [6] memo(remainingCount): ${JSON.stringify(remainingCount)},`,
    `  [7] memo(filteredTodos): ${JSON.stringify(filteredTodos.map(todo => ({ id: todo.id, text: todo.text, completed: todo.completed })))},`,
    `  [8] effect(title): ${JSON.stringify(hookSnapshot[8] ?? null)}`,
    ']',
  ].join('\n');
  const patchLogView = [`debugTick: ${debugTick}`, ...getLatestPatchLogLines()].join('\n');
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
  const childSignatureView = `function TodoItem(props) {
  // useState(...) 없음
  // useEffect(...) 없음
  // local hooks 배열 없음
  return UI(props.todo, props.isEditing, props.onToggle, ...);
}`;

  return (
    <div class="app-shell">
      <h1>Mini React Todo</h1>
      <TodoInput value={inputText} onInput={setInputText} onAdd={handleAdd} />
      <div class="demo-counter">
        카드 클릭으로 완료 토글한 횟수: <strong>{clickCount}</strong>
      </div>
      <div class="filter-bar">
        <button
          class={filter === 'all' ? 'active' : ''}
          onClick={() => { setFilter('all'); pushLog('Filter 버튼 -> App.filter = all'); }}
        >
          전체
        </button>
        <button
          class={filter === 'active' ? 'active' : ''}
          onClick={() => { setFilter('active'); pushLog('Filter 버튼 -> App.filter = active'); }}
        >
          진행 중
        </button>
        <button
          class={filter === 'completed' ? 'active' : ''}
          onClick={() => { setFilter('completed'); pushLog('Filter 버튼 -> App.filter = completed'); }}
        >
          완료
        </button>
      </div>
      <section class="todo-stage">
        <div class="todo-column">
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
        <aside class="event-log-panel">
          <h3>이벤트 로그</h3>
          <p>자식이 호출한 이벤트가 App state 변경으로 이어지는 흐름입니다.</p>
          <strong class="event-section-title">부모 state to 자식 props</strong>
          <span class="event-inline-text">선택된 자식 노드: TodoItem #{inspectedTodo?.id ?? '-'}</span>
          <code>{inspectedTodo ? `App.todos[${todos.findIndex(todo => todo.id === inspectedTodo.id)}]` : '없음'}</code>
          <div class="stateless-badge-row">
            <span class="stateless-badge off">TodoItem local state 없음, App props 사용</span>
          </div>
          <p class="compact-proof-text">
            App이 `todos`, `editingId`, `editingText`, `filter` state를 들고 있고, TodoItem은 그 값을 props로 받아 화면만 그립니다.
          </p>
          <pre class="event-code-block">{childSignatureView}</pre>
          <pre class="event-code-block">{childPropsView}</pre>
          <p class="props-flow-note">TodoItem 안에는 useState가 없고, App이 내려준 props만 사용합니다.</p>
          <div class="event-log-list">
            {eventLogs.map((log, index) => (
              <div class="event-log-item" key={index}>{log}</div>
            ))}
          </div>
        </aside>
      </section>
      <TodoFooter remaining={remainingCount} total={todos.length} filter={filter} />
      <section class="hook-debug">
        <h2>Hooks 배열</h2>
        <p>아래 패널은 경계를 드래그해서 넓이나 높이를 조절할 수 있습니다.</p>
        <div class="hook-debug-grid">
          <div class="hook-panel resizable-panel">
            <h3>코드처럼 보는 hooks 배열</h3>
            <div class="hook-stack">
              <div class="hook-split top">
                <pre>{hookCodeView}</pre>
              </div>
              <div class="hook-split bottom">
                <h4>최근 diff / patch 로그</h4>
                <pre>{patchLogView}</pre>
              </div>
            </div>
          </div>
          <div class="hook-panel easy resizable-panel">
            <h3>hooks 설명 카드</h3>
            <div class="easy-hook-list">
              {hookRoleSummary.map(item => (
                <div class="easy-hook-card" key={item.index}>
                  <strong>hooks[{item.index}]</strong>
                  <span>{item.label}</span>
                  <code>{String(item.value)}</code>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
