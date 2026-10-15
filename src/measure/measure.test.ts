import { describe, expect, it, vi } from 'vitest';
import type { Rect } from '../types.js';
import {
	anchorPoint,
	angleBetween,
	calipers,
	containsRect,
	distanceBetween,
	gapBetween,
	measure,
	overlapArea,
	overlaps,
} from './index.js';

const R = (x: number, y: number, width: number, height: number): Rect => ({
	x,
	y,
	width,
	height,
});

describe('anchorPoint', () => {
	const rect = R(10, 20, 100, 50);

	it('resolves all 13 codes to their fractional points', () => {
		const cases: Array<[string, number, number]> = [
			['tl', 10, 20],
			['tc', 60, 20],
			['tr', 110, 20],
			['cl', 10, 45],
			['cc', 60, 45],
			['cr', 110, 45],
			['bl', 10, 70],
			['bc', 60, 70],
			['br', 110, 70],
			['t', 60, 20],
			['b', 60, 70],
			['l', 10, 45],
			['r', 110, 45],
		];
		for (const [code, x, y] of cases) {
			expect(anchorPoint(rect, code as never), code).toEqual({ x, y });
		}
	});

	it('accepts fractional {x,y}, [x,y], and function anchors; defaults to cc', () => {
		expect(anchorPoint(rect, { x: 0.25, y: 0 })).toEqual({ x: 35, y: 20 });
		expect(anchorPoint(rect, [1, 1])).toEqual({ x: 110, y: 70 });
		expect(anchorPoint(rect, (r) => ({ x: r.x - 5, y: r.y - 5 }))).toEqual({
			x: 5,
			y: 15,
		});
		expect(anchorPoint(rect)).toEqual({ x: 60, y: 45 });
	});
});

