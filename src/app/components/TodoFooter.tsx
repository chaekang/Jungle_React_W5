import { h } from '../../mini-react';

interface Props {
  remaining: number;
  total: number;
}

export function TodoFooter({ remaining, total }: Props) {
  return (
    <footer class="todo-footer">
      {remaining} / {total}개 남음
    </footer>
  );
}
