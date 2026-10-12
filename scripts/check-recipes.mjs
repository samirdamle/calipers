// Recipe-snippet gate: extracts ```js / ```javascript fences from README.md and
// syntax-validates each with `node --check` (parse-only — DOM snippets can't
// execute in Node). A fence whose first non-empty line is `// recipes: skip`
// is exempt (e.g. intentional output annotations).
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');

const SKIP = '// recipes: skip';
const blocks = [];
const lines = readme.split('\n');
for (let i = 0; i < lines.length; i++) {
	const open = lines[i].match(/^```(js|javascript)\s*$/);
	if (!open) continue;
	const start = i + 1; // 1-based line of first code line
	const body = [];
	i++;
	for (; i < lines.length && !lines[i].startsWith('```'); i++)
		body.push(lines[i]);
	if (i >= lines.length) {
		console.error(`FAIL  unclosed fence at line ${start}`);
		process.exitCode = 1;
		break;
	}
	blocks.push({ start, code: body.join('\n') });
}

if (blocks.length === 0) {
	console.error('FAIL  no js fences found in README.md');
	process.exit(1);
}

const dir = mkdtempSync(join(tmpdir(), 'check-recipes-'));
let failed = false;
let checked = 0;
try {
	for (const { start, code } of blocks) {
		const first = code.split('\n').find((l) => l.trim() !== '');
		if (first && first.trim() === SKIP) {
			console.log(`SKIP  line ${start} (opt-out marker)`);
			continue;
		}
		// .mjs so top-level import/export parse as a module.
		const file = join(dir, `snippet-${start}.mjs`);
		writeFileSync(file, code + '\n');
		try {
			execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
			console.log(`PASS  line ${start}`);
			checked++;
		} catch (err) {
			failed = true;
			const detail = String(err.stderr || err.message)
				.trim()
				.split('\n')
				.slice(0, 4)
				.join('\n');
			console.error(`FAIL  line ${start}\n${detail}`);
		}
	}
} finally {
	rmSync(dir, { recursive: true, force: true });
}

console.log(
	`\n${checked} snippet(s) syntax-checked${failed ? ', with failures' : ''}.`,
);
if (failed) {
	console.error('README snippets have syntax errors.');
	process.exit(1);
}
