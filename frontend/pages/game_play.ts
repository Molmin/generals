import superagent from 'superagent'
import { io as SocketIO } from 'socket.io-client'
import { } from '../lib/jquery'
import { UserService } from '../lib/user'
import { GeneralsGame, Message, PlayerInfo } from '../lib/game'
import { Alert, ChatBox, LeaderBoard } from '../component'
import { getPathName, redirectTo } from '../lib/path'

async function getInfo() {
  const id = +getPathName().split('/')[2]
  const { body } = await superagent.post('/game/info')
    .send({ token: UserService.token, id })
  if (body.error || ![body.player1, body.player2].includes(UserService.uid) || body.done)
    redirectTo('/')
  return body
}

export async function init() {
  const info = await getInfo()
  console.info('game.info', info)
  const game = new GeneralsGame()
  const chatbox = new ChatBox(game)
  const socket = SocketIO(`${window.location.protocol.replace('http', 'ws')}//${window.location.host}`)
  game.socket = socket
  let interval: NodeJS.Timeout

  socket.emit('token', UserService.token)
  socket.emit('join', info.gameId)

  socket.on('error', (message: string) => {
    window.alert(message)
    redirectTo('/')
  })

  socket.on('update', (data: {
    players: Array<PlayerInfo>
    map: string
    turn: number
    isHalf: boolean
    doneSteps: Array<string>
    messages: Array<Message>
  }) => {
    game.markStepsAsDone(data.doneSteps)
    game.updatePlayers(data.players)
    game.updateMap(data.map)
    LeaderBoard.update(data.players)
    for (const message of data.messages) chatbox.onMessage(message)
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

  socket.on('recieveMessage', (message: Message) => {
    chatbox.onMessage(message)
  })

  socket.on('end', async (data: {
    won: boolean
    killBy?: number
  }) => {
    console.info('game.end', data)
    const killByName = game.players.filter((player) => player.id === data.killBy)[0]?.name
    game.endGame()
    const result = await new Alert(
      data.won ? 'You won!' : 'Game Over',
      data.won ? '' : `You were defeated by <span class="bold">${killByName}</span>.`,
      [
        {
          text: 'Play Again',
          class: 'small inverted',
          key: 'play-again',
        },
        {
          text: 'Watch Replay',
          class: 'small inverted',
          key: 'replay',
        },
        {
          text: 'Exit',
          class: 'inverted',
          key: 'exit',
        },
      ]
    ).open()
    redirectTo('/')
  })

  setInterval(() => socket.emit('ping'), 15000)
}
