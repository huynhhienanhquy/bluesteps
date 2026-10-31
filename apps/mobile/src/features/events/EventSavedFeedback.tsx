import { Modal, Pressable, View } from 'react-native';
import { useState } from 'react';
import { Artwork } from '../../design-system/DesignScreen';
import { eventDetailAssets } from '../../design-system/event-detail-assets';
import { CollectionText as T } from '../collection/CollectionPage';

export function EventSavedFeedback({
  state,
  onClose,
  onOpenSaved,
}: {
  state: 'saved' | 'removed' | null;
  onClose: () => void;
  onOpenSaved: () => void;
}) {
  const a = eventDetailAssets['386:10122'];
  const [panel, setPanel] = useState({ width: 359, height: 162 });
  const scale = panel.width / 359;
  return (
    <Modal visible={state !== null} transparent animationType="fade" onRequestClose={onClose}>
      <View
        accessibilityViewIsModal
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}
      >
        <Pressable
          accessible={false}
          onPress={onClose}
          style={{ position: 'absolute', inset: 0, backgroundColor: '#00000035' }}
        />
        <View
          onLayout={(event) =>
            setPanel({
              width: event.nativeEvent.layout.width,
              height: event.nativeEvent.layout.height,
            })
          }
          style={{
            width: '100%',
            maxWidth: 359,
            borderRadius: 40,
            overflow: 'hidden',
            backgroundColor: state === 'saved' ? '#F8F2F2' : '#FFFFFF',
            paddingHorizontal: 26,
            paddingVertical: 30,
            minHeight: state === 'saved' ? 162 : 95,
            gap: 15,
            justifyContent: state === 'removed' ? 'center' : undefined,
          }}
        >
          {state === 'saved' ? (
            <View pointerEvents="none" style={{ position: 'absolute', inset: 0 }}>
              <Artwork
                source={a.imgEllipse80}
                width={470 * scale}
                height={470 * scale}
                style={{ position: 'absolute', left: 100 * scale, top: -188 * scale }}
              />
              <Artwork
                source={a.imgEllipse81}
                width={470 * scale}
                height={470 * scale}
                style={{ position: 'absolute', left: -179 * scale, top: -188 * scale }}
              />
            </View>
          ) : (
            <Artwork
              source={require('../../../assets/figma/common/event-removed-gradient.svg')}
              width={panel.width}
              height={panel.height}
              fit="fill"
              style={{ position: 'absolute', left: 0, top: 0 }}
            />
          )}
          <View
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 }}
          >
            {state === 'saved' ? (
              <View style={{ width: 32, height: 32 }}>
                <Artwork source={a.imgEllipse67} width={32} />
                <Artwork
                  source={a.imgImage26}
                  width={18}
                  height={18}
                  style={{ position: 'absolute', left: 7, top: 7 }}
                />
              </View>
            ) : (
              <Artwork source={eventDetailAssets['386:10131'].imgTwemojiCrossMark} width={18} />
            )}
            <T
              accessibilityRole="alert"
              size={18}
              lineHeight={23}
              weight="bold"
              color="#000000"
              style={{ flexShrink: 1 }}
            >
              {state === 'saved' ? 'Đã Thêm Vào Yêu Thích' : 'Hoạt động yêu thích đã xóa'}
            </T>
          </View>
          {state === 'saved' ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Đi đến mục yêu thích"
              onPress={onOpenSaved}
              style={{
                minHeight: 54,
                padding: 12,
                paddingHorizontal: 16,
                borderRadius: 20,
                backgroundColor: '#075A9C',
                alignSelf: 'center',
                justifyContent: 'center',
              }}
            >
              <T
                size={18}
                lineHeight={22}
                weight="bold"
                color="#FFFFFF"
                style={{ textAlign: 'center' }}
              >
                Đi đến mục yêu thích
              </T>
            </Pressable>
          ) : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Đóng thông báo yêu thích"
          onPress={onClose}
          style={{
            marginTop: 12,
            minHeight: 44,
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: 22,
            backgroundColor: '#FFFFFF',
          }}
        >
          <T size={14} weight="semibold" color="#075A9C">
            Đóng
          </T>
        </Pressable>
      </View>
    </Modal>
  );
}
