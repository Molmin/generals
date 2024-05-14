import superagent from 'superagent'
import { io as SocketIO } from 'socket.io-client'
import { } from '../lib/jquery'
import { UserService } from '../lib/user'
import { GeneralsGame } from '../lib/game'

async function getInfo() {
  const id = +window.location.pathname.split('/')[2]
  const { body } = await superagent.post('/game/info')
    .send({ token: UserService.token, id })
  if (body.error || ![body.player1, body.player2].includes(UserService.uid) || body.done)
    window.location.pathname = '/'
  return body
}

export async function init() {
  const info = await getInfo()
  console.info('game.info', info)
  const game = new GeneralsGame()
  const socket = SocketIO(`${window.location.protocol.replace('http', 'ws')}//${window.location.host}`)
  game.socket = socket
  let interval: NodeJS.Timeout

  socket.emit('token', UserService.token)
  socket.emit('join', info.gameId)

  socket.on('error', (message: string) => {
    window.alert(message)
    window.location.pathname = '/'
  })

  socket.on('update', (data: {
    players: Array<{
      id: number
      uid: number
      name: string
      army: number
      land: number
    }>
    map: string
    turn: number
    isHalf: number
    doneSteps: Array<number>
  }) => {
    game.markStepsAsDone(data.doneSteps)
    game.updatePlayers(data.players)
    game.updateMap(data.map)
    $('.game-leaderboard > tbody').html(`
      <tr>
        <td><span style="white-space: nowrap;"><span style="color: gold;">★ </span></span></td>
        <td>Player</td>
        <td>Army</td>
        <td>Land</td>
      </tr>
      ${data.players.map((player) => `
        <tr>
          <td><span style="white-space: nowrap;"><span style="color: gold;">★ </span>0</span></td>
          <td class="leaderboard-name owner--${player.id}">${player.name}</td>
          <td>${player.army}</td>
          <td>${player.land}</td>
        </tr>
      `).join('')}
    `)
    $('.page--game_play > .turn-counter').text(
      Date.now() >= info.startAt ? `Turn ${data.turn}${data.isHalf ? '.' : ''}` : `Game will start after ${Math.ceil((info.startAt - Date.now()) / 1000)} s`
    )
    if (info.startAt > Date.now()) {
      interval = setInterval(() => {
        $('.page--game_play > .turn-counter').text(
          `Game will start after ${Math.ceil((info.startAt - Date.now()) / 1000)} s`
        )
      }, 500)
    }
    else {
      clearInterval(interval)
    }
  })

  setInterval(() => socket.emit('ping'), 15000)

  let nowSize = 32
  let nowLeft = 30, nowTop = 30
  function updateTableStyle() {
    game.$table.attr('style', [
      `--cell-size: ${nowSize}px;`,
      `--bg-size: ${nowSize / 32 * 25}px;`,
      `--number-size: ${nowSize / 32 * 3 + 9}px;`,
      `top: ${nowTop}px;`,
      `left: ${nowLeft}px;`,
    ].join(' '))
  }

  function registerWheelEvent() {
    $(document).on('wheel', (ev) => {
      const deltaY = (ev.originalEvent as Event)['deltaY']
      if (deltaY < 0 && nowSize < 100) nowSize += 6
      if (deltaY > 0 && nowSize > 11) nowSize -= 6
      updateTableStyle()
    })
  }

  function registerMouseEvent() {
    let isDown = false
    let fromX = 0, fromY = 0
    let lastLeft = 0, lastTop = 0
    $(document).on('mousedown', (ev) => {
      lastLeft = nowLeft
      lastTop = nowTop
      fromX = ev.clientX
      fromY = ev.clientY
      isDown = true
    })
    $(document).on('mouseup', (ev) => {
      if (!isDown) return
      isDown = false
      nowLeft = lastLeft + ev.clientX - fromX
      nowTop = lastTop + ev.clientY - fromY
      updateTableStyle()
    })
    $(document).on('mousemove', (ev) => {
      if (!isDown) return
      nowLeft = lastLeft + ev.clientX - fromX
      nowTop = lastTop + ev.clientY - fromY
      updateTableStyle()
    })
  }

  registerWheelEvent()
  registerMouseEvent()
  updateTableStyle()
}
