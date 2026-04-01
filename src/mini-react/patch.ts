import { VNode, VElement } from './vdom';
import { PatchOp } from './diff';

const listenerMap = new WeakMap<Node, Map<string, EventListener>>();

function getEventName(prop: string): string {
  // 'onClick' → 'click'
  return prop[2].toLowerCase() + prop.slice(3);
}

function isEventProp(key: string): boolean {
  return /^on[A-Z]/.test(key);
}

function applyProps(el: Element, props: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(props)) {
    if (isEventProp(key)) {
      const eventName = getEventName(key);
      let listeners = listenerMap.get(el);
      if (!listeners) {
        listeners = new Map();
        listenerMap.set(el, listeners);
      }
      const prev = listeners.get(eventName);
      if (prev) el.removeEventListener(eventName, prev);
      const handler = value as EventListener;
      el.addEventListener(eventName, handler);
      listeners.set(eventName, handler);
    } else if (key === 'className') {
      el.setAttribute('class', value as string);
    } else if (typeof value === 'boolean') {
      if (value) el.setAttribute(key, '');
      else el.removeAttribute(key);
    } else if (value !== null && value !== undefined) {
      el.setAttribute(key, String(value));
    }
  }
}

function removeProps(el: Element, keys: string[]): void {
  for (const key of keys) {
    if (isEventProp(key)) {
      const eventName = getEventName(key);
      const listeners = listenerMap.get(el);
      if (listeners) {
        const prev = listeners.get(eventName);
        if (prev) {
          el.removeEventListener(eventName, prev);
          listeners.delete(eventName);
        }
      }
    } else if (key === 'className') {
      el.removeAttribute('class');
    } else {
      el.removeAttribute(key);
    }
  }
}

export function createDom(vnode: VNode): Node {
  if (vnode.kind === 'text') {
    return document.createTextNode(vnode.text);
  }
  const el = document.createElement(vnode.type);
  applyProps(el, vnode.props);
  for (const child of vnode.children) {
    el.appendChild(createDom(child));
  }
  return el;
}

export function patch(dom: Node, ops: PatchOp[]): Node {
  let current = dom;
  for (const op of ops) {
    current = applyOp(current, op);
  }
  return current;
}

function applyOp(dom: Node, op: PatchOp): Node {
  switch (op.type) {
    case 'REPLACE': {
      const newDom = createDom(op.node);
      dom.parentNode?.replaceChild(newDom, dom);
      return newDom;
    }
    case 'UPDATE_TEXT': {
      (dom as Text).textContent = op.text;
      return dom;
    }
    case 'UPDATE_PROPS': {
      const el = dom as Element;
      applyProps(el, op.added);
      removeProps(el, op.removed);
      return dom;
    }
    case 'CHILDREN': {
      // Group ops by index: last APPEND/REMOVE wins for structure
      // We process in order so multiple ops on same index are applied sequentially
      const childNodes = Array.from(dom.childNodes);

      // Sort to handle REMOVEs in reverse order (avoid index shift)
      // But PRD uses a simple approach: process all patches in order
      for (const { index, op: childOp } of op.childPatches) {
        if (childOp.type === 'APPEND') {
          dom.appendChild(createDom(childOp.node));
        } else if (childOp.type === 'REMOVE') {
          const child = childNodes[index];
          if (child) dom.removeChild(child);
        } else {
          const child = childNodes[index];
          if (child) applyOp(child, childOp);
        }
      }
      return dom;
    }
    case 'APPEND': {
      const newChild = createDom(op.node);
      dom.parentNode?.appendChild(newChild);
      return dom;
    }
    case 'REMOVE': {
      dom.parentNode?.removeChild(dom);
      return dom;
    }
    default:
      return dom;
  }
}

export function mount(vnode: VNode, container: HTMLElement): Node {
  const dom = createDom(vnode);
  container.appendChild(dom);
  return dom;
}
