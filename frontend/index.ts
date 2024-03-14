import * as pageHome from './pages/home'
import * as pageLogin from './pages/login'
import * as pageGamePlay from './pages/game_play'
import { gotoPage, registerPage } from './lib/page'
import { UserService } from './lib/user'

registerPage('home', pageHome.init)
registerPage('login', pageLogin.init)
registerPage('game_play', pageGamePlay.init)

$(async () => {
  await UserService.init()
  const { pathname } = window.location
  if (/^\/login$/.test(pathname)) gotoPage('login')
  else {
    if (/^\/$/.test(pathname)) gotoPage('home')
    else if (/^\/game\/[1-9][0-9]*?\/play$/.test(pathname)) gotoPage('game_play')
    else window.location.pathname = '/'
  }
})
