import { describe, expect, it, vi } from 'vitest';
import { align, distribute, stack } from './index.js';

describe('stack', () => {
	it('stacks downward from a reference with a gap, centered', () => {
		mockStyle();
		const blue = box(100, 100, 50, 50); // bottom 150, center-x 125
		const reds = [box(0, 0), box(200, 0)];
		stack(reds, { to: blue, direction: 'b', gap: 10, align: 'c' });
		expect(reds.map(translateOf)).toEqual(['120px 160px', '-80px 180px']);
		vi.restoreAllMocks();
	});

	it('stacks upward from a source at the bottom', () => {
		mockStyle();
		const blue = box(100, 200, 50, 50); // top 200, center-x 125
		const reds = [box(0, 0), box(300, 50)];
		stack(reds, { to: blue, direction: 't', gap: 10, align: 'c' });
		// nearest the source first: the lower red goes directly above it
		expect(translateOf(reds[0])).toBe('120px 160px');
		expect(translateOf(reds[1])).toBe('-180px 130px');
		vi.restoreAllMocks();
	});

	it('stacks horizontally with lateral top alignment', () => {
		mockStyle();
		const blue = box(100, 100, 50, 50); // right 150, top 100
		const reds = [box(0, 0, 20, 10), box(0, 200, 20, 10)];
		stack(reds, { to: blue, direction: 'r', gap: 5, align: 't' });
		expect(reds.map(translateOf)).toEqual(['155px 100px', '180px -100px']);
		vi.restoreAllMocks();
	});

	it('aligns laterally to the anchor edges', () => {
		mockStyle();
		const blue = box(100, 100, 50, 50);
		const left = box(0, 0);
		const right = box(0, 0);
		stack([left], { to: blue, direction: 'b', gap: 0, align: 'l' });
		stack([right], { to: blue, direction: 'b', gap: 0, align: 'r' });
		expect(translateOf(left)).toBe('100px 150px');
		expect(translateOf(right)).toBe('140px 150px');
		vi.restoreAllMocks();
	});

	it('without `to`, seeds the trailing extreme and leaves it put', () => {
		mockStyle();
		const els = [box(0, 0), box(0, 100), box(0, 50)];
		stack(els, { direction: 'b', gap: 0 });
		// the topmost box is the seed and never moves
		expect(els.map(translateOf)).toEqual(['', '0px -80px', '0px -40px']);
		vi.restoreAllMocks();
	});

	it('is idempotent: repeating the same call is a no-op', () => {
		mockStyleLive();
		const blue = box(100, 100, 50, 50);
		const reds = [box(0, 0), box(200, 0)];
		stack(reds, { to: blue, direction: 'b', gap: 10 });
		const afterFirst = reds.map(translateOf);
		stack(reds, { to: blue, direction: 'b', gap: 10 });
		stack(reds, { to: blue, direction: 'b', gap: 10 });
		expect(reds.map(translateOf)).toEqual(afterFirst);
		vi.restoreAllMocks();
	});

	it('no-ops on empty lists', () => {
		mockStyle();
		expect(() => stack([], { direction: 't' })).not.toThrow();
		vi.restoreAllMocks();
	});
});

function mockOffset(
	el: HTMLElement,
	o: {
		left: number;
		top: number;
		width: number;
		height: number;
		parent?: HTMLElement | null;
	},
) {
	for (const [k, v] of Object.entries({
		offsetLeft: o.left,
		offsetTop: o.top,
		offsetWidth: o.width,
		offsetHeight: o.height,
		offsetParent: o.parent ?? null,
	})) {
		Object.defineProperty(el, k, { value: v, configurable: true });
	}
}

function mockStyle(values: Record<string, string> = {}) {
	vi.spyOn(window, 'getComputedStyle').mockReturnValue({
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
	} as unknown as CSSStyleDeclaration);
}

/**
 * getComputedStyle mock that reports each element's own inline translate,
 * like a real browser — so repeated calls see the previous call's movement.
 */
function mockStyleLive() {
	vi.spyOn(window, 'getComputedStyle').mockImplementation(
		(el: Element) =>
			({
				position: 'static',
				translate:
					(el as HTMLElement).style.getPropertyValue('translate') || 'none',
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
			}) as unknown as CSSStyleDeclaration,
	);
}

function translateOf(el: HTMLElement): string {
	return el.style.getPropertyValue('translate');
}

function box(left: number, top: number, width = 10, height = 10): HTMLElement {
	const el = document.createElement('div');
	mockOffset(el, { left, top, width, height });
	return el;
}

