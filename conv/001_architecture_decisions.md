# Architecture Decisions

## 전체 구조 개요

```
src/mini-react/   ← 라이브러리 코어 (프레임워크)
src/app/          ← Todo 데모 애플리케이션
tests/            ← 유닛/통합 테스트
```

---

## 결정 1: TypeScript + Vite + Vitest

**선택:** TypeScript + Vite + Vitest

**근거:**
- TypeScript: VNode, PatchOp, HookSlot 등 복잡한 타입 구조를 명확히 표현 가능. 컴파일 타임에 오류 조기 발견.
- Vite: 빠른 개발 서버 + HMR, JSX pragma 설정 용이 (`esbuild.jsxFactory`).
- Vitest: Vite와 동일한 설정 공유, Jest 호환 API, `jsdom` 환경으로 DOM 테스트 가능.

**대안 고려:**
- Webpack: 설정 복잡도 높음, 불필요.
- Jest + Babel: 별도 babel 설정 필요, Vite 프로젝트와 설정 이원화.

---

## 결정 2: JSX Pragma (`h()` 함수)

**선택:** `tsconfig.json`에 `"jsxFactory": "h"` 설정, `.tsx` 파일에서 JSX 문법 사용

**근거:**
- React와 동일한 개발 경험 제공 → 발표 시 "우리가 만든 React"임을 직관적으로 보여줌.
- `<div>` → `h('div', ...)` 변환 원리를 tsconfig 한 줄로 증명 가능.
- 코드 가독성: `h('div', null, h('span', null, 'text'))` 대비 JSX가 훨씬 명확.

**트레이드오프:**
- 각 `.tsx` 파일에서 반드시 `import { h } from '../mini-react'` 필요.
- TypeScript가 `h`를 JSX 변환 함수로 인식하게 하려면 `tsconfig` + `vite.config` 양쪽 설정 필요.

---

## 결정 3: VNode 구조 (`kind` discriminant)

**선택:**
```ts
type VNode = VElement | VText;
interface VElement { kind: 'element'; type: string; props: ...; children: VNode[]; key?: ... }
interface VText    { kind: 'text'; text: string }
```

**근거:**
- `kind` 필드로 TypeScript 타입 가드 활용 (`if (vnode.kind === 'text')`).
- `type`을 HTML 태그명 전용으로 유지 → `VElement.type`과 discriminant 충돌 없음.
- `children`을 `VElement` 내부에 플랫하게 보관 → diff/patch 로직 단순화.

**대안 고려:**
- `typeof vnode === 'string'` 패턴: children을 string으로 두면 diff 시 타입 체크 복잡.
- `props.children` 패턴: React 방식이나, 우리 구현에선 `children`을 별도 필드로 분리하는 게 알고리즘상 더 명확.

---

## 결정 4: 모듈 의존성 순서

```
vdom.ts → diff.ts → patch.ts → hooks.ts → component.ts
```

**근거:**
- 순환 의존성 방지를 위해 의존성 방향을 단방향으로 고정.
- `hooks.ts`는 `FunctionComponent` 타입 참조가 필요하지만, 실제 클래스 인스턴스는 런타임에 주입 → 인터페이스(interface)로 역방향 의존성 해소.

---

## 결정 5: 테스트 범위

**유닛 테스트:** `vdom`, `diff`, `hooks` (순수 함수 / 로직 테스트)  
**통합 테스트:** `patch`, `component` (jsdom을 이용한 실제 DOM 조작 검증)

**근거:**
- `patch`는 DOM 사이드 이펙트가 있으므로 jsdom 환경에서만 의미 있게 테스트 가능.
- `component`는 전체 파이프라인(render → diff → patch → effect)을 통합적으로 검증.
