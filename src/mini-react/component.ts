import { diff } from './diff';
import type { HookSlot } from './hooks';
import {
  clearCurrentComponent,
  scheduleEffectFlush,
  setCurrentComponent,
} from './hooks';
import { createDom, patch } from './patch';
import type { VNode } from './vdom';

export class FunctionComponent {
  public hooks: HookSlot[] = [];
  private vdom: VNode | null = null;
  private rootNode: Node | null = null;

  public constructor(
    private readonly container: HTMLElement,
    private readonly renderFn: () => VNode,
  ) {}

  private render(): VNode {
    setCurrentComponent(this);

    try {
      return this.renderFn();
    } finally {
      clearCurrentComponent();
    }
  }

  public mount(): void {
    const nextVdom = this.render();
    this.vdom = nextVdom;
    this.rootNode = createDom(nextVdom);
    this.container.replaceChildren(this.rootNode);
    scheduleEffectFlush(this);
  }

  public update(): void {
    if (this.vdom === null || this.rootNode === null) {
      this.mount();
      return;
    }

    const nextVdom = this.render();
    const ops = diff(this.vdom, nextVdom);
    this.vdom = nextVdom;

    if (ops.length > 0) {
      this.rootNode = patch(this.rootNode, ops);

      if (this.rootNode === null) {
        this.container.replaceChildren();
      } else if (this.rootNode.parentNode !== this.container) {
        this.container.replaceChildren(this.rootNode);
      }
    }

    scheduleEffectFlush(this);
  }
}
