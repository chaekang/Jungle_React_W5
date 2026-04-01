import { beforeEach, describe, expect, it } from 'vitest';

import { App } from '../src/app/App';
import { FunctionComponent, h, resetHooksForTests } from '../src/mini-react';

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

function mountApp(): HTMLDivElement {
  const container = document.createElement('div');
  document.body.appendChild(container);

  const component = new FunctionComponent(container, () => h(App, null));
  component.mount();

  return container;
}

function getFirstTodoItem(container: HTMLElement): HTMLLIElement {
  const item = container.querySelector('.todo-item');

  if (!(item instanceof HTMLLIElement)) {
    throw new Error('Expected the first todo item to exist.');
  }

  return item;
}

describe('App editing flow', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    resetHooksForTests();
  });

  it('saves an edited todo and removes edit-mode buttons cleanly', async () => {
    const container = mountApp();

    const initialItem = getFirstTodoItem(container);
    const editButton = initialItem.querySelector('.todo-action.ghost');

    if (!(editButton instanceof HTMLButtonElement)) {
      throw new Error('Expected the edit button to exist.');
    }

    editButton.click();
    await flushMicrotasks();

    let editingItem = getFirstTodoItem(container);
    const editInput = editingItem.querySelector('.todo-edit-input');

    if (!(editInput instanceof HTMLInputElement)) {
      throw new Error('Expected the edit input to exist.');
    }

    editInput.value = 'updated todo';
    editInput.dispatchEvent(new Event('input', { bubbles: true }));
    await flushMicrotasks();

    editingItem = getFirstTodoItem(container);
    const saveButton = editingItem.querySelector('.todo-action:not(.ghost):not(.danger)');

    if (!(saveButton instanceof HTMLButtonElement)) {
      throw new Error('Expected the save button to exist.');
    }

    saveButton.click();
    await flushMicrotasks();

    const savedItem = getFirstTodoItem(container);

    expect(savedItem.querySelector('.todo-edit-input')).toBeNull();
    expect(savedItem.querySelector('.todo-text')?.textContent).toBe('updated todo');
    expect(savedItem.querySelectorAll('.todo-actions > .todo-action')).toHaveLength(2);
    expect(savedItem.querySelectorAll('.todo-actions > .todo-action.ghost')).toHaveLength(1);
  });

  it('cancels editing without leaving duplicate cancel buttons behind', async () => {
    const container = mountApp();

    const initialItem = getFirstTodoItem(container);
    const editButton = initialItem.querySelector('.todo-action.ghost');

    if (!(editButton instanceof HTMLButtonElement)) {
      throw new Error('Expected the edit button to exist.');
    }

    const originalText = initialItem.querySelector('.todo-text')?.textContent;

    editButton.click();
    await flushMicrotasks();

    let editingItem = getFirstTodoItem(container);
    const cancelButton = editingItem.querySelector('.todo-action.ghost');

    if (!(cancelButton instanceof HTMLButtonElement)) {
      throw new Error('Expected the cancel button to exist.');
    }

    cancelButton.click();
    await flushMicrotasks();

    const canceledItem = getFirstTodoItem(container);

    expect(canceledItem.querySelector('.todo-edit-input')).toBeNull();
    expect(canceledItem.querySelector('.todo-text')?.textContent).toBe(originalText);
    expect(canceledItem.querySelectorAll('.todo-actions > .todo-action')).toHaveLength(2);
    expect(canceledItem.querySelectorAll('.todo-actions > .todo-action.ghost')).toHaveLength(1);
  });
});
