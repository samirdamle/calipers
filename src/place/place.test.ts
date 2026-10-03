import { describe, expect, it, vi } from 'vitest';
import { place } from './index.js';

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
	for (const [k, v] of Object.entries({
		offsetLeft: o.left,
		offsetTop: o.top,
		offsetWidth: o.width,
		offsetHeight: o.height,
		offsetParent: o.parent,
	})) {
		Object.defineProperty(el, k, { value: v, configurable: true });
	}
}

function mockStyle(values: Record<string, string> = {}) {
	const base: Record<string, string> = {
		position: 'static',
		translate: '',
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
	const spy = vi
		.spyOn(window, 'getComputedStyle')
		.mockReturnValue(base as unknown as CSSStyleDeclaration);
	return spy;
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

function translateOf(el: HTMLElement): string {
	return el.style.getPropertyValue('translate');
}

describe('place using transform (default)', () => {
	it('moves the anchor onto a raw point', () => {
		const el = document.createElement('div');
		vi.spyOn(el, 'getBoundingClientRect').mockReturnValue(
			fakeDOMRect(100, 100, 50, 40),
		);
		mockStyle();
		place(el, { anchor: 'tl', at: { x: 200, y: 200 } });
		expect(translateOf(el)).toBe('100px 100px');
		expect(el.style.left).toBe('');
		vi.restoreAllMocks();
	});

	it('accumulates over an existing translate and applies offset', () => {
		const el = document.createElement('div');
		vi.spyOn(el, 'getBoundingClientRect').mockReturnValue(
			fakeDOMRect(100, 100, 50, 40),
		);
		mockStyle({ translate: '10px 20px' });
		place(el, {
			anchor: 'cc',
			at: { x: 200, y: 200 },
			offset: { x: 5, y: -5 },
		});
		// cur cc = (125, 120); delta = (200 + 5 − 125, 200 − 5 − 120) = (80, 75); + prev (10, 20)
		expect(translateOf(el)).toBe('90px 95px');
		vi.restoreAllMocks();
	});

	it('targets an anchored measurable', () => {
		const el = document.createElement('div');
		vi.spyOn(el, 'getBoundingClientRect').mockReturnValue(
			fakeDOMRect(0, 0, 50, 40),
		);
		mockStyle();
		place(el, {
			anchor: 'tc',
			at: { anchor: 'bc', of: { x: 0, y: 0, width: 100, height: 100 } },
		});
		// target (50, 100); cur tc (25, 0) → delta (25, 100)
		expect(translateOf(el)).toBe('25px 100px');
		vi.restoreAllMocks();
	});

	it('defaults to the viewport center', () => {
		const el = document.createElement('div');
		vi.spyOn(el, 'getBoundingClientRect').mockReturnValue(
			fakeDOMRect(0, 0, 10, 10),
		);
		mockStyle();
		place(el);
		const cx = window.innerWidth / 2;
		const cy = window.innerHeight / 2;
		expect(translateOf(el)).toBe(`${cx}px ${cy}px`);
		vi.restoreAllMocks();
	});
});

describe('place using position', () => {
	it('sets left/top in the offsetParent frame', () => {
		const container = document.createElement('div');
		const el = document.createElement('div');
		container.appendChild(el);
		el.style.position = 'absolute';
		mockOffset(container, {
			left: 0,
			top: 0,
			width: 500,
			height: 500,
			parent: null,
		});
		mockOffset(el, {
			left: 0,
			top: 0,
			width: 100,
			height: 50,
			parent: container,
		});
		mockStyle({ position: 'absolute' });
		place(el, {
			anchor: 'cc',
			at: { anchor: 'cc', of: container },
			using: 'position',
		});
		// target (250, 250); anchor offset (50, 25) → left 200px, top 225px
		expect(el.style.left).toBe('200px');
		expect(el.style.top).toBe('225px');
		expect(translateOf(el)).toBe('');
		vi.restoreAllMocks();
	});

	it('upgrades static to absolute and accounts for margins', () => {
		const container = document.createElement('div');
		const el = document.createElement('div');
		container.appendChild(el);
		mockOffset(container, {
			left: 0,
			top: 0,
			width: 500,
			height: 500,
			parent: null,
		});
		mockOffset(el, {
			left: 0,
			top: 0,
			width: 100,
			height: 50,
			parent: container,
		});
		mockStyle({ position: 'static', marginLeft: '10px', marginTop: '5px' });
		place(el, { anchor: 'tl', at: { x: 300, y: 300 }, using: 'position' });
		expect(el.style.position).toBe('absolute');
		// left = 300 − 0 − 10 (margin), top = 300 − 0 − 5
		expect(el.style.left).toBe('290px');
		expect(el.style.top).toBe('295px');
		vi.restoreAllMocks();
	});

	it('positions fixed elements in the viewport frame', () => {
		const el = document.createElement('div');
		el.style.position = 'fixed';
		mockOffset(el, { left: 10, top: 20, width: 100, height: 50, parent: null });
		mockStyle({ position: 'fixed' });
		mockScroll(0, 0);
		place(el, { anchor: 'tl', at: { x: 100, y: 100 }, using: 'position' });
		expect(el.style.left).toBe('100px');
		expect(el.style.top).toBe('100px');
		vi.restoreAllMocks();
		mockScroll(0, 0);
	});
});
