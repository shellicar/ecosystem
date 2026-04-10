export const main = async () => {
  const dynamic = await import('./dynamic.js');
  await dynamic.dynamicFunction('Bob');
};

await main();
