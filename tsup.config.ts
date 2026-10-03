import { defineConfig } from 'tsup';

export default defineConfig({
	entry: {
		index: 'src/index.ts',
		rect: 'src/rect/index.ts',
		measure: 'src/measure/index.ts',
		place: 'src/place/index.ts',
		align: 'src/align/index.ts',
		fit: 'src/fit/index.ts',
		debug: 'src/debug/index.ts',
	},
	format: ['esm'],
	dts: true,
	sourcemap: true,
	clean: true,
	treeshake: true,
});
