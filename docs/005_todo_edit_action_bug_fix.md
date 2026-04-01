# Todo 편집 액션 버튼 버그 수정

## 목적

- Todo 편집 모드에서 발생하던 저장/취소 버튼 관련 UI 오류를 문서로 남긴다.
- 현재 `mini-react`의 child diff/patch 방식에서 어떤 구조가 안전하고 어떤 구조가 문제를 만들 수 있는지 정리한다.
- 같은 종류의 버튼 전환 UI를 다시 만들 때 참고할 기준을 남긴다.

## 증상

- `수정` 버튼을 눌러 편집 모드로 들어가면 입력창은 열리지만 `저장` 버튼이 정상적으로 동작하지 않았다.
- `취소` 버튼을 누르면 편집은 종료되지만, 액션 영역에 `취소` 버튼이 하나 더 남는 현상이 있었다.
- 즉 편집 모드와 일반 모드 사이를 오갈 때 액션 버튼 DOM이 기대한 구조와 다르게 남아 있었다.

## 문제 원인

문제는 `TodoItem`의 액션 버튼 영역이 편집 상태에 따라 서로 다른 child 구조로 바뀌는 방식에 있었다.

기존 구조:

```tsx
<div className="todo-actions">
  {isEditing ? (
    <>
      <button>저장</button>
      <button>취소</button>
    </>
  ) : (
    <button>수정</button>
  )}
  <button>삭제</button>
</div>
```

현재 `mini-react`는 function component를 바로 실행해서 vnode를 만들고, child diff는 최종 child 배열 기준으로 patch를 계산한다.

편집 모드 전환 전후의 버튼 구성이 아래처럼 달라진다.

```text
일반 모드: [수정, 삭제]
편집 모드: [저장, 취소, 삭제]
```

여기서 첫 번째 child가 `수정 -> 저장`으로 교체되고, 두 번째 child가 `삭제 -> 취소`처럼 밀리며, 마지막에 다시 `삭제`가 추가된다.
구조 자체는 diff가 계산할 수 있지만, 현재 액션 영역처럼 상태 전환이 잦고 의미가 다른 버튼들이 index 중심으로 재배치되면 DOM 재사용이 직관과 어긋날 수 있다.

그 결과:

- 저장 버튼이 기대한 DOM/리스너 위치와 어긋나 동작이 불안정해질 수 있었다.
- 취소 후에는 이전 child가 의도와 다르게 재사용되면서 버튼이 중복된 것처럼 보일 수 있었다.

## 수정 방법

액션 버튼을 `Fragment` 묶음 대신 "항상 같은 의미를 가진 버튼을 같은 key로 관리"하는 구조로 바꿨다.

수정 후 구조:

```tsx
<div className="todo-actions">
  {isEditing ? (
    <button key="save">저장</button>
  ) : (
    <button key="edit">수정</button>
  )}
  {isEditing ? <button key="cancel">취소</button> : null}
  <button key="delete">삭제</button>
</div>
```

핵심은 다음과 같다.

- `저장`, `수정`, `취소`, `삭제`를 각각 독립된 child로 다룬다.
- 의미가 고정된 버튼에는 `key`를 부여해 child matching이 더 안정적으로 일어나게 한다.
- `삭제` 버튼은 항상 같은 위치와 key를 유지하므로 불필요한 DOM 흔들림이 줄어든다.
- `Fragment`로 두 버튼을 한 번에 토글하는 대신, 버튼 단위로 명시적으로 추가/제거한다.

## 검증

편집 플로우를 직접 검증하는 테스트를 추가했다.

- `tests/app.test.ts`
- 편집 후 입력값을 바꾸고 `저장`을 눌렀을 때 텍스트가 실제로 반영되는지 확인
- 저장 후 `.todo-actions` 아래 버튼 개수가 2개(`수정`, `삭제`)로 정리되는지 확인
- `취소` 후 입력창이 사라지고 버튼이 중복 없이 2개만 남는지 확인

실행 확인:

```bash
npm test
npm run build
```

## 참고 파일

- `src/app/components/TodoItem.tsx`
- `tests/app.test.ts`
- `src/mini-react/diff.ts`
- `src/mini-react/patch.ts`
