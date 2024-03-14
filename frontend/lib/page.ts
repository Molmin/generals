import { } from './jquery'

const pages: Record<string, { page: string, init: () => void }> = {}

export function registerPage(page: string, init: () => void) {
  pages[page] = { page, init }
  console.info(`Registered page ${page}`)
}

let now = ''

export function gotoPage(page: string) {
  console.info(`Going to page ${page}`)
  if (now) {
    $(`.page.page--${now}`).removeClass('active')
  }
  now = page
  pages[now].init()
  $(`.page.page--${now}`).addClass('active')
}
