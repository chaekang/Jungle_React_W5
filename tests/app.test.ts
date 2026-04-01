import { beforeEach, describe, expect, it } from 'vitest';

import { App } from '../src/app/App';
import { FunctionComponent, h, resetHooksForTests } from '../src/mini-react';

type SaveAttemptKind = 'button' | 'enter';
type FilterName = 'all' | 'active' | 'completed';
type DisappearingEditCase =
  | {
      mode: 'filter';
      sourceFilter: 'all';
      targetFilter: 'active' | 'completed';
      todoText: string;
      draft: string;
    }
  | {
      mode: 'toggle';
      sourceFilter: 'active' | 'completed';
      todoText: string;
      draft: string;
      initialCompleted: boolean;
    };
type ValidEditSaveCase = {
  sourceFilter: FilterName;
  todoText: string;
  draft: string;
  attempt: SaveAttemptKind;
};
type DeleteWhileEditingCase = {
  sourceFilter: FilterName;
  todoText: string;
  draft: string;
};

const blankDrafts = [
  '',
  ' ',
  '  ',
  '   ',
  '\t',
  '\n',
  '\r\n',
  ' \n ',
  '\t\t',
  ' \t ',
  '\n\t',
  '\u00a0',
  '\u00a0 ',
  ' \u00a0 ',
  '\n \t \r',
];

const invalidEditSaveCases = blankDrafts.flatMap((draft) => [
  { draft, attempt: 'button' as SaveAttemptKind },
  { draft, attempt: 'enter' as SaveAttemptKind },
]);

const draftVariants = [
  '숨겨질 draft',
  '  앞뒤 공백이 있는 draft  ',
  '다른 설명 문장으로 바꾼 draft',
];

const validDraftVariants = [
  '수정된 할 일',
  '  앞뒤 공백을 제거한 저장  ',
  '한글과 숫자 123을 섞은 저장',
];

const saveSourceCases = [
  { sourceFilter: 'all' as const, todoText: 'mini-react 렌더 흐름 살펴보기' },
  { sourceFilter: 'all' as const, todoText: 'useState가 hooks 배열에 저장되는지 설명하기' },
  { sourceFilter: 'all' as const, todoText: 'TodoItem은 props만 받는다는 점 보여주기' },
  { sourceFilter: 'all' as const, todoText: '필터 버튼으로 App state 변경 시연하기' },
  { sourceFilter: 'all' as const, todoText: '이벤트 로그로 상태 변화 추적하기' },
];

const validEditSaveCases: ValidEditSaveCase[] = saveSourceCases.flatMap((baseCase) =>
  validDraftVariants.flatMap((draft) => [
    { ...baseCase, draft, attempt: 'button' as const },
    { ...baseCase, draft, attempt: 'enter' as const },
  ]),
);

const deleteWhileEditingBaseCases = [
  { sourceFilter: 'all' as const, todoText: 'mini-react 렌더 흐름 살펴보기' },
  { sourceFilter: 'all' as const, todoText: 'useState가 hooks 배열에 저장되는지 설명하기' },
  { sourceFilter: 'all' as const, todoText: 'TodoItem은 props만 받는다는 점 보여주기' },
  { sourceFilter: 'all' as const, todoText: '필터 버튼으로 App state 변경 시연하기' },
  { sourceFilter: 'all' as const, todoText: '이벤트 로그로 상태 변화 추적하기' },
  { sourceFilter: 'active' as const, todoText: 'mini-react 렌더 흐름 살펴보기' },
  { sourceFilter: 'active' as const, todoText: 'TodoItem은 props만 받는다는 점 보여주기' },
  { sourceFilter: 'active' as const, todoText: '필터 버튼으로 App state 변경 시연하기' },
  { sourceFilter: 'completed' as const, todoText: 'useState가 hooks 배열에 저장되는지 설명하기' },
  { sourceFilter: 'completed' as const, todoText: '이벤트 로그로 상태 변화 추적하기' },
];

const deleteDraftVariants = [
  '삭제 직전 draft',
  '  삭제 전 공백 포함 draft  ',
  '삭제 전 마지막 수정',
];

const deleteWhileEditingCases: DeleteWhileEditingCase[] = deleteWhileEditingBaseCases.flatMap(
  (baseCase) => deleteDraftVariants.map((draft) => ({ ...baseCase, draft })),
);

const filterDisappearingCases: DisappearingEditCase[] = [
  { sourceFilter: 'all' as const, targetFilter: 'completed' as const, todoText: 'mini-react 렌더 흐름 살펴보기' },
  { sourceFilter: 'all' as const, targetFilter: 'completed' as const, todoText: 'TodoItem은 props만 받는다는 점 보여주기' },
  { sourceFilter: 'all' as const, targetFilter: 'completed' as const, todoText: '필터 버튼으로 App state 변경 시연하기' },
  { sourceFilter: 'all' as const, targetFilter: 'active' as const, todoText: 'useState가 hooks 배열에 저장되는지 설명하기' },
  { sourceFilter: 'all' as const, targetFilter: 'active' as const, todoText: '이벤트 로그로 상태 변화 추적하기' },
].flatMap((baseCase) =>
  draftVariants.map((draft) => ({
    ...baseCase,
    mode: 'filter' as const,
    draft,
  })),
);

