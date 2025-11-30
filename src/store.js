import { Store } from "@tauri-apps/plugin-store"

let storeInstace = null

export function initStore() {
  return Store.load("settings.json").then(s => {
    if (s) {
      storeInstace = s
      return true
    }
    return false
  })
}

export function getStore() {
  return storeInstace
}