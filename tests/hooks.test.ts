import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  clearCurrentComponent,
  getCurrentHookSnapshot,
  resetHooksForTests,
  scheduleEffectFlush,
  setCurrentComponent,
  useEffect,
  useMemo,
  useState,
  type HookHost,
} from '../src/mini-react';

function createHost(): HookHost {
  return {
    hooks: [],
    update: vi.fn(),
  };
}

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe('hooks', () => {
  beforeEach(() => {
    resetHooksForTests();
  });

  it('keeps hook slots stable across renders', () => {
    const host = createHost();

    setCurrentComponent(host);
    const [firstCount] = useState(1);
    const firstMemo = useMemo(() => firstCount * 2, [firstCount]);
    clearCurrentComponent();

    setCurrentComponent(host);
    const [secondCount] = useState(999);
    const secondMemo = useMemo(() => secondCount * 2, [secondCount]);
    clearCurrentComponent();

    expect(firstCount).toBe(1);
    expect(secondCount).toBe(1);
    expect(firstMemo).toBe(2);
    expect(secondMemo).toBe(2);
    expect(host.hooks).toHaveLength(2);
  });

  it('triggers component updates from setState and supports functional updaters', () => {
    const host = createHost();

    setCurrentComponent(host);
    const [count, setCount] = useState(1);
    clearCurrentComponent();

    expect(count).toBe(1);

    setCount((prev) => prev + 1);
    expect(host.update).toHaveBeenCalledTimes(1);
    expect((host.hooks[0] as { value: number }).value).toBe(2);
  });

  it('memoizes values until dependencies change', () => {
    const host = createHost();
    const compute = vi.fn((value: number) => value * 10);

    setCurrentComponent(host);
    const first = useMemo(() => compute(2), [2]);
    clearCurrentComponent();

    setCurrentComponent(host);
    const second = useMemo(() => compute(2), [2]);
    clearCurrentComponent();

    setCurrentComponent(host);
    const third = useMemo(() => compute(3), [3]);
    clearCurrentComponent();

    expect(first).toBe(20);
    expect(second).toBe(20);
    expect(third).toBe(30);
    expect(compute).toHaveBeenCalledTimes(2);
  });

  it('runs effects after a microtask and executes cleanup before rerun', async () => {
    const host = createHost();
    const cleanup = vi.fn();
    const firstEffect = vi.fn(() => cleanup);
    const secondEffect = vi.fn();

    setCurrentComponent(host);
    useEffect(firstEffect, [1]);
    clearCurrentComponent();

    scheduleEffectFlush(host);
    await flushMicrotasks();

    expect(firstEffect).toHaveBeenCalledTimes(1);
    expect(cleanup).not.toHaveBeenCalled();

    setCurrentComponent(host);
    useEffect(secondEffect, [2]);
    clearCurrentComponent();

    scheduleEffectFlush(host);
    await flushMicrotasks();

    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(secondEffect).toHaveBeenCalledTimes(1);
  });

  it('returns a serializable snapshot of the current hook slots', () => {
    const host = createHost();

    setCurrentComponent(host);
    const [count] = useState(3);
    const doubled = useMemo(() => count * 2, [count]);
    useEffect(() => undefined, [count, doubled]);
    const snapshot = getCurrentHookSnapshot();
    clearCurrentComponent();

    expect(snapshot).toEqual([
      3,
      6,
      {
        type: 'effect',
        deps: [3, 6],
        hasCleanup: false,
        needsRun: true,
      },
    ]);
  });
});
