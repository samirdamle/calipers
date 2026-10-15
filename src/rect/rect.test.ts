import { afterEach, describe, expect, it, vi } from 'vitest';
import { rectOf } from './index.js';

function mockOffset(
	el: HTMLElement,
	o: {
		left: number;
		top: number;
		width: number;
		height: number;
		parent: HTMLElement | null;
	},
) {
	const props = {
		offsetLeft: o.left,
		offsetTop: o.top,
		offsetWidth: o.width,
		offsetHeight: o.height,
		offsetParent: o.parent,
	};
	for (const [k, v] of Object.entries(props)) {
		Object.defineProperty(el, k, { value: v, configurable: true });
	}
}

function mockStyle(values: Record<string, string> = {}) {
	const base: Record<string, string> = {
		position: 'static',
		borderLeftWidth: '0px',
		borderRightWidth: '0px',
		borderTopWidth: '0px',
		borderBottomWidth: '0px',
		paddingLeft: '0px',
		paddingRight: '0px',
		paddingTop: '0px',
		paddingBottom: '0px',
		marginLeft: '0px',
		marginRight: '0px',
		marginTop: '0px',
		marginBottom: '0px',
		...values,
	};
	vi.spyOn(window, 'getComputedStyle').mockReturnValue(
		base as unknown as CSSStyleDeclaration,
	);
}

function mockScroll(x: number, y: number) {
	Object.defineProperty(window, 'scrollX', { value: x, configurable: true });
	Object.defineProperty(window, 'scrollY', { value: y, configurable: true });
}

function fakeDOMRect(
	x: number,
	y: number,
	width: number,
	height: number,
): DOMRect {
	return {
		x,
		y,
		width,
		height,
		top: y,
		left: x,
		right: x + width,
		bottom: y + height,
	} as DOMRect;
}

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
	mockScroll(0, 0);
});

describe('rectOf input normalization', () => {
	it('passes RectLike through as a copy', () => {
		const input = { x: 1, y: 2, width: 3, height: 4 };
		const out = rectOf(input);
		expect(out).toEqual(input);
		expect(out).not.toBe(input);
	});

	it('resolves "viewport" and window to the viewport rect', () => {
		const expected = {
			x: 0,
			y: 0,
			width: window.innerWidth,
			height: window.innerHeight,
		};
		expect(rectOf('viewport')).toEqual(expected);
		expect(rectOf(window)).toEqual(expected);
	});

	it('offsets the viewport rect by scroll in document space (#34)', () => {
		mockScroll(120, 80);
		expect(rectOf('viewport', { space: 'document' })).toEqual({
			x: 120,
			y: 80,
			width: window.innerWidth,
			height: window.innerHeight,
		});
		// viewport space is unaffected by scroll
		expect(rectOf('viewport', { space: 'viewport' })).toEqual({
			x: 0,
			y: 0,
			width: window.innerWidth,
			height: window.innerHeight,
		});
	});

	it('resolves a Point to a zero-size rect (#36)', () => {
		expect(rectOf({ x: 5, y: 7 })).toEqual({ x: 5, y: 7, width: 0, height: 0 });
	});

	it('resolves selectors (first match) and throws on no match', () => {
		document.body.innerHTML = '<div id="t1"></div>';
		const el = document.getElementById('t1') as HTMLElement;
		mockOffset(el, { left: 7, top: 8, width: 10, height: 10, parent: null });
		expect(rectOf('#t1')).toEqual({ x: 7, y: 8, width: 10, height: 10 });
		expect(() => rectOf('#nope')).toThrow(
			/no element matches selector "#nope"/,
		);
		document.body.innerHTML = '';
	});

	it('resolves array-likes by their first entry, throws when empty', () => {
		const el = document.createElement('div');
		mockOffset(el, { left: 1, top: 2, width: 3, height: 4, parent: null });
		expect(rectOf([el])).toEqual({ x: 1, y: 2, width: 3, height: 4 });
		document.body.innerHTML = '<div class="n"></div><div class="n"></div>';
		const list = document.querySelectorAll('.n');
		mockOffset(list[0] as HTMLElement, {
			left: 5,
			top: 5,
			width: 5,
			height: 5,
			parent: null,
		});
		expect(rectOf(list)).toEqual({ x: 5, y: 5, width: 5, height: 5 });
		expect(() => rectOf([])).toThrow(/empty list/);
		document.body.innerHTML = '';
	});
});

