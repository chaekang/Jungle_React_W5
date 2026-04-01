# feat 데모 강점을 codex 구현에 이식

## 배경
- 작업 폴더가 `codex-gpt-5-4-high`와 `feat-mini-react-impl`로 나뉘어 있었고, 두 구현 모두 mini-react 과제를 목표로 하고 있었다.
- `codex-gpt-5-4-high`는 mini-react 코어가 더 정돈되어 있었지만 데모 기능과 설명용 UI가 비교적 단순했다.
- `feat-mini-react-impl`는 편집, 필터, 이벤트 로그, hooks 시각화 등 발표에 유리한 장점이 있었지만 코어 구조는 상대적으로 덜 깔끔했다.

## 요청 내용
- `feat-mini-react-impl`의 장점들을 `codex-gpt-5-4-high`에 적용해 달라는 요청.
- 대규모 수정이 들어가도 괜찮다는 전제였다.

## 고려한 선택지
- `codex`를 유지한 채 `feat`의 앱/UI 장점만 선택적으로 이식한다.
- `feat` 구현을 거의 통째로 복사해 `codex`를 덮어쓴다.
- 공통 코어를 새로 만들고 두 폴더를 다시 재정리한다.

## 결정
- `codex`의 mini-react 코어는 유지하고, `feat`의 발표/데모 장점을 `codex` 위에 이식하는 방향으로 진행했다.
- 구체적으로는 `Todo 수정`, `필터`, `기본 Todo 5개`, `이벤트 로그`, `hooks 배열 패널`, `patch 로그`, `자식은 props만 받는다는 설명 UI`, `카드 전체 클릭 토글`을 `codex` 쪽 앱에 반영했다.
- 동시에 `codex` 쪽 mini-react 코어에 `getCurrentHookSnapshot()`과 `getLatestPatchLogLines()` 같은 디버그 조회 API를 추가해, 앱 UI가 코어 정보를 직접 보여줄 수 있게 했다.
- `feat`에서 문제가 되었던 과한 diff 로그 출력 방식은 그대로 가져오지 않고, `codex` 구조에 맞춘 가벼운 patch 요약 로그로 줄였다.

## 영향
- `codex-gpt-5-4-high`는 코어 안정성을 유지하면서도 발표용 설명력이 크게 강화되었다.
- `npm test`, `npx tsc --noEmit`, `npm run build` 기준으로 검증까지 통과했다.
- 앞으로는 `codex-gpt-5-4-high`만으로도 과제 요구사항 설명과 데모를 함께 진행하기 쉬운 상태가 되었다.
