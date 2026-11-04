import type { MapCoordinate } from './map-coordinate';
export type PointMapProps = {
  coordinate?: MapCoordinate;
  zoom?: number;
  line?: MapCoordinate[];
  points?: (MapCoordinate & { id: string })[];
  selectedPointId?: string;
  onSelectPoint?: (id: string) => void;
  controls?: boolean;
  onPick?: (point: MapCoordinate) => void;
};
export function mapPayload({
  coordinate,
  zoom = 0,
  line = [],
  points = [],
  selectedPointId,
  controls = false,
  onPick,
}: PointMapProps) {
  return { coordinate, line, points, selectedPointId, zoom, controls, pick: !!onPick };
}
export function validPick(value: unknown): value is { latitude: number; longitude: number } {
  if (!value || typeof value !== 'object') return false;
  const p = value as MapCoordinate;
  return (
    Number.isFinite(p.latitude) &&
    Math.abs(p.latitude) <= 90 &&
    Number.isFinite(p.longitude) &&
    Math.abs(p.longitude) <= 180
  );
}
export function mapDocument(
  channel: string,
  initial: ReturnType<typeof mapPayload>,
  contextType?: 'webgl',
) {
  const vendor = require('../../../assets/vendor/maplibre.json') as { js: string; css: string };
  const json = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c');
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"><style>${vendor.css.replace(/<\/style/gi, '<\\/style')}html,body,#map{margin:0;width:100%;height:100%;overflow:hidden}#error{position:absolute;inset:auto 12px 30px;padding:10px;background:white;border-radius:12px;font:13px sans-serif;display:none}.maplibregl-ctrl-attrib{font-size:10px}</style></head><body><div id="map" aria-label="Bản đồ tương tác"></div><div id="error">Không tải được bản đồ. Bạn vẫn có thể đọc chỉ dẫn hoặc nhập tọa độ.</div><script>${vendor.js.replace(/<\/script/gi, '<\\/script')}</script><script>
 const channel=${json(channel)};
 function send(value){const payload={channel,...value};if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(JSON.stringify(payload));else window.parent.postMessage(payload,'*');}
 let current=${json(initial)},map,marker,styleReady=false,ready=false,controls;
 function draw(data){current=data;if(!styleReady)return;const line=data.line.map(p=>[p.longitude,p.latitude]);const geo={type:'FeatureCollection',features:line.length>1?[{type:'Feature',properties:{},geometry:{type:'LineString',coordinates:line}}]:[]};
  if(map.getSource('route'))map.getSource('route').setData(geo);else{map.addSource('route',{type:'geojson',data:geo});map.addLayer({id:'route-outline',type:'line',source:'route',paint:{'line-color':'white','line-width':9}});map.addLayer({id:'route-line',type:'line',source:'route',paint:{'line-color':'#147CC1','line-width':5},layout:{'line-join':'round','line-cap':'round'}});}
  const points={type:'FeatureCollection',features:data.points.map(p=>({type:'Feature',properties:{id:p.id,selected:p.id===data.selectedPointId},geometry:{type:'Point',coordinates:[p.longitude,p.latitude]}}))};
  if(map.getSource('collection-points'))map.getSource('collection-points').setData(points);else{
    map.addSource('collection-points',{type:'geojson',data:points});
    map.addLayer({id:'collection-points',type:'circle',source:'collection-points',paint:{
      'circle-radius':['case',['get','selected'],10,7],
      'circle-color':['case',['get','selected'],'#075A9C','#147CC1'],
      'circle-stroke-width':2,'circle-stroke-color':'white'
    }});
    map.on('mouseenter','collection-points',()=>{map.getCanvas().style.cursor='pointer';});
    map.on('mouseleave','collection-points',()=>{map.getCanvas().style.cursor='';});
  }
  if(marker){marker.remove();marker=null;}if(data.coordinate&&!data.selectedPointId){marker=new maplibregl.Marker({color:'#147CC1',draggable:data.pick}).setLngLat([data.coordinate.longitude,data.coordinate.latitude]).addTo(map);marker.on('dragend',()=>{const p=marker.getLngLat();send({type:'pick',latitude:p.lat,longitude:p.lng});});}
  const key=JSON.stringify({line:data.line,zoom:data.zoom,center:line.length>1?null:data.coordinate,points:data.coordinate||line.length>1?null:data.points});if(map._viewKey!==key){map._viewKey=key;if(line.length>1){const bounds=new maplibregl.LngLatBounds();line.forEach(p=>bounds.extend(p));map.fitBounds(bounds,{padding:36,maxZoom:18,duration:0});}else if(data.coordinate)map.jumpTo({center:[data.coordinate.longitude,data.coordinate.latitude],zoom:15+data.zoom});else if(data.points.length){const bounds=new maplibregl.LngLatBounds();data.points.forEach(p=>bounds.extend([p.longitude,p.latitude]));map.fitBounds(bounds,{padding:36,maxZoom:15,duration:0});}}
  if(data.controls&&!controls){controls=new maplibregl.NavigationControl({showCompass:false});map.addControl(controls,'top-right');}if(!data.controls&&controls){map.removeControl(controls);controls=null;}
  document.documentElement.dataset.routePoints=String(line.length);
 }
 window.BlueStepsUpdate=draw;
 window.addEventListener('message',event=>{if(event.source===window.parent&&event.data&&event.data.channel===channel&&event.data.type==='update')draw(event.data.payload);});
 try{const start=current.coordinate||current.line[0]||current.points[0];map=new maplibregl.Map({container:'map',style:'https://tiles.openfreemap.org/styles/liberty',center:[start.longitude,start.latitude],zoom:15+current.zoom,attributionControl:{compact:false},maxZoom:19,canvasContextAttributes:${json(contextType ? { contextType } : {})}});
  map.on('load',()=>{styleReady=true;draw(current);});map.on('idle',()=>{if(map.isStyleLoaded()&&map.areTilesLoaded()){document.documentElement.dataset.mapLoaded='true';document.getElementById('error').style.display='none';if(!ready){ready=true;send({type:'ready'});}}});
  map.on('click',e=>{
    if(current.pick){send({type:'pick',latitude:e.lngLat.lat,longitude:e.lngLat.lng});return;}
    if(!map.getLayer('collection-points'))return;
    const hit=map.queryRenderedFeatures(e.point,{layers:['collection-points']})[0];
    if(hit)send({type:'point',id:hit.properties.id});
  });
  map.on('error',()=>{if(!ready)document.getElementById('error').style.display='block';});
  new ResizeObserver(()=>map.resize()).observe(document.getElementById('map'));
 }catch(error){document.getElementById('error').style.display='block';send({type:'error'});}
 setTimeout(()=>{if(!ready){document.getElementById('error').style.display='block';send({type:'error'});}},20000);
 </script></body></html>`;
}
