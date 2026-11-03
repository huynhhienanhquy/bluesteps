import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { PrivateModal as Modal } from './PrivateModal';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Card, Icon, Label, Notice } from '../../design-system/ui';
import { useApp } from '../../providers';
import { usePages, useResource } from '../../services/queries';
import type { Schemas } from '../../services/api';
import { More, QueryState } from './common';
import {
  categoryNames,
  HandbookPage,
  MaterialPicture,
  ReferenceSources,
  RelatedMaterials,
  WasteTiles,
} from './HandbookParts';

export function HandbookCategoryScreen() {
  const {
    category = '',
    expanded,
    query: search = '',
  } = useLocalSearchParams<{
    category?: string;
    expanded?: string;
    query?: string;
  }>();
  const setSearch = (query: string) => router.setParams({ query });
  const { colors } = useApp();
  const guide = useResource<Schemas['HandbookGuide']>(
    `/v1/handbook/categories/${encodeURIComponent(category)}`,
  );
  const items = usePages<Schemas['WasteItem']>(
    `/v1/waste-items?category_key=${encodeURIComponent(category)}&q=${encodeURIComponent(search)}`,
  );
  const data = guide.data;
  const close = () => router.setParams({ expanded: undefined });
  return (
    <HandbookPage title="Sổ tay rác" search={search} setSearch={setSearch}>
      <QueryState query={guide}>
        {data ? (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Cách xử lý ${data.title}`}
              accessibilityState={{ expanded: expanded === '1' }}
              onPress={() => router.setParams({ expanded: expanded === '1' ? undefined : '1' })}
              style={{
                alignItems: 'center',
                padding: 20,
                borderRadius: 24,
                backgroundColor: colors.surface,
                gap: 12,
              }}
            >
              <Label size={23} bold heading>
                {data.title}
              </Label>
              <Label style={{ textAlign: 'center' }}>{data.summary}</Label>
              <Icon name="chevron-down" size={22} />
            </Pressable>
            {data.warning ? <Notice tone="warning">{data.warning}</Notice> : null}
            <RelatedMaterials kinds={data.relatedKinds ?? []} />
          </>
        ) : null}
      </QueryState>
      <Label size={20} bold heading>
        Vật phẩm trong nhóm
      </Label>
      <QueryState
        query={items}
        empty={!items.data?.pages[0]?.items.length}
        emptyText="Chưa có vật phẩm trong nhóm này"
      >
        <WasteTiles items={items.data?.pages.flatMap((page) => page.items) ?? []} />
        <More query={items} />
      </QueryState>
      {data ? <ReferenceSources sources={data.sources} reviewed={data.reviewedOn} /> : null}
      <Modal
        transparent
        animationType="none"
        visible={expanded === '1' && !!data}
        onRequestClose={close}
      >
        <View
          style={{ flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#435E6A66' }}
        >
          <ScrollView
            style={{
              maxHeight: '80%',
              flexGrow: 0,
              backgroundColor: colors.surface,
              borderRadius: 26,
            }}
            contentContainerStyle={{ padding: 24, gap: 16 }}
          >
            <Label size={22} bold heading>
              {data?.title}
            </Label>
            <Label size={18} bold>
              Cách xử lý:
            </Label>
            {data?.handling?.map((line) => (
              <Label key={line}>• {line}</Label>
            ))}
            {data?.example ? <Label>➜ {data.example}</Label> : null}
            <Button title="Đóng cách xử lý" variant="quiet" onPress={close} />
          </ScrollView>
        </View>
      </Modal>
    </HandbookPage>
  );
}

export function MaterialTypesScreen() {
  const { kind = '', entry: selected } = useLocalSearchParams<{ kind?: string; entry?: string }>();
  const { colors } = useApp();
  const [menu, setMenu] = useState(false);
  const guide = useResource<Schemas['HandbookGuide']>(
    `/v1/handbook/materials/${encodeURIComponent(kind)}`,
  );
  const data = guide.data;
  return (
    <HandbookPage
      title={data?.title ?? 'Các loại vật liệu'}
      action={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Danh mục vật liệu"
          onPress={() => setMenu((value) => !value)}
          style={{ padding: 8 }}
        >
          <Icon name="menu" color="#FFFFFF" size={26} />
        </Pressable>
      }
    >
      {menu ? (
        <Card>
          <RelatedMaterials kinds={['plastic', 'medical', 'bag', 'battery']} />
          <Button title="Về sổ tay" variant="quiet" onPress={() => router.push('/handbook')} />
        </Card>
      ) : null}
      <QueryState query={guide}>
        {data ? (
          <>
            {(data.entries ?? []).map((entry) => {
              const opened = selected === entry.code;
              return (
                <View
                  key={entry.code}
                  style={{
                    borderRadius: 16,
                    backgroundColor: '#EEF7FD',
                    boxShadow: '0px 4px 4px #0003',
                    overflow: 'hidden',
                  }}
                >
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Chi tiết ${entry.title}`}
                    accessibilityState={{ expanded: opened }}
                    onPress={() => router.setParams({ entry: opened ? undefined : entry.code })}
                    style={{
                      padding: 16,
                      minHeight: 110,
                      gap: 16,
                      alignItems: 'center',
                      flexDirection: 'row',
                    }}
                  >
                    <MaterialPicture
                      kind={kind}
                      code={kind === 'battery' ? entry.code : (entry.illustration ?? entry.code)}
                      size={90}
                    />
                    <View style={{ flex: 1, gap: 8 }}>
                      <Label size={22} bold color="#000000">
                        {entry.title}
                      </Label>
                      <Label size={13} color="#172B3D">
                        {entry.composition}
                      </Label>
                      {entry.decomposition ? (
                        <Label size={12} color="#334E61">
                          {entry.decomposition.label}
                        </Label>
                      ) : null}
                    </View>
                    <Icon name={opened ? 'chevron-up' : 'chevron-down'} size={18} />
                  </Pressable>
                  {opened ? (
                    <View style={{ padding: 18, gap: 12, backgroundColor: colors.surface }}>
                      {entry.examples?.length ? (
                        <Label>Ví dụ: {entry.examples.join(', ')}</Label>
                      ) : null}
                      {entry.handling?.map((line) => (
                        <Label key={line}>• {line}</Label>
                      ))}
                      {entry.decomposition?.conditions ? (
                        <Label size={12}>{entry.decomposition.conditions}</Label>
                      ) : null}
                      {entry.decomposition?.minimumYears != null &&
                      entry.decomposition.maximumYears != null ? (
                        <Label>
                          {entry.decomposition.minimumYears}–{entry.decomposition.maximumYears} năm
                        </Label>
                      ) : null}
                      <Button
                        title={`Tra vật phẩm ${entry.title}`}
                        variant="secondary"
                        onPress={() =>
                          router.push({
                            pathname: '/handbook/list',
                            params: { kind, query: entry.itemQuery ?? '' },
                          })
                        }
                      />
                    </View>
                  ) : null}
                </View>
              );
            })}
            <Label size={20} bold heading>
              Tóm tắt dễ hiểu
            </Label>
            <Label>{data.summary}</Label>
            {data.handling?.map((line) => (
              <Label key={line}>• {line}</Label>
            ))}
            {data.warning ? <Notice tone="warning">{data.warning}</Notice> : null}
            <Button
              title="Xem vật phẩm trong sổ tay"
              onPress={() => router.push({ pathname: '/handbook/list', params: { kind } })}
            />
            <RelatedMaterials kinds={data.relatedKinds ?? []} />
            <ReferenceSources sources={data.sources} reviewed={data.reviewedOn} />
          </>
        ) : null}
      </QueryState>
      <View style={{ gap: 8 }}>
        {Object.entries(categoryNames).map(([code, name]) => (
          <Button
            key={code}
            title={name}
            variant="quiet"
            onPress={() =>
              router.push({ pathname: '/handbook/category/[category]', params: { category: code } })
            }
          />
        ))}
      </View>
    </HandbookPage>
  );
}
