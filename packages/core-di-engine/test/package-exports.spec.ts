import { resolve } from 'node:path';
import { describePackageExports } from '@shellicar/test-support/package-exports';

describePackageExports('@shellicar/core-di-engine', resolve(import.meta.dirname, '../src/index.ts'), import.meta.dirname);
