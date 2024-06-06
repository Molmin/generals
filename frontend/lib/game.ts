import { Socket } from 'socket.io-client'
import { } from './jquery'
import { UserService } from './user'

export interface PlayerInfo {
  id: number
  uid: number
  name: string
  army: number
  land: number
  status: PLAYER_STATUS
}

export interface Cell {
  type: 'general' | 'city' | 'empty' | 'mountain' | 'unknown' | 'obstacle'
  owner: number
  army: number
}

export enum SELECT_STATUS {
  SELECTED = 1,
  SELECTED_HALF = 2,
  NOT_SELECTED = 3,
}

export enum PLAYER_STATUS {
  PLAYING = 1,
  SURRENDERED = 2,
  DEAD = 3,
}

export type Step = [[number, number], [number, number], boolean, string]

export function newStepId() {
  const get = () => String.fromCharCode(97 + Math.floor(Math.random() * 26))
  return `${Date.now()}${get()}${get()}${get()}${get()}`
}

let initializedTable = false

export class GeneralsGame {
  now: Array<Array<Cell>> = []
  $table = $('.page--game_play .game-table')
  width = 0
  height = 0
  me = 0
  steps: Array<Step> = []
  socket: Socket
  players: Array<PlayerInfo> = []
  gameEnded = false

  nowSelectX = -1
  nowSelectY = -1
  nowSelectStatus = SELECT_STATUS.NOT_SELECTED

  endGame() {
    this.gameEnded = true
  }

  updatePlayers(
    players: Array<PlayerInfo>
  ) {
    this.players = players
    this.me = players.filter((player) => player.uid === UserService.uid)[0].id
  }

  updateMap(str: string) {
    const map = str.split(';').map((line) => line.split(','))
    const flag = initializedTable
    if (!initializedTable) {
      this.width = map[0].length
      this.height = map.length
      for (let i = 0; i < this.height; i++)
        this.now.push(new Array(this.width).fill({ type: 'empty', owner: 0, army: 0 }))
      for (let i = 0; i < this.height; i++) {
        this.$table.append(`<tr data-x="${i}"></tr>`)
        for (let j = 0; j < this.width; j++) {
          this.$table.find(`tr[data-x="${i}"]`).append(`<td data-x="${i}" data-y="${j}"></td>`)
        }
      }
      $(document).on('click', '.page--game_play table', (ev) => this.handleClickByEvent(ev))
      $(document).on('keydown', (ev) => this.handleKeydown(ev))
      initializedTable = true
    }
    const updated: string[] = []
    for (let x = 0; x < this.height; x++)
      for (let y = 0; y < this.width; y++) {
        const type = map[x][y][0]
        const newData: Cell = {
          type: type === 'g' ? 'general' : type === 'c' ? 'city' : type === 'e'
            ? 'empty' : type === 'm' ? 'mountain' : type === 'u' ? 'unknown' : 'obstacle',
          owner: +map[x][y][1],
          army: +map[x][y].replace(/^[a-z][0-9]/, ''),
        }
        if (!flag || !['type', 'owner', 'army'].every((key) => this.now[x][y][key] === newData[key])) updated.push(`${x},${y}`)
        this.now[x][y] = newData
      }
    for (let x = 0; x < this.height; x++)
      for (let y = 0; y < this.width; y++) {
        const cell = this.now[x][y]
        const td = this.$table.find(`td[data-x="${x}"][data-y="${y}"]`)
        const nowClass = (td.attr('class') || '').split(' ')
        if (!nowClass.includes(`type--${cell.type}`)) {
          for (const css of nowClass.filter((css) => css.startsWith('type--'))) td.removeClass(css)
          td.addClass(`type--${cell.type}`)
        }
        if (!nowClass.includes(`owner--${cell.owner}`)) {
          for (const css of nowClass.filter((css) => css.startsWith('owner--'))) td.removeClass(css)
          td.addClass(`owner--${cell.owner}`)
        }
        if (updated.includes(`${x},${y}`)) this.updateSelectStatus(x, y)
      }
  }

  async updateSelectStatus(x: number, y: number, flag = false) {
    if (x < 0 || y < 0 || x >= this.height || y >= this.width) return
    if (flag) {
      await Promise.all([
        this.updateSelectStatus(x + 1, y),
        this.updateSelectStatus(x - 1, y),
        this.updateSelectStatus(x, y + 1),
        this.updateSelectStatus(x, y - 1),
      ])
    }
    const td = this.$table.find(`td[data-x="${x}"][data-y="${y}"]`)
    const cell = this.now[x][y]
    const displayHalf = this.nowSelectX === x && this.nowSelectY === y && this.nowSelectStatus === SELECT_STATUS.SELECTED_HALF
    const displayText = displayHalf ? '50%' : (cell.army > 0 || (cell.owner === 0 && cell.army === 0 && cell.type === 'city') ? cell.army.toString() : '')
    function buildArrow(steps: Array<Step>, dx: number, dy: number, ele: string) {
      const docs = steps.filter((doc) => doc[0][0] === x && doc[0][1] === y && doc[1][0] === x + dx && doc[1][1] === y + dy)
      return docs.length > 0 ? ele : ''
    }
    td.html([
      buildArrow(this.steps, 0, -1, '<div class="center-vertical" style="left: 0px;">←</div>'),
      buildArrow(this.steps, 0, 1, '<div class="center-vertical" style="right: 0px;">→</div>'),
      buildArrow(this.steps, -1, 0, '<div class="center-horizontal" style="top: 0px;">↑</div>'),
      buildArrow(this.steps, 1, 0, '<div class="center-horizontal" style="bottom: 0px;">↓</div>'),
      displayText,
    ].join(''))
    const ensureNoClass = (css: string) => { if (td.hasClass(css)) td.removeClass(css) }
    const ensureHasClass = (css: string) => { if (!td.hasClass(css)) td.addClass(css) }
    const ensureClass = (css: string, has: boolean) => { has ? ensureHasClass(css) : ensureNoClass(css) }
    if (this.nowSelectX === x && this.nowSelectY === y) {
      ensureHasClass('selected')
      ensureNoClass('attackable'), ensureHasClass('selectable')
    }
    else {
      let attackable = Math.abs(this.nowSelectX - x) + Math.abs(this.nowSelectY - y) === 1
      attackable &&= cell.type !== 'mountain'
      ensureNoClass('selected')
      ensureClass('attackable', attackable)
      ensureClass('selectable', attackable || cell.owner === this.me)
    }
  }

