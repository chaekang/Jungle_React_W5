import type { VElement, VNode } from './vdom';

export type PatchOp =
  | { type: 'REPLACE'; node: VNode }
  | { type: 'UPDATE_TEXT'; text: string }
  | { type: 'UPDATE_PROPS'; added: Record<string, unknown>; removed: string[] }
  | { type: 'APPEND'; node: VNode }
  | { type: 'REMOVE' }
  | { type: 'CHILDREN'; childPatches: ChildPatch[] };

export type ChildPatch =
  | { type: 'PATCH'; oldIndex: number; newIndex: number; ops: PatchOp[] }
  | { type: 'INSERT'; newIndex: number; node: VNode }
  | { type: 'REMOVE'; oldIndex: number };

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

function getNodeKey(node: VNode): string | number | undefined {
  if (node.kind !== 'element') {
    return undefined;
  }

  return node.key;
}

function diffChildren(oldNode: VElement, newNode: VElement): ChildPatch[] {
  const oldChildren = oldNode.children;
  const newChildren = newNode.children;
  const childPatches: ChildPatch[] = [];
  const usedOldIndices = new Set<number>();
  const oldKeyToIndex = new Map<string | number, number>();
  const oldUnkeyedIndices: number[] = [];

  for (let oldIndex = 0; oldIndex < oldChildren.length; oldIndex += 1) {
    const key = getNodeKey(oldChildren[oldIndex]);

    if (key === undefined) {
      oldUnkeyedIndices.push(oldIndex);
      continue;
    }

    if (!oldKeyToIndex.has(key)) {
      oldKeyToIndex.set(key, oldIndex);
    }
  }

  let unkeyedCursor = 0;

  for (let newIndex = 0; newIndex < newChildren.length; newIndex += 1) {
    const nextChild = newChildren[newIndex];
    const key = getNodeKey(nextChild);
    let matchedOldIndex: number | undefined;

    if (key !== undefined) {
      const keyedMatch = oldKeyToIndex.get(key);
      if (keyedMatch !== undefined && !usedOldIndices.has(keyedMatch)) {
        matchedOldIndex = keyedMatch;
      }
    } else {
      while (unkeyedCursor < oldUnkeyedIndices.length) {
        const candidateIndex = oldUnkeyedIndices[unkeyedCursor];
        unkeyedCursor += 1;

        if (!usedOldIndices.has(candidateIndex)) {
          matchedOldIndex = candidateIndex;
          break;
        }
      }
    }

    if (matchedOldIndex === undefined) {
      childPatches.push({
        type: 'INSERT',
        newIndex,
        node: nextChild,
      });
      continue;
    }

    usedOldIndices.add(matchedOldIndex);
    const ops = diff(oldChildren[matchedOldIndex], nextChild);

    if (ops.length > 0 || matchedOldIndex !== newIndex) {
      childPatches.push({
        type: 'PATCH',
        oldIndex: matchedOldIndex,
        newIndex,
        ops,
      });
    }
  }

  for (let oldIndex = 0; oldIndex < oldChildren.length; oldIndex += 1) {
    if (usedOldIndices.has(oldIndex)) {
      continue;
    }

    childPatches.push({
      type: 'REMOVE',
      oldIndex,
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
