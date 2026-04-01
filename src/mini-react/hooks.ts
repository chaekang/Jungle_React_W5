export type StateSlot<T = unknown> = {
  type: 'state';
  value: T;
};

export type EffectSlot = {
  type: 'effect';
  deps: unknown[];
  cleanup: (() => void) | void;
  pendingFn: (() => (() => void) | void) | null;
};

export type MemoSlot<T = unknown> = {
  type: 'memo';
  deps: unknown[];
  value: T;
};

export type HookSlot = StateSlot | EffectSlot | MemoSlot;

export interface ComponentLike {
  hooks: HookSlot[];
  update(): void;
}

let currentComponent: ComponentLike | null = null;
let hookIndex = 0;

export function setCurrentComponent(comp: ComponentLike): void {
  currentComponent = comp;
  hookIndex = 0;
}

export function clearCurrentComponent(): void {
  currentComponent = null;
  hookIndex = 0;
}

function getComponent(): ComponentLike {
  if (!currentComponent) throw new Error('Hook called outside of component render');
  return currentComponent;
}

function nextSlot(): [ComponentLike, number] {
  const comp = getComponent();
  const idx = hookIndex++;
  return [comp, idx];
}

export function useState<T>(initialValue: T): [T, (next: T | ((prev: T) => T)) => void] {
  const [comp, idx] = nextSlot();

  if (comp.hooks[idx] === undefined) {
    comp.hooks[idx] = { type: 'state', value: initialValue };
  }

  const slot = comp.hooks[idx] as StateSlot<T>;

  const setState = (next: T | ((prev: T) => T)): void => {
    const prev = (comp.hooks[idx] as StateSlot<T>).value;
    const newValue = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
    (comp.hooks[idx] as StateSlot<T>).value = newValue;
    comp.update();
  };

  return [slot.value, setState];
}

function depsChanged(prev: unknown[], next: unknown[]): boolean {
  if (prev.length !== next.length) return true;
  return prev.some((v, i) => !Object.is(v, next[i]));
}

export function useEffect(fn: () => (() => void) | void, deps: unknown[]): void {
  const [comp, idx] = nextSlot();

  if (comp.hooks[idx] === undefined) {
    comp.hooks[idx] = { type: 'effect', deps, cleanup: undefined, pendingFn: fn };
    scheduleEffect(comp, idx);
    return;
  }

  const slot = comp.hooks[idx] as EffectSlot;
  if (depsChanged(slot.deps, deps)) {
    slot.pendingFn = fn;
    slot.deps = deps;
    scheduleEffect(comp, idx);
  }
}

export function flushEffects(comp: ComponentLike): void {
  for (let i = 0; i < comp.hooks.length; i++) {
    const slot = comp.hooks[i];
    if (slot.type === 'effect' && slot.pendingFn !== null) {
      if (slot.cleanup) slot.cleanup();
      slot.cleanup = slot.pendingFn();
      slot.pendingFn = null;
    }
  }
}

function scheduleEffect(comp: ComponentLike, _idx: number): void {
  Promise.resolve().then(() => flushEffects(comp));
}

export function useMemo<T>(fn: () => T, deps: unknown[]): T {
  const [comp, idx] = nextSlot();

  if (comp.hooks[idx] === undefined) {
    const value = fn();
    comp.hooks[idx] = { type: 'memo', deps, value };
    return value;
  }

  const slot = comp.hooks[idx] as MemoSlot<T>;
  if (depsChanged(slot.deps, deps)) {
    slot.value = fn();
    slot.deps = deps;
  }
  return slot.value;
}
