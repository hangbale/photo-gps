export function createUrl(apiKey) {
  return `https://webapi.amap.com/maps?v=1.4.15&key=${apiKey}&plugin=AMap.Autocomplete`
}

export function createOuterScriptElement(apiKey) {
  const script = document.createElement('script')
  script.type = 'text/javascript'
  script.src = createUrl(apiKey)
  script.async = true
  script.defer = true
  return script
}
function loadAmapSecurityKey(securityKey) {
  window._AMapSecurityConfig = {
    securityJsCode: securityKey,
  };
}
export function loadAmapScript(apiKey, securityKey) {
  loadAmapSecurityKey(securityKey)
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${createUrl(apiKey)}"]`)) {
      resolve()
      return
    }
    const script = createOuterScriptElement(apiKey)
    script.onload = () => {
      resolve(true)
    }
    script.onerror = (err) => {
      reject(err)
    }
    document.head.appendChild(script)
  })
}
