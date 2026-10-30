import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Artwork } from '../../design-system/DesignScreen';
import { LegacyCanvas, LegacyStatusBar } from '../../design-system/LegacyCanvas';
import { LegacyNavigation } from '../../design-system/LegacyNavigation';
import { achievementAssets as a } from '../../design-system/achievement-assets';

const textStyle = { fontFamily: 'Inter_400Regular', color: '#000000', fontSize: 16 };
export function AchievementsScreen() {
  return (
    <LegacyCanvas background="#A8D5F0">
      <View
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: 428,
          height: 335,
          backgroundColor: '#147CC1',
          borderBottomLeftRadius: 35,
          borderBottomRightRadius: 35,
        }}
      />
      <LegacyStatusBar assets={a} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Quay lại"
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/profile'))}
        style={{
          position: 'absolute',
          left: 8,
          top: 60,
          width: 44,
          height: 44,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Artwork
          source={require('../../../assets/figma/common/back-chevron-large.png')}
          width={35}
          style={{ position: 'absolute', left: 2, top: 6 }}
        />
      </Pressable>
      <Text
        accessibilityRole="header"
        style={[
          textStyle,
          {
            position: 'absolute',
            left: 132,
            top: 63,
            fontFamily: 'Inter_700Bold',
            fontSize: 32,
            color: '#FFFFFF',
          },
        ]}
      >
        Thành tích
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Thông báo"
        onPress={() => router.push('/notifications')}
        style={{ position: 'absolute', left: 366, top: 57, width: 44, height: 44 }}
      >
        <Artwork
          source={a.imgFrame36714}
          width={30}
          style={{ position: 'absolute', left: 7, top: 7 }}
        />
        <Artwork
          source={a.imgIconlySharpLightNotification}
          width={25}
          style={{ position: 'absolute', left: 10, top: 9 }}
        />
      </Pressable>
      <Artwork
        source={a.imgEllipse10}
        width={120}
        style={{ position: 'absolute', left: 154, top: 98 }}
      />
      <Artwork
        source={a.imgEllipse9}
        width={110}
        style={{ position: 'absolute', left: 159, top: 103 }}
      />
      <Text
        style={[
          textStyle,
          {
            position: 'absolute',
            left: 179,
            top: 218,
            fontFamily: 'Inter_700Bold',
            fontSize: 20,
          },
        ]}
      >
        Healing
      </Text>
      <Text style={[textStyle, { position: 'absolute', left: 174, top: 256 }]}>120/200</Text>
      <Artwork
        source={a.imgImage17}
        width={24}
        style={{ position: 'absolute', left: 243, top: 251 }}
      />
      <View
        style={{
          position: 'absolute',
          left: 96,
          top: 290,
          width: 258,
          height: 29,
          borderWidth: 1,
          borderColor: '#147CC1',
          backgroundColor: '#A8D5F0',
          borderRadius: 20,
        }}
      >
        <View
          style={{
            width: 176,
            height: 27,
            backgroundColor: '#6CB4DB',
            borderRightWidth: 1,
            borderColor: '#147CC1',
            borderRadius: 20,
          }}
        />
      </View>
      <Artwork
        source={a.imgImage19}
        width={45}
        style={{ position: 'absolute', left: 195, top: 342 }}
      />
      {[
        {
          name: 'Thu Phương',
          points: '100/200',
          source: a.imgEllipse12,
          left: 31,
          top: 387,
          avatarLeft: 17,
          avatarTop: 16,
          pointsLeft: 11,
          leafLeft: 69,
          avatarSize: 80,
          border: '#000000',
        },
        {
          name: 'Linh Chi',
          points: '120/200',
          source: a.imgEllipse11,
          left: 157,
          top: 380,
          avatarLeft: 13,
          avatarTop: 13,
          pointsLeft: 13,
          leafLeft: 69,
          avatarSize: 90,
          border: '#3C8DB9',
        },
        {
          name: 'Mỹ Duyên',
          points: '90/200',
          source: a.imgEllipse13,
          left: 287,
          top: 387,
          avatarLeft: 30,
          avatarTop: 31,
          pointsLeft: 16,
          leafLeft: 61,
          avatarSize: 65,
          border: '#000000',
        },
      ].map((item) => (
        <View
          key={item.name}
          style={{
            position: 'absolute',
            left: item.left,
            top: item.top,
            width: 118,
            height: item.name === 'Linh Chi' ? 211 : 192,
            borderWidth: 1,
            borderColor: item.border,
            borderRadius: 30,
          }}
        >
          <Artwork
            source={item.source}
            width={item.avatarSize}
            style={{ position: 'absolute', left: item.avatarLeft, top: item.avatarTop }}
          />
          <Text
            style={[
              textStyle,
              { position: 'absolute', top: 503 - item.top, width: 118, textAlign: 'center' },
            ]}
          >
            {item.name}
          </Text>
          <View
            style={{
              position: 'absolute',
              left: item.pointsLeft,
              top: 531 - item.top,
              width: 93,
              height: 24,
            }}
          >
            <Text style={[textStyle, { position: 'absolute', left: 0, top: 5 }]}>
              {item.points}
            </Text>
            <Artwork
              source={a.imgImage17}
              width={24}
              style={{ position: 'absolute', left: item.leafLeft, top: 0 }}
            />
          </View>
        </View>
      ))}
      <ScrollView
        style={{ position: 'absolute', left: 22, top: 606, width: 383, height: 267 }}
        contentContainerStyle={{ paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            backgroundColor: 'rgba(255,255,255,0.9)',
            paddingHorizontal: 27,
            paddingTop: 24,
            paddingBottom: 40,
            gap: 37,
          }}
        >
          {[
            { name: 'Quang Huy', points: '90/200', source: a.imgEllipse18 },
            { name: 'Hoàng Bảo', points: '89/200', source: a.imgEllipse19 },
            { name: 'Khánh Linh', points: '85/200', source: a.imgEllipse20 },
            { name: 'Bảo An', points: '80/200', source: a.imgEllipse21 },
          ].map((item, index) => (
            <View
              key={item.name}
              style={{ height: 42, flexDirection: 'row', alignItems: 'center' }}
            >
              <Text style={[textStyle, { fontFamily: 'Inter_700Bold', width: 31 }]}>
                {index + 4}
              </Text>
              <Artwork source={item.source} width={42} />
              <Text
                style={[textStyle, { fontFamily: 'Inter_700Bold', marginLeft: 44, width: 124 }]}
              >
                {item.name}
              </Text>
              <Text style={textStyle}>{item.points}</Text>
              <Artwork source={a.imgImage17} width={24} style={{ marginLeft: 7 }} />
            </View>
          ))}
        </View>
      </ScrollView>
      <LegacyNavigation />
    </LegacyCanvas>
  );
}
