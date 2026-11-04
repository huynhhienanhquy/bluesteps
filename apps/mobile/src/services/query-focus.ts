import { useCallback, useLayoutEffect, useRef } from 'react';
import { useFocusEffect } from 'expo-router';

type FocusQuery = {
  isEnabled: boolean;
  isStale: boolean;
  isPending: boolean;
  fetchStatus: string;
  refetch: (options: { cancelRefetch: boolean }) => Promise<unknown>;
};

/** Navigation focus should reuse fresh data and any fetch already in progress. */
export function useRefreshOnFocus(queries: readonly (FocusQuery | false)[]) {
  const current = useRef(queries);
  useLayoutEffect(() => {
    current.current = queries;
  });
  useFocusEffect(
    useCallback(() => {
      for (const query of current.current) {
        // Initial loads and newly enabled queries are fetched by their observer.
        if (
          query &&
          query.isEnabled &&
          query.isStale &&
          !query.isPending &&
          query.fetchStatus === 'idle'
        )
          void query.refetch({ cancelRefetch: false });
      }
    }, []),
  );
}
