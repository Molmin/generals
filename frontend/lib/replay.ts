import { GeneralsGame } from './game'

export interface GeneralsReplay {
  replayVersion: number
  playerToId: Record<number, number>
  idToPlayer: Record<number, number>
  initial: Array<string>
  turns: Array<string>
}

export class GeneralsGameReplay extends GeneralsGame {
  isReplay = true
  nowTurn = 1
  isHalf = false

  constructor(
    public replay: GeneralsReplay
  ) {
    super()
    this.updateMap(this.replay.initial.join(';'))
  }

  gotoTurn(turn: number, isHalf: boolean) {
    const now = this.nowTurn * 2 + (this.isHalf ? 1 : 0) - 3
    const target = turn * 2 + (isHalf ? 1 : 0) - 3
    const notAvailable = target < -1
      || target >= this.replay.turns.length
      || Math.floor(target) !== target
    if (notAvailable) return
    $('.page--game_play > .turn-counter').text(`Turn ${turn}${isHalf ? '.' : ''}`)
    if (now < target) {
      for (let i = now + 1; i <= target; i++) {
        const diffs = this.replay.turns[i].split(',')
        for (const d of diffs) if (d) this.updateDiffMap(d)
      }
    }
    else {
      this.updateMap(this.replay.initial.join(';'))
      for (let i = 0; i <= target; i++) {
        const diffs = this.replay.turns[i].split(',')
        for (const d of diffs) if (d) this.updateDiffMap(d)
      }
    }
    this.nowTurn = turn, this.isHalf = isHalf
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
