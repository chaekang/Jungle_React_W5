import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  FunctionComponent,
  getLatestPatchLogLines,
  h,
  resetHooksForTests,
  useEffect,
  useState,
} from '../src/mini-react';

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe('FunctionComponent', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    resetHooksForTests();
  });

  it('mounts the rendered DOM into the container', () => {
    const container = document.createElement('div');
    const component = new FunctionComponent(container, () => h('div', { id: 'root' }, 'hello'));

    component.mount();

    expect(container.querySelector('#root')?.textContent).toBe('hello');
  });

  it('reuses stable DOM nodes on update', () => {
    const container = document.createElement('div');
    let increment: (() => void) | undefined;

    const App = () => {
      const [count, setCount] = useState(0);
      increment = () => setCount((prev) => prev + 1);

      return h(
        'div',
        null,
        h('span', null, count),
        h('button', { type: 'button' }, 'stable'),
      );
    };

    const component = new FunctionComponent(container, () => h(App, null));
    component.mount();

    const stableButton = container.querySelector('button');
    increment?.();

    expect(container.querySelector('span')?.textContent).toBe('1');
    expect(container.querySelector('button')).toBe(stableButton);
  });

  it('flushes effects after patching in a microtask', async () => {
    const container = document.createElement('div');
    const effect = vi.fn();

    const App = () => {
      useEffect(() => {
        effect(container.textContent);
      }, []);

      return h('div', null, 'mounted');
    };

    const component = new FunctionComponent(container, () => h(App, null));
    component.mount();

    expect(effect).not.toHaveBeenCalled();

    await flushMicrotasks();

    expect(effect).toHaveBeenCalledWith('mounted');
  });

  it('records the latest patch summary after mount and update', () => {
    const container = document.createElement('div');
    let increment: (() => void) | undefined;

    const App = () => {
      const [count, setCount] = useState(0);
      increment = () => setCount((prev) => prev + 1);

      return h('div', null, h('span', null, count));
    };

    const component = new FunctionComponent(container, () => h(App, null));
    component.mount();

    expect(getLatestPatchLogLines()).toContain('initial mount');

    increment?.();

    expect(getLatestPatchLogLines()[0]).toBe('patch count: 1');
    expect(getLatestPatchLogLines().some((line) => line.includes('CHILDREN'))).toBe(true);
  });
});
