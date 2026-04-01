# FunctionComponent 클래스 설계

## 역할

`FunctionComponent`는 함수형 컴포넌트를 감싸는 컨테이너입니다.

- **hooks 배열 보관:** 함수가 매 렌더마다 새로 실행되어도 상태가 유지됩니다.
- **mount/update 조율:** 렌더 → diff → patch → effect 파이프라인을 관리합니다.
- **currentComponent 포인터 관리:** 훅이 올바른 컴포넌트의 슬롯을 읽도록 합니다.

---

## 클래스 구조

```ts
export class FunctionComponent {
  hooks: HookSlot[] = [];          // useState/useEffect/useMemo 슬롯
  private vdom: VNode | null = null;  // 마지막 렌더 결과 (diff 기준점)
  private container: HTMLElement;
  private renderFn: () => VNode;

  constructor(renderFn: () => VNode, container: HTMLElement) {
    this.renderFn = renderFn;
    this.container = container;
  }

  mount(): void {
    setCurrentComponent(this);
    try {
      this.vdom = this.renderFn();
    } finally {
      clearCurrentComponent();
    }
    // 첫 렌더: diff 없이 직접 DOM 생성
    const dom = createDom(this.vdom);
    this.container.appendChild(dom);
    flushEffects(this);  // useEffect 실행
  }

  update(): void {
    setCurrentComponent(this);
    let newVdom: VNode;
    try {
      newVdom = this.renderFn();
    } finally {
      clearCurrentComponent();
    }
    // diff → patch → vdom 업데이트
    const patches = diff(this.vdom!, newVdom!);
    patch(this.container.firstChild as Node, patches);
    this.vdom = newVdom!;
    flushEffects(this);  // 변경된 useEffect 실행
  }
}
```

---

## 설계 결정

### 1. `try/finally`로 currentComponent 보호

```ts
setCurrentComponent(this);
try {
  this.vdom = this.renderFn();
} finally {
  clearCurrentComponent();  // 렌더 함수에서 예외가 발생해도 반드시 초기화
}
```

**이유:** `renderFn()`에서 예외가 발생하면 `currentComponent`가 남아있어 다음 렌더를 오염시킬 수 있습니다.

### 2. mount()에서 diff 생략

첫 렌더 시 비교할 이전 VNode가 없으므로, diff 없이 `createDom()`으로 직접 DOM을 생성합니다.
이후 모든 업데이트는 diff → patch 경로를 거칩니다.

### 3. `hooks` 배열을 public으로 노출

`hooks.ts`의 전역 함수들(`useState`, `useEffect`, `useMemo`)이 `comp.hooks[index]`에 직접 접근해야 합니다.
같은 모듈에서 처리하거나, 접근자 메서드를 두는 방법도 있지만, 단순성을 위해 public으로 유지합니다.

### 4. flushEffects 시점

```
renderFn() 완료
    → clearCurrentComponent()
    → patch() (동기 DOM 조작)
    → flushEffects() → Promise.resolve().then(...)
                           └─ DOM 완전히 반영된 후 effect 실행
```

`flushEffects`는 `Promise.resolve()`를 통해 microtask로 지연됩니다.
이는 React의 "paint 후 effect 실행" 동작을 근사합니다.

---

## 사용 예시

```ts
// main.ts
import { FunctionComponent } from './mini-react';
import { App } from './app/App';

const root = document.getElementById('app')!;
const app = new FunctionComponent(App, root);
app.mount();
```

---

## 제약사항 (과제 요구)

| 제약 | 구현 방식 |
|---|---|
| 훅은 최상위 컴포넌트에서만 사용 | `currentComponent`는 전역 단일 포인터 |
| 상태는 루트 컴포넌트에서만 관리 | `FunctionComponent` 인스턴스가 `hooks[]` 소유 |
| 자식 컴포넌트는 stateless | 자식은 props를 받는 순수 함수, `FunctionComponent`로 감싸지 않음 |
| Lifting State Up | App에서 상태와 핸들러를 정의, 자식에게 props로 전달 |
