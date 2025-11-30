import AMapLoader from "@amap/amap-jsapi-loader";
export default function loadAmp(apiKey, securityKey) {
  window._AMapSecurityConfig = {
    securityJsCode: securityKey,
  }
  return AMapLoader.load({
    key: apiKey,
    plugins: ["AMap.ToolBar", "AMap.PlaceSearch"]
  })
}