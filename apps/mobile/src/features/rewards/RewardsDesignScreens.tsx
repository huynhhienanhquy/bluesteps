import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button } from '../../design-system/ui';
import {
  RewardHit,
  RewardLayers,
  RewardsCanvas,
  rewardDesign,
  rewardSource,
  type RewardFrame,
  type RewardLayer,
} from './RewardsDesignParts';
import { useRewardsUi, type RewardChoice } from './RewardsUiProvider';

const goBack = () => (router.canGoBack() ? router.back() : router.replace('/rewards'));
function usePreviewFrame(fallback: RewardFrame, allowed: RewardFrame[]) {
  const { frame, preview } = useLocalSearchParams<{ frame?: string; preview?: string }>();
  return {
    frame: allowed.includes(frame as RewardFrame) ? (frame as RewardFrame) : fallback,
    sample: preview === '1',
  };
}
function liveText(balance: number, sample: boolean) {
  return (l: RewardLayer) => (!sample && l.text === '180 điểm' ? `${balance} điểm` : undefined);
}

export function RewardsWalletScreen() {
  const { state } = useRewardsUi();
  const { frame, sample } = usePreviewFrame('386:16253', ['386:11010', '386:16253', '386:16592']);
  return (
    <RewardsCanvas frame={frame} contentHeight={1725} replaceText={liveText(state.balance, sample)}>
      <RewardHit
        label="Cách quy đổi điểm"
        box={[352, 370, 72, 72]}
        onPress={() => router.push('/rewards/guide')}
      />
      <RewardHit
        label="Mở phần thưởng"
        box={[352, 461, 72, 72]}
        onPress={() => router.push('/rewards/catalog')}
      />
      <RewardHit
        label="Lịch sử điểm và quà"
        box={[352, 553, 72, 72]}
        onPress={() => router.push('/history')}
      />
      {frame !== '386:11010' ? (
        <>
          <RewardHit label="Quay lại" box={[12, 46, 44, 44]} onPress={goBack} />
          <RewardHit
            label="Tìm thêm điểm"
            box={[284, 116, 120, 34]}
            onPress={() => router.push('/scan')}
          />
        </>
      ) : null}
    </RewardsCanvas>
  );
}

export function RewardsGuideScreen() {
  const { state } = useRewardsUi();
  const { sample } = usePreviewFrame('386:11320', []);
  return (
    <RewardsCanvas frame="386:11320" replaceText={liveText(state.balance, sample)}>
      <RewardHit label="Quay lại" box={[12, 46, 44, 44]} onPress={goBack} />
      <RewardHit
        label="Đổi thưởng"
        box={[283, 792, 139, 45]}
        onPress={() => router.push('/rewards/catalog')}
      />
    </RewardsCanvas>
  );
}

const categoryFrames = {
  recycled: '386:11451',
  voucher: '386:13109',
  entertainment: '386:12823',
  other: '386:12956',
} as const;
type Category = keyof typeof categoryFrames;
const names: Record<Category, string[]> = {
  recycled: [
    'Chậu cây tái chế',
    'Ly tái chế Eco',
    'Túi vải canvas',
    'Xà phòng hữu cơ',
    'Móc khóa tái chế',
    'Bút bi thân nhựa',
    'Khung ảnh mini',
    'Hộp đựng tài liệu',
  ],
  voucher: [
    'Voucher Siêu thị 30k',
    'Voucher giảm giá 10%',
    'Voucher “Workshop tái chế nhựa”',
    'Voucher “1 tặng 1”',
  ],
  entertainment: ['Vé xem phim', 'Tham quan khu tái chế'],
  other: ['Bình nước thủy tinh', 'Bình giữ nhiệt mini', 'Khung ảnh mini', 'Hộp đựng tài liệu'],
};

function choices(frame: RewardFrame, category: Category): RewardChoice[] {
  const layers = rewardDesign[frame].layers;
  return names[category].flatMap((title) => {
    const text = layers.find((l) => l.text?.replace(/\s+/g, ' ').trim() === title && l.y > 500);
    if (!text) return [];
    const images = layers.filter(
      (l) =>
        l.kind === 'image' &&
        l.y < text.y &&
        l.y > text.y - 100 &&
        l.w > 90 &&
        l.w < 185 &&
        Math.abs(l.x - text.x) < 60,
    );
    const image = images.sort((a, b) => a.y - b.y).at(-1);
    const cost = layers.find(
      (l) =>
        l.text?.match(/^\d+ điểm$/) &&
        l.y > text.y &&
        l.y < text.y + 85 &&
        Math.abs(l.x - text.x) < 100,
    );
    return image?.key && cost?.text
      ? [{ title, cost: parseInt(cost.text, 10), frame, image: image.key }]
      : [];
  });
}

