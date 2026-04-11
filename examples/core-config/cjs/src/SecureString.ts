import { createFactory } from '@shellicar/core-config';

const factory = createFactory();
const secret = factory.string('myPassword123');

console.log(secret.toString());
// sha256:71d4ec024886c1c8e4707fb02b46fd568df44e77dd5055cadc3451747f0f2716

console.log(JSON.stringify({ secret }));
// {"secret":"sha256:71d4ec024886c1c8e4707fb02b46fd568df44e77dd5055cadc3451747f0f2716"}
