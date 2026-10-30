import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Artwork } from '../../design-system/DesignScreen';
import { LegacyCanvas } from '../../design-system/LegacyCanvas';
import { LegacyNavigation } from '../../design-system/LegacyNavigation';
import { HandbookHeader } from './HandbookHeader';
import { handbookAssets as a } from '../../design-system/handbook-assets';
import { handbookNavigationAssets } from '../../design-system/handbook-navigation-assets';

export function HandbookLanding() {
  const { variant } = useLocalSearchParams<{ variant?: string }>();
  const active = variant === 'active';
  const [search, setSearch] = useState('');
  const list = (category = 'Tất cả') =>
    router.push({ pathname: '/handbook/list', params: { category, query: search } });
  return (
    <LegacyCanvas statusHeight={49}>
      <HandbookHeader search={search} setSearch={setSearch} submit={() => list()} active={active} />
      {[
        {
          title: 'Rác tái chế',
          category: 'Tái chế',
          x: 34,
          y: 234,
          w: 167,
          color: '#30ABFF',
          ink: '#FFFFFF',
          source: a.imgImage53,
          ix: 85,
          iy: 268,
          iw: 64,
          ih: 64,
          tx: 73,
          ty: 332,
        },
        {
          title: 'Rác hữu cơ',
          category: 'Hữu cơ',
          x: 227,
          y: 234,
          w: 167,
          color: '#F0B2B3',
          ink: '#515152',
          source: a.imgRectangle89,
          ix: 280,
          iy: 272,
          iw: 60,
          ih: 60,
          tx: 266,
          ty: 335,
        },
        {
          title: 'Rác vô cơ',
          category: 'Vô cơ',
          x: 119,
          y: 410,
          w: 189.555,
          color: '#B2B099',
          ink: '#515152',
          source: a.imgGroup,
          ix: 182.63,
          iy: 446.5,
          iw: 60.91,
          ih: 51,
          tx: 168.94,
          ty: 511,
        },
      ]
        .map((item) =>
          active
            ? {
                ...item,
                y: item.y === 410 ? 407 : 227,
                iy: item.iy - (item.category === 'Hữu cơ' ? 10 : item.category === 'Vô cơ' ? 3 : 7),
                ty: item.ty - (item.category === 'Hữu cơ' ? 10 : item.category === 'Vô cơ' ? 3 : 7),
              }
            : item,
        )
        .map((item) => (
          <Pressable
            key={item.title}
            accessibilityRole="button"
            accessibilityLabel={item.title}
            onPress={() =>
              router.push(
                `/handbook/category/${item.category === 'Hữu cơ' ? 'organic' : item.category === 'Vô cơ' ? 'inorganic' : 'recycle'}`,
              )
            }
            style={{
              position: 'absolute',
              left: item.x,
              top: item.y,
              width: item.w,
              height: 151,
              borderWidth: 1,
              borderColor: '#D8D8D8',
              backgroundColor: item.color,
              borderRadius: 20,
              boxShadow: '0px 4px 4px rgba(0,0,0,.25)',
            }}
          >
            <Artwork
              source={item.source}
              width={item.iw}
              height={item.ih}
              style={{
                position: 'absolute',
                left: item.ix - item.x - 1,
                top: item.iy - item.y - 1,
              }}
            />
            <Text
              style={{
                position: 'absolute',
                left: item.tx - item.x - 1,
                top: item.ty - item.y - 1,
                fontFamily: 'Mulish_700Bold',
                fontSize: 16,
                lineHeight: 20,
                color: item.ink,
              }}
            >
              {item.title}
            </Text>
          </Pressable>
        ))}
      <View
        style={{
          position: 'absolute',
          left: active ? 274.6 : 275.6,
          top: active ? 575.5 : 582.5,
          width: 139.2,
          height: 114.178,
          transform: [{ rotate: '-6.85deg' }],
        }}
      >
        <Artwork
          source={a.imgVector}
          width={113.1}
          height={85.895}
          style={{ position: 'absolute', left: 13.05, top: 10.704 }}
        />
        <Text
          style={{
            position: 'absolute',
            left: 24.45,
            top: 16.155,
            width: 92.84,
            textAlign: 'center',
            fontFamily: 'Mulish_300Light',
            fontSize: 12,
            lineHeight: 20,
            color: '#000000',
            transform: [{ rotate: '2.78deg' }],
          }}
        >
          {'Nếu chưa \nbiết rác loại nào \n-hãy vào đây'}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Xem tất cả"
        onPress={() => list()}
        style={{
          position: 'absolute',
          left: 56,
          top: active ? 671 : 676,
          width: 316,
          height: 62,
          borderWidth: 1,
          borderColor: '#3191C4',
          borderRadius: 10,
          boxShadow: '0px 4px 4px rgba(0,0,0,.25)',
          backgroundColor: active ? '#CFE6F2' : '#FFFFFF',
        }}
      >
        <Artwork
          source={a.imgAllSvgrepoCom}
          width={28}
          height={26}
          style={{ position: 'absolute', left: 80, top: 17 }}
        />
        <Text
          style={{
            position: 'absolute',
            left: 122,
            top: 21,
            fontFamily: 'Mulish_700Bold',
            fontSize: 16,
            lineHeight: 20,
            color: '#515152',
          }}
        >
          Xem tất cả
        </Text>
      </Pressable>
      <Artwork
        source={a.imgGroup10}
        width={75}
        height={46}
        style={{ position: 'absolute', left: 3, top: 792 }}
      />
      <Artwork
        source={a.imgRectangle16}
        width={70}
        height={70}
        style={{ position: 'absolute', left: 6, top: 744 }}
      />
      <LegacyNavigation
        selected={null}
        handbook
        handbookAssets={handbookNavigationAssets[active ? '386:13313' : '386:13263']}
      />
    </LegacyCanvas>
  );
}
