import { createFactory } from '@shellicar/core-config';

const factory = createFactory();

console.log(factory.string('myPassword123'));
console.log(factory.connectionString('Server=myserver.uri;Password=myPassword123'));
console.log(factory.url(new URL('http://myuser:myPassword123@myserver.uri')));