  handleAddStep(fromX: number, fromY: number, toX: number, toY: number, half: boolean) {
    this.steps.push([[fromX, fromY], [toX, toY], half, newStepId()])
    this.updateSelectStatus(fromX, fromY)
    this.sendSteps()
  }
  async sendSteps() {
    this.socket.emit('updateSteps', this.steps)
  }
  sendSurrenderMessage() {
    this.socket.emit('surrender')
  }
  markStepsAsDone(done: Array<string>) {
    const removedSteps = this.steps.filter((step) => done.includes(step[3]))
    this.steps = this.steps.filter((step) => !done.includes(step[3]))
    for (const step of removedSteps) this.updateSelectStatus(step[0][0], step[0][1])
    this.sendSteps()
  }

  async handleClick(target: JQuery<any>, shortcut = true) {
    const x = this.nowSelectX, y = this.nowSelectY
    const newX = +(target.attr('data-x') || '0'), newY = +(target.attr('data-y') || '0')
    function clearSelect() {
      if (shortcut) return
      this.nowSelectStatus = SELECT_STATUS.NOT_SELECTED
      this.nowSelectX = this.nowSelectY = -1
      this.updateSelectStatus(x, y, true)
    }
    if (typeof target.attr('data-y') !== 'string') return clearSelect.bind(this)()
    if (target.hasClass('attackable')) {
      this.nowSelectX = newX, this.nowSelectY = newY
      this.handleAddStep(x, y, this.nowSelectX, this.nowSelectY, this.nowSelectStatus === SELECT_STATUS.SELECTED_HALF)
      this.nowSelectStatus = SELECT_STATUS.SELECTED
      this.updateSelectStatus(x, y, true)
      this.updateSelectStatus(newX, newY, true)
    }
    else if (x === newX && y === newY) {
      const alreadyHalf = this.nowSelectStatus === SELECT_STATUS.SELECTED_HALF
      if (alreadyHalf && !shortcut) return clearSelect.bind(this)()
      this.nowSelectStatus = alreadyHalf ? SELECT_STATUS.SELECTED : SELECT_STATUS.SELECTED_HALF
      this.updateSelectStatus(x, y)
    }
    else if (target.hasClass('selectable')) {
      console.info('select position', newX, newY)
      this.nowSelectStatus = SELECT_STATUS.SELECTED
      this.nowSelectX = newX, this.nowSelectY = newY
      this.updateSelectStatus(x, y, true)
      this.updateSelectStatus(newX, newY, true)
    }
    else return clearSelect.bind(this)()
  }
  handleClickByEvent(ev: JQuery.ClickEvent) {
    this.handleClick($(ev.target), false)
  }

  handleKeydown(ev: JQuery.KeyDownEvent) {
    if (this.nowSelectStatus === SELECT_STATUS.NOT_SELECTED) return
    if (['ArrowUp', 'KeyW'].includes(ev.code)) return this.handleClick(this.$table.find(`td[data-x="${this.nowSelectX - 1}"][data-y="${this.nowSelectY}"]`))
    if (['ArrowDown', 'KeyS'].includes(ev.code)) return this.handleClick(this.$table.find(`td[data-x="${this.nowSelectX + 1}"][data-y="${this.nowSelectY}"]`))
    if (['ArrowLeft', 'KeyA'].includes(ev.code)) return this.handleClick(this.$table.find(`td[data-x="${this.nowSelectX}"][data-y="${this.nowSelectY - 1}"]`))
    if (['ArrowRight', 'KeyD'].includes(ev.code)) return this.handleClick(this.$table.find(`td[data-x="${this.nowSelectX}"][data-y="${this.nowSelectY + 1}"]`))
    if (ev.code === 'KeyZ') return this.handleClick(this.$table.find(`td[data-x="${this.nowSelectX}"][data-y="${this.nowSelectY}"]`))
    if (ev.code === 'KeyQ') {
      const steps = this.steps
      this.steps = []
      for (const step of steps) this.updateSelectStatus(step[0][0], step[0][1])
      return this.sendSteps()
    }
    if (ev.code === 'KeyE') {
      const step = this.steps.pop()
      if (!step) return
      this.updateSelectStatus(step[0][0], step[0][1])
      if (step[1][0] === this.nowSelectX && step[1][1] === this.nowSelectY) {
        this.nowSelectX = step[0][0], this.nowSelectY = step[0][1], this.nowSelectStatus = SELECT_STATUS.SELECTED
        this.updateSelectStatus(step[0][0], step[0][1], true)
        this.updateSelectStatus(step[1][0], step[1][1], true)
      }
      return this.sendSteps()
    }
    if (ev.code === 'Escape') return this.sendSurrenderMessage()
  }
}
