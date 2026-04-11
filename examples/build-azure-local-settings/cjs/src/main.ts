export default async () => {
  console.log('Hello from CJS example!');
  console.log('Greeting:', process.env.GREETING_MESSAGE);
  console.log('Magic Number:', process.env.MAGIC_NUMBER);
  console.log('Awesome Feature:', process.env.FEATURE_FLAG_AWESOME);
};