export function RewardsCatalogScreen() {
  const { state, claim, toggleReminder, redeem } = useRewardsUi();
  const [category, setCategory] = useState<Category>('recycled');
  const [overlay, setOverlay] = useState<'claim' | 'confirm' | 'success' | null>(null);
  const [choice, setChoice] = useState<RewardChoice | null>(null);
  const [notice, setNotice] = useState(false);
  const [menu, setMenu] = useState(false);
  const { frame: requested, sample } = usePreviewFrame('386:11451', [
    '386:11451',
    '386:11652',
    '386:11858',
    '386:12064',
    '386:12362',
    '386:12517',
    '386:12671',
    '386:12823',
    '386:12956',
    '386:13109',
  ]);
  const seededOverlay =
    requested === '386:12671'
      ? 'claim'
      : requested === '386:12517'
        ? 'confirm'
        : requested === '386:12362'
          ? 'success'
          : null;
  const [dismissedPreview, setDismissedPreview] = useState(false);
  const modal = overlay ?? (!dismissedPreview ? seededOverlay : null);
  const directCategory = Object.entries(categoryFrames).find(([, id]) => id === requested)?.[0] as
    Category | undefined;
  const [changedCategory, setChangedCategory] = useState(false);
  const activeCategory = changedCategory ? category : (directCategory ?? category);
  let frame: RewardFrame = categoryFrames[activeCategory];
  if (activeCategory === 'recycled') {
    if (state.reminder || (!dismissedPreview && requested === '386:11858')) frame = '386:11858';
    else if (state.claimed || (!dismissedPreview && requested === '386:11652')) frame = '386:11652';
  }
  if (modal)
    frame = modal === 'claim' ? '386:12671' : modal === 'confirm' ? '386:12517' : '386:12362';
  if (requested === '386:12064' && !dismissedPreview) frame = requested;
  const selected = choice ?? choices('386:11451', 'recycled')[0]!;
  const close = () => {
    setOverlay(null);
    setDismissedPreview(true);
  };
  const replaceText = (l: RewardLayer) => {
    if (sample) return undefined;
    if (!sample && l.text === '180 điểm') return `${state.balance} điểm`;
    if (l.text === 'Nhắc tôi' || l.text === 'Hủy lời nhắc')
      return state.reminder ? 'Hủy lời nhắc' : 'Nhắc tôi';
    if ((l.text === 'Nhận ngay 2 điểm' || l.text === 'Quay lại ngày mai nhé') && !sample)
      return state.claimed ? 'Quay lại ngày mai nhé' : 'Nhận ngay 2 điểm';
    if (modal === 'confirm' && l.text?.startsWith('Bạn đang có'))
      return `Bạn đang có ${state.balance} điểm. Quà "${selected.title}" cần ${selected.cost} điểm.`;
    if (modal === 'success' && l.text?.trim() === 'chậu cây tái chế') return selected.title;
    return undefined;
  };
  const replaceImage = (l: RewardLayer) =>
    !sample && modal === 'success' && l.kind === 'image' && l.y >= 310 && l.y < 330 && l.h > 100
      ? {
          source: rewardSource(selected.frame, selected.image),
          crop: rewardDesign[selected.frame as RewardFrame].layers.find(
            (photo) => photo.key === selected.image,
          )?.crop,
        }
      : undefined;
  const items = choices(frame, activeCategory);
  const height = modal
    ? 926
    : Math.max(
        810,
        ...rewardDesign[frame].layers
          .filter((l) => l.kind === 'text' && !l.navigation)
          .map((l) => l.y + l.h + 24),
      );
  return (
    <>
      <RewardsCanvas
        frame={frame}
        fixed={!!modal}
        contentHeight={height}
        replaceText={replaceText}
        replaceImage={replaceImage}
      >
        {modal ? (
          <>
            {modal === 'claim' ? (
              <>
                <RewardHit label="Đóng nhận thưởng" box={[296, 252, 36, 36]} onPress={close} />
                <RewardHit
                  label="Đổi quà sau nhận thưởng"
                  box={[154, 508, 120, 45]}
                  onPress={close}
                />
              </>
            ) : modal === 'confirm' ? (
              <>
                <RewardHit
                  label="Đổi ngay trong phiên UI"
                  box={[112, 470, 90, 40]}
                  disabled={state.balance < selected.cost}
                  onPress={() => {
                    redeem(selected);
                    setOverlay('success');
                    setDismissedPreview(true);
                  }}
                />
                <RewardHit label="Hủy đổi quà" box={[224, 470, 90, 40]} onPress={close} />
                {state.balance < selected.cost ? (
                  <Text
                    accessibilityRole="alert"
                    style={{
                      position: 'absolute',
                      left: 80,
                      top: 545,
                      width: 270,
                      textAlign: 'center',
                      color: '#9C2828',
                      backgroundColor: 'white',
                      padding: 10,
                      borderRadius: 12,
                    }}
                  >
                    Bạn chưa đủ điểm cho phần quà này.
                  </Text>
                ) : null}
              </>
            ) : (
              <RewardHit
                label="Nhận quà trong phiên UI"
                box={[152, 548, 125, 50]}
                onPress={close}
              />
            )}
          </>
        ) : frame === '386:12064' ? (
          <RewardHit
            label="Đóng thông báo nhắc thưởng"
            box={[13, 50, 403, 98]}
            onPress={() => setDismissedPreview(true)}
          />
        ) : (
          <>
            <RewardHit label="Quay lại" box={[12, 46, 44, 44]} onPress={goBack} />
            <RewardHit
              label="Tùy chọn phần thưởng"
              box={[377, 45, 40, 44]}
              onPress={() => setMenu(true)}
            />
            <RewardHit
              label="Lịch sử điểm và quà"
              box={[313, 115, 90, 34]}
              onPress={() => router.push('/history')}
            />
            <RewardHit
              label={state.reminder ? 'Hủy lời nhắc thưởng' : 'Nhắc tôi nhận thưởng'}
              box={[320, 159, 76, 31]}
              onPress={() => {
                toggleReminder();
                if (!state.reminder) setNotice(true);
              }}
            />
            <RewardHit
              label={state.claimed ? 'Đã nhận thưởng hôm nay' : 'Nhận ngay 2 điểm'}
              box={[99, 282, 230, 28]}
              disabled={state.claimed}
              onPress={() => {
                claim();
                setOverlay('claim');
                setDismissedPreview(true);
              }}
            />
            {(['recycled', 'voucher', 'entertainment', 'other'] as const).map((cat, i) => (
              <RewardHit
                key={cat}
                label={['Đồ tái chế', 'Voucher', 'Giải trí', 'Khác'][i]!}
                role="tab"
                selected={cat === activeCategory}
                box={
                  [
                    [41, 422, 96, 30],
                    [142, 422, 85, 30],
                    [232, 422, 72, 30],
                    [310, 422, 66, 30],
                  ][i]!
                }
                onPress={() => {
                  setCategory(cat);
                  setChangedCategory(true);
                  setDismissedPreview(true);
                }}
              />
            ))}
            {items.map((item) => {
              const title = rewardDesign[frame].layers.find(
                (l) => l.text?.replace(/\s+/g, ' ').trim() === item.title && l.y > 500,
              )!;
              return (
                <RewardHit
                  key={item.title}
                  label={`Đổi ${item.title}, ${item.cost} điểm`}
                  box={[title.x < 214 ? 30 : 222, title.y - 85, 177, 174]}
                  onPress={() => {
                    setChoice(item);
                    setOverlay('confirm');
                    setDismissedPreview(true);
                  }}
                />
              );
            })}
          </>
        )}
      </RewardsCanvas>
      <Modal
        visible={notice}
        transparent
        animationType="fade"
        onRequestClose={() => setNotice(false)}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Đóng thông báo nhắc thưởng"
          onPress={() => setNotice(false)}
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,.15)',
            alignItems: 'center',
            justifyContent: 'flex-start',
            paddingTop: 30,
          }}
        >
          <View style={{ width: '100%', maxWidth: 428, height: 215 }}>
            <RewardLayers frame="386:12064" />
          </View>
        </Pressable>
      </Modal>
      <Modal visible={menu} transparent animationType="slide" onRequestClose={() => setMenu(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,.25)' }}>
          <View
            style={{
              backgroundColor: 'white',
              padding: 24,
              gap: 12,
              borderTopLeftRadius: 25,
              borderTopRightRadius: 25,
            }}
          >
            <Text style={{ fontFamily: 'BackupInter_600SemiBold', fontSize: 20 }}>
              Điểm và phần thưởng
            </Text>
            <Button
              title="Cách quy đổi điểm"
              onPress={() => {
                setMenu(false);
                router.push('/rewards/guide');
              }}
            />
            <Button
              title="Xem ví điểm"
              onPress={() => {
                setMenu(false);
                router.push('/rewards');
              }}
            />
            <Button title="Đóng tùy chọn" variant="quiet" onPress={() => setMenu(false)} />
          </View>
        </View>
      </Modal>
    </>
  );
}

