import { useCallback, useRef, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../providers';
import { Artwork } from '../../design-system/DesignScreen';
import { collectionArtwork as a } from '../../design-system/catalog-artwork';
import { CurvedNavigation, MediaSlot } from '../shared/DesignParts';
import { PointMap } from './PointMap';
import { router, useFocusEffect, useLocalSearchParams, usePathname } from 'expo-router';
import {
  Button,
  Icon,
  Typography,
  Card,
  Chip,
  Field,
  Label,
  Notice,
  Row,
  Screen,
  Section,
} from '../../design-system/ui';
import { type Schemas } from '../../services/api';
import { useCommand, usePages, useResource } from '../../services/queries';
import { CommandError, More, QueryState, RequireAuth } from '../shared/common';
import { collectionFilterQuery, type CollectionFilterParams } from './CollectionFilters';
import { useForegroundLocation } from '../../services/foreground-location';
import { RouteReplacement } from './RouteReplacement';
import { DraftJourneyEditor as DraftRouteEditor } from './JourneyPlanner';
import { StopOrder } from './StopOrder';
import { RoutePlanPanel } from './RouteDirections';
import { CollectionPointPage } from './CollectionPointPage';
import { PointOverview } from './PointOverview';
import { pointCapacityLabel } from './collection-point-status';
export { pointCapacityLabel } from './collection-point-status';

export function CollectionScreen() {
  const params = useLocalSearchParams<CollectionFilterParams>();
  const moderation = useResource<{ allowed: boolean }>('/v1/me/collection-moderation', true);
  const geo = useForegroundLocation();
  const cards = useRef<ScrollView>(null);
  const [search, setSearch] = useState(params.q ?? ''),
    [selected, setSelected] = useState<string[]>([]),
    [focused, setFocused] = useState<string | null>(null),
    [zoom, setZoom] = useState(0),
    [mapError, setMapError] = useState<unknown>(null);
  const { colors } = useApp(),
    insets = useSafeAreaInsets();
  const path = usePathname();
  const filterQuery = collectionFilterQuery(params, geo.location);
  const needsLocation = !!params.radius && !geo.location;
  const query = usePages<Schemas['CollectionPoint']>(
    `/v1/collection-points?q=${encodeURIComponent(search)}&${filterQuery}`,
    false,
    !needsLocation,
  );
  const points = query.data?.pages.flatMap((page) => page.items) ?? [];
  const active = points.find((point) => point.id === focused);
  const mapCenter = focused === 'user' ? geo.location : active;
  const canZoom = !!mapCenter || points.length > 0;
  const systemTop = Platform.OS === 'web' ? 49 : insets.top;
  const selectedPoints = selected.flatMap((id) => {
    const point = points.find((item) => item.id === id);
    return point ? [point] : [];
  });
  const toggle = (id: string) =>
    setSelected((current) => {
      const visible = current.filter((value) => points.some((point) => point.id === value));
      return visible.includes(id)
        ? visible.filter((value) => value !== id)
        : [...visible, id].slice(-5);
    });
  return (
    <Typography.Provider value="inter">
      <View style={{ flex: 1, backgroundColor: '#EBF0F2' }}>
        <View style={{ position: 'absolute', inset: 0 }}>
          <PointMap
            coordinate={mapCenter}
            points={points.map(({ id, latitude, longitude }) => ({ id, latitude, longitude }))}
            selectedPointId={active?.id}
            onSelectPoint={(id) => {
              const index = points.findIndex((point) => point.id === id);
              if (index < 0) return;
              setFocused(id);
              cards.current?.scrollTo({ x: index * 245, animated: true });
            }}
            zoom={zoom}
          />
        </View>
        <View
          pointerEvents="box-none"
          style={{ position: 'absolute', top: systemTop, left: 22, right: 33, gap: 13 }}
        >
          <View
            style={{
              height: 40,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Quay lại"
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
              style={{ width: 43, height: 43, alignItems: 'center', justifyContent: 'center' }}
            >
              <Artwork source={a.back} width={24} />
            </Pressable>
            <Label family="inter" size={20} bold color="#000000" heading style={{ lineHeight: 24 }}>
              Khám phá
            </Label>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cá nhân"
              onPress={() => router.push('/profile')}
            >
              <Artwork source={a.brand} width={40} />
            </Pressable>
          </View>
          <View
            style={{
              height: 50,
              backgroundColor: '#FFFFFF',
              borderRadius: 15,
              boxShadow: '0px 4px 4px rgba(0,0,0,0.25)',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              paddingLeft: 19,
              paddingRight: 14,
              marginLeft: 8,
              marginRight: 1,
            }}
          >
            <TextInput
              accessibilityLabel="Tên điểm hoặc địa chỉ"
              placeholder="Tên điểm hoặc địa chỉ"
              placeholderTextColor="#64748B"
              value={search}
              onChangeText={setSearch}
              style={{
                flex: 1,
                minWidth: 0,
                height: 50,
                fontFamily: 'Inter_400Regular',
                fontSize: 16,
                color: '#000000',
                padding: 0,
              }}
            />
            <View
              accessibilityLabel="Tìm kiếm bằng giọng nói chưa khả dụng"
              style={{ opacity: 0.4 }}
            >
              <Artwork source={a.voice} width={16} height={22} />
            </View>
          </View>
          {selectedPoints.length ? (
            <View
              style={{
                backgroundColor: '#FFFFFF',
                borderWidth: 2,
                borderColor: '#147CC1',
                borderRadius: 18,
                padding: 12,
                gap: 8,
              }}
            >
              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    backgroundColor: '#147CC1',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Artwork source={a.check} width={14} />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Label size={14} weight="semibold" color="#172B3D">
                    Đã chọn {selectedPoints.length} điểm
                  </Label>
                  <Label size={12} color="#677C8C">
                    {selectedPoints.map((point) => point.name).join(', ')}
                  </Label>
                </View>
              </View>
              <Button
                title="So sánh điểm đã chọn"
                disabled={selectedPoints.length < 2}
                onPress={() =>
                  router.push({
                    pathname: '/collection-compare',
                    params: {
                      ids: selectedPoints.map((point) => point.id).join(','),
                      materials: params.materials,
                    },
                  })
                }
              />
            </View>
          ) : null}
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <Button
              title="Vị trí của tôi"
              variant="secondary"
              pending={geo.busy}
              onPress={() => {
                setFocused('user');
                void geo.locate();
              }}
            />
            <Button
              title="Bộ lọc"
              variant="secondary"
              onPress={() =>
                router.push({
                  pathname: '/collection-filters',
                  params: {
                    ...params,
                    q: search,
                    fromExplore: path === '/collection-explore' ? '1' : '',
                  },
                })
              }
            />
            <Button
              title="Hành trình"
              variant="secondary"
              onPress={() => router.push('/journey')}
            />
            <Button
              title="Đề xuất địa điểm"
              variant="secondary"
              onPress={() => router.push('/point-proposal')}
            />
            {moderation.data?.allowed ? (
              <Button
                title="Xét duyệt điểm thu gom"
                variant="secondary"
                onPress={() => router.push('/collection-moderation')}
              />
            ) : null}
          </View>
          {geo.error ? <Notice tone="error">{geo.error}</Notice> : null}
          {needsLocation ? (
            <Notice>
              Chưa có vị trí để áp dụng bán kính. Chọn Vị trí của tôi hoặc điều chỉnh bộ lọc.
            </Notice>
          ) : null}
        </View>
        <View
          style={{
            position: 'absolute',
            right: 31,
            bottom: path === '/collection' ? 179 : 295,
            gap: 4,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Phóng to bản đồ"
            accessibilityState={{ disabled: !canZoom || zoom >= 4 }}
            disabled={!canZoom || zoom >= 4}
            onPress={() => {
              if (!mapCenter && points[0]) setFocused(points[0].id);
              setZoom((value) => Math.min(4, value + 1));
            }}
            style={{ width: 45, height: 45, opacity: canZoom ? 1 : 0.4 }}
          >
            <Artwork source={a.zoom} width={45} />
          </Pressable>
        </View>
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: path === '/collection' ? 5 : 121,
            gap: 12,
          }}
        >
          <Label
            family="inter"
            size={20}
            bold
            color="#147CC1"
            style={{ lineHeight: 24, paddingLeft: 29 }}
          >
            Điểm thu gom
          </Label>
          {needsLocation ? null : (
            <QueryState
              query={query}
              empty={!points.length}
              emptyText={
                search || filterQuery !== 'match_mode=all'
                  ? 'Không tìm thấy điểm thu gom phù hợp'
                  : 'Chưa có điểm thu gom được công bố'
              }
            >
              <ScrollView
                ref={cards}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                  paddingLeft: 29,
                  paddingRight: 20,
                  gap: 15,
                  paddingBottom: 6,
                }}
              >
                {points.map((point) => (
                  <View
                    key={point.id}
                    style={{
                      width: 230,
                      minHeight: 163,
                      borderRadius: 20,
                      backgroundColor: '#FFFFFF',
                      boxShadow: '0px 4px 4px rgba(0,0,0,0.25)',
                      padding: 12,
                      gap: 10,
                      borderWidth: point.id === active?.id ? 2 : 0,
                      borderColor: '#147CC1',
                    }}
                  >
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={'Xem trên bản đồ: ' + point.name}
                        onPress={() => setFocused(point.id)}
                      >
                        <MediaSlot
                          code={point.code}
                          icon="location-outline"
                          style={{ width: 91, height: 78, borderRadius: 15 }}
                        />
                      </Pressable>
                      <View style={{ flex: 1, gap: 8 }}>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={point.name}
                          onPress={() =>
                            router.push({
                              pathname: '/points/[id]',
                              params: { id: point.id, materials: params.materials },
                            })
                          }
                        >
                          <Label
                            size={11}
                            weight="semibold"
                            color="#000000"
                            style={{ lineHeight: 14 }}
                          >
                            {point.name}
                          </Label>
                        </Pressable>
                        <Label size={10} color="#147CC1" style={{ lineHeight: 14 }}>
                          {pointCapacityLabel(point.capacityState)}
                        </Label>
                      </View>
                    </View>
                    <Label size={11} color="#000000" style={{ lineHeight: 14 }}>
                      {point.address}
                    </Label>
                    {point.distanceM != null ? (
                      <Label size={10}>
                        Cách khoảng {Math.round(point.distanceM)} m theo đường thẳng
                      </Label>
                    ) : null}
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                        marginTop: 'auto',
                      }}
                    >
                      <Pressable
                        accessibilityRole="checkbox"
                        accessibilityLabel={'Chọn so sánh ' + point.name}
                        accessibilityState={{ checked: selected.includes(point.id) }}
                        aria-checked={selected.includes(point.id)}
                        onPress={() => toggle(point.id)}
                        style={{
                          minHeight: 32,
                          flex: 1,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 5,
                        }}
                      >
                        <Icon
                          name={selected.includes(point.id) ? 'checkbox' : 'square-outline'}
                          size={17}
                        />
                        <Label size={10} color="#64748B">
                          So sánh
                        </Label>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={'Chỉ đường đến ' + point.name}
                        onPress={() =>
                          router.push({
                            pathname: '/collection-directions',
                            params: { id: point.id, materials: params.materials },
                          })
                        }
                        style={{
                          minHeight: 28,
                          borderRadius: 20,
                          backgroundColor: '#147CC1',
                          paddingHorizontal: 10,
                          justifyContent: 'center',
                        }}
                      >
                        <Label size={10} color="#FFFFFF">
                          Chỉ đường
                        </Label>
                      </Pressable>
                    </View>
                  </View>
                ))}
                {query.hasNextPage ? (
                  <View style={{ width: 120, justifyContent: 'center' }}>
                    <More query={query} />
                  </View>
                ) : null}
              </ScrollView>
            </QueryState>
          )}
          <CommandError error={mapError} />
          {canZoom ? (
            <Pressable
              accessibilityRole="link"
              accessibilityLabel="OpenStreetMap contributors"
              onPress={() =>
                void Linking.openURL('https://www.openstreetmap.org/copyright').catch(setMapError)
              }
              style={{
                alignSelf: 'flex-end',
                backgroundColor: '#FFFFFF',
                padding: 3,
                marginRight: 8,
              }}
            >
              <Label family="inter" size={9} color={colors.text}>
                © OpenStreetMap contributors
              </Label>
            </Pressable>
          ) : null}
        </View>
        {path !== '/collection' ? (
          <View
            pointerEvents="box-none"
            style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}
          >
            <CurvedNavigation selected="collection" />
          </View>
        ) : null}
      </View>
    </Typography.Provider>
  );
}

