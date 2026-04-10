import type { DynamicFunction } from './types';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const dynamicFunction: DynamicFunction = async (name: string) => {
  console.log(`Hello ${name}`);
  await delay(1000);
  console.log(`Goodbye ${name}`);
};
