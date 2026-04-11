import { equal } from 'node:assert';
import { createFactory } from '@shellicar/core-config';
import { secretHmac, secretKey, secretString } from './constants';

const factory = createFactory({ secret: secretKey });

const secret = factory.string(secretString);
equal(`${secret}`, secretHmac);

const connectionString = factory.connectionString(`Host=abc.com;Key=${secretString}`);
equal(`${connectionString}`, `Host=abc.com;Key=${secretHmac}`);

const secureUrl = factory.url(new URL(`https://:${secretString}@example.uri`));
equal(`${secureUrl}`, `https://:${encodeURIComponent(secretHmac)}@example.uri/`);