export function RewardsHistoryDesignScreen() {
  const { state } = useRewardsUi();
  const [filter, setFilter] = useState<'all' | 'month' | 'week'>('all');
  const [changed, setChanged] = useState(false);
  const map = { all: '386:12071', month: '386:12194', week: '386:12284' } as const;
  const { frame: requested, sample } = usePreviewFrame(map[filter], Object.values(map));
  const frame = changed ? map[filter] : requested;
  const max = Math.max(
    810,
    ...rewardDesign[frame].layers.filter((l) => l.kind === 'text').map((l) => l.y + l.h + 20),
  );
  return (
    <RewardsCanvas frame={frame} contentHeight={max} replaceText={liveText(state.balance, sample)}>
      <RewardHit label="Quay lại" box={[12, 46, 44, 44]} onPress={goBack} />
      <RewardHit
        label="Tìm thêm điểm"
        box={[285, 115, 119, 34]}
        onPress={() => router.push('/scan')}
      />
      {(['all', 'month', 'week'] as const).map((value, i) => (
        <RewardHit
          key={value}
          label={['Tất cả', 'Tháng này', 'Tuần này'][i]!}
          role="tab"
          selected={frame === map[value]}
          box={[38 + i * 121, 277, 110, 30]}
          onPress={() => {
            setFilter(value);
            setChanged(true);
          }}
        />
      ))}
    </RewardsCanvas>
  );
}
