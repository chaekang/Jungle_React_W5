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

  it('reorders keyed children while reusing existing DOM nodes', () => {
    const oldNode = h(
      'ul',
      null,
      h('li', { key: 'a' }, 'A'),
      h('li', { key: 'b' }, 'B'),
      h('li', { key: 'c' }, 'C'),
    );
    const newNode = h(
      'ul',
      null,
      h('li', { key: 'c' }, 'C'),
      h('li', { key: 'a' }, 'A'),
      h('li', { key: 'b' }, 'B'),
    );

    const domNode = createDom(oldNode) as HTMLUListElement;
    document.body.appendChild(domNode);

    const firstNode = domNode.children[0];
    const secondNode = domNode.children[1];
    const thirdNode = domNode.children[2];

    patch(domNode, diff(oldNode, newNode));

    expect(Array.from(domNode.children).map((node) => node.textContent)).toEqual(['C', 'A', 'B']);
    expect(domNode.children[0]).toBe(thirdNode);
    expect(domNode.children[1]).toBe(firstNode);
    expect(domNode.children[2]).toBe(secondNode);
  });

  it('appends a new child without disturbing unchanged existing children', () => {
    const oldNode = h(
      'ul',
      null,
      h('li', null, 'A'),
      h('li', null, 'B'),
    );
    const newNode = h(
      'ul',
      null,
      h('li', null, 'A'),
      h('li', null, 'B'),
      h('li', null, 'C'),
    );

    const domNode = createDom(oldNode) as HTMLUListElement;
    document.body.appendChild(domNode);

    const firstNode = domNode.children[0];
    const secondNode = domNode.children[1];

    patch(domNode, diff(oldNode, newNode));

    expect(Array.from(domNode.children).map((node) => node.textContent)).toEqual(['A', 'B', 'C']);
    expect(domNode.children[0]).toBe(firstNode);
    expect(domNode.children[1]).toBe(secondNode);
  });

  it('keeps keyed matches stable across remove, insert, and nested updates', () => {
    const oldNode = h(
      'ul',
      null,
      h('li', { key: 'a', className: 'old-a' }, 'A'),
      h('li', { key: 'b', className: 'old-b' }, 'B'),
    );
    const newNode = h(
      'ul',
      null,
      h('li', { key: 'b', className: 'new-b' }, 'B updated'),
      h('li', { key: 'c', className: 'new-c' }, 'C'),
    );

    const domNode = createDom(oldNode) as HTMLUListElement;
    document.body.appendChild(domNode);

    const nodeA = domNode.children[0];
    const nodeB = domNode.children[1];

    patch(domNode, diff(oldNode, newNode));

    expect(domNode.children).toHaveLength(2);
    expect(domNode.children[0]).toBe(nodeB);
    expect(domNode.children[0].textContent).toBe('B updated');
    expect((domNode.children[0] as HTMLLIElement).className).toBe('new-b');
    expect(Array.from(domNode.children)).not.toContain(nodeA);
    expect(domNode.children[1].textContent).toBe('C');
  });

  it('reuses keyed DOM nodes produced by function components', () => {
    const Item = ({ label }: { label: string }) => h('li', null, label);
    const oldNode = h(
      'ul',
      null,
      h(Item, { key: 'a', label: 'A' }),
      h(Item, { key: 'b', label: 'B' }),
    );
    const newNode = h(
      'ul',
      null,
      h(Item, { key: 'b', label: 'B' }),
      h(Item, { key: 'a', label: 'A' }),
    );

    const domNode = createDom(oldNode) as HTMLUListElement;
    document.body.appendChild(domNode);

    const firstNode = domNode.children[0];
    const secondNode = domNode.children[1];

    patch(domNode, diff(oldNode, newNode));

    expect(Array.from(domNode.children).map((node) => node.textContent)).toEqual(['B', 'A']);
    expect(domNode.children[0]).toBe(secondNode);
    expect(domNode.children[1]).toBe(firstNode);
  });
});
