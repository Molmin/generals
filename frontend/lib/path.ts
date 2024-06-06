export function redirectTo(path: string) {
  window.location.pathname = `${window['site_prefix']}${path}`
}

export function getPathName() {
  return window.location.pathname.replace(window['site_prefix'], '')
}
