export const main = async () => {
  const dynamic = await import('./dynamic.js');
  await dynamic.dynamicFunction('Bob');
};

main();
