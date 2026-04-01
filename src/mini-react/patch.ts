import type { ChildPatch, PatchOp } from './diff';
import { debugLog, infoLog } from './logger';
import type { VElement, VNode } from './vdom';
import { isFragment } from './vdom';

const listenerMap = new WeakMap<Node, Map<string, EventListener>>();

function isEventProp(name: string): boolean {
  return /^on[A-Z]/.test(name);
}

function toEventName(name: string): string {
  return name.slice(2).toLowerCase();
}

function getListenerStore(node: Node): Map<string, EventListener> {
  const existing = listenerMap.get(node);
  if (existing) {
    return existing;
  }

  const created = new Map<string, EventListener>();
  listenerMap.set(node, created);
  return created;
}

function setEventListener(node: Node, propName: string, listener: unknown): void {
  const eventName = toEventName(propName);
  const store = getListenerStore(node);
  const previous = store.get(eventName);

  if (previous && 'removeEventListener' in node) {
    node.removeEventListener(eventName, previous);
    store.delete(eventName);
    debugLog('Patch:Event', '기존 이벤트 리스너를 제거합니다.', {
      eventName,
      nodeName: node.nodeName,
    });
  }

  if (typeof listener === 'function' && 'addEventListener' in node) {
    const nextListener = listener as EventListener;
    node.addEventListener(eventName, nextListener);
    store.set(eventName, nextListener);
    debugLog('Patch:Event', '새 이벤트 리스너를 등록합니다.', {
      eventName,
      nodeName: node.nodeName,
    });
  }
}

function removeEventListener(node: Node, propName: string): void {
  const eventName = toEventName(propName);
  const store = listenerMap.get(node);
  const previous = store?.get(eventName);

  if (!previous || !('removeEventListener' in node)) {
    return;
  }

  node.removeEventListener(eventName, previous);
  store?.delete(eventName);
  debugLog('Patch:Event', '이벤트 리스너를 제거합니다.', {
    eventName,
    nodeName: node.nodeName,
  });
}

function setAttribute(node: Element, name: string, value: unknown): void {
  const attrName = name === 'className' ? 'class' : name;

  if (attrName === 'value' && 'value' in node) {
    (node as HTMLInputElement).value = value == null ? '' : String(value);
    return;
  }

  if (attrName === 'checked' && 'checked' in node) {
    (node as HTMLInputElement).checked = Boolean(value);
    if (value) {
      node.setAttribute(attrName, '');
    } else {
      node.removeAttribute(attrName);
    }
    return;
  }

  if (attrName === 'disabled' && 'disabled' in node) {
    (node as HTMLButtonElement).disabled = Boolean(value);
    if (value) {
      node.setAttribute(attrName, '');
    } else {
      node.removeAttribute(attrName);
    }
    return;
  }

  if (value === false || value === null || value === undefined) {
    node.removeAttribute(attrName);
    return;
  }

  if (value === true) {
    node.setAttribute(attrName, '');
    return;
  }

  node.setAttribute(attrName, String(value));
}

function removeAttribute(node: Element, name: string): void {
  const attrName = name === 'className' ? 'class' : name;

  if (attrName === 'value' && 'value' in node) {
    (node as HTMLInputElement).value = '';
  }

  if (attrName === 'checked' && 'checked' in node) {
    (node as HTMLInputElement).checked = false;
  }

  if (attrName === 'disabled' && 'disabled' in node) {
    (node as HTMLButtonElement).disabled = false;
  }

  node.removeAttribute(attrName);
}

function applyProps(node: Node, added: Record<string, unknown>, removed: string[]): void {
  for (const name of removed) {
    if (isEventProp(name)) {
      removeEventListener(node, name);
      continue;
    }

    if (node instanceof Element) {
      removeAttribute(node, name);
    }
  }

  for (const [name, value] of Object.entries(added)) {
    if (isEventProp(name)) {
      setEventListener(node, name, value);
      continue;
    }

    if (node instanceof Element) {
      setAttribute(node, name, value);
    }
  }
}

function createElementDom(vnode: VElement): Node {
  if (isFragment(vnode)) {
    const fragment = document.createDocumentFragment();
    debugLog('Patch:CreateDom', 'fragment DOM 생성을 시작합니다.', {
      childCount: vnode.children.length,
    });

    for (const child of vnode.children) {
      fragment.appendChild(createDom(child));
    }

    return fragment;
  }

  const element = document.createElement(vnode.type);
  debugLog('Patch:CreateDom', 'element DOM 생성을 시작합니다.', {
    type: vnode.type,
    childCount: vnode.children.length,
    propKeys: Object.keys(vnode.props),
  });
  applyProps(element, vnode.props, []);

  for (const child of vnode.children) {
    element.appendChild(createDom(child));
  }

  return element;
}

export function createDom(vnode: VNode): Node {
  if (vnode.kind === 'text') {
    debugLog('Patch:CreateDom', 'text DOM 생성을 시작합니다.', {
      text: vnode.text,
    });
    return document.createTextNode(vnode.text);
  }

  return createElementDom(vnode);
}

