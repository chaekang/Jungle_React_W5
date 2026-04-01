# Keyed Diff 회귀 수정

## 배경

- `8ce459b` 이후 데모 UI가 비정상적으로 동작한다는 보고가 있었다.
- 조사 결과 keyed child diff 도입 과정에서 유지되어야 할 기존 자식을 최종 DOM 재배치 대상에서 누락하는 문제가 있었다.
- 또한 함수형 컴포넌트에 전달한 `key`가 반환 vnode까지 보존되지 않아 Todo 데모에서 keyed diff가 실제로 적용되지 않았다.

## 요청 내용

- 문제 여부를 확인하고, 원인이라면 수정한다.

## 고려한 선택지

- `patch`에서 누락된 기존 자식을 별도로 병합
- `diffChildren`가 변화가 있는 경우 유지 자식 전체를 최종 순서 정보에 포함하도록 수정
- 함수형 컴포넌트 경계에서 `key`를 별도 메타데이터로 관리

## 결정

- `diffChildren`가 child 변화가 있는 경우 유지되는 자식도 모두 `PATCH` 항목으로 포함하도록 수정했다.
- 함수형 컴포넌트가 반환한 element vnode에 상위 `key`를 전달하도록 보정했다.
- append/reorder/function component key 재사용 회귀 테스트를 추가했다.

## 영향

- 기존 자식이 변하지 않은 상태에서 새 자식을 추가해도 순서가 깨지지 않는다.
- Todo 데모처럼 `<TodoItem key={id} />` 패턴에서도 keyed child diff가 실제로 동작한다.
- keyed diff 관련 회귀를 테스트로 다시 잡을 수 있게 됐다.
