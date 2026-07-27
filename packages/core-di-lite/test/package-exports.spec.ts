import { resolve } from 'node:path';
import { describePackageExports } from '@shellicar/test-support/package-exports';

const srcDir = resolve(import.meta.dirname, '../src');

describePackageExports('@shellicar/core-di-lite', resolve(srcDir, 'index.ts'), [srcDir], import.meta.dirname);
