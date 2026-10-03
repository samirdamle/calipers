import type { Point } from '../types.js';

/**
 * Shared DOM read/write helpers. Internal only — not exported from any
 * entry point, so these never become public API. Each entry inlines what it
 * uses (`splitting: false`), keeping per-module size budgets honest.
 */

/** Guarded `instanceof Element` — safe where the DOM doesn't exist (SSR). */
export function isElement(v: unknown): v is Element {
	return typeof Element !== 'undefined' && v instanceof Element;
}

/** Parse a CSS length; non-numeric values (e.g. `auto`) count as 0. */
export function px(value: string): number {
	const n = parseFloat(value);
	return Number.isFinite(n) ? n : 0;
}

/** Parse computed `translate`: `none` | `<x>` | `<x> <y>` | `<x> <y> <z>`. */
export function parseTranslate(value: string | undefined): Point {
	if (!value || value === 'none') return { x: 0, y: 0 };
	const [x = '0', y = '0'] = value.trim().split(/\s+/);
	return { x: px(x), y: px(y) };
}

/** The element's current CSS `translate` property, as a point. */
export function getTranslate(el: Element): Point {
	return parseTranslate(getComputedStyle(el).translate);
}

/**
 * Move an element by a translate delta, accumulating onto its existing CSS
 * `translate`. Reads the previously-read `prev` value instead of re-reading
 * computed style, so verbs do one style read per element per call. No-op
 * when both deltas are 0 (keeps repeated calls from touching the DOM).
 */
export function shiftTranslate(
	el: HTMLElement,
	prev: Point,
	dx: number,
	dy: number,
): void {
	if (dx === 0 && dy === 0) return;
	el.style.setProperty('translate', `${prev.x + dx}px ${prev.y + dy}px`);
}
