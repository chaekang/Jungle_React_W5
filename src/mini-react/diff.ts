import { VNode, VElement } from './vdom';

export type PatchOp =
  | { type: 'REPLACE'; node: VNode }
  | { type: 'UPDATE_TEXT'; text: string }
  | { type: 'UPDATE_PROPS'; added: Record<string, unknown>; removed: string[] }
  | { type: 'APPEND'; node: VNode }
  | { type: 'REMOVE' }
  | { type: 'CHILDREN'; childPatches: ChildPatch[] };

export interface ChildPatch {
  index: number;
  op: PatchOp;
}

function diffProps(
  oldProps: Record<string, unknown>,
  newProps: Record<string, unknown>,
): { added: Record<string, unknown>; removed: string[] } | null {
  const added: Record<string, unknown> = {};
  const removed: string[] = [];

  for (const key of Object.keys(newProps)) {
    if (oldProps[key] !== newProps[key]) {
      added[key] = newProps[key];
    }
  }
  for (const key of Object.keys(oldProps)) {
    if (!(key in newProps)) {
      removed.push(key);
    }
  }

  if (Object.keys(added).length === 0 && removed.length === 0) return null;
  return { added, removed };
}

export function diff(oldNode: VNode, newNode: VNode): PatchOp[] {
  const ops: PatchOp[] = [];

  // 1. kind 다름 → REPLACE
  if (oldNode.kind !== newNode.kind) {
    return [{ type: 'REPLACE', node: newNode }];
  }

  // 2. 둘 다 text
  if (oldNode.kind === 'text' && newNode.kind === 'text') {
    if (oldNode.text !== newNode.text) {
      ops.push({ type: 'UPDATE_TEXT', text: newNode.text });
    }
    return ops;
  }

  // 3. 둘 다 element
  const oldEl = oldNode as VElement;
  const newEl = newNode as VElement;

  // 3a. 태그 다름 → REPLACE
  if (oldEl.type !== newEl.type) {
    return [{ type: 'REPLACE', node: newNode }];
  }

  // 3b. props diff
  const propsDiff = diffProps(oldEl.props, newEl.props);
  if (propsDiff) {
    ops.push({ type: 'UPDATE_PROPS', ...propsDiff });
  }

  // 3c. children diff
  const childPatches: ChildPatch[] = [];
  const maxLen = Math.max(oldEl.children.length, newEl.children.length);

  for (let i = 0; i < maxLen; i++) {
    const oldChild = oldEl.children[i];
    const newChild = newEl.children[i];

    if (oldChild === undefined) {
      childPatches.push({ index: i, op: { type: 'APPEND', node: newChild } });
    } else if (newChild === undefined) {
      childPatches.push({ index: i, op: { type: 'REMOVE' } });
    } else {
      const childOps = diff(oldChild, newChild);
      for (const op of childOps) {
        childPatches.push({ index: i, op });
      }
    }
  }

  if (childPatches.length > 0) {
    ops.push({ type: 'CHILDREN', childPatches });
  }

  return ops;
}