function applyChildPatches(parentNode: Node, childPatches: ChildPatch[]): void {
  infoLog('Patch:ChildrenSummary', '자식 patch 요약입니다.', {
    parentNodeName: parentNode.nodeName,
    childPatchCount: childPatches.length,
    childPatchTypes: childPatches.map((patch) => patch.type),
  });
  debugLog('Patch:Children', '자식 patch 적용을 시작합니다.', {
    parentNodeName: parentNode.nodeName,
    childPatchCount: childPatches.length,
    childPatchTypes: childPatches.map((patch) => patch.type),
  });
  const snapshot = Array.from(parentNode.childNodes);
  const nextNodes = new Map<number, Node>();

  for (const childPatch of childPatches) {
    if (childPatch.type !== 'REMOVE') {
      continue;
    }

    const target = snapshot[childPatch.oldIndex];
    if (target?.parentNode === parentNode) {
      parentNode.removeChild(target);
      debugLog('Patch:Children', '기존 자식 노드를 제거합니다.', {
        oldIndex: childPatch.oldIndex,
        nodeName: target.nodeName,
      });
    }
  }

  for (const childPatch of childPatches) {
    if (childPatch.type === 'REMOVE') {
      continue;
    }

    if (childPatch.type === 'INSERT') {
      nextNodes.set(childPatch.newIndex, createDom(childPatch.node));
      debugLog('Patch:Children', '새 자식 노드를 삽입 대상으로 준비합니다.', {
        newIndex: childPatch.newIndex,
      });
      continue;
    }

    const target = snapshot[childPatch.oldIndex];
    if (!target) {
      continue;
    }

    const nextNode = childPatch.ops.length > 0 ? patch(target, childPatch.ops) : target;
    if (nextNode !== null) {
      nextNodes.set(childPatch.newIndex, nextNode);
      debugLog('Patch:Children', '기존 자식 노드를 재사용하거나 갱신합니다.', {
        oldIndex: childPatch.oldIndex,
        newIndex: childPatch.newIndex,
        nestedPatchCount: childPatch.ops.length,
      });
    }
  }

  const orderedNodes = Array.from(nextNodes.entries())
    .sort((left, right) => left[0] - right[0])
    .map((entry) => entry[1]);

  for (let index = 0; index < orderedNodes.length; index += 1) {
    const node = orderedNodes[index];
    const currentNodeAtIndex = parentNode.childNodes[index];

    if (currentNodeAtIndex !== node) {
      parentNode.insertBefore(node, currentNodeAtIndex ?? null);
      debugLog('Patch:Children', '최종 자식 순서를 재배치합니다.', {
        targetIndex: index,
        nodeName: node.nodeName,
      });
    }
  }
}

export function patch(node: Node, ops: PatchOp[]): Node | null {
  let currentNode: Node | null = node;
  infoLog('Patch:Summary', 'DOM patch 적용 요약입니다.', {
    nodeName: node.nodeName,
    patchCount: ops.length,
    patchTypes: ops.map((op) => op.type),
  });
  debugLog('Patch:Start', 'patch 적용을 시작합니다.', {
    nodeName: node.nodeName,
    patchCount: ops.length,
    patchTypes: ops.map((op) => op.type),
  });

  for (const op of ops) {
    if (currentNode === null) {
      return null;
    }

    switch (op.type) {
      case 'REPLACE': {
        const nextNode = createDom(op.node);
        currentNode.parentNode?.replaceChild(nextNode, currentNode);
        debugLog('Patch:Op', 'REPLACE patch를 적용합니다.', {
          previousNodeName: currentNode.nodeName,
          nextNodeName: nextNode.nodeName,
        });
        currentNode = nextNode;
        break;
      }
      case 'UPDATE_TEXT': {
        currentNode.textContent = op.text;
        debugLog('Patch:Op', 'UPDATE_TEXT patch를 적용합니다.', {
          text: op.text,
        });
        break;
      }
      case 'UPDATE_PROPS': {
        applyProps(currentNode, op.added, op.removed);
        debugLog('Patch:Op', 'UPDATE_PROPS patch를 적용합니다.', {
          addedKeys: Object.keys(op.added),
          removed: op.removed,
        });
        break;
      }
      case 'APPEND': {
        currentNode.appendChild(createDom(op.node));
        debugLog('Patch:Op', 'APPEND patch를 적용합니다.');
        break;
      }
      case 'REMOVE': {
        currentNode.parentNode?.removeChild(currentNode);
        debugLog('Patch:Op', 'REMOVE patch를 적용합니다.', {
          nodeName: currentNode.nodeName,
        });
        currentNode = null;
        break;
      }
      case 'CHILDREN': {
        applyChildPatches(currentNode, op.childPatches);
        break;
      }
    }
  }

  return currentNode;
}

export function mount(container: HTMLElement, vnode: VNode): Node {
  const node = createDom(vnode);
  container.replaceChildren(node);
  return container.firstChild ?? node;
}