describe('rectOf boxes (HTML)', () => {
	it('border: accumulates the offset chain in document space', () => {
		const parent = document.createElement('div');
		const child = document.createElement('div');
		parent.appendChild(child);
		mockOffset(parent, {
			left: 5,
			top: 6,
			width: 200,
			height: 100,
			parent: null,
		});
		mockOffset(child, { left: 10, top: 20, width: 100, height: 50, parent });
		expect(rectOf(child)).toEqual({ x: 15, y: 26, width: 100, height: 50 });
	});

	it('content: insets the border box by border and padding', () => {
		const el = document.createElement('div');
		mockOffset(el, { left: 10, top: 20, width: 100, height: 50, parent: null });
		mockStyle({
			borderLeftWidth: '2px',
			borderRightWidth: '2px',
			borderTopWidth: '2px',
			borderBottomWidth: '2px',
			paddingLeft: '3px',
			paddingRight: '3px',
			paddingTop: '3px',
			paddingBottom: '3px',
		});
		expect(rectOf(el, { box: 'content' })).toEqual({
			x: 15,
			y: 25,
			width: 90,
			height: 40,
		});
	});

	it('margin: outsets the border box by margins', () => {
		const el = document.createElement('div');
		mockOffset(el, { left: 10, top: 20, width: 100, height: 50, parent: null });
		mockStyle({
			marginLeft: '4px',
			marginRight: '4px',
			marginTop: '4px',
			marginBottom: '4px',
		});
		expect(rectOf(el, { box: 'margin' })).toEqual({
			x: 6,
			y: 16,
			width: 108,
			height: 58,
		});
	});

	it('visual: uses getBoundingClientRect, transforms included', () => {
		const el = document.createElement('div');
		vi.spyOn(el, 'getBoundingClientRect').mockReturnValue(
			fakeDOMRect(40, 50, 100, 60),
		);
		expect(rectOf(el, { box: 'visual' })).toEqual({
			x: 40,
			y: 50,
			width: 100,
			height: 60,
		});
	});

	it('bbox on HTML falls back to the border box', () => {
		const el = document.createElement('div');
		mockOffset(el, { left: 3, top: 4, width: 30, height: 40, parent: null });
		expect(rectOf(el, { box: 'bbox' })).toEqual(rectOf(el, { box: 'border' }));
	});
});

describe('rectOf spaces', () => {
	it('converts layout boxes from document to viewport space', () => {
		const el = document.createElement('div');
		mockOffset(el, { left: 10, top: 20, width: 100, height: 50, parent: null });
		mockScroll(30, 40);
		expect(rectOf(el, { space: 'document' })).toEqual({
			x: 10,
			y: 20,
			width: 100,
			height: 50,
		});
		expect(rectOf(el, { space: 'viewport' })).toEqual({
			x: -20,
			y: -20,
			width: 100,
			height: 50,
		});
	});

	it('converts visual boxes from viewport to document space', () => {
		const el = document.createElement('div');
		vi.spyOn(el, 'getBoundingClientRect').mockReturnValue(
			fakeDOMRect(40, 50, 100, 60),
		);
		mockScroll(30, 40);
		expect(rectOf(el, { box: 'visual', space: 'document' })).toEqual({
			x: 70,
			y: 90,
			width: 100,
			height: 60,
		});
	});
});

describe('rectOf SVG', () => {
	function svgEl() {
		// Fake SVGGraphicsElement that stays instanceof Element (happy-dom lacks
		// a real one with getBBox).
		class FakeSVGGraphics extends Element {
			getBBox() {
				return { x: 1, y: 2, width: 3, height: 4 };
			}
			getBoundingClientRect() {
				return fakeDOMRect(10, 20, 30, 40);
			}
		}
		vi.stubGlobal('SVGGraphicsElement', FakeSVGGraphics);
		const el = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
		Object.setPrototypeOf(el, FakeSVGGraphics.prototype);
		return el;
	}

	it('bbox returns local user units, ignoring space', () => {
		expect(rectOf(svgEl(), { box: 'bbox' })).toEqual({
			x: 1,
			y: 2,
			width: 3,
			height: 4,
		});
		expect(rectOf(svgEl(), { box: 'bbox', space: 'document' })).toEqual({
			x: 1,
			y: 2,
			width: 3,
			height: 4,
		});
	});

	it('other boxes use the screen rect with space conversion', () => {
		mockScroll(5, 5);
		expect(rectOf(svgEl())).toEqual({ x: 10, y: 20, width: 30, height: 40 });
		expect(rectOf(svgEl(), { space: 'document' })).toEqual({
			x: 15,
			y: 25,
			width: 30,
			height: 40,
		});
	});
});
