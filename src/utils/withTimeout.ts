// Force-rejette une promesse qui n'a pas répondu dans le délai imparti.
// Permet de débloquer l'UI si une requête Supabase reste en attente
// (projet en pause, réseau coupé, schema cache invalide, etc.).
export const withTimeout = <T>(promise: PromiseLike<T>, ms = 5000): Promise<T> =>
  Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`timeout after ${ms}ms`)), ms),
    ),
  ]);
