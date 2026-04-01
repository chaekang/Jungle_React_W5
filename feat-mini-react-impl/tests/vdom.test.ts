import { describe, it, expect } from 'vitest';
import { h, VElement, VText } from '../src/mini-react/vdom';

describe('h() / createElement', () => {
  it('기본 엘리먼트 생성', () => {
    const node = h('div', null) as VElement;
    expect(node.kind).toBe('element');
    expect(node.type).toBe('div');
    expect(node.props).toEqual({});
    expect(node.children).toEqual([]);
  });

  it('props 전달', () => {
    const node = h('input', { type: 'text', disabled: true }) as VElement;
    expect(node.props.type).toBe('text');
    expect(node.props.disabled).toBe(true);
  });

  it('문자열 자식 → VText 변환', () => {
    const node = h('span', null, 'hello') as VElement;
    expect(node.children).toHaveLength(1);
    const child = node.children[0] as VText;
    expect(child.kind).toBe('text');
    expect(child.text).toBe('hello');
  });

  it('숫자 자식 → VText 변환', () => {
    const node = h('span', null, 42) as VElement;
    const child = node.children[0] as VText;
    expect(child.kind).toBe('text');
    expect(child.text).toBe('42');
  });

  it('null/undefined 자식 제거', () => {
    const node = h('div', null, null, undefined, 'keep') as VElement;
    expect(node.children).toHaveLength(1);
    expect((node.children[0] as VText).text).toBe('keep');
  });

  it('중첩 배열 flatten', () => {
    const node = h('ul', null, [h('li', null, 'a'), h('li', null, 'b')]) as VElement;
    expect(node.children).toHaveLength(2);
    expect((node.children[0] as VElement).type).toBe('li');
  });

  it('key prop → VElement.key로 분리, props에서 제거', () => {
    const node = h('div', { key: 'abc', id: 'x' }) as VElement;
    expect(node.key).toBe('abc');
    expect(node.props.key).toBeUndefined();
    expect(node.props.id).toBe('x');
  });

  it('key 없으면 key 프로퍼티 없음', () => {
    const node = h('div', null) as VElement;
    expect(node.key).toBeUndefined();
  });

  it('중첩 구조', () => {
    const node = h('ul', null,
      h('li', { key: 1 }, 'first'),
      h('li', { key: 2 }, 'second'),
    ) as VElement;
    expect(node.children).toHaveLength(2);
    expect((node.children[0] as VElement).key).toBe(1);
  });
});
