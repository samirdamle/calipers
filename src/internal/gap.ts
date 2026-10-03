import type { Gap, Point } from '../types.js';

/** Normalize the `Gap` option to per-axis magnitudes. Internal only. */
export function normalizeGap(gap?: Gap): Point {
	if (gap === undefined) return { x: 0, y: 0 };
	if (typeof gap === 'number') return { x: gap, y: gap };
	if ('x' in gap) return { x: gap.x, y: gap.y };
	return { x: gap[0], y: gap[1] };
}
