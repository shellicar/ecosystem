import type { VersionInfo } from '@shellicar/build-version/types';
import version from '@shellicar/build-version/version';
import { z } from 'zod';

const testVersion = (v: VersionInfo) => {
  const schema = z.object({
    buildDate: z.iso.datetime(),
    branch: z.string().min(1),
    sha: z.string().length(40),
    shortSha: z.string().length(7),
    commitDate: z.string().min(1),
    version: z.string().min(1),
  });
  console.log(schema.parse(v));
};

testVersion(version);
