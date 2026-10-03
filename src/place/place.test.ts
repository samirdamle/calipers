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

describe('place gap', () => {
	it('pushes the box away from the target along the anchor ray (transform)', () => {
		const el = document.createElement('div');
		vi.spyOn(el, 'getBoundingClientRect').mockReturnValue(
			fakeDOMRect(0, 0, 50, 40),
		);
		mockStyle();
		place(el, { anchor: 'tc', at: { x: 200, y: 200 }, gap: 10 });
		// cur tc = (25, 0); dir (0, +1); delta = (200 − 25, 200 + 10 − 0)
		expect(translateOf(el)).toBe('175px 210px');
		vi.restoreAllMocks();
	});

	it('applies per-axis gaps from tuples and objects', () => {
		for (const gap of [[5, 15], { x: 5, y: 15 }] as const) {
			const el = document.createElement('div');
			vi.spyOn(el, 'getBoundingClientRect').mockReturnValue(
				fakeDOMRect(0, 0, 50, 40),
			);
			mockStyle();
			place(el, { anchor: 'br', at: { x: 200, y: 200 }, gap });
			// cur br = (50, 40); dir (−1, −1); delta = (200 − 5 − 50, 200 − 15 − 40)
			expect(translateOf(el)).toBe('145px 145px');
			vi.restoreAllMocks();
		}
	});

	it('is a no-op with a center anchor', () => {
		const el = document.createElement('div');
		vi.spyOn(el, 'getBoundingClientRect').mockReturnValue(
			fakeDOMRect(0, 0, 50, 40),
		);
		mockStyle();
		place(el, { anchor: 'cc', at: { x: 200, y: 200 }, gap: 10 });
		// cur cc = (25, 20); dir (0, 0) → delta (175, 180), same as gap: 0
		expect(translateOf(el)).toBe('175px 180px');
		vi.restoreAllMocks();
	});

	it('applies in position mode', () => {
		const el = document.createElement('div');
		el.style.position = 'absolute';
		mockOffset(el, { left: 0, top: 0, width: 100, height: 50, parent: null });
		mockStyle({ position: 'absolute' });
		place(el, {
			anchor: 'tl',
			at: { x: 300, y: 300 },
			gap: 10,
			using: 'position',
		});
		// dir for 'tl' = (+1, +1); left = 300 + 10, top = 300 + 10
		expect(el.style.left).toBe('310px');
		expect(el.style.top).toBe('310px');
		vi.restoreAllMocks();
	});

	it('is idempotent: repeating the call is a no-op', () => {
		const el = document.createElement('div');
		// getBoundingClientRect reflects the live translate, like a browser.
		vi.spyOn(el, 'getBoundingClientRect').mockImplementation(() => {
			const t = el.style.getPropertyValue('translate').split(' ');
			const x = parseFloat(t[0]) || 0;
			const y = parseFloat(t[1]) || 0;
			return fakeDOMRect(x, y, 50, 40);
		});
		vi.spyOn(window, 'getComputedStyle').mockImplementation(
			(target: Element) =>
				({
					position: 'static',
					translate:
						(target as HTMLElement).style.getPropertyValue('translate') ||
						'none',
				}) as unknown as CSSStyleDeclaration,
		);
		place(el, { anchor: 'tc', at: { x: 200, y: 200 }, gap: 10 });
		expect(translateOf(el)).toBe('175px 210px');
		place(el, { anchor: 'tc', at: { x: 200, y: 200 }, gap: 10 });
		expect(translateOf(el)).toBe('175px 210px');
		vi.restoreAllMocks();
	});

	it('is exact on fractional layouts: target measured in visual space', () => {
		// True fractional layout (e.g. after a pointer drag with fractional
		// clientX/Y); offset* round to integers like real browsers, while
		// getBoundingClientRect() stays fractional.
		const boxB = document.createElement('div');
		const el = document.createElement('div');
		for (const [target, t] of [
			[boxB, { x: 320.49, y: 180.49, w: 150, h: 70 }],
			[el, { x: 60.49, y: 60.49, w: 120, h: 90 }],
		] as const) {
			for (const [k, v] of Object.entries({
				offsetLeft: Math.round(t.x),
				offsetTop: Math.round(t.y),
				offsetWidth: Math.round(t.w),
				offsetHeight: Math.round(t.h),
				offsetParent: null,
			})) {
				Object.defineProperty(target, k, { value: v, configurable: true });
			}
			// getBoundingClientRect stays fractional and reflects the live translate.
			vi.spyOn(target, 'getBoundingClientRect').mockImplementation(() => {
				const tr = target.style.getPropertyValue('translate').split(' ');
				return fakeDOMRect(
					t.x + (parseFloat(tr[0]) || 0),
					t.y + (parseFloat(tr[1]) || 0),
					t.w,
					t.h,
				);
			});
		}
		vi.spyOn(window, 'getComputedStyle').mockImplementation(
			(target: Element) =>
				({
					position: 'static',
					translate:
						(target as HTMLElement).style.getPropertyValue('translate') ||
						'none',
				}) as unknown as CSSStyleDeclaration,
		);
		place(el, {
			anchor: 'br',
			at: { anchor: 'tl', of: boxB },
			gap: { x: 50, y: 20 },
		});
		// The on-screen anchor must land exactly on target + gap.
		const v = el.getBoundingClientRect();
		expect(v.right).toBeCloseTo(320.49 - 50, 10);
		expect(v.bottom).toBeCloseTo(180.49 - 20, 10);
		vi.restoreAllMocks();
	});
});
