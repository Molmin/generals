import { ChatBox, LeaderBoard } from '../component'
import { GeneralsGame, Message, PLAYER_STATUS, PlayerInfo } from './game'

export interface GeneralsReplay {
  replayVersion: number
  playerToId: Record<number, number>
  idToPlayer: Record<number, number>
  initial: Array<string>
  turns: Array<string>
  messages: Array<Message>
}

export class GeneralsGameReplay extends GeneralsGame {
  isReplay = true
  nowTurn = 1
  isHalf = false
  chatbox: ChatBox

  constructor(
    public replay: GeneralsReplay,
  ) {
    super()
    this.chatbox = new ChatBox(this)
    this.reset()
    this.updatePlayers()
  }

  nowMessageId = 0
  reset() {
    this.nowMessageId = 0
    this.chatbox.clearMessage()
    this.updateMap(this.replay.initial.join(';'))
  }

  turnToNumber(turn: number, isHalf: boolean) {
    return turn * 2 + (isHalf ? 1 : 0) - 3
  }

  gotoTurn(turn: number, isHalf: boolean) {
    let now = this.turnToNumber(this.nowTurn, this.isHalf)
    const target = this.turnToNumber(turn, isHalf)
    const notAvailable = target < -1
      || target >= this.replay.turns.length
      || Math.floor(target) !== target
    if (notAvailable) return
    $('.page--game_play > .turn-counter').text(`Turn ${turn}${isHalf ? '.' : ''}`)
    if (now >= target) {
      this.reset()
      now = -1
    }
    for (let i = now + 1; i <= target; i++) {
      const diffs = this.replay.turns[i].split(',')
      for (const d of diffs) if (d) this.updateDiffMap(d)
    }
    const nextMessage = () => this.replay.messages[this.nowMessageId]
    while (this.turnToNumber(nextMessage().turn, nextMessage().isHalf) <= target) {
      this.chatbox.onMessage(nextMessage())
      this.nowMessageId++
    }
    this.updatePlayers()
    this.nowTurn = turn, this.isHalf = isHalf
  }

  updatePlayers() {
    const playerArmy: Record<number, number> = {}
    const playerLand: Record<number, number> = {}
    for (let i = 0; i < this.now.length; i++)
      for (let j = 0; j < this.now[0].length; j++) {
        const { owner, army } = this.now[i][j]
        playerLand[owner] = (playerLand[owner] || 0) + 1
        playerArmy[owner] = (playerArmy[owner] || 0) + army
      }
    this.players = Object.entries(this.replay.idToPlayer).map(([id, uid]) => ({
      id: +id,
      uid,
      name: uid.toString(),
      army: playerArmy[+id] || 0,
      land: playerLand[+id] || 0,
      status: (playerLand[+id] || 0) === 0 ? PLAYER_STATUS.DEAD : PLAYER_STATUS.PLAYING,
    })).sort((x, y) => x.army === y.army ? y.land - x.land : y.army - x.army)
    LeaderBoard.update(this.players)
  }

  updateDiffMap(diff: string) {
    const cellId = +diff.replace(/[a-z]\d+/, '')
    const x = Math.floor(cellId / this.now[0].length)
    const y = cellId % this.now[0].length
    const type = diff.replace(/\d/g, '')
    this.now[x][y].type = type === 'g' ? 'general' : type === 'c' ? 'city' : type === 'e' ? 'empty' : 'mountain'
    const extra = diff.replace(/\d+[a-z]/, '')
    this.now[x][y].owner = +extra[0]
    this.now[x][y].army = +extra.slice(1)
    this.updateCell(x, y)
    this.updateSelectStatus(x, y)
  }
}
