import { h, type VNode } from '../../mini-react';

interface TodoFooterProps {
  remaining: number;
  total: number;
}

export function TodoFooter({ remaining, total }: TodoFooterProps): VNode {
  return (
    <footer className="todo-footer">
      <p className="todo-footer-stat">
        <strong>{remaining}</strong> remaining
      </p>
      <p className="todo-footer-stat">
        <strong>{total}</strong> total
      </p>
    </footer>
  );
}
