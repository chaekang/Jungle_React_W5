import { h, type VNode } from '../../mini-react';
import type { Todo } from '../types';

interface TodoItemProps {
  todo: Todo;
  onToggle(id: number): void;
  onDelete(id: number): void;
}

export function TodoItem({ todo, onToggle, onDelete }: TodoItemProps): VNode {
  return (
    <li className={`todo-item ${todo.completed ? 'is-complete' : ''}`}>
      <button
        className="todo-toggle"
        type="button"
        aria-label={todo.completed ? 'Mark as incomplete' : 'Mark as complete'}
        onClick={() => {
          onToggle(todo.id);
        }}
      >
        {todo.completed ? 'Done' : 'Open'}
      </button>
      <button
        className="todo-text"
        type="button"
        onClick={() => {
          onToggle(todo.id);
        }}
      >
        {todo.text}
      </button>
      <button
        className="todo-delete"
        type="button"
        aria-label={`Delete ${todo.text}`}
        onClick={() => {
          onDelete(todo.id);
        }}
      >
        Delete
      </button>
    </li>
  );
}
