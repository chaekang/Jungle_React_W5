import { h } from '../../mini-react';
import { TodoFilter } from '../types';

interface Props {
  remaining: number;
  total: number;
  filter: TodoFilter;
}

const filterLabel: Record<TodoFilter, string> = {
  all: '전체',
  active: '진행 중',
  completed: '완료',
};

export function TodoFooter({ remaining, total, filter }: Props) {
  return (
    <footer class="todo-footer">
      {remaining} / {total}개 남음 · 현재 필터: {filterLabel[filter]}
    </footer>
  );
}
