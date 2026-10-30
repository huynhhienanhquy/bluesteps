import {
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ComponentRef,
  type PropsWithChildren,
} from 'react';
import { Platform, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../providers';
import { Label, Notice } from '../../design-system/ui';
import { Artwork, DesignLink, StatusSpace } from '../../design-system/DesignScreen';
import { AccountButton } from './AccountLayout';
import {
  assets386_7148 as splash,
  assets386_7418 as welcome,
  assets386_7154 as reduce,
  assets386_7158 as reuse,
  assets386_7149 as recycle,
  assets386_7151 as interests,
  assets386_7156 as goals,
  assets386_7160 as nearby,
  assets386_7168 as reminders,
  assets386_7176 as ready,
} from '../../design-system/onboarding-assets';

const goalOptions = [
  {
    id: 'sorting',
    title: 'Phân loại rác mỗi ngày',
    detail: 'Bắt đầu từ một món đồ nhỏ',
    source: goals.imgIconRecycle,
  },
  {
    id: 'reduce',
    title: 'Giảm đồ nhựa dùng một lần',
    detail: 'Mang theo bình nước hoặc túi vải',
    source: goals.imgIconLeaf,
  },
  {
    id: 'community',
    title: 'Góp sức cùng cộng đồng',
    detail: 'Tham gia một hoạt động xanh',
    source: goals.imgIconStar,
  },
] as const;
const statuses = [
  splash,
  welcome,
  reduce,
  reuse,
  recycle,
  interests,
  goals,
  nearby,
  reminders,
  ready,
];
const primaryLabels = [
  '',
  'Bắt đầu hành trình',
  'Tiếp tục',
  'Thử phân loại rác',
  'Thiết lập trải nghiệm',
  'Tiếp tục',
  'Chọn mục tiêu này',
  'Cho phép vị trí',
  'Lưu lời nhắc',
  'Tạo tài khoản',
];
const secondaryLabels = [
  '',
  'Đã có tài khoản? Đăng nhập',
  'Bỏ qua giới thiệu',
  'Bỏ qua giới thiệu',
  'Để sau',
  'Tôi sẽ chọn sau',
  'Để sau',
  'Để sau',
  'Bỏ qua bước này',
  'Khám phá trước',
];

function IntroTitle({
  title,
  detail,
  size = 32,
  leading = 42,
}: {
  title: string;
  detail: string;
  size?: number;
  leading?: number;
}) {
  const { colors } = useApp();
  return (
    <View style={{ gap: 12 }}>
      <Label size={size} bold heading style={{ lineHeight: leading }}>
        {title}
      </Label>
      <Label size={15} color={colors.muted} style={{ lineHeight: 24 }}>
        {detail}
      </Label>
    </View>
  );
}
function ChoiceMark({
  selected,
  style,
}: {
  selected: boolean;
  style?: ComponentProps<typeof View>['style'];
}) {
  const { colors } = useApp();
  return (
    <View
      style={[
        {
          width: 25,
          height: 25,
          borderRadius: 13,
          backgroundColor: selected ? colors.brand : colors.mint,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      {selected ? (
        <Label size={15} bold color={colors.heroText} style={{ lineHeight: 21 }}>
          ✓
        </Label>
      ) : null}
    </View>
  );
}
function Block({ children, top }: PropsWithChildren<{ top: number }>) {
  return <View style={{ marginTop: top }}>{children}</View>;
}

export function OnboardingScreen() {
  const { colors, experience, setExperience } = useApp();
  const { step: requestedStep, preview } = useLocalSearchParams<{
    step?: string;
    preview?: string;
  }>();
  const [step, setStep] = useState(() => Math.min(9, Math.max(0, Number(requestedStep) || 0)));
  const [bin, setBin] = useState('');
  const [locationPreview, setLocationPreview] = useState(false);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const width = Math.min(428, useWindowDimensions().width) - 48;
  const ratio = width / 380;
  const insets = useSafeAreaInsets();
  useEffect(() => {
    if (step !== 0 || preview === '1') return;
    const timer = setTimeout(() => setStep(1), 1600);
    return () => clearTimeout(timer);
  }, [step, preview]);
  useEffect(() => {
    scroll.current?.scrollTo({ y: 0, animated: false });
  }, [step]);
  const go = (next: number) => setStep(Math.min(9, Math.max(0, next)));
  const figure = (source: ComponentProps<typeof Artwork>['source'], height: number) => (
    <Artwork source={source} width={width} height={height * ratio} />
  );
  const panel = {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 26,
  };
  const indicator = (inverse = false) =>
    Platform.OS === 'web' ? (
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          bottom: 16,
          width: 128,
          height: 5,
          borderRadius: 3,
          backgroundColor: inverse ? colors.heroText : colors.text,
          alignSelf: 'center',
        }}
      />
    ) : null;

  if (step === 0)
    return (
      <View style={{ flex: 1, backgroundColor: colors.brand }}>
        <StatusBar style="light" />
        <StatusSpace inverse source={splash.imgSongWiFiPin} iconWidth={78} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tiếp tục đến màn chào mừng"
          onPress={() => go(1)}
          style={{ flex: 1 }}
        >
          <Artwork
            source={splash.imgBiuTngMmXanh}
            width={width}
            height={300 * ratio}
            style={{ position: 'absolute', left: 24, top: 154 }}
          />
          <View style={{ position: 'absolute', left: 24, right: 24, top: 468, gap: 12 }}>
            <Label
              size={39}
              bold
              heading
              color={colors.heroText}
              style={{ lineHeight: 55, textAlign: 'center' }}
            >
              BlueSteps
            </Label>
            <Label
              size={11}
              weight="semibold"
              color="#E5F3FC"
              style={{ lineHeight: 16, textAlign: 'center' }}
            >
              BƯỚC NHỎ · THAY ĐỔI LỚN
            </Label>
          </View>
          <View
            style={{
              position: 'absolute',
              alignSelf: 'center',
              marginLeft: -12,
              top: 668,
              flexDirection: 'row',
              gap: 8,
            }}
          >
            {[0, 1, 2].map((index) => (
              <View
                key={index}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: index === 0 ? '#F3D581' : '#E5F3FC',
                  opacity: index === 0 ? 1 : 0.4,
                }}
              />
            ))}
          </View>
          <Label
            size={12}
            weight="medium"
            color="#E5F3FC"
            style={{
              position: 'absolute',
              left: 24,
              right: 24,
              top: 771,
              lineHeight: 18,
              textAlign: 'center',
            }}
          >
            Cùng bạn nuôi dưỡng hành tinh xanh
          </Label>
        </Pressable>
        {indicator(true)}
      </View>
    );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style="dark" />
      <StatusSpace source={statuses[step]!.imgSongWiFiPin} iconWidth={78} />
      {step >= 2 ? (
        <>
          <View
            style={{
              height: 48,
              marginTop: 23,
              marginHorizontal: 24,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Quay lại"
              onPress={() => go(step - 1)}
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                backgroundColor: colors.surface,
                justifyContent: 'center',
                paddingLeft: 14,
              }}
            >
              <Label size={30} weight="medium" style={{ lineHeight: 43 }}>
                ‹
              </Label>
            </Pressable>
            <Label
              size={12}
              weight="semibold"
              color={colors.muted}
              style={{ lineHeight: 17, flex: 1, textAlign: 'center' }}
            >
              {step <= 4 ? `KHÁM PHÁ 3R · ${step - 1}/3` : `DÀNH RIÊNG CHO BẠN · ${step - 4}/5`}
            </Label>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Bỏ qua"
              onPress={() => go(step <= 4 ? 5 : 9)}
              disabled={step === 9}
              style={{ width: 66, minHeight: 44, alignItems: 'flex-end', justifyContent: 'center' }}
            >
              <Label size={12} weight="semibold" color={colors.brand} style={{ lineHeight: 17 }}>
                {step === 9 ? '' : 'Bỏ qua'}
              </Label>
            </Pressable>
          </View>
          <View
            accessibilityRole="progressbar"
            accessibilityValue={{
              min: 0,
              max: step <= 4 ? 3 : 5,
              now: step <= 4 ? step - 1 : step - 4,
            }}
            style={{ flexDirection: 'row', gap: 6, marginHorizontal: 24, marginTop: 7, height: 4 }}
          >
            {Array.from({ length: step <= 4 ? 3 : 5 }, (_, index) => (
              <View
                key={index}
                style={{
                  flex: 1,
                  borderRadius: 2,
                  backgroundColor:
                    index < (step <= 4 ? step - 1 : step - 4) ? colors.brand : colors.border,
                }}
              />
            ))}
          </View>
        </>
      ) : null}
      <ScrollView
        ref={scroll}
        key={step}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {step === 1 ? (
          <>
            <View
              style={{
                marginTop: 28,
                height: 27,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Label size={19} bold style={{ lineHeight: 27 }}>
                GreenSteps
              </Label>
              <Label size={10} weight="semibold" color={colors.brand} style={{ lineHeight: 14 }}>
                SỐNG XANH MỖI NGÀY
              </Label>
            </View>
            <Block top={47}>{figure(welcome.imgBnNhChamCayXanh, 330)}</Block>
            <Block top={34}>
              <IntroTitle
                title={'Một khởi đầu nhỏ.\nMột tương lai xanh.'}
                detail="Biến những lựa chọn hằng ngày thành điều tốt đẹp cho Trái Đất."
              />
            </Block>
          </>
        ) : null}
        {step === 2 || step === 3 ? (
          <>
            <Block top={step === 2 ? 32 : 30}>
              {figure(
                step === 2 ? reduce.imgTuiViVaBinhNcTaiSDng : reuse.imgLThyTinhTrThanhChuCay,
                300,
              )}
            </Block>
            <View style={{ marginTop: step === 2 ? 24 : 26, gap: 12 }}>
              <View
                style={{
                  width: 174,
                  height: 30,
                  borderRadius: 100,
                  backgroundColor: colors.mint,
                  paddingHorizontal: 12,
                  justifyContent: 'center',
                }}
              >
                <Label size={11} weight="semibold" color={colors.brand} style={{ lineHeight: 16 }}>
                  {step === 2 ? '01 / REDUCE' : '02 / REUSE'}
                </Label>
              </View>
              <IntroTitle
                size={step === 2 ? 30 : 32}
                leading={step === 2 ? 43 : 42}
                title={
                  step === 2
                    ? 'Ít đồ dùng một lần.\nThêm điều tốt lành.'
                    : 'Đồ cũ.\nCâu chuyện mới.'
                }
                detail={
                  step === 2
                    ? 'Mang theo túi vải và bình nước riêng. Một thay đổi nhỏ, bớt đi nhiều rác thải.'
                    : 'Một chiếc lọ cũng có thể thành vườn nhỏ. Tái sử dụng để những món đồ có thêm vòng đời.'
                }
              />
            </View>
          </>
        ) : null}
        {step === 4 ? (
          <>
            <Block top={17}>{figure(recycle.imgChaiNhaCnPhanLoi, 220)}</Block>
            <Block top={17}>
              <IntroTitle
                title="Chai nhựa về đâu?"
                detail="Chạm vào thùng phù hợp để thử phân loại."
              />
            </Block>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 50 }}>
              {['Hữu cơ', 'Tái chế', 'Còn lại'].map((name, index) => (
                <Pressable
                  key={name}
                  accessibilityRole="button"
                  accessibilityState={{ selected: bin === name }}
                  aria-pressed={bin === name}
                  onPress={() => setBin(name)}
                  style={{
                    flex: 1,
                    height: 116,
                    borderWidth: bin === name ? 2 : 1,
                    borderColor: bin === name ? colors.brand : colors.border,
                    borderRadius: 26,
                    backgroundColor: ['#E5F3FC', colors.soft, '#F3D581'][index],
                    alignItems: 'center',
                  }}
                >
                  <View
                    style={{
                      position: 'absolute',
                      top: 20,
                      width: 42,
                      height: 45,
                      borderRadius: 8,
                      backgroundColor: index === 1 ? colors.brand : colors.muted,
                    }}
                  />
                  <View
                    style={{
                      position: 'absolute',
                      top: 16,
                      width: 50,
                      height: 7,
                      borderRadius: 3,
                      backgroundColor: colors.text,
                    }}
                  />
                  <View style={{ position: 'absolute', top: 32, flexDirection: 'row', gap: 8 }}>
                    <View
                      style={{ width: 5, height: 22, borderRadius: 2, backgroundColor: '#FFFFFF' }}
                    />
                    <View
                      style={{ width: 5, height: 22, borderRadius: 2, backgroundColor: '#FFFFFF' }}
                    />
                  </View>
                  <Label
                    size={12}
                    weight="semibold"
                    style={{ lineHeight: 17, position: 'absolute', top: 81 }}
                  >
                    {name}
                  </Label>
                </Pressable>
              ))}
            </View>
            {bin ? (
              <View style={{ marginTop: 16 }}>
                <Notice tone={bin === 'Tái chế' ? 'success' : 'info'}>
                  {bin === 'Tái chế'
                    ? 'Đúng rồi! Chai nhựa sạch có thể được thu gom để tái chế.'
                    : 'Thử lại nhé. Chai nhựa sạch phù hợp với thùng tái chế.'}
                </Notice>
              </View>
            ) : null}
          </>
        ) : null}
        {step === 5 ? (
          <>
            <Block top={30}>
              <IntroTitle
                title={'Bạn muốn bắt đầu\ntừ điều gì?'}
                detail="Chọn những chủ đề bạn quan tâm. Bạn có thể thay đổi sau trong cài đặt."
              />
            </Block>
            <View style={{ marginTop: 44, gap: 14 }}>
              {[
                [
                  {
                    id: 'sorting',
                    title: 'Phân loại rác',
                    detail: 'Hiểu đúng, làm dễ',
                    source: interests.imgIconRecycle,
                  },
                  {
                    id: 'collection',
                    title: 'Điểm thu gom',
                    detail: 'Tìm nơi gửi rác',
                    source: interests.imgIconPin,
                  },
                ],
                [
                  {
                    id: 'activities',
                    title: 'Hoạt động xanh',
                    detail: 'Cùng nhau góp sức',
                    source: interests.imgIconLeaf,
                  },
                  {
                    id: 'rewards',
                    title: 'Đổi thưởng',
                    detail: 'Ghi nhận nỗ lực',
                    source: interests.imgIconStar,
                  },
                ],
              ].map((row, index) => (
                <View key={index} style={{ flexDirection: 'row', gap: 14 }}>
                  {row.map((item) => (
                    <Pressable
                      key={item.id}
                      accessibilityRole="checkbox"
                      accessibilityLabel={item.title}
                      accessibilityState={{ checked: experience.interests.includes(item.id) }}
                      aria-checked={experience.interests.includes(item.id)}
                      onPress={() =>
                        setExperience((current) => ({
                          ...current,
                          interests: current.interests.includes(item.id)
                            ? current.interests.filter((id) => id !== item.id)
                            : [...current.interests, item.id],
                        }))
                      }
                      style={[panel, { flex: 1, height: 148 }]}
                    >
                      <Artwork
                        source={item.source}
                        width={40}
                        style={{ position: 'absolute', left: 15, top: 16 }}
                      />
                      <ChoiceMark
                        selected={experience.interests.includes(item.id)}
                        style={{ position: 'absolute', right: 18, top: 17 }}
                      />
                      <Label
                        size={14}
                        weight="semibold"
                        style={{ position: 'absolute', left: 15, top: 78, lineHeight: 20 }}
                      >
                        {item.title}
                      </Label>
                      <Label
                        size={11}
                        weight="medium"
                        color={colors.muted}
                        style={{ position: 'absolute', left: 15, top: 105, lineHeight: 16 }}
                      >
                        {item.detail}
                      </Label>
                    </Pressable>
                  ))}
                </View>
              ))}
            </View>
            <Label
              size={12}
              weight="medium"
              color={colors.muted}
              style={{ lineHeight: 18, textAlign: 'center', marginTop: 20 }}
            >
              Chọn nhiều chủ đề để có gợi ý phù hợp hơn.
            </Label>
          </>
        ) : null}
        {step === 6 ? (
          <>
            <Block top={29}>
              <IntroTitle
                title={'Bước nhỏ nào\nhợp với bạn?'}
                detail="Chọn một mục tiêu vừa sức. GreenSteps sẽ đồng hành cùng bạn mỗi ngày."
              />
            </Block>
            <View accessibilityRole="radiogroup" style={{ marginTop: 45, gap: 14 }}>
              {goalOptions.map((item) => (
                <Pressable
                  key={item.id}
                  accessibilityRole="radio"
                  accessibilityLabel={item.title}
                  accessibilityState={{ checked: experience.goal === item.id }}
                  aria-checked={experience.goal === item.id}
                  onPress={() => setExperience((current) => ({ ...current, goal: item.id }))}
                  style={[panel, { height: 96 }]}
                >
                  <Artwork
                    source={item.source}
                    width={42}
                    style={{ position: 'absolute', left: 17, top: 25 }}
                  />
                  <View style={{ position: 'absolute', left: 75, right: 43, top: 19, gap: 5 }}>
                    <Label size={14} weight="semibold" style={{ lineHeight: 20 }}>
                      {item.title}
                    </Label>
                    <Label
                      size={12}
                      weight="medium"
                      color={colors.muted}
                      style={{ lineHeight: 18 }}
                    >
                      {item.detail}
                    </Label>
                  </View>
                  <ChoiceMark
                    selected={experience.goal === item.id}
                    style={{ position: 'absolute', right: 18, top: 34 }}
                  />
                </Pressable>
              ))}
            </View>
            <Label
              size={12}
              weight="medium"
              color={colors.brand}
              style={{ lineHeight: 18, textAlign: 'center', marginTop: 26 }}
            >
              Không cần hoàn hảo, chỉ cần bắt đầu.
            </Label>
          </>
        ) : null}
        {step === 7 ? (
          <>
            <View style={{ marginTop: 25 }}>
              {figure(nearby.imgBnDDimThuGomXanh, 292)}
              <View
                style={[
                  panel,
                  {
                    position: 'absolute',
                    left: 18,
                    top: 220 * ratio,
                    width: 225,
                    height: 52,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    paddingHorizontal: 11,
                  },
                ]}
              >
                <Artwork source={nearby.imgIconRecycle} width={28} />
                <Label size={11} weight="semibold" style={{ lineHeight: 16 }}>
                  Điểm thu gom gần bạn
                </Label>
              </View>
            </View>
            <Block top={38}>
              <IntroTitle
                title={'Một điểm đến gần.\nMột hành động xanh.'}
                detail="Bật vị trí để tìm điểm thu gom và các hoạt động phù hợp quanh bạn."
              />
            </Block>
            <View style={{ marginTop: 33, flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
              <Artwork source={nearby.imgIconPin} width={24} />
              <Label
                size={12}
                weight="medium"
                color={colors.muted}
                style={{ lineHeight: 18, flex: 1 }}
              >
                Bạn luôn có thể chọn khu vực thủ công.
              </Label>
            </View>
            {locationPreview ? (
              <View style={{ marginTop: 16 }}>
                <Notice>
                  Bản xem trước chưa xin quyền vị trí. Bạn có thể tiếp tục với khu vực minh họa.
                </Notice>
                <DesignLink onPress={() => go(8)}>Tiếp tục bằng khu vực minh họa</DesignLink>
              </View>
            ) : null}
          </>
        ) : null}
        {step === 8 ? (
          <>
            <Block top={14}>{figure(reminders.imgLiNhcSngXanh, 164)}</Block>
            <Block top={20}>
              <IntroTitle
                title={'Một lời nhắc nhẹ.\nMột thói quen tốt.'}
                detail="Dành một phút mỗi ngày để chăm chút cho hành tinh của chúng ta."
              />
            </Block>
            <Pressable
              accessibilityRole="switch"
              accessibilityLabel="Nhắc tôi sống xanh"
              accessibilityState={{ checked: experience.remindersEnabled }}
              aria-checked={experience.remindersEnabled}
              onPress={() =>
                setExperience((current) => ({
                  ...current,
                  remindersEnabled: !current.remindersEnabled,
                }))
              }
              style={[
                panel,
                {
                  marginTop: 32,
                  height: 86,
                  paddingHorizontal: 17,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                },
              ]}
            >
              <View style={{ position: 'absolute', left: 17, right: 80, top: 17, gap: 5 }}>
                <Label size={15} weight="semibold" style={{ lineHeight: 22 }}>
                  Nhắc tôi sống xanh
                </Label>
                <Label size={12} weight="medium" color={colors.muted} style={{ lineHeight: 18 }}>
                  Bạn có thể tắt bất cứ lúc nào
                </Label>
              </View>
              <View
                style={{
                  width: 54,
                  position: 'absolute',
                  right: 19,
                  top: 26,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: experience.remindersEnabled ? colors.brand : colors.soft,
                  justifyContent: 'center',
                  paddingHorizontal: 3,
                  alignItems: experience.remindersEnabled ? 'flex-end' : 'flex-start',
                }}
              >
                <View
                  style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFFFFF' }}
                />
              </View>
            </Pressable>
            <Label
              size={11}
              weight="semibold"
              color={colors.muted}
              style={{ lineHeight: 16, marginTop: 28 }}
            >
              THỜI GIAN PHÙ HỢP VỚI BẠN
            </Label>
            <View style={{ marginTop: 13, flexDirection: 'row', gap: 10 }}>
              {(['08:00', '12:00', '20:00'] as const).map((time) => (
                <Pressable
                  key={time}
                  accessibilityRole="radio"
                  accessibilityLabel={time}
                  accessibilityState={{ checked: experience.reminderTime === time }}
                  aria-checked={experience.reminderTime === time}
                  onPress={() => setExperience((current) => ({ ...current, reminderTime: time }))}
                  style={[
                    panel,
                    {
                      flex: 1,
                      height: 54,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderColor: colors.border,
                      backgroundColor:
                        experience.reminderTime === time ? colors.mint : colors.surface,
                    },
                  ]}
                >
                  <Label
                    size={15}
                    weight="semibold"
                    color={experience.reminderTime === time ? colors.brand : colors.text}
                    style={{ lineHeight: 22 }}
                  >
                    {time}
                    {experience.reminderTime === time ? ' ✓' : ''}
                  </Label>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}
        {step === 9 ? (
          <>
            <Block top={16}>{figure(ready.imgMmCayVaDuHoanTt, 228)}</Block>
            <Block top={22}>
              <IntroTitle
                title={'Hành trình xanh\nbắt đầu từ bạn.'}
                detail="Trải nghiệm của bạn đã sẵn sàng. Cùng biến ý định tốt thành hành động nhỏ."
              />
            </Block>
            <View style={[panel, { backgroundColor: colors.mint, marginTop: 43, height: 128 }]}>
              <Artwork
                source={ready.imgIconLeaf}
                width={36}
                style={{ position: 'absolute', left: 17, top: 22 }}
              />
              <Label
                size={10}
                weight="semibold"
                color={colors.brand}
                style={{ position: 'absolute', left: 69, top: 19, lineHeight: 14 }}
              >
                MỤC TIÊU KHỞI ĐẦU
              </Label>
              <Label
                size={14}
                weight="semibold"
                style={{ position: 'absolute', left: 69, right: 12, top: 44, lineHeight: 20 }}
              >
                {goalOptions.find((item) => item.id === experience.goal)!.title}
              </Label>
              <Label
                size={12}
                weight="medium"
                color={colors.muted}
                style={{ position: 'absolute', left: 19, top: 90, lineHeight: 18 }}
              >
                Bắt đầu nhẹ nhàng, duy trì mỗi ngày.
              </Label>
            </View>
          </>
        ) : null}
      </ScrollView>
      <View
        style={{
          paddingHorizontal: 24,
          gap: 10,
          paddingBottom: Platform.OS === 'web' ? 46 : Math.max(24, insets.bottom),
        }}
      >
        <AccountButton
          title={primaryLabels[step]!}
          onPress={() => {
            if (step === 9) router.push('/register');
            else if (step === 7) setLocationPreview(true);
            else go(step + 1);
          }}
        />
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            if (step === 1) router.push('/login');
            else if (step <= 3) go(5);
            else if (step === 4 || step === 9) router.replace('/');
            else go(step + 1);
          }}
          style={{ height: 56, alignItems: 'center', justifyContent: 'center' }}
        >
          <Label size={15} weight="semibold" style={{ lineHeight: 22 }}>
            {secondaryLabels[step]}
          </Label>
        </Pressable>
      </View>
      {indicator()}
    </View>
  );
}
