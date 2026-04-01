# 컴포넌트 작성 포맷 결정 (JSX Pragma)

## 배경

컴포넌트를 작성할 때 두 가지 방식이 있다.
PRD 초안에서는 이 결정이 빠져 있어 구현 전에 명확히 해야 했다.

## 요청 내용

"컴포넌트 구성에는 어떤 포맷을 사용할꺼야?" — 구현 시작 전 포맷 선택 요청.

## 고려한 선택지

### h() 직접 호출

```ts
const App = () =>
  h('div', { class: 'app' },
    h(TodoInput, { value: text, onAdd: handleAdd }),
  );
```

- 장점: 빌드 설정 단순, `h()`가 JSX 변환 결과물임을 코드에서 바로 확인 가능
- 단점: 중첩이 깊어질수록 가독성 급락, 실제 React 코드와 전혀 다른 모습

### JSX Pragma (선택)

```tsx
const App = () => (
  <div class="app">
    <TodoInput value={text} onAdd={handleAdd} />
  </div>
);
```

- 장점: 실제 React와 동일한 문법, 발표 시 "우리가 만든 React"를 직관적으로 보여줌
- 단점: 각 파일에 `import { h } from '../mini-react'` 필요, tsconfig + vite.config 양쪽 설정

## 결정

**JSX Pragma 방식 선택.**

핵심 이유는 발표다. 목요일 발표에서 실제 React 코드와 우리 코드를 나란히 놓았을 때
JSX 문법이면 "진짜 React를 만든 것"처럼 보인다.
`<div>` 한 줄이 `h('div', null)` 두 줄보다 청중에게 훨씬 설득력 있다.

기술적으로도 JSX가 결국 `h()` 호출로 변환된다는 것을 보여주면
"JSX는 문법 설탕(syntactic sugar)이다"라는 핵심 개념 설명에 활용할 수 있다.

## 영향

- 컴포넌트 파일 확장자가 `.tsx`
- `tsconfig.json`: `"jsx": "react"`, `"jsxFactory": "h"`, `"jsxFragmentFactory": "Fragment"`
- `vite.config.ts`: `esbuild: { jsxFactory: 'h', jsxFragment: 'Fragment' }`
- 모든 컴포넌트 파일 상단에 `import { h } from '../mini-react'` 필요
