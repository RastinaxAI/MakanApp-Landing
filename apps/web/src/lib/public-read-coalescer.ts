/** Share only pending anonymous reads. Completed values/errors are never cached. */
export function createPublicReadCoalescer(limit = 128) {
  const pending = new Map<string, Promise<unknown>>();
  return async function read<T>(
    key: string,
    load: () => Promise<T>,
  ): Promise<T> {
    const existing = pending.get(key);
    if (existing) return existing as Promise<T>;
    if (pending.size >= limit) return load();
    const operation = load();
    pending.set(key, operation);
    try {
      return await operation;
    } finally {
      if (pending.get(key) === operation) pending.delete(key);
    }
  };
}

export const coalescePublicRead = createPublicReadCoalescer();
