// Size-budget gate: minifies each dist entry with esbuild, measures the
// brotli-compressed size, and fails when a budget in size-budgets.json is
// exceeded. Run after `pnpm build`.
import { existsSync, readFileSync } from 'node:fs';
import { brotliCompressSync } from 'node:zlib';
import { transformSync } from 'esbuild';

const budgetsUrl = new URL('../size-budgets.json', import.meta.url);
const budgets = JSON.parse(readFileSync(budgetsUrl, 'utf8'));

let failed = false;
for (const [file, budget] of Object.entries(budgets)) {
	const distUrl = new URL(`../dist/${file}`, import.meta.url);
	if (!existsSync(distUrl)) {
		console.error(`missing dist/${file} — run pnpm build first`);
		failed = true;
		continue;
	}
	const src = readFileSync(distUrl, 'utf8');
	const minified = transformSync(src, { loader: 'js', minify: true }).code;
	const size = brotliCompressSync(minified).length;
	const ok = size <= budget;
	console.log(
		`${ok ? 'PASS' : 'FAIL'}  dist/${file}  ${size} B (min+br)  budget ${budget} B`,
	);
	if (!ok) failed = true;
}

if (failed) {
	console.error('\nSize budget exceeded.');
	process.exit(1);
}
console.log('\nAll size budgets pass.');