export { CollectionFiltersScreen } from './CollectionFilters';

export function PointDetailScreen() {
  const { id, materials } = useLocalSearchParams<{ id: string; materials?: string }>();
  const { user } = useApp();
  return <PointDetails key={`${user?.id ?? 'guest'}:${id}`} id={id} materials={materials} />;
}

function PointDetails({ id, materials }: { id: string; materials?: string }) {
  const { view } = useLocalSearchParams<{ view?: string }>();
  const reviewing = view === 'reviews';
  const query = useResource<Schemas['CollectionPoint']>(`/v1/collection-points/${id}`);
  const reviews = usePages<Schemas['PointReview']>(`/v1/collection-points/${id}/reviews`);
  const photos = useResource<Schemas['MediaAsset'][]>(`/v1/collection-points/${id}/photos`);
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState('');
  const sending = useRef(false);
  const command = useCommand<{ state: string }>();
  const carried = [...new Set(materials?.split(',').filter(Boolean) ?? [])];
  const { refetch: refreshPoint } = query;
  const { refetch: refreshReviews } = reviews;
  const { refetch: refreshPhotos } = photos;
  useFocusEffect(
    useCallback(() => {
      void refreshPoint();
      void refreshReviews();
      void refreshPhotos();
    }, [refreshPoint, refreshReviews, refreshPhotos]),
  );
  return (
    <CollectionPointPage
      point={query.data}
      photos={photos.data ?? []}
      reviewing={reviewing}
      onViewChange={(reviews) => router.setParams({ view: reviews ? 'reviews' : 'overview' })}
      onDirections={() =>
        router.push({ pathname: '/collection-directions', params: { id, materials } })
      }
    >
      {photos.isError ? <QueryState query={photos} /> : null}
      <QueryState query={query}>
        {query.data && (
          <>
            {!reviewing ? (
              <PointOverview
                point={query.data}
                carried={carried}
                onReport={() =>
                  router.push({
                    pathname: '/point-report',
                    params: { id, materials, pointView: view },
                  })
                }
              />
            ) : (
              <>
                <Section title="Đánh giá" />
                <Label>{query.data.reviewCount ?? 0} đánh giá đã công bố</Label>
                <QueryState
                  query={reviews}
                  empty={!reviews.data?.pages[0]?.items.length}
                  emptyText="Chưa có đánh giá được duyệt"
                >
                  {reviews.data?.pages
                    .flatMap((page) => page.items)
                    .map((review) => (
                      <Card key={review.id}>
                        <Label bold>
                          {review.authorName} · {review.rating}/5
                        </Label>
                        <Label>{review.body}</Label>
                      </Card>
                    ))}
                  <More query={reviews} />
                </QueryState>
                <RequireAuth>
                  <Row>
                    {[1, 2, 3, 4, 5].map((value) => (
                      <Chip
                        key={value}
                        label={`${value} sao`}
                        selected={rating === value}
                        disabled={command.isPending}
                        onPress={() => {
                          setRating(value);
                          command.reset();
                        }}
                      />
                    ))}
                  </Row>
                  <Field
                    label="Nội dung đánh giá"
                    value={body}
                    onChangeText={(value) => {
                      setBody(value);
                      command.reset();
                    }}
                    editable={!command.isPending}
                    multiline
                    maxLength={1000}
                  />
                  <CommandError error={command.error} />
                  <Button
                    title="Gửi đánh giá"
                    pending={command.isPending}
                    disabled={!body.trim()}
                    onPress={() => {
                      if (sending.current || !body.trim()) return;
                      sending.current = true;
                      void command
                        .mutateAsync({
                          path: `/v1/collection-points/${id}/reviews`,
                          body: { rating, body: body.trim() },
                        })
                        .then(() => setBody(''))
                        .catch(() => {})
                        .finally(() => {
                          sending.current = false;
                        });
                    }}
                  />
                  {command.data?.state === 'pending' && (
                    <Notice tone="success">Đánh giá đang chờ xét duyệt.</Notice>
                  )}
                </RequireAuth>
              </>
            )}
          </>
        )}
      </QueryState>
    </CollectionPointPage>
  );
}

