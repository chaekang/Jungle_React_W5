import { debugLog, infoLog } from './logger';

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

function summarizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return {
      type: 'array',
      length: value.length,
    };
  }

  if (typeof value === 'function') {
    return '[function]';
  }

  if (value && typeof value === 'object') {
    return {
      type: 'object',
      keys: Object.keys(value as Record<string, unknown>),
    };
  }

  return value;
}

export function summarizeHookSlots(hooks: HookSlot[]): string[] {
  return hooks.map((slot, index) => {
    if (slot.type === 'state') {
      return `${index}:state=${JSON.stringify(summarizeValue(slot.value))}`;
    }

    if (slot.type === 'effect') {
      return `${index}:effect deps=${JSON.stringify(slot.deps.map(summarizeValue))} needsRun=${slot.needsRun} cleanup=${typeof slot.cleanup === 'function'}`;
    }

    return `${index}:memo deps=${JSON.stringify(slot.deps.map(summarizeValue))} value=${JSON.stringify(summarizeValue(slot.value))}`;
  });
}

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
  debugLog('Hook:Context', '현재 hook host를 설정하고 cursor를 0으로 초기화합니다.', {
    existingHookCount: component.hooks.length,
  });
}

export function clearCurrentComponent(): void {
  currentComponent = null;
  hookIndex = 0;
  debugLog('Hook:Context', '현재 hook host를 해제하고 cursor를 초기화합니다.');
}

export function scheduleEffectFlush(component: HookHost): void {
  pendingEffects.add(component);
  debugLog('Effect:Schedule', 'effect flush 대상을 큐에 등록합니다.', {
    queuedComponentCount: pendingEffects.size,
  });

  if (effectFlushScheduled) {
    debugLog('Effect:Schedule', '이미 microtask flush가 예약되어 있어 재예약하지 않습니다.');
    return;
  }

  effectFlushScheduled = true;
  debugLog('Effect:Schedule', 'microtask 기반 effect flush를 예약합니다.');
  Promise.resolve().then(() => {
    flushEffects();
  });
}

export function flushEffects(): void {
  effectFlushScheduled = false;
  const queuedComponents = Array.from(pendingEffects);
  pendingEffects.clear();
  debugLog('Effect:Flush', '예약된 effect flush를 실행합니다.', {
    componentCount: queuedComponents.length,
  });
  let executedEffectCount = 0;
  let cleanupCount = 0;

  for (const component of queuedComponents) {
    for (const slot of component.hooks) {
      if (slot.type !== 'effect' || !slot.needsRun || slot.pendingFn === undefined) {
        continue;
      }

      debugLog('Effect:Flush', 'effect cleanup을 먼저 실행합니다.', {
        hasCleanup: typeof slot.cleanup === 'function',
      });
      if (typeof slot.cleanup === 'function') {
        cleanupCount += 1;
      }
      slot.cleanup?.();
      const nextCleanup = slot.pendingFn();
      slot.cleanup = typeof nextCleanup === 'function' ? nextCleanup : undefined;
      slot.pendingFn = undefined;
      slot.needsRun = false;
      executedEffectCount += 1;
      debugLog('Effect:Flush', 'effect 본문 실행이 완료되었습니다.', {
        hasCleanup: typeof slot.cleanup === 'function',
      });
    }
  }

  infoLog('Effect:Summary', 'effect flush 요약입니다.', {
    componentCount: queuedComponents.length,
    executedEffectCount,
    cleanupCount,
  });
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
    debugLog('Hook:State', 'state 슬롯을 초기화합니다.', {
      slotIndex,
      initialValue,
    });
  }

  const slot = component.hooks[slotIndex] as StateHook<T>;
  debugLog('Hook:State', 'state 값을 읽습니다.', {
    slotIndex,
    value: slot.value,
  });
  const setState = (next: T | ((prev: T) => T)) => {
    const currentSlot = component.hooks[slotIndex] as StateHook<T>;
    const nextValue =
      typeof next === 'function'
        ? (next as (prev: T) => T)(currentSlot.value)
        : next;

    if (Object.is(currentSlot.value, nextValue)) {
      debugLog('Hook:State', 'state 변경이 없어 update를 생략합니다.', {
        slotIndex,
        value: currentSlot.value,
      });
      return;
    }

    debugLog('Hook:State', 'state 값을 갱신하고 update를 요청합니다.', {
      slotIndex,
      previousValue: currentSlot.value,
      nextValue,
    });
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
    debugLog('Hook:Effect', 'effect 슬롯을 초기화하고 첫 실행을 예약합니다.', {
      slotIndex,
      deps,
    });
    return;
  }

  if (depsChanged(existing.deps, deps)) {
    debugLog('Hook:Effect', 'deps 변경을 감지해 effect 재실행을 예약합니다.', {
      slotIndex,
      previousDeps: existing.deps,
      nextDeps: deps,
    });
    existing.deps = deps;
    existing.pendingFn = fn;
    existing.needsRun = true;
  } else {
    debugLog('Hook:Effect', 'deps 변경이 없어 기존 effect를 유지합니다.', {
      slotIndex,
      deps,
    });
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
    debugLog('Hook:Memo', 'memo 슬롯을 초기화하고 값을 계산합니다.', {
      slotIndex,
      deps,
      value,
    });
    return value;
  }

  if (depsChanged(existing.deps, deps)) {
    const previousDeps = existing.deps;
    existing.deps = deps;
    existing.value = fn();
    debugLog('Hook:Memo', 'deps 변경으로 memo 값을 다시 계산합니다.', {
      slotIndex,
      previousDeps,
      nextDeps: deps,
      value: existing.value,
    });
  } else {
    debugLog('Hook:Memo', 'deps 변경이 없어 memo 캐시를 재사용합니다.', {
      slotIndex,
      deps,
      value: existing.value,
    });
  }

  return existing.value;
}

export function resetHooksForTests(): void {
  currentComponent = null;
  hookIndex = 0;
  pendingEffects.clear();
  effectFlushScheduled = false;
}
