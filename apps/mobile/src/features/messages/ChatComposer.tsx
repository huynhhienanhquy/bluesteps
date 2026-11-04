import { Pressable, TextInput, View, type ImageSourcePropType } from 'react-native';
import { Artwork } from '../../design-system/DesignScreen';
import { Icon, Label } from '../../design-system/ui';
import { useApp } from '../../providers';

type Action = 'camera' | 'emoji' | 'record' | 'images' | 'file' | 'attach';
const icons = {
  camera: {
    source: require('../../../assets/icons/chat/source.svg'),
    width: 20,
    height: 18,
    name: 'camera',
  },
  record: {
    source: require('../../../assets/icons/chat/source-5.svg'),
    width: 17.5,
    height: 22.2127,
    name: 'mic-outline',
  },
  images: {
    source: require('../../../assets/icons/chat/source-3.svg'),
    width: 19.9573,
    height: 20.6116,
    name: 'image-outline',
  },
  file: {
    source: require('../../../assets/icons/chat/source-2.svg'),
    width: 18.165,
    height: 20.5661,
    name: 'document-text-outline',
  },
  attach: {
    source: require('../../../assets/icons/chat/source-4.svg'),
    width: 21.5,
    height: 22.2127,
    name: 'add-circle-outline',
  },
} satisfies Record<
  Exclude<Action, 'emoji'>,
  { source: ImageSourcePropType; width: number; height: number; name: string }
>;

export function ChatComposer({
  text,
  onChange,
  disabled,
  pending,
  canSend,
  hasAttachments,
  send,
  onAction,
}: {
  text: string;
  onChange: (text: string) => void;
  disabled: boolean;
  pending: boolean;
  canSend: boolean;
  hasAttachments: boolean;
  send: () => void;
  onAction: (action: Action) => void;
}) {
  const { colors, dark } = useApp();
  const action = (kind: Exclude<Action, 'emoji'>, label: string) => (
    <Pressable
      key={kind}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => onAction(kind)}
      style={{
        width: kind === 'camera' ? 44 : 28,
        minHeight: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: kind === 'camera' ? '#65B9DE' : undefined,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {dark ? (
        <Icon name={icons[kind].name} size={22} color={colors.text} />
      ) : (
        <Artwork
          source={icons[kind].source}
          width={icons[kind].width}
          height={icons[kind].height}
        />
      )}
    </Pressable>
  );
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 3,
        borderRadius: 20,
        backgroundColor: dark ? colors.soft : '#F2F2F2',
        padding: 6,
      }}
    >
      {action('camera', 'Chụp ảnh')}
      <TextInput
        accessibilityLabel="Nội dung tin nhắn"
        value={text}
        onChangeText={onChange}
        multiline
        maxLength={4000}
        editable={!disabled}
        placeholder="Nhắn tin..."
        placeholderTextColor={colors.muted}
        style={{
          flex: 1,
          minWidth: 38,
          minHeight: 44,
          maxHeight: 120,
          paddingHorizontal: 6,
          paddingVertical: 11,
          fontFamily: 'Inter_400Regular',
          fontSize: 14,
          lineHeight: 21,
          color: colors.text,
        }}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Chọn emoji"
        disabled={disabled}
        onPress={() => onAction('emoji')}
        style={{
          width: 30,
          minHeight: 44,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <Label size={25}>☺</Label>
      </Pressable>
      {text.trim() || hasAttachments ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Gửi tin nhắn"
          accessibilityState={{ disabled: !canSend, busy: pending }}
          disabled={!canSend}
          onPress={send}
          style={{
            width: 38,
            minHeight: 44,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: !canSend ? 0.45 : 1,
          }}
        >
          <Icon name={pending ? 'hourglass-outline' : 'send'} color={colors.brand} size={24} />
        </Pressable>
      ) : (
        <>
          {action('record', 'Ghi âm')}
          {action('images', 'Chọn ảnh hoặc video')}
          {action('file', 'Chọn tệp')}
          {action('attach', 'Đính kèm')}
        </>
      )}
    </View>
  );
}