export { CollectionCompareScreen } from './CollectionCompare';

export { JourneyScreen } from './JourneyPlanner';

type Route = Schemas['RouteDetail'];
export function RouteScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { user } = useApp();
  const [dragging, setDragging] = useState(false);
  return (
    <Screen title="Chi tiết hành trình" back scrollEnabled={!dragging}>
      <RequireAuth>
        {id ? (
          <RouteBody key={`${user?.id}:${id}`} id={id} onDragging={setDragging} />
        ) : (
          <>
            <Notice>Chọn hoặc tạo một hành trình để tiếp tục.</Notice>
            <Button title="Hành trình của tôi" onPress={() => router.replace('/journey')} />
          </>
        )}
      </RequireAuth>
    </Screen>
  );
}
function RouteBody({ id, onDragging }: { id: string; onDragging: (active: boolean) => void }) {
  const query = useResource<Route>(`/v1/routes/${id}`, true);
  const command = useCommand();
  function reorder(stops: string[]) {
    if (!query.data) return;
    return command.mutateAsync({
      path: `/v1/routes/${id}`,
      method: 'PATCH',
      body: { stopIds: stops, mode: query.data.mode, expectedVersion: query.data.version },
    });
  }
  return (
    <QueryState query={query}>
      {query.data && (
        <>
          <Label>Trạng thái: {query.data.status}</Label>
          <RoutePlanPanel route={query.data} />
          <CommandError error={command.error} />
          {query.data.status === 'draft' && (
            <Button
              title="Sửa điểm dừng và phương tiện"
              variant="secondary"
              onPress={() => router.push({ pathname: '/collection-replacement', params: { id } })}
            />
          )}
          {query.data.status === 'draft' ? (
            <StopOrder
              items={query.data.stops.map((s) => ({
                id: s.pointId,
                name: s.name,
                detail: s.address,
                handover: `Vật liệu: ${s.materials?.map((m) => m.name).join(', ') || 'Chưa có dữ liệu'}`,
              }))}
              onChange={reorder}
              onDragging={onDragging}
              disabled={command.isPending}
            />
          ) : (
            query.data.stops.map((stop, index) => (
              <Card key={stop.id}>
                <Label bold>
                  {index + 1}. {stop.name}
                </Label>
                <Label>{stop.address}</Label>
                <Label>{stop.status}</Label>
                {query.data?.status === 'active' && (
                  <>
                    <Button
                      title="Đến điểm và bàn giao"
                      onPress={() =>
                        router.push({
                          pathname: '/collection-arrival',
                          params: { id, stopId: stop.id },
                        })
                      }
                    />
                    {stop.status === 'pending' ? (
                      <Button
                        title="Thay điểm này"
                        variant="secondary"
                        onPress={() =>
                          router.push({
                            pathname: '/collection-replacement',
                            params: { id, stopId: stop.id },
                          })
                        }
                      />
                    ) : null}
                  </>
                )}
              </Card>
            ))
          )}
          {query.data.status === 'draft' && (
            <Button
              title="Bắt đầu hành trình"
              pending={command.isPending}
              onPress={() => command.mutate({ path: `/v1/routes/${id}/start` })}
            />
          )}
          {['draft', 'active'].includes(query.data.status) && (
            <Button
              title="Hủy hành trình"
              variant="danger"
              pending={command.isPending}
              onPress={() => command.mutate({ path: `/v1/routes/${id}/cancel` })}
            />
          )}
        </>
      )}
    </QueryState>
  );
}

export { ArrivalScreen } from './ArrivalScreen';

export function RouteEditorScreen() {
  const { id, stopId } = useLocalSearchParams<{ id?: string; stopId?: string }>();
  return id && stopId ? (
    <RouteReplacement key={`${id}:${stopId}`} id={id} stopId={stopId} />
  ) : (
    <DraftRouteEditor />
  );
}
export { PointProposalScreen, PointReportScreen } from './CollectionForms';
