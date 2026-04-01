# Diff & Patch 설계

## 목표

전체 DOM을 다시 그리지 않고, **변경된 부분만** 실제 DOM에 반영합니다.

```
이전 VNode 트리  ──┐
                   ├─ diff() ──→ PatchOp[] ──→ patch() ──→ 실제 DOM 변경
다음 VNode 트리  ──┘
```

---

## PatchOp 타입 설계

```ts
export type PatchOp =
  | { type: 'REPLACE';       node: VNode }
  | { type: 'UPDATE_TEXT';   text: string }
  | { type: 'UPDATE_PROPS';  added: Record<string, unknown>; removed: string[] }
  | { type: 'APPEND';        node: VNode }
  | { type: 'REMOVE' }
  | { type: 'CHILDREN';      childPatches: ChildPatch[] }

export interface ChildPatch {
  index: number;
  op: PatchOp;
}
```

**결정:** `PatchOp`은 "무엇을 어떻게 바꿀지"만 기술합니다. DOM 레퍼런스는 포함하지 않습니다.
이렇게 하면 diff 결과를 직렬화하거나 테스트하기 쉬워집니다.

---

## Diff 알고리즘

### 결정 트리

```
diff(oldVNode, newVNode) → PatchOp[]
```

```
1. old.kind !== new.kind  →  REPLACE(new)
2. old.kind === 'element' && old.type !== new.type  →  REPLACE(new)
3. 둘 다 VText  →  (텍스트 다를 때만) UPDATE_TEXT
4. 둘 다 동일 태그 VElement:
   a. props 비교 → UPDATE_PROPS (변경/추가/삭제된 prop만)
   b. children 비교 → CHILDREN (인덱스별 재귀 diff)
      - new children > old children: 초과분 → APPEND
      - new children < old children: 부족분 → REMOVE
```

### 설계 근거

- **타입 변경 시 즉시 REPLACE:** 타입이 다른 노드의 속성을 비교하는 것은 의미 없음.
- **인덱스 기반 children 비교:** key 없는 경우 O(n) 단순 zip. Todo List에는 충분함.
- **Props diff는 델타만:** `UPDATE_PROPS`에 변경된 항목만 포함 → patch 최소화.

### 예시

```
Old: <ul>
       <li key=1>A</li>
       <li key=2>B</li>
     </ul>

New: <ul>
       <li key=1>A (done)</li>
       <li key=2>B</li>
       <li key=3>C</li>
     </ul>

diff 결과:
CHILDREN [
  { index: 0, op: CHILDREN [{ index: 0, op: UPDATE_TEXT("A (done)") }] },
  { index: 1, op: [] },            // 변경 없음
  { index: 2, op: APPEND(<li>C</li>) }
]
```

---

## Patch 알고리즘

```ts
function patch(domNode: Node, ops: PatchOp[]): void
```

### 각 PatchOp 처리

| PatchOp | DOM 조작 |
|---|---|
| `REPLACE` | `parent.replaceChild(createDom(op.node), domNode)` |
| `UPDATE_TEXT` | `domNode.textContent = op.text` |
| `UPDATE_PROPS` | 변경된 attr 설정, 삭제된 attr 제거, 이벤트 핸들러 교체 |
| `APPEND` | `parent.appendChild(createDom(op.node))` |
| `REMOVE` | `parent.removeChild(domNode)` |
| `CHILDREN` | `domNode.childNodes[i]`에 재귀적으로 `patch()` 호출 |

---

## 이벤트 핸들러 관리: WeakMap 패턴

### 문제

```ts
// 렌더마다 새로운 화살표 함수가 생성됨
const vnode = h('button', { onClick: () => handleAdd() }, 'Add');
```

매 렌더마다 `() => handleAdd()`는 새로운 함수 객체입니다.
단순 `removeEventListener(old)` + `addEventListener(new)`를 하려면 이전 함수 참조가 필요합니다.

### 해결: WeakMap으로 이전 리스너 추적

```ts
const listenerMap = new WeakMap<Node, Map<string, EventListener>>();

function setEventListener(node: Node, eventName: string, listener: EventListener): void {
  if (!listenerMap.has(node)) {
    listenerMap.set(node, new Map());
  }
  const nodeListeners = listenerMap.get(node)!;

  // 기존 리스너 제거
  if (nodeListeners.has(eventName)) {
    node.removeEventListener(eventName, nodeListeners.get(eventName)!);
  }

  // 새 리스너 등록 및 추적
  node.addEventListener(eventName, listener);
  nodeListeners.set(eventName, listener);
}
```

**WeakMap을 쓰는 이유:**
- DOM 노드가 GC로 회수되면 Map 엔트리도 자동 해제 → 메모리 누수 없음.
- DOM 노드 자체를 키로 사용 → 노드-리스너 1:1 매핑 명확.

### prop → 이벤트명 변환

```ts
// 'onClick' → 'click', 'onInput' → 'input'
const eventName = propName.slice(2).toLowerCase(); // 'on' 제거 + 소문자
```

패턴 감지: `/^on[A-Z]/` 정규식으로 이벤트 핸들러 prop 구분.

---

## createDom (VNode → 실제 DOM)

`patch`의 `REPLACE`, `APPEND`와 `mount()`의 초기 렌더에서 공통으로 사용:

```ts
function createDom(vnode: VNode): Node {
  if (vnode.kind === 'text') {
    return document.createTextNode(vnode.text);
  }
  const el = document.createElement(vnode.type);
  applyProps(el, vnode.props);
  vnode.children.forEach(child => el.appendChild(createDom(child)));
  return el;
}
```

---

## 성능 특성

| 연산 | 시간복잡도 |
|---|---|
| diff (인덱스 기반) | O(n) — n: 최대 children 수 |
| patch | O(변경된 노드 수) |
| createDom | O(트리 전체 크기) — mount 시 1회만 |

Todo List 규모에서 충분한 성능입니다.
