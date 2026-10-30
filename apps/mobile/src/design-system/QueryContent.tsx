import type { PropsWithChildren } from 'react';
import { Button, Empty, Loading, Notice } from './ui';
export function QueryContent({
  loading,
  error,
  empty,
  retry,
  children,
}: PropsWithChildren<{ loading: boolean; error: boolean; empty?: boolean; retry: () => void }>) {
  if (loading) return <Loading />;
  if (error)
    return (
      <>
        <Notice tone="error">Không tải được dữ liệu. Nội dung của bạn vẫn được giữ lại.</Notice>
        <Button title="Thử lại" onPress={retry} />
      </>
    );
  if (empty) return <Empty />;
  return <>{children}</>;
}
