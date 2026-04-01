import { h, useEffect, useMemo, useState, type VNode } from '../mini-react';
import { TodoFooter } from './components/TodoFooter';
import { TodoInput } from './components/TodoInput';
import { TodoList } from './components/TodoList';
import type { Todo } from './types';

let nextTodoId = 1;

export function App(): VNode {
  const [todos, setTodos] = useState<Todo[]>([
    {
      id: nextTodoId++,
      text: 'Build hooks from scratch',
      completed: true,
    },
    {
      id: nextTodoId++,
      text: 'Patch only the nodes that changed',
      completed: false,
    },
  ]);
  const [inputText, setInputText] = useState('');

  const remainingCount = useMemo(
    () => todos.filter((todo) => !todo.completed).length,
    [todos],
  );

  useEffect(() => {
    document.title = `Todos (${remainingCount} left)`;
  }, [remainingCount]);

  const handleAdd = () => {
    const trimmedText = inputText.trim();
    if (trimmedText.length === 0) {
      return;
    }

    setTodos((previousTodos) => [
      ...previousTodos,
      {
        id: nextTodoId++,
        text: trimmedText,
        completed: false,
      },
    ]);
    setInputText('');
  };

  const handleToggle = (id: number) => {
    setTodos((previousTodos) =>
      previousTodos.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo,
      ),
    );
  };

  const handleDelete = (id: number) => {
    setTodos((previousTodos) => previousTodos.filter((todo) => todo.id !== id));
  };

  return (
    <main className="app-shell">
      <section className="app-card">
        <p className="app-kicker">Week 5 Mini React</p>
        <h1 className="app-title">Todo list powered by a custom renderer</h1>
        <p className="app-description">
          State lives in the root component, pure child components receive props,
          and DOM updates flow through Virtual DOM diff + patch.
        </p>
        <TodoInput
          value={inputText}
          onInput={setInputText}
          onAdd={handleAdd}
        />
        <TodoList
          todos={todos}
          onToggle={handleToggle}
          onDelete={handleDelete}
        />
        <TodoFooter remaining={remainingCount} total={todos.length} />
      </section>
    </main>
  );
}
