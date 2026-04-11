import { equal } from 'node:assert/strict';
import { createFactory } from '@shellicar/core-config';
import { secretSha, secretString } from './constants';

const factory = createFactory();
const url = new URL(`https://:${secretString}@example.uri`);
const s = factory.url(url);
equal(`${s}`, `https://:${encodeURIComponent(secretSha)}@example.uri/`);
