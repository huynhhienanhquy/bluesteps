import { useRef, useState } from 'react';
import { Switch, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Field, Icon, Label, Notice } from '../../design-system/ui';
import { Artwork } from '../../design-system/DesignScreen';
import { useApp } from '../../providers';
import { useCommand, useResource } from '../../services/queries';
import type { Schemas } from '../../services/api';
import { CommandError, QueryState, RequireAuth } from './common';
import { HandbookPage, MaterialPicture, ReferenceSources, RelatedMaterials } from './HandbookParts';
import { parseSortingWeight, sortingWeightError } from './sorting-weight';
import { CollectionMaterialLink } from './CollectionMaterialLink';

export function WasteDetailScreen() {
  const { id = '', mode, fromScan } = useLocalSearchParams<{
    id?: string;
    mode?: string;
    fromScan?: string;
  }>();
  const { user } = useApp();
  return (
    <WasteGuide key={`${user?.id ?? 'guest'}:${id}`} id={id} mode={mode} fromScan={fromScan === 'manual'} />
  );
}

function WasteGuide({ id, mode, fromScan }: { id: string; mode?: string; fromScan: boolean }) {
  const guide = useResource<Schemas['WasteGuide']>(`/v1/waste-items/${id}/guide`);
  const command = useCommand<Schemas['SortingResponse']>({ feedback: true });
  const [weight, setWeight] = useState('');
  const [weightError, setWeightError] = useState('');
  const saving = useRef(false);
  const data = guide.data;
  const donts = mode === 'donts';
  return (
    <HandbookPage
      title="BlueSteps"
      hero={
        <View style={{ alignItems: 'center' }}>
          {data?.item.handbookKind === 'plastic' ? (
            <Artwork
              source={require('../../../assets/images/handbook/waste-guide/waste-guide-illustration.png')}
              width={220}
              height={140}
            />
          ) : (
            <MaterialPicture kind={data?.item.handbookKind} size={130} />
          )}
        </View>
      }
    >
      <QueryState query={guide}>
        {data ? (
          <>
            <View
              style={{
                marginHorizontal: -18,
                marginTop: -18,
                padding: 22,
                backgroundColor: '#71B0D3',
                borderTopLeftRadius: 40,
                borderTopRightRadius: 40,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <Label size={25} bold heading color="#000000" style={{ flex: 1 }}>
                {data.item.name}
              </Label>
              <View style={{ alignItems: 'center', gap: 4 }}>
                <Switch
                  accessibilityLabel="Xem điều không nên làm"
                  value={donts}
                  onValueChange={(value) => router.setParams({ mode: value ? 'donts' : undefined })}
                />
                <Label size={11} color="#000000">
                  {donts ? 'Không nên' : 'Nên làm'}
                </Label>
              </View>
            </View>
            <Label size={13}>
              {data.item.material} · {data.item.category}
            </Label>
            {data.item.hazardous ? (
              <Notice tone="warning">
                Vật liệu cần xử lý riêng. Liên hệ đơn vị tiếp nhận chuyên biệt.
              </Notice>
            ) : null}
            <Label size={20} bold heading>
              {donts ? 'Không nên làm' : 'Hướng dẫn phân loại'}
            </Label>
            {((donts ? data.details.donts : data.details.dos) ?? []).map((line, index) => (
              <View
                key={index}
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: 14,
                  paddingVertical: 6,
                }}
              >
                <Icon
                  name={donts ? 'close-circle-outline' : 'repeat-outline'}
                  size={26}
                  color={donts ? '#C53030' : '#147CC1'}
                />
                <Label size={15} style={{ flex: 1, lineHeight: 24 }}>
                  {index + 1}. {line}
                </Label>
              </View>
            ))}
            {donts && !data.details.donts?.length ? (
              <Notice>Chưa có hướng dẫn “Không nên làm” được công bố cho vật phẩm này.</Notice>
            ) : null}
            {data.details.tips?.map((tip) => (
              <Label key={tip}>💡 {tip}</Label>
            ))}
            {data.details.decomposition ? (
              <View style={{ gap: 8 }}>
                <Label size={16} bold>
                  Thời gian phân hủy
                </Label>
                <Label>{data.details.decomposition.label}</Label>
                <Label size={12}>{data.details.decomposition.conditions}</Label>
              </View>
            ) : null}
            <RelatedMaterials kinds={data.details.relatedKinds ?? []} />
            <ReferenceSources sources={data.sources ?? data.item.sources} />
            <CollectionMaterialLink material={data.item.material} />
            <RequireAuth>
              {command.data ? (
                <Notice tone="success">
                  Đã lưu hành động. Điểm thưởng: {command.data.award.points}.
                </Notice>
              ) : (
                <>
                  <Field
                    label="Khối lượng đã cân (kg, không bắt buộc)"
                    value={weight}
                    onChangeText={(value) => {
                      setWeight(value);
                      setWeightError('');
                    }}
                    keyboardType="decimal-pad"
                    editable={!command.isPending}
                  />
                  <Label size={11}>Chỉ nhập khi bạn đã cân. Đây là khối lượng tự ghi nhận.</Label>
                  {weightError ? <Notice tone="error">{weightError}</Notice> : null}
                  <CommandError error={command.error} />
                  <Button
                    title="Ghi nhận đã phân loại"
                    pending={command.isPending}
                    onPress={() => {
                      if (saving.current) return;
                      const reportedWeightKg = parseSortingWeight(weight);
                      if (reportedWeightKg === null) {
                        setWeightError(sortingWeightError);
                        return;
                      }
                      saving.current = true;
                      void command.mutateAsync({
                        path: '/v1/sorting-actions',
                        body: {
                          source: 'manual',
                          itemId: id,
                          ...(reportedWeightKg ? { reportedWeightKg } : {}),
                        },
                      }).catch(() => {}).finally(() => { saving.current = false; });
                    }}
                  />
                </>
              )}
            </RequireAuth>
            {fromScan ? (
              <Button
                title="Quay lại phân loại rác"
                variant="secondary"
                disabled={command.isPending}
                onPress={() => (router.canGoBack() ? router.back() : router.replace('/scan'))}
              />
            ) : null}
          </>
        ) : null}
      </QueryState>
    </HandbookPage>
  );
}
