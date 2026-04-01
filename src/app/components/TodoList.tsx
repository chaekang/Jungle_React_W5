import { h } from '../../mini-react';
import { Todo } from '../types';
import { TodoItem } from './TodoItem';

interface Props {
  todos: Todo[];
  onToggle: (id: number) => void;
  onDelete: (id: number) => void;
}

export function TodoList({ todos, onToggle, onDelete }: Props) {
  return (
    <ul class="todo-list">
      {todos.map(todo => (
        <TodoItem key={todo.id} todo={todo} onToggle={onToggle} onDelete={onDelete} />
      ))}
    </ul>
  );
}
