import { describe, expect, it } from 'vitest';
import * as align from './align/index.js';
import * as root from './index.js';
import * as measure from './measure/index.js';
import * as place from './place/index.js';
import * as rect from './rect/index.js';

describe('scaffold', () => {
	it('every entry point loads', () => {
		for (const mod of [root, rect, measure, place, align]) {
			expect(mod).toBeDefined();
		}
	});
});
