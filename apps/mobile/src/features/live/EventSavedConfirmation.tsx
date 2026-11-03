import { useRef, type ComponentRef } from 'react';
import { AccessibilityInfo, findNodeHandle, Platform, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Artwork } from '../../design-system/DesignScreen';
import { Label } from '../../design-system/ui';
import { PrivateModal } from './PrivateModal';

const art = {
  circle: require('../../../assets/images/events/saved-confirmation/circle.svg'),
  heart: require('../../../assets/icons/events/saved-confirmation/heart.png'),
  blue:
    Platform.OS === 'web'
      ? require('../../../assets/images/events/saved-confirmation/ellipse80.svg')
      : require('../../../assets/images/events/saved-confirmation/ellipse80.native.png'),
  pink:
    Platform.OS === 'web'
      ? require('../../../assets/images/events/saved-confirmation/ellipse81.svg')
      : require('../../../assets/images/events/saved-confirmation/ellipse81.native.png'),
};

export function EventSavedConfirmation({
  visible,
  close,
}: {
  visible: boolean;
  close: () => void;
}) {
  const heading = useRef<ComponentRef<typeof View>>(null);
  if (!visible) return null;
  return (
    <PrivateModal
      visible
      transparent
      animationType="fade"
      onRequestClose={close}
      onShow={() => {
        if (Platform.OS === 'web') return;
        const target = findNodeHandle(heading.current);
        if (target) AccessibilityInfo.setAccessibilityFocus(target);
      }}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: '#00000033',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Đóng thông báo đã lưu"
          onPress={close}
          style={{ position: 'absolute', inset: 0 }}
        />
        <View
          accessibilityViewIsModal
          style={{
            width: '100%',
            maxWidth: 359,
            minHeight: 162,
            borderRadius: 40,
            backgroundColor: '#F8F2F2',
            overflow: 'hidden',
            paddingTop: 31,
            paddingBottom: 30,
            gap: 15,
            alignItems: 'center',
          }}
        >
          <View pointerEvents="none" style={{ position: 'absolute', inset: 0 }}>
            <Artwork
              source={art.blue}
              width={470}
              height={470}
              style={{ position: 'absolute', left: 100, top: -188 }}
            />
            <Artwork
              source={art.pink}
              width={470}
              height={470}
              style={{ position: 'absolute', left: -179, top: -188 }}
            />
          </View>
          <View
            ref={heading}
            collapsable={false}
            accessible
            accessibilityRole="header"
            accessibilityLabel="Đã thêm vào yêu thích"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 7,
              paddingHorizontal: 12,
            }}
          >
            <View style={{ width: 32, height: 32 }}>
              <Artwork source={art.circle} width={32} height={32} />
              <Artwork
                source={art.heart}
                width={18}
                height={18}
                style={{ position: 'absolute', left: 7, top: 7 }}
              />
            </View>
            <Label size={18} bold heading style={{ lineHeight: 22, flexShrink: 1 }} color="#000000">
              Đã Thêm Vào Yêu Thích
            </Label>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Đi đến mục yêu thích"
            onPress={() => {
              close();
              router.push('/saved');
            }}
            style={{
              width: 237,
              maxWidth: '90%',
              minHeight: 54,
              borderRadius: 20,
              backgroundColor: '#075A9C',
              justifyContent: 'center',
              alignItems: 'center',
              paddingHorizontal: 12,
            }}
          >
            <Label size={18} bold color="#FFFFFF" style={{ lineHeight: 22, textAlign: 'center' }}>
              Đi đến mục yêu thích
            </Label>
          </Pressable>
        </View>
      </View>
    </PrivateModal>
  );
}
