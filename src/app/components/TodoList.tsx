import { h, type VNode } from '../../mini-react';
import type { Todo } from '../types';
import { TodoItem } from './TodoItem';

interface TodoListProps {
  todos: Todo[];
  onToggle(id: number): void;
  onDelete(id: number): void;
}

export function TodoList({ todos, onToggle, onDelete }: TodoListProps): VNode {
  if (todos.length === 0) {
    return <p className="todo-empty">Your list is empty. Add the first task above.</p>;
  }

  return (
    <ul className="todo-list">
      {todos.map((todo) => (
        <TodoItem
          key={todo.id}
          todo={todo}
          onToggle={onToggle}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
}
