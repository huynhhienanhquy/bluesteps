import { router } from 'expo-router';
import { Button, Notice } from '../../design-system/ui';
import type { Page, Schemas } from '../../services/api';
import { useResource } from '../../services/queries';

export function CollectionMaterialLink({ material }: { material: string }) {
  const catalog = useResource<Page<Schemas['MaterialRef']>>('/v1/waste-materials');
  const name = material.trim().toLocaleLowerCase('vi-VN');
  const match = catalog.data?.items.find(
    (item) => item.name.trim().toLocaleLowerCase('vi-VN') === name,
  );
  return (
    <>
      <Button
        title={match ? `Xem điểm thu gom · ${match.name}` : 'Xem điểm thu gom'}
        pending={catalog.isPending && catalog.fetchStatus === 'fetching'}
        disabled={!match}
        onPress={() => {
          if (match) {
            router.push({
              pathname: '/collection',
              params: { materials: match.id, matchMode: 'all' },
            });
          }
        }}
      />
      {catalog.isError || catalog.fetchStatus === 'paused' ? (
        <>
          <Notice tone="error">Chưa tải được loại vật liệu để lọc điểm thu gom.</Notice>
          <Button title="Thử lại" variant="quiet" onPress={() => void catalog.refetch()} />
        </>
      ) : catalog.isSuccess && !match ? (
        <Notice>Chưa tìm thấy loại vật liệu tương ứng trong bộ lọc điểm thu gom.</Notice>
      ) : null}
    </>
  );
}
