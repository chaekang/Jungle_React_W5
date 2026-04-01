import { describe, it, expect, vi } from 'vitest';
import { h } from '../src/mini-react/vdom';
import { diff } from '../src/mini-react/diff';
import { createDom, patch, mount } from '../src/mini-react/patch';

function setup() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  return container;
}

describe('createDom()', () => {
  it('텍스트 노드 생성', () => {
    const dom = createDom({ kind: 'text', text: 'hello' });
    expect(dom.nodeType).toBe(Node.TEXT_NODE);
    expect(dom.textContent).toBe('hello');
  });

  it('엘리먼트 생성', () => {
    const dom = createDom(h('div', { id: 'box' }, 'content')) as HTMLElement;
    expect(dom.tagName.toLowerCase()).toBe('div');
    expect(dom.getAttribute('id')).toBe('box');
    expect(dom.textContent).toBe('content');
  });

  it('이벤트 리스너 등록', () => {
    const fn = vi.fn();
    const dom = createDom(h('button', { onClick: fn })) as HTMLButtonElement;
    dom.click();
    expect(fn).toHaveBeenCalledOnce();
  });
});

describe('patch() — UPDATE_TEXT', () => {
  it('텍스트 노드 내용 변경', () => {
    const container = setup();
    const old = { kind: 'text' as const, text: 'before' };
    const next = { kind: 'text' as const, text: 'after' };
    const dom = createDom(old);
    container.appendChild(dom);
    patch(dom, diff(old, next));
    expect(dom.textContent).toBe('after');
  });
});

describe('patch() — UPDATE_PROPS', () => {
  it('속성 추가', () => {
    const old = h('div', {});
    const next = h('div', { id: 'x' });
    const dom = createDom(old) as HTMLElement;
    patch(dom, diff(old, next));
    expect(dom.getAttribute('id')).toBe('x');
  });

  it('속성 제거', () => {
    const old = h('div', { id: 'x' });
    const next = h('div', {});
    const dom = createDom(old) as HTMLElement;
    patch(dom, diff(old, next));
    expect(dom.getAttribute('id')).toBeNull();
  });
});

describe('patch() — REPLACE', () => {
  it('다른 태그로 교체', () => {
    const container = setup();
    const old = h('div', null, 'text');
    const next = h('span', null, 'text');
    const dom = createDom(old);
    container.appendChild(dom);
    const newDom = patch(dom, diff(old, next));
    expect(newDom.nodeName.toLowerCase()).toBe('span');
  });
});

describe('patch() — CHILDREN', () => {
  it('자식 추가', () => {
    const container = setup();
    const old = h('ul', null);
    const next = h('ul', null, h('li', null, 'item'));
    const dom = createDom(old) as HTMLElement;
    container.appendChild(dom);
    patch(dom, diff(old, next));
    expect(dom.children).toHaveLength(1);
    expect(dom.children[0].tagName.toLowerCase()).toBe('li');
  });

  it('자식 삭제', () => {
    const container = setup();
    const old = h('ul', null, h('li', null, 'a'));
    const next = h('ul', null);
    const dom = createDom(old) as HTMLElement;
    container.appendChild(dom);
    patch(dom, diff(old, next));
    expect(dom.children).toHaveLength(0);
  });
});

describe('이벤트 리스너 중복 방지', () => {
  it('재렌더 후 이벤트 핸들러 중복 등록 없음', () => {
    const fn = vi.fn();
    const old = h('button', { onClick: fn });
    const next = h('button', { onClick: fn });
    const dom = createDom(old) as HTMLButtonElement;
    patch(dom, diff(old, next));
    dom.click();
    expect(fn).toHaveBeenCalledOnce();
  });

  it('새 핸들러로 교체', () => {
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    const old = h('button', { onClick: fn1 });
    const next = h('button', { onClick: fn2 });
    const dom = createDom(old) as HTMLButtonElement;
    patch(dom, diff(old, next));
    dom.click();
    expect(fn1).not.toHaveBeenCalled();
    expect(fn2).toHaveBeenCalledOnce();
  });
});

describe('mount()', () => {
  it('컨테이너에 DOM 삽입', () => {
    const container = setup();
    mount(h('h1', null, 'Hello'), container);
    expect(container.querySelector('h1')?.textContent).toBe('Hello');
  });
});
