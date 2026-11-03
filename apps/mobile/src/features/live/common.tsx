import type { PropsWithChildren, ReactNode } from 'react';
import { router, useLocalSearchParams, usePathname } from 'expo-router';
import { useApp } from '../../providers';
import { Button, Empty, Loading, Notice } from '../../design-system/ui';
import { errorMessage } from '../../services/api';
import { safeAuthReturn, screenAddress } from '../../services/auth-return';

export function RequireAuth({ children }: PropsWithChildren) {
  const { status, sessionError, restore } = useApp();
  const pathname = usePathname();
  const params = useLocalSearchParams();
  const returnTo = safeAuthReturn(screenAddress(pathname, params));
  if (status === 'loading') return <Loading />;
  if (status === 'error')
    return (
      <>
        <Notice tone="error">{sessionError}</Notice>
        <Button title="Kết nối lại" onPress={() => void restore()} />
      </>
    );
  if (status !== 'authenticated')
    return (
      <Empty
        title="Đăng nhập để tiếp tục"
        detail="Dữ liệu cá nhân được lưu trong tài khoản của bạn."
        action="Đăng nhập"
        onPress={() => router.push({ pathname: '/login', params: returnTo ? { returnTo } : {} })}
      />
    );
  return <>{children}</>;
}

export function QueryState({
  query,
  children,
  empty = false,
  emptyText = 'Chưa có dữ liệu',
}: PropsWithChildren<{
  query: {
    isPending: boolean;
    isError: boolean;
    error: unknown;
    refetch: () => unknown;
    fetchStatus?: string;
  };
  empty?: boolean;
  emptyText?: string;
}>) {
  if (query.fetchStatus === 'paused')
    return <Notice tone="error">Không có kết nối mạng. Dữ liệu chưa được tải.</Notice>;
  if (query.isPending) return <Loading />;
  if (query.isError)
    return (
      <>
        <Notice tone="error">{errorMessage(query.error)}</Notice>
        <Button title="Thử lại" onPress={() => void query.refetch()} />
      </>
    );
  if (empty)
    return (
      <Empty
        title={emptyText}
        detail="Nội dung sẽ xuất hiện khi có dữ liệu được công bố trên hệ thống."
      />
    );
  return <>{children}</>;
}

export function CommandError({ error }: { error: unknown }) {
  return error ? <Notice tone="error">{errorMessage(error)}</Notice> : null;
}

export function More({
  query,
}: {
  query: { hasNextPage: boolean; isFetchingNextPage: boolean; fetchNextPage: () => unknown };
}) {
  return query.hasNextPage ? (
    <Button
      title="Xem thêm"
      pending={query.isFetchingNextPage}
      variant="secondary"
      onPress={() => void query.fetchNextPage()}
    />
  ) : null;
}

export function DataValue({
  value,
  children,
}: {
  value: unknown;
  children: (value: string) => ReactNode;
}) {
  return value === null || value === undefined ? null : <>{children(String(value))}</>;
}
