import { createFactory } from '@shellicar/core-config';

const factory = createFactory();
const url = new URL('https://user:myPassword123@example.com?key=value');
const secureUrl = factory.url(url);

console.log(secureUrl.toString());
// https://user@example.com/?key=value

console.log(secureUrl);
// {
//   href: 'https://user@example.com/',
//   password: 'sha256:71d4ec024886c1c8e4707fb02b46fd568df44e77dd5055cadc3451747f0f2716',
//   searchParams: { key: 'value' }
// }
