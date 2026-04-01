export { FunctionComponent } from './component';
export { diff, type ChildPatch, type PatchOp } from './diff';
export {
  clearCurrentComponent,
  flushEffects,
  type HookHost,
  type HookSlot,
  resetHooksForTests,
  scheduleEffectFlush,
  setCurrentComponent,
  useEffect,
  useMemo,
  useState,
} from './hooks';
export { createDom, mount, patch } from './patch';
export {
  Fragment,
  createElement,
  h,
  isElementNode,
  isFragment,
  isTextNode,
  type VElement,
  type VNode,
  type VText,
} from './vdom';
