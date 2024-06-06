import * as pageHome from './pages/home'
import * as pageLogin from './pages/login'
import * as pageGamePlay from './pages/game_play'
import * as pageGameReplay from './pages/game_replay'
import { gotoPage, registerPage } from './lib/page'
import { UserService } from './lib/user'
import { registerAlertEvent } from './component'
import { getPathName, redirectTo } from './lib/path'

registerPage('home', pageHome.init)
registerPage('login', pageLogin.init)
registerPage('game_play', pageGamePlay.init)
registerPage('game_replay', pageGameReplay.init)

$(async () => {
  registerAlertEvent()
  if (window['site_prefix'] === '') await UserService.init()
  const pathname = getPathName()
  if (/^\/login$/.test(pathname)) gotoPage('login')
  else {
    if (/^\/$/.test(pathname)) gotoPage('home')
    else if (/^\/game\/[1-9][0-9]*?\/play$/.test(pathname)) gotoPage('game_play')
    else if (/^\/game\/[1-9][0-9]*?\/replay$/.test(pathname) || window['site_prefix'] !== '') gotoPage('game_replay')
    else redirectTo('/')
  }
})
