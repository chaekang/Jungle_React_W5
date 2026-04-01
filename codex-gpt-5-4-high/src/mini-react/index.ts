export { FunctionComponent } from './component';
export { diff, type ChildPatch, type PatchOp } from './diff';
export {
  clearCurrentComponent,
  flushEffects,
  getCurrentHookSnapshot,
  type HookHost,
  type HookDebugSlot,
  type HookSlot,
  resetHooksForTests,
  scheduleEffectFlush,
  setCurrentComponent,
  useEffect,
  useMemo,
  useState,
} from './hooks';
export { getLogLevel, infoLog, setLogLevel, type LogLevel } from './logger';
export { getLatestPatchLogLines } from './component';
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
