import { describe, it, expect } from 'vitest';
import { h, VNode } from '../src/mini-react/vdom';
import { diff, PatchOp } from '../src/mini-react/diff';

const text = (t: string): VNode => ({ kind: 'text', text: t });

describe('diff()', () => {
  it('동일 트리 → 빈 결과', () => {
    const node = h('div', { id: 'a' }, 'hello');
    expect(diff(node, node)).toEqual([]);
  });

  it('text → text 동일 → 빈 결과', () => {
    expect(diff(text('hi'), text('hi'))).toEqual([]);
  });

  it('text 변경 → UPDATE_TEXT', () => {
    const ops = diff(text('a'), text('b'));
    expect(ops).toEqual([{ type: 'UPDATE_TEXT', text: 'b' }]);
  });

  it('kind 다름 (text vs element) → REPLACE', () => {
    const ops = diff(text('a'), h('span', null, 'a'));
    expect(ops[0].type).toBe('REPLACE');
  });

  it('태그 다름 → REPLACE', () => {
    const ops = diff(h('div', null), h('span', null));
    expect(ops[0].type).toBe('REPLACE');
  });

  it('props 추가 → UPDATE_PROPS added', () => {
    const ops = diff(h('div', {}), h('div', { id: 'x' }));
    const update = ops.find(o => o.type === 'UPDATE_PROPS') as Extract<PatchOp, { type: 'UPDATE_PROPS' }>;
    expect(update).toBeDefined();
    expect(update.added).toEqual({ id: 'x' });
    expect(update.removed).toEqual([]);
  });

  it('props 제거 → UPDATE_PROPS removed', () => {
    const ops = diff(h('div', { id: 'x' }), h('div', {}));
    const update = ops.find(o => o.type === 'UPDATE_PROPS') as Extract<PatchOp, { type: 'UPDATE_PROPS' }>;
    expect(update).toBeDefined();
    expect(update.removed).toContain('id');
  });

  it('props 변경 → UPDATE_PROPS added', () => {
    const ops = diff(h('div', { id: 'a' }), h('div', { id: 'b' }));
    const update = ops.find(o => o.type === 'UPDATE_PROPS') as Extract<PatchOp, { type: 'UPDATE_PROPS' }>;
    expect(update.added).toEqual({ id: 'b' });
  });

  it('props 동일 → UPDATE_PROPS 없음', () => {
    const ops = diff(h('div', { id: 'a' }), h('div', { id: 'a' }));
    expect(ops.find(o => o.type === 'UPDATE_PROPS')).toBeUndefined();
  });

  it('자식 추가 → APPEND', () => {
    const old = h('ul', null);
    const next = h('ul', null, h('li', null, 'a'));
    const ops = diff(old, next);
    const children = ops.find(o => o.type === 'CHILDREN') as Extract<PatchOp, { type: 'CHILDREN' }>;
    expect(children).toBeDefined();
    expect(children.childPatches[0].op.type).toBe('APPEND');
  });

  it('자식 삭제 → REMOVE', () => {
    const old = h('ul', null, h('li', null, 'a'));
    const next = h('ul', null);
    const ops = diff(old, next);
    const children = ops.find(o => o.type === 'CHILDREN') as Extract<PatchOp, { type: 'CHILDREN' }>;
    expect(children.childPatches[0].op.type).toBe('REMOVE');
  });

  it('자식 텍스트 변경 → CHILDREN > UPDATE_TEXT', () => {
    const old = h('p', null, 'before');
    const next = h('p', null, 'after');
    const ops = diff(old, next);
    const children = ops.find(o => o.type === 'CHILDREN') as Extract<PatchOp, { type: 'CHILDREN' }>;
    expect(children.childPatches[0].op.type).toBe('UPDATE_TEXT');
  });
});
