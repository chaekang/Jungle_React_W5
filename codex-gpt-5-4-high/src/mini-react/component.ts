import { diff, type PatchOp } from './diff';
import type { HookSlot } from './hooks';
import {
  clearCurrentComponent,
  scheduleEffectFlush,
  setCurrentComponent,
  summarizeHookSlots,
} from './hooks';
import { debugLog, infoLog } from './logger';
import { createDom, patch } from './patch';
import type { VNode } from './vdom';

let latestPatchLogLines: string[] = ['아직 diff/patch 로그가 없습니다.'];

function describeVNode(node: VNode): string {
  if (node.kind === 'text') {
    return `text("${node.text}")`;
  }

  return `${node.type}${node.key !== undefined ? `#${String(node.key)}` : ''}`;
}

function summarizePatchOp(op: PatchOp, depth = 0): string[] {
  const indent = '  '.repeat(depth);

  if (op.type === 'CHILDREN') {
    const lines = [`${indent}CHILDREN`];

    for (const childPatch of op.childPatches.slice(0, 12)) {
      if (childPatch.type === 'PATCH') {
        lines.push(`${indent}  PATCH ${childPatch.oldIndex} -> ${childPatch.newIndex}`);
        for (const childOp of childPatch.ops.slice(0, 4)) {
          lines.push(...summarizePatchOp(childOp, depth + 2));
        }
        continue;
      }

      if (childPatch.type === 'INSERT') {
        lines.push(`${indent}  INSERT @${childPatch.newIndex} -> ${describeVNode(childPatch.node)}`);
        continue;
      }

      lines.push(`${indent}  REMOVE @${childPatch.oldIndex}`);
    }

    if (op.childPatches.length > 12) {
      lines.push(`${indent}  ... ${op.childPatches.length - 12} more child patches`);
    }

    return lines;
  }

  if (op.type === 'UPDATE_PROPS') {
    return [
      `${indent}UPDATE_PROPS (added=${Object.keys(op.added).join(',') || '-'}; removed=${op.removed.join(',') || '-'})`,
    ];
  }

  if (op.type === 'UPDATE_TEXT') {
    return [`${indent}UPDATE_TEXT`];
  }

  if (op.type === 'REPLACE' || op.type === 'APPEND') {
    return [`${indent}${op.type} -> ${describeVNode(op.node)}`];
  }

  return [`${indent}${op.type}`];
}

function recordPatchLogs(ops: PatchOp[]): void {
  latestPatchLogLines =
    ops.length === 0
      ? ['변경 없음']
      : ops.flatMap((op) => summarizePatchOp(op)).slice(0, 24);
}

export function getLatestPatchLogLines(): string[] {
  return latestPatchLogLines;
}

export class FunctionComponent {
  public hooks: HookSlot[] = [];
  private vdom: VNode | null = null;
  private rootNode: Node | null = null;

  public constructor(
    private readonly container: HTMLElement,
    private readonly renderFn: () => VNode,
  ) {}

  private render(): VNode {
    debugLog('Component:Render', '루트 컴포넌트 렌더를 시작합니다.', {
      hookCount: this.hooks.length,
    });
    setCurrentComponent(this);

    try {
      const nextVdom = this.renderFn();
      debugLog('Component:Render', '루트 컴포넌트 렌더가 완료되었습니다.', {
        vnode: describeVNode(nextVdom),
      });
      infoLog('Component:RenderSummary', '렌더 결과와 hook 상태 요약입니다.', {
        vnode: describeVNode(nextVdom),
        hookCount: this.hooks.length,
        hooks: summarizeHookSlots(this.hooks).join(' | '),
      });
      return nextVdom;
    } finally {
      clearCurrentComponent();
    }
  }

  public mount(): void {
    debugLog('Component:Mount', '초기 마운트를 시작합니다.', {
      container: this.container.tagName.toLowerCase(),
    });
    const nextVdom = this.render();
    this.vdom = nextVdom;
    this.rootNode = createDom(nextVdom);
    this.container.replaceChildren(this.rootNode);
    recordPatchLogs([]);
    debugLog('Component:Mount', '초기 DOM 삽입이 완료되었습니다.', {
      rootNodeType: this.rootNode.nodeName,
    });
    scheduleEffectFlush(this);
  }

  public update(): void {
    if (this.vdom === null || this.rootNode === null) {
      debugLog('Component:Update', '기존 렌더 결과가 없어 mount()로 위임합니다.');
      this.mount();
      return;
    }

    debugLog('Component:Update', '업데이트 렌더를 시작합니다.', {
      previousVNode: describeVNode(this.vdom),
    });
    const nextVdom = this.render();
    const ops = diff(this.vdom, nextVdom);
    this.vdom = nextVdom;
    debugLog('Component:Update', 'diff 계산이 완료되었습니다.', {
      patchCount: ops.length,
    });
    recordPatchLogs(ops);
    infoLog('Component:UpdateSummary', '업데이트 patch 요약입니다.', {
      patchCount: ops.length,
      patches: latestPatchLogLines.join(' | ') || '-',
      hookCount: this.hooks.length,
      hooks: summarizeHookSlots(this.hooks).join(' | '),
    });

    if (ops.length > 0) {
      this.rootNode = patch(this.rootNode, ops);

      if (this.rootNode === null) {
        this.container.replaceChildren();
      } else if (this.rootNode.parentNode !== this.container) {
        this.container.replaceChildren(this.rootNode);
      }

      debugLog('Component:Update', 'patch 적용이 완료되었습니다.', {
        rootNodeType: this.rootNode?.nodeName ?? null,
      });
    } else {
      debugLog('Component:Update', '적용할 patch가 없어 DOM 변경을 생략합니다.');
    }

    scheduleEffectFlush(this);
  }
}
