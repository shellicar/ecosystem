import { equal } from 'node:assert/strict';
import { createFactory } from '@shellicar/core-config';
import { secretSha, secretString } from './constants';

const factory = createFactory();
const s = factory.string(secretString);
equal(`${s}`, secretSha);
