const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

const resolvePlugin = {
  name: 'resolve',
  setup(build) {
    build.onResolve({ filter: /^\.\.?\/.*/ }, args => {
      const resolved = path.resolve(args.resolveDir, args.path);
      
      // Проверяем директорию
      if (fs.existsSync(resolved)) {
        const stat = fs.statSync(resolved);
        if (stat.isDirectory()) {
          const indexFiles = ['index.ts', 'index.js'];
          for (const indexFile of indexFiles) {
            const indexPath = path.join(resolved, indexFile);
            if (fs.existsSync(indexPath)) {
              return { path: indexPath };
            }
          }
        } else if (stat.isFile()) {
          return { path: resolved };
        }
      }
      
      // Пробуем добавить расширения к файлам
      const extensions = ['.ts', '.js'];
      for (const ext of extensions) {
        const fullPath = resolved + ext;
        if (fs.existsSync(fullPath)) {
          return { path: fullPath };
        }
      }
      
      return null;
    });
  },
};

esbuild.build({
  entryPoints: ['src/ide/vscode/extension.ts'],
  bundle: true,
  outfile: 'out/extension.js',
  external: ['vscode'],
  format: 'cjs',
  platform: 'node',
  sourcemap: true,
  plugins: [resolvePlugin],
  resolveExtensions: ['.ts', '.js'],
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
