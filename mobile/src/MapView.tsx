import { useEffect, useRef, type ComponentType, type Ref } from 'react'
import { StyleSheet, View } from 'react-native'
import { WebView, type WebViewMessageEvent, type WebViewProps } from 'react-native-webview'

// react-native-webview's class typings do not resolve under React 19.3 types; same component, explicit props.
const Web = WebView as unknown as ComponentType<WebViewProps & { ref?: Ref<WebView> }>

export type MapPlace = { id: number; name: string; lat: number; lng: number }
type Props = {
  places: MapPlace[]
  activeId: number | null
  /** 'guide': red active pin, blue others. 'explore': green pins, active one bigger. */
  variant: 'guide' | 'explore'
  user: { lat: number; lng: number; accuracy: number | null } | null
  route: { lat: number; lng: number } | null
  center: readonly [number, number]
  onSelect: (id: number) => void
}

// Leaflet + OpenStreetMap inside a WebView: the same map library as the web app, and no map API key.
const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<style>html,body,#map{margin:0;height:100%;background:#e9eee5}
.pin{width:26px;height:26px;border-radius:50% 50% 50% 4px;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 2px 6px #0005}
.pin.guide{background:#2f6fdb}.pin.guide.active{background:#e0352b;width:34px;height:34px}
.pin.explore{background:#2f7a52}.pin.explore.active{background:#c9382f;width:34px;height:34px}</style></head>
<body><div id="map"></div><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script>
var map, markers = {}, ids = '', last = {}, userDot, userRing, line, lastActive = null;
function icon(variant, active){ var s = active ? 34 : 26; return L.divIcon({className:'', html:'<div class="pin '+variant+(active?' active':'')+'"></div>', iconSize:[s,s], iconAnchor:[s/2,s]}) }
window.update = function(d){
  if(!map){ map = L.map('map',{zoomControl:true,attributionControl:true}).setView(d.center,17);
    L.tileLayer('https://tile.openstreetmap.de/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap'}).addTo(map) }
  var key = d.places.map(function(p){return p.id}).join(',');
  if(key !== ids){ Object.values(markers).forEach(function(m){map.removeLayer(m)}); markers = {}; ids = key;
    d.places.forEach(function(p){ var m = L.marker([p.lat,p.lng],{icon:icon(d.variant,p.id===d.activeId),title:p.name}).addTo(map);
      m.bindTooltip(p.name); m.on('click',function(){ window.ReactNativeWebView.postMessage(String(p.id)) }); markers[p.id]=m });
    if(d.places.length && d.activeId===null){ map.fitBounds(d.places.map(function(p){return [p.lat,p.lng]}),{padding:[30,30],maxZoom:18}) } }
  Object.keys(markers).forEach(function(id){ var active = Number(id)===d.activeId; markers[id].setIcon(icon(d.variant,active)); markers[id].setZIndexOffset(active?1000:0) });
  if(d.activeId!==null && d.activeId!==lastActive){ var p = d.places.find(function(x){return x.id===d.activeId}); if(p) map.panTo([p.lat,p.lng]) }
  lastActive = d.activeId;
  if(d.user){ var ll=[d.user.lat,d.user.lng];
    if(!userDot){ userRing=L.circle(ll,{radius:d.user.accuracy||0,color:'#4285f4',weight:1,fillOpacity:.12,interactive:false}).addTo(map);
      userDot=L.circleMarker(ll,{radius:8,color:'#fff',weight:3,fillColor:'#4285f4',fillOpacity:1}).addTo(map) }
    else { userDot.setLatLng(ll); userRing.setLatLng(ll).setRadius(d.user.accuracy||0) } }
  else if(userDot){ map.removeLayer(userDot); map.removeLayer(userRing); userDot=null; userRing=null }
  if(d.user && d.route){ var pts=[[d.user.lat,d.user.lng],[d.route.lat,d.route.lng]];
    if(line) line.setLatLngs(pts); else line=L.polyline(pts,{color:'#e0352b',weight:4,dashArray:'8 8',interactive:false}).addTo(map) }
  else if(line){ map.removeLayer(line); line=null }
};
window.ReactNativeWebView.postMessage('ready');
</script></body></html>`

export function MapView({ places, activeId, variant, user, route, center, onSelect }: Props) {
  const web = useRef<WebView>(null)
  const ready = useRef(false)
  const payload = JSON.stringify({ places, activeId, variant, user, route, center })
  const latest = useRef(payload)

  useEffect(() => {
    latest.current = payload
    if (ready.current) web.current?.injectJavaScript(`window.update(${payload});true;`)
  }, [payload])

  function onMessage(event: WebViewMessageEvent) {
    const data = event.nativeEvent.data
    if (data === 'ready') {
      ready.current = true
      web.current?.injectJavaScript(`window.update(${latest.current});true;`)
      return
    }
    const id = Number(data)
    if (Number.isInteger(id)) onSelect(id)
  }

  return (
    <View style={styles.box}>
      <Web ref={web} source={{ html, baseUrl: 'https://localhost/' }} onMessage={onMessage} originWhitelist={['*']} javaScriptEnabled style={styles.web} />
    </View>
  )
}

const styles = StyleSheet.create({
  box: { height: 300, borderRadius: 14, overflow: 'hidden', backgroundColor: '#e9eee5' },
  web: { flex: 1, backgroundColor: 'transparent' },
})
