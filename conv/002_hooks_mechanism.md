# Hooks 동작 원리

## 핵심 질문

> "함수는 매번 새로 실행되는데, 상태는 어떻게 유지될까?"

함수형 컴포넌트는 호출될 때마다 새로운 스택 프레임이 생성되므로, 지역 변수로는 상태를 보존할 수 없습니다.
해결책: 상태를 **함수 외부의 배열**에 저장하고, 호출 순서(인덱스)로 접근합니다.

---

## Global Cursor Pattern

```ts
// hooks.ts (모듈 레벨 전역 변수)
let currentComponent: FunctionComponent | null = null;
let hookIndex: number = 0;

export function setCurrentComponent(comp: FunctionComponent): void {
  currentComponent = comp;
  hookIndex = 0;  // 렌더마다 커서를 슬롯 0으로 초기화
}
```

### 동작 흐름

```
component.update() 호출
  └─ setCurrentComponent(this)   ← currentComponent 포인터 설정, hookIndex = 0
  └─ renderFn() 실행
       └─ useState(0)            ← hookIndex=0 슬롯 읽기, hookIndex++
       └─ useState([])           ← hookIndex=1 슬롯 읽기, hookIndex++
       └─ useMemo(fn, [todos])   ← hookIndex=2 슬롯 읽기, hookIndex++
  └─ clearCurrentComponent()     ← currentComponent = null
```

**핵심:** 훅이 항상 **동일한 순서**로 호출되어야 슬롯 인덱스가 안정적입니다.
이것이 React의 "훅은 조건문/반복문 안에서 호출하면 안 된다"는 규칙의 이유입니다.

---

## useState

```ts
// 슬롯 구조
interface StateSlot<T> {
  type: 'state';
  value: T;
}

function useState<T>(initialValue: T): [T, (next: T | ((prev: T) => T)) => void] {
  const index = hookIndex++;
  const comp = currentComponent!;

  // 첫 렌더: 슬롯 초기화
  if (!comp.hooks[index]) {
    comp.hooks[index] = { type: 'state', value: initialValue };
  }

  const slot = comp.hooks[index] as StateSlot<T>;
  const value = slot.value;

  const setState = (next: T | ((prev: T) => T)) => {
    // 함수형 업데이터 지원
    slot.value = typeof next === 'function'
      ? (next as (prev: T) => T)(slot.value)
      : next;
    comp.update();  // 재렌더 트리거
  };

  return [value, setState];
}
```

**포인트:** `setState` 클로저는 `index`와 `comp`를 캡처합니다. 렌더 이후에도 올바른 슬롯을 가리킵니다.

---

## useEffect

```ts
// 슬롯 구조
interface EffectSlot {
  type: 'effect';
  deps: unknown[] | null;
  cleanup: (() => void) | void;
  pendingFn: (() => (() => void) | void) | null;
}

function useEffect(fn: () => (() => void) | void, deps: unknown[]): void {
  const index = hookIndex++;
  const comp = currentComponent!;

  if (!comp.hooks[index]) {
    // 첫 렌더: 슬롯 생성, effect 예약
    comp.hooks[index] = { type: 'effect', deps: null, cleanup: undefined, pendingFn: fn };
    return;
  }

  const slot = comp.hooks[index] as EffectSlot;
  const depsChanged = !areDepsEqual(slot.deps, deps);

  if (depsChanged) {
    slot.pendingFn = fn;  // 다음 flushEffects()에서 실행 예약
    slot.deps = deps;
  }
}
```

### Effect 실행 타이밍

```ts
// component.ts
async function flushEffects(comp: FunctionComponent): void {
  // DOM patch가 완료된 후 microtask로 실행
  await Promise.resolve();

  for (const slot of comp.hooks) {
    if (slot.type === 'effect' && slot.pendingFn) {
      // cleanup 먼저 실행 (이전 effect 정리)
      if (typeof slot.cleanup === 'function') slot.cleanup();
      slot.cleanup = slot.pendingFn();
      slot.pendingFn = null;
    }
  }
}
```

**왜 microtask?** `effect`는 "DOM이 화면에 반영된 후" 실행되어야 합니다.
`Promise.resolve().then(...)` 은 현재 동기 콜 스택(patch 포함)이 완료된 직후 실행됩니다.

---

## useMemo

```ts
// 슬롯 구조
interface MemoSlot<T> {
  type: 'memo';
  deps: unknown[] | null;
  value: T;
}

function useMemo<T>(fn: () => T, deps: unknown[]): T {
  const index = hookIndex++;
  const comp = currentComponent!;

  if (!comp.hooks[index]) {
    // 첫 렌더: fn 즉시 실행, 결과 저장
    comp.hooks[index] = { type: 'memo', deps, value: fn() };
    return (comp.hooks[index] as MemoSlot<T>).value;
  }

  const slot = comp.hooks[index] as MemoSlot<T>;

  if (!areDepsEqual(slot.deps, deps)) {
    // deps 변경: fn 재실행
    slot.value = fn();
    slot.deps = deps;
  }

  return slot.value;  // deps 동일: 캐시된 값 반환
}
```

**포인트:** `useMemo`는 완전히 동기적입니다. 스케줄링 없이 즉시 값을 반환합니다.

---

## deps 비교 (`areDepsEqual`)

```ts
function areDepsEqual(a: unknown[] | null, b: unknown[]): boolean {
  if (a === null) return false;       // 첫 렌더
  if (a.length !== b.length) return false;
  return a.every((v, i) => Object.is(v, b[i]));
}
```

`Object.is`를 사용하는 이유: `NaN === NaN`이 `false`인 문제 방지, `+0 === -0` 구분.

---

## 훅 규칙 요약

| 규칙 | 이유 |
|---|---|
| 컴포넌트 최상위에서만 호출 | hookIndex가 렌더마다 동일해야 함 |
| 조건문/반복문 안에서 호출 금지 | 슬롯 인덱스 불안정 → 상태 오염 |
| 루트 컴포넌트에서만 사용 | 우리 구현에서 currentComponent는 단 하나 |
