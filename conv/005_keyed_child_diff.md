# Key 기반 자식 diff 적용

## 배경

- 기존 `diffChildren`은 자식을 인덱스 기준으로만 비교했다.
- `TodoItem`처럼 리스트 렌더링에서 `key`를 주더라도 순서 변경 시 기존 DOM 노드를 재사용하지 못했다.
- 이 상태에서는 재정렬이 발생할 때 불필요한 교체가 생기고, 발표 때도 `key`의 의미를 설명하기 어려웠다.

## 요청 내용

- key 기반 diff 알고리즘을 가지도록 수정하고, 테스트 후 커밋한다.

## 고려한 선택지

- 기존 인덱스 기반 알고리즘 유지
- `MOVE` 같은 별도 패치 타입을 추가
- 자식 패치를 `PATCH / INSERT / REMOVE`로 재구성하고, 최종 `newIndex` 기준으로 DOM 순서를 재배치

## 결정

- `ChildPatch`를 `PATCH / INSERT / REMOVE` union 타입으로 변경했다.
- `diffChildren`는 keyed child는 `key`로, unkeyed child는 남은 순서대로 매칭한다.
- `patch`는 삭제와 업데이트를 먼저 수행하고, 마지막에 `newIndex` 기준으로 실제 DOM 순서를 맞춘다.

## 영향

- keyed reorder에서 기존 DOM 노드를 유지하면서 위치만 바꿀 수 있게 됐다.
- keyed insert/remove/update를 한 번의 자식 패치 사이클에서 처리할 수 있게 됐다.
- 테스트에 노드 재사용 검증이 추가되어 이후 리팩터링 때 동작을 더 안전하게 지킬 수 있다.
