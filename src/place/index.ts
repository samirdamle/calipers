import { anchorPoint } from '../geom/index.js';
import { isElement, px, shiftTranslate } from '../internal/dom.js';
import { normalizeGap } from '../internal/gap.js';
import { rendered } from '../internal/rendered.js';
import { rectOf } from '../rect/index.js';
import type {
	Anchor,
	Box,
	Displacement,
	ElementDisplacement,
	Gap,
	Measurable,
	Point,
	Rect,
} from '../types.js';

export interface PlaceAt {
	/** Anchor of the `of` target. @default 'cc' */
	anchor?: Anchor;
	/** What to place against. @default 'viewport' */
	of?: Measurable | Point | Rect;
}

export interface PlaceOptions {
	/** Which point of `el` to position. @default 'tl' */
	anchor?: Anchor;
	/**
	 * Target: `{ anchor, of }`, a raw viewport point, or a rect.
	 * @default viewport center
	 */
	at?: PlaceAt | Point | Rect;
	/** Extra shift in px. */
	offset?: { x?: number; y?: number };
	/**
	 * Gap in px between the placed box and the target. Unlike `offset`
	 * (a raw signed shift), the gap pushes the box *away* from the target
	 * along the ray from the anchor through the box center — e.g.
	 * `place(tip, { anchor: 'tc', at: { anchor: 'bc', of: btn }, gap: 8 })`
	 * puts the tooltip 8px below the button. A center anchor has no
	 * direction, so the gap is a no-op there (use `offset` instead).
	 */
	gap?: Gap;
	/**
	 * `transform` (default): sets the CSS `translate` property — compositor-friendly,
	 * composes with `transform`, accumulates across calls.
	 * `position`: sets `left`/`top` (upgrades `static` to `absolute`);
	 * exact for absolute/fixed positioning.
	 */
	using?: 'transform' | 'position';
	/**
	 * Read-only mode: compute the displacements without moving anything.
	 * Returns `[{ el, dx, dy }, …]` in input order, zeros included for
	 * elements that wouldn't move. @default false
	 */
	dryRun?: boolean;
}

/**
 * Anything `place` can position: one element, several, or a selector —
 * a selector expands to *all* matches (like `calipers`).
 */
export type Placeable = HTMLElement | ArrayLike<HTMLElement> | string;

export function place(
	els: Placeable,
	options?: PlaceOptions & { dryRun?: false },
): void;
export function place(
	els: Placeable,
	options: PlaceOptions & { dryRun: true },
): ElementDisplacement[];
export function place(
	els: Placeable,
	options?: PlaceOptions,
): undefined | ElementDisplacement[];
/**
 * Position elements so each one's anchor lands on the target point, plus
 * `offset` and `gap`. Reads layout once per element. Repeating the same call
 * is a no-op.
 *
 * One target broadcasts to every element; several targets pair
 * correspondingly with the elements (zipped to the shorter length — extras
 * on either side are left untouched).
 */
export function place(
	els: Placeable,
	options: PlaceOptions = {},
): undefined | ElementDisplacement[] {
	const dryRun = options.dryRun ?? false;
	const list = resolveEls(els);
	const { anchor = 'tl', offset = {}, using = 'transform' } = options;
	const ox = offset.x ?? 0;
	const oy = offset.y ?? 0;
	const gap = normalizeGap(options.gap);
	const targets = resolveTargetPoints(options.at, using);
	const results: ElementDisplacement[] = list.map((el, i) => {
		// One target broadcasts; many pair correspondingly.
		const target = targets.length === 1 ? targets[0] : targets[i];
		if (!target) return { el, dx: 0, dy: 0 };
		if (using === 'transform') {
			const { dx, dy, translate } = transformDelta(
				el,
				anchor,
				target,
				ox,
				oy,
				gap,
			);
			if (!dryRun) shiftTranslate(el, translate, dx, dy);
			return { el, dx, dy };
		}
		const p = positionPlacement(el, anchor, target, ox, oy, gap);
		if (!dryRun) {
			if (p.upgrade) el.style.position = 'absolute';
			el.style.left = `${p.left}px`;
			el.style.top = `${p.top}px`;
		}
		return { el, dx: p.dx, dy: p.dy };
	});
	return dryRun ? results : undefined;
}

/** Resolve the elements to position. Selectors expand to all matches. */
function resolveEls(els: Placeable): HTMLElement[] {
	if (typeof els === 'string')
		return Array.from(document.querySelectorAll(els)) as HTMLElement[];
	if (isElement(els)) return [els as HTMLElement];
	return Array.from(els);
}

function isList(v: unknown): boolean {
	return (
		typeof v === 'object' &&
		v !== null &&
		typeof (v as { length?: unknown }).length === 'number' &&
		!(v instanceof Element)
	);
}

function isRawPoint(v: unknown): v is Point {
	return (
		typeof v === 'object' &&
		v !== null &&
		typeof (v as Point).x === 'number' &&
		typeof (v as Point).y === 'number' &&
		typeof (v as { width?: unknown }).width !== 'number'
	);
}

/**
 * Resolve the target(s) to points in the requested space. A single target
 * (point, rect, element, viewport) yields one point; a selector or list of
 * targets yields one point per target for corresponding pairing.
 */
