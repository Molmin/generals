export function redirectTo(path: string) {
  window.location.pathname = `${window['site_prefix']}${path}`
}
