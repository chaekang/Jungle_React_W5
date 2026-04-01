import { describe, it, expect, vi } from 'vitest';
import { h } from '../src/mini-react/vdom';
import { FunctionComponent, render } from '../src/mini-react/component';
import { useState, useEffect, useMemo } from '../src/mini-react/hooks';

function makeContainer(): HTMLElement {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return el;
}

describe('FunctionComponent.mount()', () => {
  it('컨테이너에 DOM 삽입', () => {
    const container = makeContainer();
    const comp = new FunctionComponent(() => h('h1', null, 'Hello'), container);
    comp.mount();
    expect(container.querySelector('h1')?.textContent).toBe('Hello');
  });

  it('mount 후 effect microtask 실행', async () => {
    const container = makeContainer();
    const fn = vi.fn();
    const comp = new FunctionComponent(() => {
      useEffect(fn, []);
      return h('div', null);
    }, container);
    comp.mount();
    expect(fn).not.toHaveBeenCalled();
    await Promise.resolve();
    expect(fn).toHaveBeenCalledOnce();
  });
});

describe('FunctionComponent.update()', () => {
  it('update 후 DOM 텍스트 변경', async () => {
    const container = makeContainer();
    let setText!: (v: string) => void;
    const comp = new FunctionComponent(() => {
      const [text, set] = useState('before');
      setText = set;
      return h('p', null, text);
    }, container);
    comp.mount();
    expect(container.querySelector('p')?.textContent).toBe('before');
    setText('after');
    expect(container.querySelector('p')?.textContent).toBe('after');
  });

  it('update 후 기존 노드 재사용 (REPLACE 없음)', async () => {
    const container = makeContainer();
    let setVal!: (v: number) => void;
    const comp = new FunctionComponent(() => {
      const [val, set] = useState(0);
      setVal = set;
      return h('div', null, String(val));
    }, container);
    comp.mount();
    const divBefore = container.querySelector('div');
    setVal(1);
    const divAfter = container.querySelector('div');
    expect(divBefore).toBe(divAfter); // 같은 노드
  });
});

describe('render() helper', () => {
  it('render()가 FunctionComponent 반환', () => {
    const container = makeContainer();
    const comp = render(() => h('span', null, 'hi'), container);
    expect(comp).toBeInstanceOf(FunctionComponent);
    expect(container.querySelector('span')?.textContent).toBe('hi');
  });
});

describe('useState + useMemo + useEffect 통합', () => {
  it('useState → useMemo → useEffect 체인', async () => {
    const container = makeContainer();
    const effectFn = vi.fn();
    let setCount!: (v: number) => void;

    const comp = new FunctionComponent(() => {
      const [count, set] = useState(0);
      setCount = set;
      const doubled = useMemo(() => count * 2, [count]);
      useEffect(() => { effectFn(doubled); }, [doubled]);
      return h('div', null, String(doubled));
    }, container);
    comp.mount();
    await Promise.resolve();
    expect(effectFn).toHaveBeenCalledWith(0);

    setCount(5);
    await Promise.resolve();
    expect(effectFn).toHaveBeenCalledWith(10);
    expect(container.querySelector('div')?.textContent).toBe('10');
  });
});
