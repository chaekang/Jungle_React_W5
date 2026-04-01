import { h, type VNode } from '../../mini-react';
import type { Todo } from '../types';
import { TodoItem } from './TodoItem';

interface TodoListProps {
  todos: Todo[];
  editingId: number | null;
  editingText: string;
  inspectedTodoId: number | null;
  onEditInput(value: string): void;
  onEditCancel(): void;
  onEditSave(): void;
  onInspect(id: number): void;
  onStartEdit(id: number): void;
  onToggle(id: number): void;
  onDelete(id: number): void;
}

export function TodoList({
  todos,
  editingId,
  editingText,
  inspectedTodoId,
  onEditInput,
  onEditCancel,
  onEditSave,
  onInspect,
  onStartEdit,
  onToggle,
  onDelete,
}: TodoListProps): VNode {
  if (todos.length === 0) {
    return <p className="todo-empty">표시할 Todo가 없습니다.</p>;
  }

  return (
    <ul className="todo-list">
      {todos.map((todo) => (
        <TodoItem
          key={todo.id}
          todo={todo}
          isEditing={editingId === todo.id}
          isInspected={inspectedTodoId === todo.id}
          editingText={editingText}
          onEditInput={onEditInput}
          onEditCancel={onEditCancel}
          onEditSave={onEditSave}
          onInspect={onInspect}
          onStartEdit={onStartEdit}
          onToggle={onToggle}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
}
