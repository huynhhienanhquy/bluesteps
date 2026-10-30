import { useQuery } from '@tanstack/react-query';
import { useApp } from '../providers';
import { readDemo, demoData, type Dataset } from './demo';

export function useDemoQuery<K extends Dataset>(dataset: K) {
  const { state } = useApp();
  type Item = (typeof demoData)[K][number];
  return useQuery({
    queryKey: ['demo', dataset, state],
    queryFn: ({ signal }) => readDemo<Item>(demoData[dataset] as Item[], signal, state),
  });
}
