import { VNode } from './vdom';
import { diff } from './diff';
import { patch, createDom, mount as domMount } from './patch';
import { PatchOp } from './diff';
import {
  HookSlot,
  setCurrentComponent,
  clearCurrentComponent,
  flushEffects,
} from './hooks';

let latestPatchLogLines: string[] = ['아직 diff/patch 로그가 없습니다.'];

function summarizePatchOp(op: PatchOp, depth = 0): string[] {
  const indent = '  '.repeat(depth);

  switch (op.type) {
    case 'REPLACE':
      return [`${indent}REPLACE -> ${op.node.kind === 'element' ? op.node.type : 'text'}`];
    case 'UPDATE_TEXT':
      return [`${indent}UPDATE_TEXT`];
    case 'UPDATE_PROPS':
      {
        const addedKeys = Object.keys(op.added);
        const removedKeys = op.removed;
        const propBits: string[] = [];
        if (addedKeys.length > 0) propBits.push(`added=${addedKeys.join(',')}`);
        if (removedKeys.length > 0) propBits.push(`removed=${removedKeys.join(',')}`);
        return [`${indent}UPDATE_PROPS${propBits.length > 0 ? ` (${propBits.join(' | ')})` : ''}`];
      }
    case 'APPEND':
      return [`${indent}APPEND -> ${op.node.kind === 'element' ? op.node.type : 'text'}`];
    case 'REMOVE':
      return [`${indent}REMOVE`];
    case 'MOVE':
      return [`${indent}MOVE ${op.from} -> ${op.to}`];
    case 'CHILDREN': {
      const header = `${indent}CHILDREN${op.keyed ? ' (keyed)' : ''}`;
      const nested = op.childPatches
        .slice(0, 12)
        .flatMap(childPatch => summarizePatchOp(childPatch.op, depth + 1));
      if (op.childPatches.length > 12) {
        nested.push(`${indent}  ... ${op.childPatches.length - 12} more`);
      }
      return [header, ...nested];
    }
    default:
      return [`${indent}UNKNOWN_PATCH`];
  }
}

function recordPatchLogs(ops: PatchOp[]): void {
  latestPatchLogLines = ops.length === 0
    ? ['변경 없음']
    : ops.flatMap(op => summarizePatchOp(op)).slice(0, 20);
}

export function getLatestPatchLogLines(): string[] {
  return latestPatchLogLines;
}

export class FunctionComponent {
  hooks: HookSlot[] = [];
  private vdom: VNode | null = null;
  private domNode: Node | null = null;
  private container: HTMLElement;
  private renderFn: () => VNode;

  constructor(renderFn: () => VNode, container: HTMLElement) {
    this.renderFn = renderFn;
    this.container = container;
  }

  private runRender(): VNode {
    setCurrentComponent(this);
    try {
      return this.renderFn();
    } finally {
      clearCurrentComponent();
    }
  }

  mount(): void {
    const vdom = this.runRender();
    this.vdom = vdom;
    const dom = createDom(vdom);
    this.domNode = dom;
    this.container.appendChild(dom);
    recordPatchLogs([]);
    Promise.resolve().then(() => flushEffects(this));
  }

  update(): void {
    if (!this.vdom || !this.domNode) return;
    const newVdom = this.runRender();
    const ops = diff(this.vdom, newVdom);
    recordPatchLogs(ops);
    if (ops.length > 0) {
      this.domNode = patch(this.domNode, ops);
    }
    this.vdom = newVdom;
    Promise.resolve().then(() => flushEffects(this));
  }
}

export function render(renderFn: () => VNode, container: HTMLElement): FunctionComponent {
  const comp = new FunctionComponent(renderFn, container);
  comp.mount();
  return comp;
}
