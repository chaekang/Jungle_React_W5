import { h } from '../../mini-react';

interface Props {
  value: string;
  onInput: (v: string) => void;
  onAdd: () => void;
}

export function TodoInput({ value, onInput, onAdd }: Props) {
  return (
    <div class="todo-input">
      <input
        type="text"
        value={value}
        onInput={(e: Event) => onInput((e.target as HTMLInputElement).value)}
        onKeydown={(e: KeyboardEvent) => { if (e.key === 'Enter') onAdd(); }}
        placeholder="할 일을 입력하세요..."
      />
      <button onClick={onAdd}>추가</button>
    </div>
  );
}
