import { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Icon, Label } from '../../design-system/ui';
import { useApp } from '../../providers';

const defaults = [
  '😀',
  '😊',
  '😂',
  '🥰',
  '😍',
  '😎',
  '😢',
  '👍',
  '❤️',
  '💚',
  '🎉',
  '🙏',
  '🌿',
  '♻️',
  '✨',
  '🔥',
  '🤝',
  '👏',
  '😮',
  '💪',
];
const categories = [
  { id: 'recent', icon: 'Gần đây', name: 'Gần đây', emojis: defaults },
  {
    id: 'faces',
    icon: '😀',
    name: 'Cảm xúc và cử chỉ',
    emojis: [
      '😀',
      '😊',
      '😂',
      '🥰',
      '😍',
      '😎',
      '😢',
      '😮',
      '🤔',
      '😴',
      '😭',
      '😅',
      '👍',
      '🙏',
      '🤝',
      '👏',
      '💪',
      '👋',
      '🙌',
      '👌',
    ],
  },
  {
    id: 'animals',
    icon: '🐻',
    name: 'Động vật',
    emojis: [
      '🐻',
      '🐶',
      '🐱',
      '🐼',
      '🐰',
      '🦊',
      '🐯',
      '🐵',
      '🐸',
      '🐢',
      '🐳',
      '🐬',
      '🦋',
      '🐝',
      '🐞',
      '🐦',
      '🦉',
      '🐧',
      '🐘',
      '🦒',
    ],
  },
  {
    id: 'nature',
    icon: '🍃',
    name: 'Thiên nhiên',
    emojis: [
      '🍃',
      '🌿',
      '🌱',
      '♻️',
      '🌍',
      '🌳',
      '🌲',
      '🌻',
      '🌸',
      '🌺',
      '🍀',
      '🌵',
      '🌞',
      '🌈',
      '💧',
      '🌊',
      '☁️',
      '🍂',
      '🍄',
      '🌾',
    ],
  },
  {
    id: 'hearts',
    icon: '❤️',
    name: 'Tình cảm',
    emojis: [
      '❤️',
      '💚',
      '💙',
      '💛',
      '🧡',
      '💜',
      '🤍',
      '🖤',
      '🤎',
      '🩷',
      '💖',
      '💕',
      '💞',
      '💗',
      '💓',
      '💘',
      '💝',
      '💌',
      '🫶',
      '🤗',
    ],
  },
  {
    id: 'party',
    icon: '🎉',
    name: 'Ăn mừng',
    emojis: [
      '🎉',
      '✨',
      '🔥',
      '🎊',
      '🎈',
      '🎁',
      '🎂',
      '🥳',
      '⭐',
      '🌟',
      '💫',
      '🎆',
      '🎇',
      '🏆',
      '🥇',
      '🎯',
      '🎵',
      '🎶',
      '🎀',
      '🪄',
    ],
  },
];

/** The Figma emoji tray keeps the draft and send action available while browsing. */
export function ChatEmojiPicker({
  text,
  onChange,
  disabled,
  pending,
  canSend,
  send,
  close,
  bottom,
}: {
  text: string;
  onChange: (value: string) => void;
  disabled: boolean;
  pending: boolean;
  canSend: boolean;
  send: () => void;
  close: () => void;
  bottom: number;
}) {
  const { colors, dark, user } = useApp();
  const cache = useQueryClient();
  const recentKey = ['chat-recent-emojis', user?.id];
  const { data: recent } = useQuery<string[]>({
    queryKey: recentKey,
    queryFn: () => [],
    initialData: [],
    enabled: false,
    gcTime: Infinity,
  });
  const [category, setCategory] = useState('recent');
  const selected = categories.find((item) => item.id === category) ?? categories[0];
  const emojis =
    category === 'recent' ? [...new Set([...recent, ...defaults])].slice(0, 20) : selected.emojis;
  return (
    <View
      style={{
        backgroundColor: dark ? colors.soft : '#F0F5FA',
        paddingTop: 11,
        paddingBottom: Math.max(12, bottom),
        gap: 8,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          borderRadius: 17,
          backgroundColor: colors.surface,
          marginHorizontal: 19,
          paddingHorizontal: 8,
          gap: 4,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Đóng bảng emoji"
          onPress={close}
          style={{ width: 44, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="keypad-outline" size={23} color={colors.muted} />
        </Pressable>
        <TextInput
          accessibilityLabel="Nội dung tin nhắn"
          placeholder="Nhắn tin..."
          placeholderTextColor={colors.muted}
          value={text}
          onChangeText={onChange}
          editable={!disabled}
          maxLength={4000}
          multiline
          style={{
            flex: 1,
            minWidth: 0,
            minHeight: 48,
            maxHeight: 96,
            paddingVertical: 11,
            fontSize: 16,
            color: colors.text,
            fontFamily: 'Inter_400Regular',
          }}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Gửi tin nhắn"
          accessibilityState={{ disabled: !canSend, busy: pending }}
          disabled={!canSend}
          onPress={send}
          style={{
            width: 40,
            height: 36,
            borderRadius: 18,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.brand,
            opacity: canSend ? 1 : 0.45,
          }}
        >
          <Icon name={pending ? 'hourglass-outline' : 'send'} size={20} color={colors.heroText} />
        </Pressable>
      </View>
      <View accessibilityRole="tablist" style={{ flexDirection: 'row', paddingHorizontal: 12 }}>
        {categories.map((item) => (
          <Pressable
            key={item.id}
            accessibilityRole="tab"
            accessibilityLabel={item.name}
            accessibilityState={{ selected: item.id === category }}
            onPress={() => setCategory(item.id)}
            style={{
              flex: item.id === 'recent' ? 1.4 : 1,
              minHeight: 44,
              justifyContent: 'center',
              alignItems: 'center',
              borderBottomWidth: 2,
              borderBottomColor: item.id === category ? colors.brand : 'transparent',
            }}
          >
            <Label
              size={item.id === 'recent' ? 16 : 23}
              color={item.id === category ? colors.brand : colors.muted}
            >
              {item.icon}
            </Label>
          </Pressable>
        ))}
      </View>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        style={{ maxHeight: 176 }}
        contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12 }}
      >
        {emojis.map((emoji) => (
          <Pressable
            key={emoji}
            accessibilityRole="button"
            accessibilityLabel={`Chèn emoji ${emoji}`}
            disabled={disabled || text.length + emoji.length > 4000}
            onPress={() => {
              if (disabled || text.length + emoji.length > 4000) return;
              onChange(text + emoji);
              const next = [emoji, ...recent.filter((item) => item !== emoji)].slice(0, 20);
              cache.setQueryData(recentKey, next);
            }}
            style={{
              width: '20%',
              minHeight: 44,
              justifyContent: 'center',
              alignItems: 'flex-start',
              paddingLeft: 10,
              opacity: disabled || text.length + emoji.length > 4000 ? 0.45 : 1,
            }}
          >
            <Label size={24}>{emoji}</Label>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