describe('pure geometry', () => {
	it('distanceBetween', () => {
		expect(distanceBetween({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
	});

	it('angleBetween: 0° east, clockwise-positive, (−180°, 180°]', () => {
		const o = { x: 0, y: 0 };
		expect(angleBetween(o, { x: 1, y: 0 })).toBeCloseTo(0);
		expect(angleBetween(o, { x: 0, y: 1 })).toBeCloseTo(Math.PI / 2);
		expect(angleBetween(o, { x: -1, y: 0 })).toBeCloseTo(Math.PI);
		expect(angleBetween(o, { x: 0, y: -1 })).toBeCloseTo(-Math.PI / 2);
	});

	it('gapBetween: separation per axis, 0 when overlapping', () => {
		expect(gapBetween(R(0, 0, 10, 10), R(25, 40, 10, 10))).toEqual({
			x: 15,
			y: 30,
		});
		expect(gapBetween(R(0, 0, 10, 10), R(5, 5, 10, 10))).toEqual({
			x: 0,
			y: 0,
		});
		expect(gapBetween(R(0, 0, 10, 10), R(10, 0, 10, 10))).toEqual({
			x: 0,
			y: 0,
		});
		// overlap on x only → x gap 0, y gap real
		expect(gapBetween(R(0, 0, 10, 10), R(5, 30, 10, 10))).toEqual({
			x: 0,
			y: 20,
		});
	});

	it('overlapArea / overlaps / containsRect', () => {
		expect(overlapArea(R(0, 0, 10, 10), R(5, 5, 10, 10))).toBe(25);
		expect(overlapArea(R(0, 0, 10, 10), R(20, 20, 10, 10))).toBe(0);
		expect(overlaps(R(0, 0, 10, 10), R(5, 5, 10, 10))).toBe(true);
		expect(overlaps(R(0, 0, 10, 10), R(10, 10, 10, 10))).toBe(false);
		expect(containsRect(R(0, 0, 30, 30), R(5, 5, 10, 10))).toBe(true);
		expect(containsRect(R(0, 0, 30, 30), R(0, 0, 30, 30))).toBe(true);
		expect(containsRect(R(5, 5, 10, 10), R(0, 0, 30, 30))).toBe(false);
	});
});

describe('measure', () => {
	const a = R(0, 0, 10, 10);
	const b = R(20, 0, 10, 10);

	it('computes all fields by default', () => {
		const r = measure(a, b);
		expect(r.pointA).toEqual({ x: 5, y: 5 });
		expect(r.pointB).toEqual({ x: 25, y: 5 });
		expect(r.dx).toBe(-20);
		expect(r.dy).toBe(0);
		expect(r.distance).toBe(20);
		expect(r.gapX).toBe(10);
		expect(r.gapY).toBe(0);
		expect(r.angleDeg).toBeCloseTo(180);
		expect(r.angleRad).toBeCloseTo(Math.PI);
		expect(r.width).toBe(10);
		expect(r.height).toBe(10);
		expect(r.overlaps).toBe(false);
		expect(r.overlapArea).toBe(0);
		expect(r.contains).toBe(false);
		expect(r.visible).toBe(true);
		expect(r.target).toBe(a);
		expect(r.source).toBe(b);
	});

	it('honors anchor / ofAnchor', () => {
		const r = measure(a, b, { anchor: 'tl', ofAnchor: 'br' });
		expect(r.pointA).toEqual({ x: 0, y: 0 });
		expect(r.pointB).toEqual({ x: 30, y: 10 });
		expect(r.dx).toBe(-30);
		expect(r.dy).toBe(-10);
	});

	it('computes only requested fields', () => {
		const r = measure(a, b, { fields: ['dx', 'gapX'] });
		expect(r.dx).toBe(-20);
		expect(r.gapX).toBe(10);
		expect(r.dy).toBeUndefined();
		expect(r.distance).toBeUndefined();
		expect(r.pointA).toEqual({ x: 5, y: 5 });
		expect(r.pointB).toEqual({ x: 25, y: 5 });
	});

	it('detects containment and visibility', () => {
		const r = measure(R(0, 0, 100, 100), R(10, 10, 10, 10), {
			fields: ['contains', 'overlaps'],
		});
		expect(r.contains).toBe(true);
		expect(r.overlaps).toBe(true);
		expect(
			measure(R(50_000, 50_000, 10, 10), b, { fields: ['visible'] }).visible,
		).toBe(false);
	});

	it('visible respects document space', () => {
		Object.defineProperty(window, 'scrollX', {
			value: 100,
			configurable: true,
		});
		Object.defineProperty(window, 'scrollY', {
			value: 100,
			configurable: true,
		});
		try {
			const opts = { space: 'document' as const, fields: ['visible'] as const };
			expect(measure(R(100, 100, 10, 10), b, opts).visible).toBe(true);
			expect(measure(R(0, 0, 10, 10), b, opts).visible).toBe(false);
		} finally {
			Object.defineProperty(window, 'scrollX', {
				value: 0,
				configurable: true,
			});
			Object.defineProperty(window, 'scrollY', {
				value: 0,
				configurable: true,
			});
		}
	});
});

describe('calipers', () => {
	it('measures N targets against one source', () => {
		const results = calipers(
			[R(0, 0, 10, 10), R(0, 20, 10, 10)],
			R(20, 0, 10, 10),
			{
				fields: ['dx', 'dy'],
			},
		);
		expect(results).toHaveLength(2);
		expect(results[0].dx).toBe(-20);
		expect(results[0].dy).toBe(0);
		expect(results[1].dx).toBe(-20);
		expect(results[1].dy).toBe(20);
	});

	it('expands selector strings to all matches', () => {
		document.body.innerHTML =
			'<i class="m"></i><i class="m"></i><i class="m"></i>';
		const results = calipers('.m', R(0, 0, 10, 10), { fields: ['dx'] });
		expect(results).toHaveLength(3);
		expect(results[0].target).toBeInstanceOf(Element);
		document.body.innerHTML = '';
		vi.restoreAllMocks();
	});
});
