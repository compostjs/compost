import { defineConfig } from 'vite';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

export default defineConfig(({ command }) => {
  if (command === 'serve') {
    // Dev mode: npm start
    return {
      server: {
        port: 8080
      }
    };
  }

  // Standalone build: npm run standalone
  // Bundles everything (including virtual-dom) into a single IIFE file
  return {
    build: {
      lib: {
        entry: './src/project/standalone.js',
        name: 'CompostStandalone',
        formats: ['iife'],
        fileName: () => `compost-${pkg.version}.js`
      },
      outDir: 'docs/releases',
      emptyOutDir: false,
      minify: false,
      rollupOptions: {
        output: {
          inlineDynamicImports: true
        }
      }
    }
  };
});