const toggleDisappearingCases: DisappearingEditCase[] = [
  {
    sourceFilter: 'active' as const,
    todoText: 'mini-react 렌더 흐름 살펴보기',
    initialCompleted: false,
  },
  {
    sourceFilter: 'active' as const,
    todoText: 'TodoItem은 props만 받는다는 점 보여주기',
    initialCompleted: false,
  },
  {
    sourceFilter: 'active' as const,
    todoText: '필터 버튼으로 App state 변경 시연하기',
    initialCompleted: false,
  },
  {
    sourceFilter: 'completed' as const,
    todoText: 'useState가 hooks 배열에 저장되는지 설명하기',
    initialCompleted: true,
  },
  {
    sourceFilter: 'completed' as const,
    todoText: '이벤트 로그로 상태 변화 추적하기',
    initialCompleted: true,
  },
].flatMap((baseCase) =>
  draftVariants.map((draft) => ({
    ...baseCase,
    mode: 'toggle' as const,
    draft,
  })),
);

const disappearingEditCases = [...filterDisappearingCases, ...toggleDisappearingCases];

async function flushMicrotasks(cycles = 6): Promise<void> {
  for (let index = 0; index < cycles; index += 1) {
    await Promise.resolve();
  }
}

function mountApp(): HTMLDivElement {
  const container = document.createElement('div');
  document.body.appendChild(container);

  const component = new FunctionComponent(container, () => h(App, null));
  component.mount();

  return container;
}

function getTodoItems(container: HTMLElement): HTMLLIElement[] {
  return Array.from(container.querySelectorAll('.todo-item')).filter(
    (item): item is HTMLLIElement => item instanceof HTMLLIElement,
  );
}

function getTodoItemByText(container: HTMLElement, todoText: string): HTMLLIElement {
  const item = getTodoItems(container).find((candidate) =>
    candidate.textContent?.includes(todoText),
  );

  if (!(item instanceof HTMLLIElement)) {
    throw new Error(`Expected todo item "${todoText}" to exist.`);
  }

  return item;
}

function getEditingTodoItem(container: HTMLElement): HTMLLIElement {
  const item = getTodoItems(container).find((candidate) =>
    candidate.querySelector('.todo-edit-input') instanceof HTMLInputElement,
  );

  if (!(item instanceof HTMLLIElement)) {
    throw new Error('Expected an editing todo item to exist.');
  }

  return item;
}

