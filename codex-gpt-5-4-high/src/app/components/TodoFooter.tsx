import { h, type VNode } from '../../mini-react';
import type { TodoFilter } from '../types';

interface TodoFooterProps {
  remaining: number;
  total: number;
  filter: TodoFilter;
}

const filterLabel: Record<TodoFilter, string> = {
  all: '전체',
  active: '진행 중',
  completed: '완료',
};

export function TodoFooter({ remaining, total, filter }: TodoFooterProps): VNode {
  return (
    <footer className="todo-footer">
      <p className="todo-footer-stat">
        <strong>{remaining}</strong> / {total}개 남음
      </p>
      <p className="todo-footer-stat">현재 필터: {filterLabel[filter]}</p>
    </footer>
  );
}
