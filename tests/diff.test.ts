import { describe, expect, it } from 'vitest';

import { diff, h } from '../src/mini-react';

describe('diff', () => {
  it('returns an empty patch list for identical trees', () => {
    const oldNode = h('div', { id: 'same' }, 'content');
    const newNode = h('div', { id: 'same' }, 'content');

    expect(diff(oldNode, newNode)).toEqual([]);
  });

  it('replaces nodes when kinds or element types differ', () => {
    expect(diff(h('div', null, 'a'), h('section', null, 'a'))).toEqual([
      { type: 'REPLACE', node: h('section', null, 'a') },
    ]);
    expect(diff(h('div', null, 'a'), { kind: 'text', text: 'plain' })).toEqual([
      { type: 'REPLACE', node: { kind: 'text', text: 'plain' } },
    ]);
  });

  it('updates text nodes when content changes', () => {
    expect(diff({ kind: 'text', text: 'old' }, { kind: 'text', text: 'new' })).toEqual([
      { type: 'UPDATE_TEXT', text: 'new' },
    ]);
  });

  it('produces prop and child patches for matching elements', () => {
    const oldNode = h(
      'ul',
      { className: 'list' },
      h('li', { className: 'first' }, 'one'),
    );
    const newNode = h(
      'ul',
      { className: 'list updated', title: 'todos' },
      h('li', { className: 'first' }, 'one'),
      h('li', null, 'two'),
    );

    expect(diff(oldNode, newNode)).toEqual([
      {
        type: 'UPDATE_PROPS',
        added: { className: 'list updated', title: 'todos' },
        removed: [],
      },
      {
        type: 'CHILDREN',
        childPatches: [
          {
            type: 'INSERT',
            newIndex: 1,
            node: h('li', null, 'two'),
          },
        ],
      },
    ]);
  });

  it('produces remove operations for trailing children', () => {
    const oldNode = h('div', null, h('span', null, 'a'), h('span', null, 'b'));
    const newNode = h('div', null, h('span', null, 'a'));

    expect(diff(oldNode, newNode)).toEqual([
      {
        type: 'CHILDREN',
        childPatches: [{ type: 'REMOVE', oldIndex: 1 }],
      },
    ]);
  });

  it('matches keyed children by key instead of index', () => {
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

    expect(diff(oldNode, newNode)).toEqual([
      {
        type: 'CHILDREN',
        childPatches: [
          { type: 'PATCH', oldIndex: 2, newIndex: 0, ops: [] },
          { type: 'PATCH', oldIndex: 0, newIndex: 1, ops: [] },
          { type: 'PATCH', oldIndex: 1, newIndex: 2, ops: [] },
        ],
      },
    ]);
  });
});
