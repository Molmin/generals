import superagent from 'superagent'
import { } from '../lib/jquery'
import { UserService } from '../lib/user'
import { GeneralsGameReplay, GeneralsReplay } from '../lib/replay'
import { getPathName, redirectTo } from '../lib/path'
import { registerGameTableComponent } from '../component/game_table'

async function getReplay() {
  if (window['site_prefix'] !== '') {
    const id = (window.location.search.split('?id=')[1] || '').split('&')[0]
    try {
      const { body } = await superagent.get(`/generals-replays/replays/${id}.json`)
      return body
    }
    catch (e) {
      console.error(e)
      window.alert('找不到该回放。')
      return redirectTo('/')
    }
  }
  const id = +getPathName().split('/')[2]
  const { body } = await superagent.post('/game/replay')
    .send({ token: UserService.token, id })
  if (body.error) redirectTo('/')
  return body.replay as GeneralsReplay
}

export async function init() {
  const replay = await getReplay()
  console.info('game.replay', replay)
  const game = new GeneralsGameReplay(replay)

  setInterval(() => {
    if (game.isHalf) game.gotoTurn(game.nowTurn + 1, false)
    else game.gotoTurn(game.nowTurn, true)
  }, 500)

  registerGameTableComponent(game)
}
