import type { VNode } from './mini-react';

declare global {
  namespace JSX {
    type Element = VNode;

    interface IntrinsicAttributes {
      key?: string | number;
    }

    interface ElementChildrenAttribute {
      children: unknown;
    }

    interface IntrinsicElements {
      [elementName: string]: Record<string, unknown>;
    }
  }
}

export {};
