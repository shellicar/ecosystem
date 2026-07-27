import { resolve } from 'node:path';
import { describePackageExports } from '@shellicar/test-support/package-exports';

const srcDir = resolve(import.meta.dirname, '../src');
// This package re-exports named values straight from core-di-engine, so its
// declarations are part of "reality" too, not just this package's own src.
const engineSrcDir = resolve(srcDir, '../../core-di-engine/src');

describePackageExports('@shellicar/core-di', resolve(srcDir, 'index.ts'), [srcDir, engineSrcDir], import.meta.dirname);
