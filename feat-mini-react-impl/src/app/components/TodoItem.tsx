import { h } from '../../mini-react';
import { Todo } from '../types';

interface Props {
  key?: string | number;
  todo: Todo;
  isEditing: boolean;
  isInspected: boolean;
  editingText: string;
  onEditInput: (value: string) => void;
  onEditCancel: () => void;
  onEditSave: () => void;
  onInspect: (id: number) => void;
  onStartEdit: (id: number) => void;
  onToggle: (id: number) => void;
  onDelete: (id: number) => void;
}

export function TodoItem({
  todo,
  isEditing,
  isInspected,
  editingText,
  onEditInput,
  onEditCancel,
  onEditSave,
  onInspect,
  onStartEdit,
  onToggle,
  onDelete,
}: Props) {
  return (
    <li
      class={`${todo.completed ? 'todo-item done' : 'todo-item'}${isInspected ? ' inspected' : ''}`}
      onClick={() => {
        onInspect(todo.id);
        onToggle(todo.id);
      }}
    >
      <label class="todo-toggle" onClick={(e: Event) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={todo.completed}
          onChange={() => onToggle(todo.id)}
        />
      </label>
      {isEditing ? (
        <input
          class="todo-edit-input"
          type="text"
          value={editingText}
          onClick={(e: Event) => e.stopPropagation()}
          onInput={(e: Event) => onEditInput((e.target as HTMLInputElement).value)}
          onKeydown={(e: KeyboardEvent) => {
            if (e.key === 'Enter') onEditSave();
            if (e.key === 'Escape') onEditCancel();
          }}
        />
      ) : (
        <span class={todo.completed ? 'completed' : ''}>
          {todo.text}
        </span>
      )}
      {isInspected ? <small class="todo-props-badge">props로 내려온 자식</small> : null}
      <div class="todo-actions">
        {isEditing ? (
          <span class="todo-edit-actions">
            <button onClick={(e: Event) => { e.stopPropagation(); onEditSave(); }}>저장</button>
            <button class="ghost" onClick={(e: Event) => { e.stopPropagation(); onEditCancel(); }}>취소</button>
          </span>
        ) : (
          <button class="ghost" onClick={(e: Event) => { e.stopPropagation(); onStartEdit(todo.id); }}>수정</button>
        )}
        <button onClick={(e: Event) => { e.stopPropagation(); onDelete(todo.id); }}>삭제</button>
      </div>
    </li>
  );
}
