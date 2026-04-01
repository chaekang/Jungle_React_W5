import { diff } from './diff';
import type { HookSlot } from './hooks';
import {
  clearCurrentComponent,
  scheduleEffectFlush,
  setCurrentComponent,
} from './hooks';
import { debugLog } from './logger';
import { createDom, patch } from './patch';
import type { VNode } from './vdom';

function describeVNode(node: VNode): string {
  if (node.kind === 'text') {
    return `text("${node.text}")`;
  }

  return `${node.type}${node.key !== undefined ? `#${String(node.key)}` : ''}`;
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
