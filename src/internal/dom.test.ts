// @vitest-environment node
// Regression test for #33: the guarded `isElement` must not throw when the
// `Element` global doesn't exist (SSR / Node).
import { describe, expect, it } from 'vitest';
import { isElement } from './dom.js';

describe('isElement without a DOM', () => {
	it('returns false instead of throwing a ReferenceError', () => {
		expect(typeof Element).toBe('undefined');
		expect(isElement({})).toBe(false);
		expect(isElement(null)).toBe(false);
		expect(isElement({ x: 1, y: 2, width: 3, height: 4 })).toBe(false);
	});
});
