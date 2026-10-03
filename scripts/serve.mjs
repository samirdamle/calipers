// Minimal static file server for the demo playground:
//   pnpm demo   → builds, then serves the repo at http://localhost:8080
// The demo page lives at /demo/ and imports ../dist/*.js, so the server
// root must include both demo/ and dist/.

import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';

const root = resolve(process.argv[2] ?? '.');
const port = Number(process.argv[3] ?? 8080);
const types = {
	'.html': 'text/html',
	'.js': 'text/javascript',
	'.css': 'text/css',
	'.json': 'application/json',
	'.svg': 'image/svg+xml',
};

createServer(async (req, res) => {
	try {
		const urlPath = decodeURIComponent(req.url.split('?')[0]);
		const rel =
			urlPath === '/'
				? 'demo/index.html'
				: urlPath.endsWith('/')
					? `${urlPath}index.html`
					: urlPath;
		const file = normalize(join(root, rel));
		if (!file.startsWith(root + sep)) throw new Error('outside root');
		const data = await readFile(file);
		res.writeHead(200, {
			'Content-Type': types[extname(file)] ?? 'application/octet-stream',
		});
		res.end(data);
	} catch {
		res.writeHead(404);
		res.end('not found');
	}
}).listen(port, () => console.log(`demo at http://localhost:${port}`));
