import { env } from 'node:process';
import { createFactory } from '@shellicar/core-config';
import { z } from 'zod';

const factory = createFactory();

env.MONGODB_URL = 'mongodb://user:myPassword123@localhost:27017/?authSource=admin';
env.API_KEY = 'myPassword123';
env.SQL_CONNECTION = 'Server=myserver;Database=mydb;User Id=admin;Password=myPassword123';

const envSchema = z.object({
  // MongoDB connection string with username/password
  MONGODB_URL: z.url().transform((x) => factory.url(new URL(x))),

  // API key for external service
  API_KEY: z
    .string()
    .min(1)
    .transform((x) => factory.string(x)),

  // SQL Server connection string
  SQL_CONNECTION: z.string().transform((x) => factory.connectionString(x)),
});

// Parse environment variables
const config = envSchema.parse(env);

// Values are now strongly typed and secured
console.log(config.MONGODB_URL.toString());
// mongodb://myuser:sha256%3A...@mongodb.example.com/

console.log(config.API_KEY.toString());
// sha256:...

console.log(config.SQL_CONNECTION.toString());
// Server=myserver;Database=mydb;User Id=admin;Password=sha256:...
