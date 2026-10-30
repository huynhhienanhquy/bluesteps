import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';
import { renderApp } from '../../test/render';
import { useApp } from '../../providers';
import { CollectionFiltersScreen } from './CollectionFiltersScreen';
import { defaultCollectionFilters, matchingCollectionPoints } from '../../services/collection';

function FilterSession() {
  const { collectionFilters } = useApp();
  const [show, setShow] = useState(true);
  return (
    <View>
      <Text testID="applied-filter">{JSON.stringify(collectionFilters)}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Ouvrir fermer"
        onPress={() => setShow(!show)}
      >
        <Text>Toggle</Text>
      </Pressable>
      {show ? <CollectionFiltersScreen /> : null}
    </View>
  );
}

test('filter edits are drafts; leaving discards them and apply updates the shared session', async () => {
  await renderApp(<FilterSession />);
  await fireEvent.press(screen.getByRole('checkbox', { name: 'Nhựa' }));
  await fireEvent.press(screen.getByRole('checkbox', { name: 'Giấy, bìa' }));
  await fireEvent.press(screen.getByRole('checkbox', { name: 'Pin đã dùng' }));
  expect(JSON.parse(screen.getByTestId('applied-filter').props.children).materials).toEqual([
    'Nhựa',
    'Giấy, bìa',
  ]);
  await fireEvent.press(screen.getByRole('button', { name: 'Quay lại' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Ouvrir fermer' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Ouvrir fermer' }));
  expect(screen.getByRole('checkbox', { name: 'Nhựa' }).props.accessibilityState.checked).toBe(
    true,
  );
  expect(
    screen.getByRole('checkbox', { name: 'Pin đã dùng' }).props.accessibilityState.checked,
  ).toBe(false);
  await fireEvent.press(screen.getByRole('checkbox', { name: 'Nhựa' }));
  await fireEvent.press(screen.getByRole('checkbox', { name: 'Giấy, bìa' }));
  await fireEvent.press(screen.getByRole('checkbox', { name: 'Pin đã dùng' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Áp dụng • 2 điểm phù hợp' }));
  const applied = JSON.parse(screen.getByTestId('applied-filter').props.children);
  expect(applied.materials).toEqual(['Pin đã dùng']);
  expect(applied.applied).toBe(true);
});

test('collection filters combine supported materials, radius, hours, capacity and accent-free search', () => {
  const filters = defaultCollectionFilters();
  expect(matchingCollectionPoints(filters)).toHaveLength(6);
  expect(
    matchingCollectionPoints({ ...filters, materials: ['Pin đã dùng'] }).map((point) => point.id),
  ).toEqual(['paper-house', 'battery-box']);
  expect(
    matchingCollectionPoints({ ...filters, materials: ['Pin đã dùng'], radius: 1 }).map(
      (point) => point.id,
    ),
  ).toEqual(['paper-house']);
  expect(
    matchingCollectionPoints({ ...filters, hours: 'always' }).map((point) => point.id),
  ).toEqual(['green-hub', 'glass-corner', 'green-corner']);
  expect(matchingCollectionPoints(filters, 'hoa hai').map((point) => point.id)).toContain(
    'paper-house',
  );
  expect(matchingCollectionPoints(filters, 'khong ton tai')).toEqual([]);
  expect(
    matchingCollectionPoints({
      ...filters,
      materials: [],
      radius: 10,
      hours: 'all',
      available: false,
    }),
  ).toHaveLength(8);
});
