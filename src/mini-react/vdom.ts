import { debugLog } from './logger';

export interface VElement {
  kind: 'element';
  type: string;
  props: Record<string, unknown>;
  children: VNode[];
  key?: string | number;
}

export interface VText {
  kind: 'text';
  text: string;
}

export type VNode = VElement | VText;

type Child = VNode | string | number | null | undefined | Child[];
type BaseProps = Record<string, unknown>;
type ComponentType<P extends BaseProps = BaseProps> = (props: P & { children?: VNode[] }) => VNode;

const FRAGMENT_TYPE = 'fragment';

function isVNode(value: unknown): value is VNode {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<VNode>;
  return candidate.kind === 'element' || candidate.kind === 'text';
}

function createText(text: string): VText {
  return {
    kind: 'text',
    text,
  };
}

function normalizeChildren(children: Child[]): VNode[] {
  const normalized: VNode[] = [];

  for (const child of children) {
    if (child === null || child === undefined) {
      continue;
    }

    if (Array.isArray(child)) {
      normalized.push(...normalizeChildren(child));
      continue;
    }

    if (typeof child === 'string' || typeof child === 'number') {
      normalized.push(createText(String(child)));
      continue;
    }

    if (isVNode(child)) {
      normalized.push(child);
    }
  }

  return normalized;
}

export function createElement<P extends BaseProps>(
  type: ComponentType<P>,
  props?: P | null,
  ...children: Child[]
): VNode;
export function createElement(
  type: string,
  props?: Record<string, unknown> | null,
  ...children: Child[]
): VNode;
export function createElement<P extends BaseProps>(
  type: string | ComponentType<P>,
  props?: P | Record<string, unknown> | null,
  ...children: Child[]
): VNode {
  const safeProps = { ...(props ?? {}) };
  const normalizedChildren = normalizeChildren(children);
  const key = safeProps.key;
  delete safeProps.key;

  if (typeof type === 'function') {
    debugLog('VDom:Component', '함수형 컴포넌트를 즉시 실행해 vnode를 생성합니다.', {
      componentName: type.name || 'Anonymous',
      propKeys: Object.keys(safeProps),
      childCount: normalizedChildren.length,
    });
    return type({
      ...safeProps,
      children: normalizedChildren,
    } as P & { children?: VNode[] });
  }

  debugLog('VDom:Element', 'element vnode를 생성합니다.', {
    type,
    key: typeof key === 'string' || typeof key === 'number' ? key : undefined,
    propKeys: Object.keys(safeProps),
    childCount: normalizedChildren.length,
  });
  return {
    kind: 'element',
    type,
    props: safeProps,
    children: normalizedChildren,
    key: typeof key === 'string' || typeof key === 'number' ? key : undefined,
  };
}

export const h = createElement;

export function Fragment(props: { children?: Child[] }): VNode {
  const children = normalizeChildren(props.children ?? []);

  if (children.length === 1) {
    return children[0];
  }

  return createElement(FRAGMENT_TYPE, null, ...children);
}

export function isTextNode(node: VNode): node is VText {
  return node.kind === 'text';
}

export function isElementNode(node: VNode): node is VElement {
  return node.kind === 'element';
}

export function isFragment(node: VNode): boolean {
  return node.kind === 'element' && node.type === FRAGMENT_TYPE;
}
