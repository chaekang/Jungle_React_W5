import { VNode } from './vdom';
import { diff } from './diff';
import { patch, createDom, mount as domMount } from './patch';
import {
  HookSlot,
  setCurrentComponent,
  clearCurrentComponent,
  flushEffects,
} from './hooks';

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
    Promise.resolve().then(() => flushEffects(this));
  }

  update(): void {
    if (!this.vdom || !this.domNode) return;
    const newVdom = this.runRender();
    const ops = diff(this.vdom, newVdom);
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