describe('align', () => {
	it('aligns edges to a reference element', () => {
		mockStyle();
		const blue = box(100, 100, 50, 50);
		const reds = [box(10, 0), box(30, 0), box(200, 0)];
		align(reds, 'left', { to: blue });
		expect(reds.map(translateOf)).toEqual([
			'90px 0px',
			'70px 0px',
			'-100px 0px',
		]);
		vi.restoreAllMocks();
	});

	it('aligns to a Rect reference (no element needed)', () => {
		mockStyle();
		const reds = [box(10, 0), box(30, 0)];
		align(reds, 'left', { to: { x: 100, y: 100, width: 50, height: 50 } });
		expect(reds.map(translateOf)).toEqual(['90px 0px', '70px 0px']);
		vi.restoreAllMocks();
	});

	it('aligns to a Point reference (#36)', () => {
		mockStyle();
		const reds = [box(10, 0), box(30, 0)];
		align(reds, 'left', { to: { x: 100, y: 0 } });
		expect(reds.map(translateOf)).toEqual(['90px 0px', '70px 0px']);
		vi.restoreAllMocks();
	});

	it('aligns right edges and bottoms to a reference', () => {
		mockStyleLive();
		const blue = box(100, 100, 50, 50); // right 150, bottom 150
		const reds = [box(10, 0, 20, 20)];
		align(reds, 'right', { to: blue });
		expect(translateOf(reds[0])).toBe('120px 0px');
		// The second call reads the real inline translate, as a browser would.
		align(reds, 'bottom', { to: blue });
		// translate accumulated: previous x stays, y moves 150 − 20 = 130
		expect(translateOf(reds[0])).toBe('120px 130px');
		vi.restoreAllMocks();
	});

	it('aligns to the selection extreme / mean without a reference', () => {
		mockStyle();
		const els = [box(10, 30), box(30, 10), box(200, 20)];
		align(els, 'top');
		expect(els.map(translateOf)).toEqual(['0px -20px', '', '0px -10px']);
		vi.restoreAllMocks();

		mockStyle();
		const els2 = [box(0, 0), box(90, 0), box(200, 0)]; // centers 5, 95, 205 → mean 101.67
		align(els2, 'center-x');
		const xs = els2.map((el) => parseFloat(translateOf(el).split(' ')[0]));
		expect(xs[0]).toBeCloseTo(96.67, 1);
		expect(xs[1]).toBeCloseTo(6.67, 1);
		expect(xs[2]).toBeCloseTo(-103.33, 1);
		vi.restoreAllMocks();
	});

	it('accumulates over an existing translate', () => {
		mockStyleLive();
		const blue = box(100, 0, 10, 10);
		const red = box(10, 0);
		red.style.setProperty('translate', '5px 7px');
		align([red], 'left', { to: blue });
		// red's rendered left is 10 + 5 = 15, so the delta is 85, not 90:
		// the visual edge must land exactly on the line.
		expect(translateOf(red)).toBe('90px 7px');
		vi.restoreAllMocks();
	});

	it('is idempotent: repeating the same call is a no-op', () => {
		mockStyleLive();
		const blue = box(100, 100, 50, 50);
		const reds = [box(10, 0), box(30, 0), box(200, 0)];
		align(reds, 'left', { to: blue });
		const afterFirst = reds.map(translateOf);
		expect(afterFirst).toEqual(['90px 0px', '70px 0px', '-100px 0px']);
		align(reds, 'left', { to: blue });
		align(reds, 'left', { to: blue });
		expect(reds.map(translateOf)).toEqual(afterFirst);
		vi.restoreAllMocks();
	});

	it('no-ops on empty lists', () => {
		mockStyle();
		expect(() => align([], 'left')).not.toThrow();
		vi.restoreAllMocks();
	});
});

describe('distribute', () => {
	it('spaces evenly with a fixed gap, in positional order', () => {
		mockStyle();
		const els = [box(100, 0), box(0, 0), box(50, 0)]; // given out of order
		distribute(els, 'x', { gap: 20 });
		// sorted: x=0 → stays (untouched); x=50 → 30; x=100 → 60
		expect(translateOf(els[0])).toBe('-40px 0px');
		expect(translateOf(els[1])).toBe('');
		expect(translateOf(els[2])).toBe('-20px 0px');
		vi.restoreAllMocks();
	});

	it('auto-computes even spacing across the span', () => {
		mockStyle();
		const els = [box(0, 0), box(30, 0), box(100, 0)]; // span 110, sizes 30 → gap 40
		distribute(els, 'x');
		expect(translateOf(els[0])).toBe('');
		expect(translateOf(els[1])).toBe('20px 0px');
		expect(translateOf(els[2])).toBe('');
		vi.restoreAllMocks();
	});

	it('distributes along y', () => {
		mockStyle();
		const els = [box(0, 0), box(0, 100)];
		distribute(els, 'y', { gap: 10 });
		expect(translateOf(els[0])).toBe('');
		expect(translateOf(els[1])).toBe('0px -80px');
		vi.restoreAllMocks();
	});

	it('is idempotent: repeating the same call is a no-op', () => {
		mockStyleLive();
		const els = [box(0, 0), box(30, 0), box(100, 0)];
		distribute(els, 'x');
		const afterFirst = els.map(translateOf);
		expect(afterFirst).toEqual(['', '20px 0px', '']);
		distribute(els, 'x');
		distribute(els, 'x');
		expect(els.map(translateOf)).toEqual(afterFirst);
		vi.restoreAllMocks();
	});

	it('no-ops with fewer than two elements', () => {
		mockStyle();
		expect(() => distribute([], 'x')).not.toThrow();
		expect(() => distribute([box(0, 0)], 'x')).not.toThrow();
		vi.restoreAllMocks();
	});
});
