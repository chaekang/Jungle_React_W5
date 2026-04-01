import { describe, expect, it } from 'vitest';

import { h } from '../src/mini-react';

describe('vdom', () => {
  it('normalizes children and removes nullish values', () => {
    const vnode = h(
      'div',
      { id: 'root' },
      'hello',
      42,
      null,
      undefined,
      [h('span', { className: 'nested' }, 'child')],
    );

    expect(vnode).toMatchObject({
      kind: 'element',
      type: 'div',
      props: { id: 'root' },
    });
    expect(vnode.kind).toBe('element');
    if (vnode.kind !== 'element') {
      throw new Error('Expected element vnode');
    }
    expect(vnode.children).toHaveLength(3);
    expect(vnode.children[0]).toEqual({ kind: 'text', text: 'hello' });
    expect(vnode.children[1]).toEqual({ kind: 'text', text: '42' });
    expect(vnode.children[2]).toMatchObject({
      kind: 'element',
      type: 'span',
    });
  });

  it('separates key from props', () => {
    const vnode = h('li', { key: 'todo-1', role: 'listitem' }, 'first');

    expect(vnode.kind).toBe('element');
    if (vnode.kind !== 'element') {
      throw new Error('Expected element vnode');
    }
    expect(vnode.key).toBe('todo-1');
    expect(vnode.props).toEqual({ role: 'listitem' });
  });

  it('invokes stateless function components', () => {
    const Message = ({ label }: { label: string }) => h('p', null, label);
    const vnode = h(Message, { label: 'hello' });

    expect(vnode).toMatchObject({
      kind: 'element',
      type: 'p',
    });
    expect(vnode.kind).toBe('element');
    if (vnode.kind !== 'element') {
      throw new Error('Expected element vnode');
    }
    expect(vnode.children[0]).toEqual({ kind: 'text', text: 'hello' });
  });
});
