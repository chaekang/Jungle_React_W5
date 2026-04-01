import { h } from '../../mini-react';
import { Todo } from '../types';

interface Props {
  todo: Todo;
  onToggle: (id: number) => void;
  onDelete: (id: number) => void;
}

export function TodoItem({ todo, onToggle, onDelete }: Props) {
  return (
    <li class="todo-item">
      <span
        class={todo.completed ? 'completed' : ''}
        onClick={() => onToggle(todo.id)}
      >
        {todo.text}
      </span>
      <button onClick={() => onDelete(todo.id)}>삭제</button>
    </li>
  );
}
