import { describe, it, expect } from 'vitest';
import { DEFAULT_LAB_PARAMS, parseLabParams } from './params';

describe('parseLabParams', () => {
  it('defaults when there are no params at all', () => {
    expect(parseLabParams(undefined)).toEqual(DEFAULT_LAB_PARAMS);
    expect(parseLabParams({})).toEqual(DEFAULT_LAB_PARAMS);
  });

  it('reads k', () => {
    expect(parseLabParams({ k: '5' }).k).toBe(5);
  });

  it('clamps k into a range the canvas can actually show', () => {
    expect(parseLabParams({ k: '0' }).k).toBe(1);
    expect(parseLabParams({ k: '9999' }).k).toBe(20);
  });

  it('ignores a k that is not a number', () => {
    // A Medium link is hand-written and will eventually be hand-mistyped.
    expect(parseLabParams({ k: 'ten' }).k).toBe(DEFAULT_LAB_PARAMS.k);
    expect(parseLabParams({ k: '' }).k).toBe(DEFAULT_LAB_PARAMS.k);
  });

  it('reads a known index name', () => {
    expect(parseLabParams({ index: 'flat' }).index).toBe('flat');
  });

  it('falls back for an index that does not exist yet', () => {
    // ?index=hnsw is a valid link to write today and a 404 to honour.
    expect(parseLabParams({ index: 'hnsw' }).index).toBe('flat');
  });

  it('takes the first value when a param repeats', () => {
    expect(parseLabParams({ k: ['5', '7'] }).k).toBe(5);
  });
});
