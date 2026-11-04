import type { QueryClient } from '@tanstack/react-query';

export const publicReferenceScope = 'public';

/** Discard account data without cancelling independent, unauthenticated reference loads. */
export async function resetSessionCache(client: QueryClient) {
  const personal = {
    predicate: (query: { queryKey: readonly unknown[] }) =>
      !(query.queryKey[0] === 'api' && query.queryKey[1] === publicReferenceScope),
  };
  await client.cancelQueries(personal);
  client.removeQueries(personal);
  client.getMutationCache().clear();
}