function resolveTargetPoints(
	at: PlaceAt | Point | Rect | undefined,
	using: 'transform' | 'position',
): Point[] {
	const space = using === 'transform' ? 'viewport' : 'document';
	const box: Box = using === 'transform' ? 'visual' : 'border';
	if (!at) return [anchorPoint(rectOf('viewport', { space }), 'cc')];
	if (isRawPoint(at)) return [toSpace(at, space)];
	if (typeof (at as Rect).width === 'number')
		return [anchorPoint(at as Rect, 'cc')];
	const placeAt = at as PlaceAt;
	const anchor = placeAt.anchor ?? 'cc';
	const of = placeAt.of ?? 'viewport';
	if (isRawPoint(of)) return [toSpace(of, space)];
	const toPoint = (t: Element | Rect): Point =>
		anchorPoint(rectOf(t, { box, space }), anchor);
	if (typeof of === 'string')
		return Array.from(document.querySelectorAll(of)).map(toPoint);
	if (isElement(of)) return [toPoint(of)];
	if (of === window || of === 'viewport')
		// rectOf treats these identically (the viewport rect).
		return [anchorPoint(rectOf('viewport', { box, space }), anchor)];
	if (isList(of)) {
		const out: Point[] = [];
		for (const e of Array.from(of as ArrayLike<Element | string | Rect>)) {
			if (typeof e === 'string') {
				for (const m of Array.from(document.querySelectorAll(e)))
					out.push(toPoint(m));
			} else out.push(toPoint(e));
		}
		return out;
	}
	// Only Element | Rect can reach here — strings, Window/'viewport', and
	// points all returned above. (The `unknown` hop is for TS: its weak-type
	// narrowing of Point can't prove Window is gone.)
	return [toPoint(of as unknown as Element | Rect)];
}

/** Shift a viewport-space point into the requested space. */
function toSpace(p: Point, space: 'viewport' | 'document'): Point {
	return space === 'document'
		? { x: p.x + window.scrollX, y: p.y + window.scrollY }
		: { ...p };
}

/** The translate-mode displacement for one element (pure computation). */
function transformDelta(
	el: HTMLElement,
	anchor: Anchor,
	target: Point,
	ox: number,
	oy: number,
	gap: Point,
): Displacement & { translate: Point } {
	// Translate is relative: deltas in screen px need no frame conversion.
	// Measure the target in visual space too — mixing the integer offset
	// chain (border) with the fractional visual rect misplaces the box by
	// up to ~1px on fractional layouts.
	const { rect, translate } = rendered(el, 'visual');
	const cur = anchorPoint(rect, anchor);
	const dir = gapDirection(rect, anchor);
	return {
		translate,
		dx: target.x + ox + gap.x * dir.x - cur.x,
		dy: target.y + oy + gap.y * dir.y - cur.y,
	};
}

/**
 * Per-axis push direction for `gap`: the sign of (box center − anchor point).
 * A center anchor yields (0, 0) — there is no direction to push.
 */
function gapDirection(rect: Rect, anchor: Anchor): Point {
	const c = anchorPoint(rect, 'cc');
	const p = anchorPoint(rect, anchor);
	return { x: Math.sign(c.x - p.x), y: Math.sign(c.y - p.y) };
}

/**
 * Absolute left/top in the offsetParent frame (viewport frame for fixed),
 * plus the geometric displacement of the border box. Positions the border
 * box; any existing `translate` still applies on top. Pure computation —
 * the caller decides whether to write.
 */
function positionPlacement(
	el: HTMLElement,
	anchor: Anchor,
	target: Point,
	ox: number,
	oy: number,
	gap: Point,
): { left: number; top: number; dx: number; dy: number; upgrade: boolean } {
	const cs = getComputedStyle(el);
	const upgrade = cs.position === 'static';
	const positioned = upgrade ? 'absolute' : cs.position;
	// offsetParent depends only on ancestors, so reading it before the
	// static→absolute upgrade gives the same frame the write would use.
	const op = el.offsetParent as HTMLElement | null;

	const border = rectOf(el, { box: 'border', space: 'document' });
	const a = anchorPoint(
		{ x: 0, y: 0, width: border.width, height: border.height },
		anchor,
	);
	const dir = gapDirection(border, anchor);
	const ml = px(cs.marginLeft);
	const mt = px(cs.marginTop);

	let fx = target.x;
	let fy = target.y;
	if (op) {
		// left/top are relative to the offsetParent's padding box.
		const ob = rectOf(op, { box: 'border', space: 'document' });
		const ocs = getComputedStyle(op);
		fx -= ob.x + px(ocs.borderLeftWidth);
		fy -= ob.y + px(ocs.borderTopWidth);
	} else if (positioned === 'fixed') {
		fx -= window.scrollX;
		fy -= window.scrollY;
	}
	// The offsetParent frame cancels out of the displacement: the box moves
	// from its current document position to the target-derived one.
	return {
		left: fx + ox + gap.x * dir.x - a.x - ml,
		top: fy + oy + gap.y * dir.y - a.y - mt,
		dx: target.x + ox + gap.x * dir.x - a.x - border.x,
		dy: target.y + oy + gap.y * dir.y - a.y - border.y,
		upgrade,
	};
}
