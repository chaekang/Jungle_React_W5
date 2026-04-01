import { describe, it, expect, vi } from 'vitest';
import {
  useState,
  useEffect,
  useMemo,
  getCurrentHookSnapshot,
  setCurrentComponent,
  clearCurrentComponent,
  flushEffects,
  HookSlot,
  ComponentLike,
} from '../src/mini-react/hooks';

function makeComp(): ComponentLike {
  return {
    hooks: [] as HookSlot[],
    update: vi.fn(),
  };
}

function withComp<T>(comp: ComponentLike, fn: () => T): T {
  setCurrentComponent(comp);
  try {
    return fn();
  } finally {
    clearCurrentComponent();
  }
}

describe('useState', () => {
  it('초기값 반환', () => {
    const comp = makeComp();
    const [val] = withComp(comp, () => useState(42));
    expect(val).toBe(42);
  });

  it('setState 호출 후 값 업데이트 및 update() 트리거', () => {
    const comp = makeComp();
    const [, setState] = withComp(comp, () => useState(0));
    setState(5);
    expect(comp.update).toHaveBeenCalledOnce();
    const [val2] = withComp(comp, () => useState(0));
    expect(val2).toBe(5);
  });

  it('함수형 업데이터 지원', () => {
    const comp = makeComp();
    const [, setState] = withComp(comp, () => useState(10));
    setState(prev => prev + 1);
    const [val] = withComp(comp, () => useState(10));
    expect(val).toBe(11);
  });

  it('슬롯 인덱스 안정성: 여러 useState', () => {
    const comp = makeComp();
    withComp(comp, () => {
      useState('a');
      useState('b');
    });
    const [v1, s1] = withComp(comp, () => {
      const r1 = useState('a');
      useState('b');
      return r1;
    });
    expect(v1).toBe('a');
    s1('changed');
    const [v1b] = withComp(comp, () => {
      const r = useState('a');
      useState('b');
      return r;
    });
    expect(v1b).toBe('changed');
  });

  it('두 번째 슬롯은 독립적', () => {
    const comp = makeComp();
    withComp(comp, () => { useState(0); useState(100); });
    const [, s2] = withComp(comp, () => {
      useState(0);
      return useState(100);
    });
    s2(999);
    const [v1, v2] = withComp(comp, () => [useState(0)[0], useState(100)[0]]);
    expect(v1).toBe(0);
    expect(v2).toBe(999);
  });
});

describe('useMemo', () => {
  it('초기 실행', () => {
    const comp = makeComp();
    const fn = vi.fn(() => 42);
    const val = withComp(comp, () => useMemo(fn, []));
    expect(val).toBe(42);
    expect(fn).toHaveBeenCalledOnce();
  });

  it('deps 동일 시 재실행 안 함', () => {
    const comp = makeComp();
    const fn = vi.fn(() => 1);
    withComp(comp, () => useMemo(fn, [1, 2]));
    withComp(comp, () => useMemo(fn, [1, 2]));
    expect(fn).toHaveBeenCalledOnce();
  });

  it('deps 변경 시 재실행', () => {
    const comp = makeComp();
    const fn = vi.fn((x?: number) => x);
    withComp(comp, () => useMemo(() => fn(1), [1]));
    withComp(comp, () => useMemo(() => fn(2), [2]));
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('캐시된 값 반환', () => {
    const comp = makeComp();
    const val1 = withComp(comp, () => useMemo(() => 'cached', ['x']));
    const val2 = withComp(comp, () => useMemo(() => 'new', ['x']));
    expect(val1).toBe('cached');
    expect(val2).toBe('cached');
  });
});

describe('useEffect', () => {
  it('첫 렌더에서 effect 실행 (microtask)', async () => {
    const comp = makeComp();
    const fn = vi.fn();
    withComp(comp, () => useEffect(fn, []));
    expect(fn).not.toHaveBeenCalled();
    await Promise.resolve();
    expect(fn).toHaveBeenCalledOnce();
  });

  it('deps 동일 시 재실행 안 함', async () => {
    const comp = makeComp();
    const fn = vi.fn();
    withComp(comp, () => useEffect(fn, [1]));
    await Promise.resolve();
    withComp(comp, () => useEffect(fn, [1]));
    await Promise.resolve();
    expect(fn).toHaveBeenCalledOnce();
  });

  it('deps 변경 시 재실행', async () => {
    const comp = makeComp();
    const fn = vi.fn();
    withComp(comp, () => useEffect(fn, [1]));
    await Promise.resolve();
    withComp(comp, () => useEffect(fn, [2]));
    await Promise.resolve();
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('cleanup 호출', async () => {
    const comp = makeComp();
    const cleanup = vi.fn();
    const fn = vi.fn(() => cleanup);
    withComp(comp, () => useEffect(fn, [1]));
    await Promise.resolve();
    withComp(comp, () => useEffect(fn, [2]));
    await Promise.resolve();
    expect(cleanup).toHaveBeenCalledOnce();
  });

  it('flushEffects 직접 호출', () => {
    const comp = makeComp();
    const fn = vi.fn();
    withComp(comp, () => useEffect(fn, []));
    flushEffects(comp);
    expect(fn).toHaveBeenCalledOnce();
  });
});

describe('getCurrentHookSnapshot', () => {
  it('현재 hook 슬롯을 디버그용 객체로 반환', () => {
    const comp = makeComp();
    const snapshot = withComp(comp, () => {
      useState('hello');
      useMemo(() => 3, []);
      useEffect(() => undefined, ['x']);
      return getCurrentHookSnapshot();
    });

    expect(snapshot).toEqual([
      { index: 0, type: 'state', value: 'hello' },
      { index: 1, type: 'memo', value: 3, deps: [] },
      { index: 2, type: 'effect', deps: ['x'], pending: true, hasCleanup: false },
    ]);
  });
});