function findButtonByText(root: ParentNode, label: string): HTMLButtonElement {
  const button = Array.from(root.querySelectorAll('button')).find((candidate) =>
    candidate.textContent?.trim() === label,
  );

  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Expected button "${label}" to exist.`);
  }

  return button;
}

async function openEditForTodo(container: HTMLElement, todoText: string): Promise<void> {
  const item = getTodoItemByText(container, todoText);
  const editButton = Array.from(item.querySelectorAll('.todo-action.ghost')).find((candidate) =>
    candidate.textContent?.trim() === '수정',
  );

  if (!(editButton instanceof HTMLButtonElement)) {
    throw new Error(`Expected edit button for "${todoText}" to exist.`);
  }

  editButton.click();
  await flushMicrotasks();
}

async function setEditingDraft(container: HTMLElement, draft: string): Promise<HTMLInputElement> {
  const editingItem = getEditingTodoItem(container);
  const editInput = editingItem.querySelector('.todo-edit-input');

  if (!(editInput instanceof HTMLInputElement)) {
    throw new Error('Expected edit input to exist.');
  }

  editInput.value = draft;
  editInput.dispatchEvent(new Event('input', { bubbles: true }));
  await flushMicrotasks();

  const refreshedInput = getEditingTodoItem(container).querySelector('.todo-edit-input');
  if (!(refreshedInput instanceof HTMLInputElement)) {
    throw new Error('Expected refreshed edit input to exist.');
  }

  return refreshedInput;
}

async function clickFilter(container: HTMLElement, label: '전체' | '진행 중' | '완료'): Promise<void> {
  findButtonByText(container.querySelector('.filter-bar') ?? container, label).click();
  await flushMicrotasks();
}

async function applySourceFilter(container: HTMLElement, filter: FilterName): Promise<void> {
  if (filter === 'all') {
    await clickFilter(container, '전체');
    return;
  }

  if (filter === 'active') {
    await clickFilter(container, '진행 중');
    return;
  }

  await clickFilter(container, '완료');
}

describe('App editing edge cases', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    resetHooksForTests();
  });

  it.each(invalidEditSaveCases)(
    'prevents blank edit saves for %j',
    async ({ draft, attempt }) => {
      const container = mountApp();
      const originalText = 'mini-react 렌더 흐름 살펴보기';

      await openEditForTodo(container, originalText);
      const editInput = await setEditingDraft(container, draft);

      const editingItem = getEditingTodoItem(container);
      const saveButton = findButtonByText(editingItem, '저장');
      const cancelButton = findButtonByText(editingItem, '취소');

      expect(saveButton.disabled).toBe(true);

      if (attempt === 'button') {
        saveButton.click();
      } else {
        editInput.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }));
      }
      await flushMicrotasks();

      expect(container.querySelector('.todo-edit-input')).not.toBeNull();
      expect(findButtonByText(getEditingTodoItem(container), '저장').disabled).toBe(true);

      cancelButton.click();
      await flushMicrotasks();

      const restoredItem = getTodoItemByText(container, originalText);
      expect(restoredItem.querySelector('.todo-edit-input')).toBeNull();
      expect(restoredItem.querySelector('.todo-text')?.textContent).toBe(originalText);
    },
  );

  it.each(validEditSaveCases)(
    'saves valid edited text across todos and input methods: %j',
    async ({ sourceFilter, todoText, draft, attempt }) => {
      const container = mountApp();

      await applySourceFilter(container, sourceFilter);
      await openEditForTodo(container, todoText);
      const editInput = await setEditingDraft(container, draft);

      const editingItem = getEditingTodoItem(container);
      const saveButton = findButtonByText(editingItem, '저장');
      const expectedText = draft.trim();

      expect(saveButton.disabled).toBe(false);

      if (attempt === 'button') {
        saveButton.click();
      } else {
        editInput.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }));
      }
      await flushMicrotasks();

      expect(container.querySelector('.todo-edit-input')).toBeNull();

      await applySourceFilter(container, 'all');

      const savedItem = getTodoItemByText(container, expectedText);
      expect(savedItem.querySelector('.todo-text')?.textContent).toBe(expectedText);
      expect(savedItem.querySelector('.todo-edit-input')).toBeNull();
      expect(getTodoItems(container).length).toBe(5);
      expect(getTodoItems(container).filter((item) => item.textContent?.includes(expectedText))).toHaveLength(1);
    },
  );

  it.each(disappearingEditCases)(
    'cleans editing state when edited todo disappears: %j',
    async (testCase) => {
      const container = mountApp();
      const { draft, todoText } = testCase;

      if (testCase.sourceFilter === 'active') {
        await clickFilter(container, '진행 중');
      }

      if (testCase.sourceFilter === 'completed') {
        await clickFilter(container, '완료');
      }

      await openEditForTodo(container, todoText);
      await setEditingDraft(container, draft);

      if (testCase.mode === 'filter') {
        await clickFilter(container, testCase.targetFilter === 'active' ? '진행 중' : '완료');
      } else {
        const editingItem = getEditingTodoItem(container);
        const checkbox = editingItem.querySelector('.todo-checkbox');

        if (!(checkbox instanceof HTMLInputElement)) {
          throw new Error('Expected checkbox in editing item to exist.');
        }

        checkbox.click();
        await flushMicrotasks();
      }

      expect(container.querySelector('.todo-edit-input')).toBeNull();
      expect(getTodoItems(container).every((item) => !item.textContent?.includes(draft.trim()))).toBe(true);

      await clickFilter(container, '전체');

      const restoredItem = getTodoItemByText(container, todoText);
      expect(restoredItem.querySelector('.todo-edit-input')).toBeNull();
      expect(restoredItem.querySelector('.todo-text')?.textContent).toBe(todoText);

      if (testCase.mode === 'toggle') {
        const restoredCheckbox = restoredItem.querySelector('.todo-checkbox');

        if (!(restoredCheckbox instanceof HTMLInputElement)) {
          throw new Error('Expected restored checkbox to exist.');
        }

        expect(restoredCheckbox.checked).toBe(!testCase.initialCompleted);
      }
    },
  );

  it.each(deleteWhileEditingCases)(
    'clears editing state and removes the todo when deleting during edit: %j',
    async ({ sourceFilter, todoText, draft }) => {
      const container = mountApp();

      await applySourceFilter(container, sourceFilter);
      await openEditForTodo(container, todoText);
      await setEditingDraft(container, draft);

      const editingItem = getEditingTodoItem(container);
      const deleteButton = findButtonByText(editingItem, '삭제');
      const visibleCountBeforeDelete = getTodoItems(container).length;

      deleteButton.click();
      await flushMicrotasks();

      expect(container.querySelector('.todo-edit-input')).toBeNull();
      expect(getTodoItems(container).length).toBe(visibleCountBeforeDelete - 1);
      expect(getTodoItems(container).every((item) => !item.textContent?.includes(todoText))).toBe(true);
      expect(getTodoItems(container).every((item) => !item.textContent?.includes(draft.trim()))).toBe(true);

      await applySourceFilter(container, 'all');

      expect(getTodoItems(container).every((item) => !item.textContent?.includes(todoText))).toBe(true);
      expect(getTodoItems(container)).toHaveLength(4);
    },
  );
});
