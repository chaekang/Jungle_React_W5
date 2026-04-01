export interface StateHook<T> {
  type: 'state';
  value: T;
}

export interface EffectHook {
  type: 'effect';
  deps: unknown[];
  cleanup?: (() => void) | undefined;
  pendingFn?: (() => void | (() => void)) | undefined;
  needsRun: boolean;
}

export interface MemoHook<T> {
  type: 'memo';
  deps: unknown[];
  value: T;
}

export type HookSlot = StateHook<unknown> | EffectHook | MemoHook<unknown>;

export interface HookHost {
  hooks: HookSlot[];
  update(): void;
}

let currentComponent: HookHost | null = null;
let hookIndex = 0;
const pendingEffects = new Set<HookHost>();
let effectFlushScheduled = false;

function assertCurrentComponent(): HookHost {
  if (currentComponent === null) {
    throw new Error('Hooks can only be used during component render.');
  }

  return currentComponent;
}

function depsChanged(previous: unknown[], next: unknown[]): boolean {
  if (previous.length !== next.length) {
    return true;
  }

  for (let index = 0; index < previous.length; index += 1) {
    if (!Object.is(previous[index], next[index])) {
      return true;
    }
  }

  return false;
}

export function setCurrentComponent(component: HookHost): void {
  currentComponent = component;
  hookIndex = 0;
}

export function clearCurrentComponent(): void {
  currentComponent = null;
  hookIndex = 0;
}

export function scheduleEffectFlush(component: HookHost): void {
  pendingEffects.add(component);

  if (effectFlushScheduled) {
    return;
  }

  effectFlushScheduled = true;
  Promise.resolve().then(() => {
    flushEffects();
  });
}

export function flushEffects(): void {
  effectFlushScheduled = false;
  const queuedComponents = Array.from(pendingEffects);
  pendingEffects.clear();

  for (const component of queuedComponents) {
    for (const slot of component.hooks) {
      if (slot.type !== 'effect' || !slot.needsRun || slot.pendingFn === undefined) {
        continue;
      }

      slot.cleanup?.();
      const nextCleanup = slot.pendingFn();
      slot.cleanup = typeof nextCleanup === 'function' ? nextCleanup : undefined;
      slot.pendingFn = undefined;
      slot.needsRun = false;
    }
  }
}

export function useState<T>(
  initialValue: T,
): [T, (next: T | ((prev: T) => T)) => void] {
  const component = assertCurrentComponent();
  const slotIndex = hookIndex;
  hookIndex += 1;

  if (component.hooks[slotIndex] === undefined) {
    component.hooks[slotIndex] = {
      type: 'state',
      value: initialValue,
    };
  }

  const slot = component.hooks[slotIndex] as StateHook<T>;
  const setState = (next: T | ((prev: T) => T)) => {
    const currentSlot = component.hooks[slotIndex] as StateHook<T>;
    const nextValue =
      typeof next === 'function'
        ? (next as (prev: T) => T)(currentSlot.value)
        : next;

    if (Object.is(currentSlot.value, nextValue)) {
      return;
    }

    currentSlot.value = nextValue;
    component.update();
  };

  return [slot.value, setState];
}

export function useEffect(
  fn: () => (() => void) | void,
  deps: unknown[],
): void {
  const component = assertCurrentComponent();
  const slotIndex = hookIndex;
  hookIndex += 1;

  const existing = component.hooks[slotIndex] as EffectHook | undefined;
  if (existing === undefined) {
    component.hooks[slotIndex] = {
      type: 'effect',
      deps,
      cleanup: undefined,
      pendingFn: fn,
      needsRun: true,
    };
    return;
  }

  if (depsChanged(existing.deps, deps)) {
    existing.deps = deps;
    existing.pendingFn = fn;
    existing.needsRun = true;
  }
}

export function useMemo<T>(fn: () => T, deps: unknown[]): T {
  const component = assertCurrentComponent();
  const slotIndex = hookIndex;
  hookIndex += 1;

  const existing = component.hooks[slotIndex] as MemoHook<T> | undefined;
  if (existing === undefined) {
    const value = fn();
    component.hooks[slotIndex] = {
      type: 'memo',
      deps,
      value,
    };
    return value;
  }

  if (depsChanged(existing.deps, deps)) {
    existing.deps = deps;
    existing.value = fn();
  }

  return existing.value;
}

export function resetHooksForTests(): void {
  currentComponent = null;
  hookIndex = 0;
  pendingEffects.clear();
  effectFlushScheduled = false;
}
