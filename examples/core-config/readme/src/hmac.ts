import { equal } from 'node:assert/strict';
import { createFactory } from '@shellicar/core-config';
import { secretHmac, secretKey, secretString } from './constants';

const factory = createFactory({ secret: secretKey });
const secureString = factory.string(secretString);
const secureConnectionString = factory.connectionString(`Host=abc.com;Key=${secretString}`);
const secureURL = factory.url(new URL(`http://:${secretString}@example.uri/`));

equal(`${secureString}`, secretHmac);
equal(`${secureConnectionString}`, `Host=abc.com;Key=${secretHmac}`);
equal(`${secureURL}`, `http://:${encodeURIComponent(secretHmac)}@example.uri/`);
