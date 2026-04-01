import { h, type VNode } from '../../mini-react';

interface TodoInputProps {
  value: string;
  onInput(value: string): void;
  onAdd(): void;
}

export function TodoInput({ value, onInput, onAdd }: TodoInputProps): VNode {
  const isDisabled = value.trim().length === 0;

  return (
    <section className="todo-input-panel">
      <label className="todo-label" for="todo-input">
        새 Todo 추가
      </label>
      <div className="todo-input-row">
        <input
          id="todo-input"
          className="todo-input"
          type="text"
          value={value}
          placeholder="할 일을 입력하세요..."
          onInput={(event: Event) => {
            const target = event.target as HTMLInputElement;
            onInput(target.value);
          }}
          onKeyDown={(event: Event) => {
            const keyboardEvent = event as KeyboardEvent;
            if (keyboardEvent.key === 'Enter') {
              onAdd();
            }
          }}
        />
        <button
          className="todo-add-button"
          type="button"
          disabled={isDisabled}
          onClick={() => {
            onAdd();
          }}
        >
          추가
        </button>
      </div>
    </section>
  );
}
