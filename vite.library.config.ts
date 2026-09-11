import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
const pkg = JSON.parse(readFileSync(new URL('./package.json', `file://${process.cwd()}/`), 'utf8'));
const external = Object.keys({ ...pkg.dependencies, ...pkg.peerDependencies });
export default defineConfig({
  plugins: [react(), { name: 'css-types', generateBundle() {
    if (pkg.name !== '@formcraft/core') this.emitFile({type:'asset', fileName:'style.d.ts', source:'export {};\n'});
  }}],
  build: {
    lib: { entry: 'src/index.ts' + (pkg.name === '@formcraft/core' ? '' : 'x'), formats: ['es'], fileName: 'index', cssFileName: 'style' },
    rollupOptions: { external: (id) => external.some(name => id === name || id.startsWith(name + '/')) },
  },
});
