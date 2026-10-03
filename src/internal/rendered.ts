import { rectOf } from '../rect/index.js';
import type { Box, Point, Rect } from '../types.js';
import { getTranslate } from './dom.js';

/**
 * One measurement of an element: its rect as currently rendered plus its
 * current CSS `translate`. One `getComputedStyle` read per call.
 *
 * The offset chain behind `rectOf` doesn't include `translate`, so measuring
 * without it would compute deltas from the stale layout position and
 * re-apply them on every call (the #20 bug class). `visual` already includes
 * it — never double-count.
 */
export interface Rendered {
	rect: Rect;
	translate: Point;
}

export function rendered(el: Element, box: Box): Rendered {
	const rect = rectOf(el, { box, space: 'viewport' });
	const translate = getTranslate(el);
	if (box === 'visual' || (translate.x === 0 && translate.y === 0)) {
		return { rect, translate };
	}
	return {
		rect: { ...rect, x: rect.x + translate.x, y: rect.y + translate.y },
		translate,
	};
}
