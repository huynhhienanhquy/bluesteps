import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Chip, Notice } from '../../design-system/ui';
import { useApp } from '../../providers';
import type { Page, Schemas } from '../../services/api';
import { usePages, useResource } from '../../services/queries';
import { More, QueryState } from './common';
import { EventFlowHeading, EventFlowText as Text } from './EventFlowParts';
import { eventTimeRange } from './event-time';
import { PrivateModal } from './PrivateModal';

/** Selecting a collection must not replace the reminder form and its unsaved settings. */
export function EventReminderCollectionPicker({
  available,
  selected,
  onApply,
  onClose,
}: {
  available: Schemas['GreenEvent'][];
  selected: string[];
  onApply: (ids: string[]) => void;
  onClose: () => void;
}) {
  const { colors } = useApp();
  const insets = useSafeAreaInsets();
  const collections = useResource<Page<Schemas['EventCollection']>>(
    '/v1/me/event-collections',
    true,
  );
  const [collectionId, setCollectionId] = useState<string | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const all = collections.data?.items ?? [];
  const active = all.find((item) => item.id === collectionId) ?? all[0];
  const events = usePages<Schemas['GreenEvent']>(
    `/v1/me/event-collections/${active?.id}/events`,
    true,
    !!active,
  );
  const availableIds = new Set(available.map((event) => event.id));
  const additions = picked.filter((id) => availableIds.has(id) && !selected.includes(id));
  const remaining = Math.max(0, 100 - selected.length);
  const items = (events.data?.pages.flatMap((page) => page.items) ?? []).filter((event) =>
    availableIds.has(event.id),
  );
  return (
    <PrivateModal transparent visible animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: '#172B3D55' }}>
        <View
          accessibilityViewIsModal
          style={{
            maxHeight: '85%',
            backgroundColor: colors.surface,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 24,
            paddingBottom: Math.max(24, insets.bottom),
            gap: 16,
          }}
        >
          <EventFlowHeading>Chọn thêm từ bộ sưu tập</EventFlowHeading>
          <Text size={12} color={colors.muted}>
            Đã chọn {selected.length} hoạt động. Bạn có thể chọn thêm {remaining} hoạt động để nhắc
            lịch.
          </Text>
          <ScrollView
            style={{ flexShrink: 1 }}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ gap: 16 }}
          >
            <QueryState query={collections}>
              {!all.length ? (
                <Notice>
                  Bạn chưa có bộ sưu tập. Đóng cửa sổ này để chọn trực tiếp từ danh sách hoạt động
                  đã lưu hoặc đăng ký.
                </Notice>
              ) : (
                <>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {all.map((collection) => (
                      <Chip
                        key={collection.id}
                        label={collection.name}
                        selected={active?.id === collection.id}
                        onPress={() => setCollectionId(collection.id)}
                      />
                    ))}
                  </View>
                  <QueryState query={events}>
                    {!items.length ? (
                      <Notice>
                        {events.hasNextPage
                          ? 'Chưa có hoạt động phù hợp trong phần đã tải. Xem thêm để tiếp tục chọn.'
                          : 'Bộ sưu tập này không có hoạt động còn diễn ra để nhắc lịch.'}
                      </Notice>
                    ) : null}
                    {items.map((event) => {
                      const alreadySelected = selected.includes(event.id);
                      const checked = alreadySelected || additions.includes(event.id);
                      const disabled =
                        alreadySelected || (!checked && additions.length >= remaining);
                      return (
                        <Pressable
                          key={event.id}
                          accessibilityRole="checkbox"
                          accessibilityLabel={event.title}
                          accessibilityState={{ checked, disabled }}
                          disabled={disabled}
                          onPress={() =>
                            setPicked((current) => {
                              if (current.includes(event.id))
                                return current.filter((id) => id !== event.id);
                              const eligible = current.filter(
                                (id) => availableIds.has(id) && !selected.includes(id),
                              );
                              return eligible.length < remaining
                                ? [...eligible, event.id]
                                : current;
                            })
                          }
                          style={{
                            minHeight: 52,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 12,
                            opacity: alreadySelected ? 0.65 : 1,
                          }}
                        >
                          <View
                            style={{
                              width: 22,
                              height: 22,
                              borderWidth: 1.5,
                              borderColor: checked ? colors.primary : colors.border,
                              backgroundColor: checked ? colors.primary : colors.surface,
                              borderRadius: 6,
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {checked ? <Text color="#FFFFFF">✓</Text> : null}
                          </View>
                          <View style={{ flex: 1, gap: 3 }}>
                            <Text>{event.title}</Text>
                            <Text size={12} color={colors.muted}>
                              {eventTimeRange(event)}
                              {alreadySelected ? ' · Đã có trong lịch nhắc' : ''}
                            </Text>
                          </View>
                        </Pressable>
                      );
                    })}
                    <More query={events} />
                  </QueryState>
                </>
              )}
            </QueryState>
          </ScrollView>
          <Button
            title={`Thêm ${additions.length} hoạt động`}
            disabled={!additions.length || additions.length > remaining}
            onPress={() => onApply(additions)}
          />
          <Button title="Hủy" variant="quiet" onPress={onClose} />
        </View>
      </View>
    </PrivateModal>
  );
}
