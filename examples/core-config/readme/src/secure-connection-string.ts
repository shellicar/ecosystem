import { equal } from 'node:assert/strict';
import { createFactory } from '@shellicar/core-config';
import { secretSha, secretString } from './constants';

const factory = createFactory();
const s = factory.connectionString(`Host=abc.com;Key=${secretString}`);
equal(`${s}`, `Host=abc.com;Key=${secretSha}`);
