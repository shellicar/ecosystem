/** Appends a value to the array bucket under `key`, creating the bucket on first use. */
export const pushBucket = <K, V>(map: Map<K, V[]>, key: K, value: V): void => {
  const bucket = map.get(key);
  if (bucket === undefined) {
    map.set(key, [value]);
  } else {
    bucket.push(value);
  }
};
