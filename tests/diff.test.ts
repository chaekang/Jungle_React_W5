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
            index: 1,
            op: {
              type: 'APPEND',
              node: h('li', null, 'two'),
            },
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
        childPatches: [{ index: 1, op: { type: 'REMOVE' } }],
      },
    ]);
  });
});
