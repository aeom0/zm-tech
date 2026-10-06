// Caché en memoria del isolate. Recorta lecturas repetidas a PostgREST
// (cada una cuenta en Log ingestion). No guarda fallos: el siguiente
// request vuelve a consultar.

type Entry<T> = { value: T; at: number };

export async function cachedLoad<T>(
  cache: Map<string, Entry<T>>,
  inflight: Map<string, Promise<T>>,
  key: string,
  ttlMs: number,
  load: () => Promise<{ value: T; store: boolean }>,
): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value;

  const pending = inflight.get(key);
  if (pending) return pending;

  const promise = load()
    .then((result) => {
      if (result.store) {
        cache.set(key, { value: result.value, at: Date.now() });
      }
      return result.value;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, promise);
  return promise;
}
