import { createFactory } from '@shellicar/core-config';

const factory = createFactory();
const conn = factory.connectionString('Server=myserver;Password=myPassword123');
console.log(conn.toString());
// Server=myserver;Password=sha256:71d4ec024886c1c8e4707fb02b46fd568df44e77dd5055cadc3451747f0f2716

// Custom secret keys
console.log(factory.connectionString('Server=myserver;SuperSecretKey=myPassword123', ['SuperSecretKey']));
// {
//   Server: 'myserver',
//   SuperSecretKey: 'sha256:71d4ec024886c1c8e4707fb02b46fd568df44e77dd5055cadc3451747f0f2716'
// }
