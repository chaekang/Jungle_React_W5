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

type RawChild = VNode | string | number | null | undefined | RawChild[];

function normalizeChildren(raw: RawChild[]): VNode[] {
  const result: VNode[] = [];
  for (const child of raw) {
    if (child === null || child === undefined) continue;
    if (Array.isArray(child)) {
      result.push(...normalizeChildren(child));
    } else if (typeof child === 'string') {
      result.push({ kind: 'text', text: child });
    } else if (typeof child === 'number') {
      result.push({ kind: 'text', text: String(child) });
    } else {
      result.push(child);
    }
  }
  return result;
}

type FunctionComponent = (props: Record<string, unknown>) => VNode;

export function h(
  type: string | FunctionComponent,
  props: Record<string, unknown> | null,
  ...rawChildren: RawChild[]
): VNode {
  const rawProps = props ?? {};

  // 함수 컴포넌트: 즉시 호출하여 VNode 반환
  if (typeof type === 'function') {
    const children = normalizeChildren(rawChildren);
    return type({ ...rawProps, children });
  }

  const key = rawProps['key'] as string | number | undefined;
  const filteredProps: Record<string, unknown> = {};
  for (const k of Object.keys(rawProps)) {
    if (k !== 'key') filteredProps[k] = rawProps[k];
  }

  const children = normalizeChildren(rawChildren);

  const vnode: VElement = {
    kind: 'element',
    type,
    props: filteredProps,
    children,
  };
  if (key !== undefined) vnode.key = key;
  return vnode;
}

export const createElement = h;

export const Fragment = 'Fragment';
