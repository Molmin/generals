import superagent from 'superagent'
import { } from '../lib/jquery'
import { UserService } from '../lib/user'
import { redirectTo } from '../lib/redirect'

function registerCreateGame() {
  const target = $('.page--home > .create-game > p')
  target.find('.submit').on('click', async () => {
    const player1 = target.find('.player1').val()?.toString() || ''
    const player2 = target.find('.player2').val()?.toString() || ''
    const startAt = target.find('.startAt').val()?.toString() || ''
    const note = target.find('.note').val()?.toString() || ''
    const { body } = await superagent.post('/game/create')
      .send({
        token: UserService.token,
        player1,
        player2,
        startAt: +startAt * 60 * 1000 + Date.now(),
        note,
      })
    if (body.error) window.alert(body.error)
    else redirectTo('/')
  })
}

async function loadGameList() {
  const { body: { list } } = await superagent.post('/game/list')
    .send({ token: UserService.token })
  for (const game of list) {
    $('.page--home > .list > table > tbody').append(`
      <tr>
        <td>${game.gameId}</td>
        <td>${game.player1}</td>
        <td>${game.player2}</td>
        <td>${new Date(game.startAt).toLocaleString()}</td>
        <td>${game.done ? game.winner : '游戏未结束'}</td>
        <td>
          ${[game.player1, game.player2].includes(UserService.uid) && !game.done ? `<a href="/game/${game.gameId}/play">进入</a>` : ''}
          ${game.done ? `<a href="/game/${game.gameId}/replay">回放</a>` : ''}
        </td>
        <td>${game.note}</td>
      </tr>
    `)
  }
}

export async function init() {
  loadGameList()
  registerCreateGame()
}
