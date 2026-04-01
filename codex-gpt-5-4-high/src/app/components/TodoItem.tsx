import { Fragment, h, type VNode } from '../../mini-react';
import type { Todo } from '../types';

interface TodoItemProps {
  todo: Todo;
  isEditing: boolean;
  isInspected: boolean;
  editingText: string;
  onEditInput(value: string): void;
  onEditCancel(): void;
  onEditSave(): void;
  onInspect(id: number): void;
  onStartEdit(id: number): void;
  onToggle(id: number): void;
  onDelete(id: number): void;
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
}: TodoItemProps): VNode {
  return (
    <li
      className={`todo-item ${todo.completed ? 'is-complete' : ''}${isInspected ? ' is-inspected' : ''}`}
      onClick={() => {
        onInspect(todo.id);
        if (!isEditing) {
          onToggle(todo.id);
        }
      }}
    >
      <label
        className="todo-check"
        onClick={(event: Event) => {
          event.stopPropagation();
        }}
      >
        <input
          className="todo-checkbox"
          type="checkbox"
          checked={todo.completed}
          onChange={() => {
            onInspect(todo.id);
            onToggle(todo.id);
          }}
        />
      </label>
      <div className="todo-main">
        {isEditing ? (
          <input
            className="todo-edit-input"
            type="text"
            value={editingText}
            onClick={(event: Event) => {
              event.stopPropagation();
            }}
            onInput={(event: Event) => {
              const target = event.target as HTMLInputElement;
              onEditInput(target.value);
            }}
            onKeyDown={(event: Event) => {
              const keyboardEvent = event as KeyboardEvent;
              if (keyboardEvent.key === 'Enter') {
                onEditSave();
              }
              if (keyboardEvent.key === 'Escape') {
                onEditCancel();
              }
            }}
          />
        ) : (
          <span className={`todo-text ${todo.completed ? 'is-done' : ''}`}>{todo.text}</span>
        )}
        {isInspected ? (
          <small className="todo-props-badge">props로 내려온 자식</small>
        ) : null}
      </div>
      <div className="todo-actions">
        {isEditing ? (
          <>
            <button
              className="todo-action"
              type="button"
              onClick={(event: Event) => {
                event.stopPropagation();
                onEditSave();
              }}
            >
              저장
            </button>
            <button
              className="todo-action ghost"
              type="button"
              onClick={(event: Event) => {
                event.stopPropagation();
                onEditCancel();
              }}
            >
              취소
            </button>
          </>
        ) : (
          <button
            className="todo-action ghost"
            type="button"
            onClick={(event: Event) => {
              event.stopPropagation();
              onInspect(todo.id);
              onStartEdit(todo.id);
            }}
          >
            수정
          </button>
        )}
        <button
          className="todo-action danger"
          type="button"
          aria-label={`${todo.text} 삭제`}
          onClick={(event: Event) => {
            event.stopPropagation();
            onDelete(todo.id);
          }}
        >
          삭제
        </button>
      </div>
    </li>
  );
}
