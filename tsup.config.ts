import { defineConfig } from 'tsup';

export default defineConfig({
	entry: {
		index: 'src/index.ts',
		rect: 'src/rect/index.ts',
		measure: 'src/measure/index.ts',
		place: 'src/place/index.ts',
		align: 'src/align/index.ts',
	},
	format: ['esm'],
	dts: true,
	// No sourcemaps: they are several times the size of the code and
	// consumers of the library never need them.
	sourcemap: false,
	clean: true,
	treeshake: true,
	// Each entry is self-contained: importing one module never pulls a shared
	// chunk, so per-module size budgets stay honest.
	splitting: false,
});
