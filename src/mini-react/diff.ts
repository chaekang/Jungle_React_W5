import type { VElement, VNode } from './vdom';

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
): { added: Record<string, unknown>; removed: string[] } {
  const added: Record<string, unknown> = {};
  const removed: string[] = [];

  for (const [key, value] of Object.entries(newProps)) {
    if (!Object.is(oldProps[key], value)) {
      added[key] = value;
    }
  }

  for (const key of Object.keys(oldProps)) {
    if (!(key in newProps)) {
      removed.push(key);
    }
  }

  return { added, removed };
}

function diffChildren(oldNode: VElement, newNode: VElement): ChildPatch[] {
  const childPatches: ChildPatch[] = [];
  const sharedLength = Math.min(oldNode.children.length, newNode.children.length);

  for (let index = 0; index < sharedLength; index += 1) {
    const nestedPatches = diff(oldNode.children[index], newNode.children[index]);

    for (const patch of nestedPatches) {
      childPatches.push({ index, op: patch });
    }
  }

  for (let index = sharedLength; index < newNode.children.length; index += 1) {
    childPatches.push({
      index,
      op: { type: 'APPEND', node: newNode.children[index] },
    });
  }

  for (let index = sharedLength; index < oldNode.children.length; index += 1) {
    childPatches.push({
      index,
      op: { type: 'REMOVE' },
    });
  }

  return childPatches;
}

export function diff(oldNode: VNode, newNode: VNode): PatchOp[] {
  if (oldNode.kind !== newNode.kind) {
    return [{ type: 'REPLACE', node: newNode }];
  }

  if (oldNode.kind === 'text' && newNode.kind === 'text') {
    if (oldNode.text === newNode.text) {
      return [];
    }

    return [{ type: 'UPDATE_TEXT', text: newNode.text }];
  }

  if (oldNode.kind === 'element' && newNode.kind === 'element' && oldNode.type !== newNode.type) {
    return [{ type: 'REPLACE', node: newNode }];
  }

  if (oldNode.kind !== 'element' || newNode.kind !== 'element') {
    return [];
  }

  const elementPatches: PatchOp[] = [];
  const { added, removed } = diffProps(oldNode.props, newNode.props);

  if (Object.keys(added).length > 0 || removed.length > 0) {
    elementPatches.push({
      type: 'UPDATE_PROPS',
      added,
      removed,
    });
  }

  const childPatches = diffChildren(oldNode, newNode);
  if (childPatches.length > 0) {
    elementPatches.push({
      type: 'CHILDREN',
      childPatches,
    });
  }

  return elementPatches;
}
