import { h } from '../mini-react';
import { useState, useEffect, useMemo } from '../mini-react';
import { Todo } from './types';
import { TodoInput } from './components/TodoInput';
import { TodoList } from './components/TodoList';
import { TodoFooter } from './components/TodoFooter';

let nextId = 1;

export function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [inputText, setInputText] = useState('');

  const remainingCount = useMemo(
    () => todos.filter(t => !t.completed).length,
    [todos],
  );

  useEffect(() => {
    document.title = `Todos (${remainingCount} left)`;
  }, [remainingCount]);

  function handleAdd() {
    const text = inputText.trim();
    if (!text) return;
    setTodos(prev => [...prev, { id: nextId++, text, completed: false }]);
    setInputText('');
  }

  function handleToggle(id: number) {
    setTodos(prev =>
      prev.map(t => (t.id === id ? { ...t, completed: !t.completed } : t)),
    );
  }

  function handleDelete(id: number) {
    setTodos(prev => prev.filter(t => t.id !== id));
  }

  return (
    <div>
      <h1>Mini React Todo</h1>
      <TodoInput value={inputText} onInput={setInputText} onAdd={handleAdd} />
      <TodoList todos={todos} onToggle={handleToggle} onDelete={handleDelete} />
      <TodoFooter remaining={remainingCount} total={todos.length} />
    </div>
  );
}
