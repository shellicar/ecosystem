import { createHash, createHmac } from 'node:crypto';

type HashAlgorithm = {
  hash: (x: string) => string;
  prefix: string;
};

const algorithms = {
  sha256: () => ({
    hash: (x: string) => createHash('sha256').update(x).digest('hex'),
    prefix: 'sha256',
  }),
  hs256: (secret: string) => ({
    hash: (x: string) => createHmac('sha256', secret).update(x).digest('hex'),
    prefix: 'hs256',
  }),
} as const;

const getAlgorithm = (secret: string | null): HashAlgorithm => {
  return secret == null ? algorithms.sha256() : algorithms.hs256(secret);
};

export const hash = (input: string, secret: string | null) => {
  const alg = getAlgorithm(secret);
  const hash = alg.hash(input);
  return `${alg.prefix}:${hash}`;
};
