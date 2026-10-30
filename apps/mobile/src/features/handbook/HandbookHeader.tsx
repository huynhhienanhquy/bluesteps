import { Platform, Pressable, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Artwork } from '../../design-system/DesignScreen';
import { handbookAssets as a } from '../../design-system/handbook-assets';
export function HandbookHeader({
  search,
  setSearch,
  submit,
  listLayout = false,
  active = false,
  categoryLayout = false,
  categoryExpanded = false,
  onBack,
}: {
  search: string;
  setSearch: (value: string) => void;
  submit: () => void;
  listLayout?: boolean;
  active?: boolean;
  categoryLayout?: boolean;
  categoryExpanded?: boolean;
  onBack?: () => void;
}) {
  return (
    <>
      <View
        style={{
          position: 'absolute',
          left: categoryLayout && !categoryExpanded ? -1 : 0,
          top: 0,
          width: 428,
          height: listLayout ? 199 : 198,
          backgroundColor: '#147CC1',
        }}
      />
      {Platform.OS === 'web' ? (
        <View pointerEvents="none">
          <Artwork
            source={a.imgTime}
            width={52}
            height={21}
            style={{ position: 'absolute', left: 12, top: 12 }}
          />
          <Artwork
            source={a.imgMobileSignal}
            width={17}
            height={10.666}
            style={{ position: 'absolute', left: 336.67, top: 17.67 }}
          />
          <Artwork
            source={a.imgWifi}
            width={15.272}
            height={10.966}
            style={{ position: 'absolute', left: 358.698, top: 17.33 }}
          />
          <Artwork
            source={a.imgRectangle}
            width={22}
            height={11.333}
            style={{ position: 'absolute', left: 379, top: 17.33 }}
          />
          <Artwork
            source={a.imgRectangle1}
            width={18}
            height={7.333}
            style={{ position: 'absolute', left: 381, top: 19.33 }}
          />
          <Artwork
            source={a.imgCombinedShape}
            width={1.328}
            height={4}
            style={{ position: 'absolute', left: 402.002, top: 21 }}
          />
        </View>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Quay lại"
        onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')))}
        style={{
          position: 'absolute',
          left: categoryExpanded ? 20 : categoryLayout ? 12 : 14,
          top: categoryExpanded ? 64 : categoryLayout ? 58 : 55,
          width: categoryExpanded ? 30 : categoryLayout ? 40 : 44,
          height: categoryExpanded ? 30 : categoryLayout ? 40 : 44,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Artwork
          source={
            categoryExpanded
              ? require('../../../assets/figma/common/handbook-help-back.svg')
              : require('../../../assets/figma/common/handbook-back.svg')
          }
          width={categoryExpanded ? 30 : 12.3333}
          height={categoryExpanded ? 30 : 20}
        />
      </Pressable>
      <View
        style={{
          position: 'absolute',
          left: categoryExpanded ? 129 : 128,
          top: categoryExpanded ? 59 : 49,
          width: 159,
          height: 38,
        }}
      >
        {[-1, 0, 1].flatMap((x) =>
          [-1, 0, 1]
            .filter((y) => x || y)
            .map((y) => (
              <Text
                key={`${x}:${y}`}
                aria-hidden
                style={{
                  position: 'absolute',
                  left: x,
                  top: y,
                  fontFamily: 'Roboto_800ExtraBold',
                  fontSize: 32,
                  letterSpacing: 0.96,
                  color: '#000000',
                }}
              >
                Sổ tay rác
              </Text>
            )),
        )}
        <Text
          accessibilityRole="header"
          style={{
            fontFamily: 'Roboto_800ExtraBold',
            fontSize: 32,
            letterSpacing: 0.96,
            color: '#FFFFFF',
          }}
        >
          Sổ tay rác
        </Text>
      </View>
      <View
        style={{
          position: 'absolute',
          left: listLayout ? 277 : 287,
          top: listLayout ? 40 : 42,
          width: 88.617,
          height: 81.142,
          overflow: 'hidden',
        }}
      >
        <Artwork
          source={a.imgRectangle9}
          width={88.617}
          height={104.928}
          fit="fill"
          style={{ position: 'absolute', left: -2.845, top: -10.175 }}
        />
      </View>
      <View
        style={{
          position: 'absolute',
          left: listLayout ? 26 : 27,
          top: listLayout ? 118 : active ? 121 : 120,
          width: 375,
          height: 56,
          borderWidth: 1,
          borderColor: '#E4E4E4',
          borderRadius: 15,
          backgroundColor: '#FFFFFF',
          boxShadow: '0px 4px 4px rgba(0,0,0,.25)',
        }}
      >
        <Artwork
          source={a.imgFiRrZoomIn}
          width={24}
          style={{ position: 'absolute', left: 13, top: 15 }}
        />
        <TextInput
          accessibilityLabel="Tìm kiếm trong sổ tay rác"
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={submit}
          returnKeyType="search"
          placeholder="Tìm kiếm....."
          placeholderTextColor="#9D9B9B"
          style={{
            position: 'absolute',
            left: 46,
            top: 0,
            width: 308,
            height: 54,
            padding: 0,
            fontFamily: categoryLayout ? 'BackupInter_400Regular' : 'Inter_400Regular',
            fontSize: 12,
            outlineWidth: 0,
          }}
        />
      </View>
    </>
  );
}
