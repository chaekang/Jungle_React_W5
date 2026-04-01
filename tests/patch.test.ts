import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createDom, diff, h, patch } from '../src/mini-react';

describe('patch', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('applies text, prop, append, and remove changes to the DOM', () => {
    const oldNode = h('div', { className: 'old' }, h('span', null, 'before'));
    const newNode = h(
      'div',
      { className: 'new', title: 'updated' },
      h('span', null, 'after'),
      h('button', { type: 'button' }, 'add'),
    );

    const domNode = createDom(oldNode);
    document.body.appendChild(domNode);
    patch(domNode, diff(oldNode, newNode));

    const container = document.body.firstElementChild as HTMLDivElement;
    expect(container.className).toBe('new');
    expect(container.getAttribute('title')).toBe('updated');
    expect(container.children).toHaveLength(2);
    expect(container.firstElementChild?.textContent).toBe('after');

    patch(container, diff(newNode, h('div', { className: 'new' }, h('span', null, 'after'))));
    expect(container.children).toHaveLength(1);
  });

  it('replaces event listeners without duplication', () => {
    const firstClick = vi.fn();
    const secondClick = vi.fn();
    const oldNode = h('button', { onClick: firstClick }, 'save');
    const newNode = h('button', { onClick: secondClick }, 'save');

    const domNode = createDom(oldNode) as HTMLButtonElement;
    document.body.appendChild(domNode);

    patch(domNode, diff(oldNode, newNode));
    domNode.click();

    expect(firstClick).not.toHaveBeenCalled();
    expect(secondClick).toHaveBeenCalledTimes(1);
  });
});
