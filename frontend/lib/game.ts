import { } from './jquery'
import { UserService } from './user'

export interface Cell {
  type: 'general' | 'city' | 'empty' | 'mountain' | 'unknown' | 'obstacle'
  owner: number
  army: number
}

export function getArmyDisplay(army: Cell | number) {
  if (typeof army !== 'number') army = army.army
  return army > 0 ? army.toString() : ''
}

export enum SELECT_STATUS {
  SELECTED = 1,
  SELECTED_HALF = 2,
  NOT_SELECTED = 3,
}

let initializedTable = false

export class GeneralsGame {
  now: Array<Array<Cell>> = []
  $table = $('.page--game_play .game-table')
  width = 0
  height = 0
  me = 0

  nowSelectX = -1
  nowSelectY = -1
  nowSelectStatus = SELECT_STATUS.NOT_SELECTED

  updatePlayers(
    players: Array<{
      uid: number
      name: string
      army: number
      land: number
    }>
  ) {
    this.me = players.map((player, index) => [index + 1, player.uid])
      .filter((player) => player[1] === UserService.uid)[0][0]
  }

  updateMap(str: string) {
    console.info(this.nowSelectX, this.nowSelectY, this.nowSelectStatus)
    const map = str.split(';').map((line) => line.split(','))
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
      $(document).on('click', '.page--game_play table', (ev) => this.handleSelect(ev))
      initializedTable = true
    }
    for (let x = 0; x < this.height; x++)
      for (let y = 0; y < this.width; y++) {
        const type = map[x][y][0]
        this.now[x][y] = {
          type: type === 'g' ? 'general' : type === 'c' ? 'city' : type === 'e'
            ? 'empty' : type === 'm' ? 'mountain' : type === 'u' ? 'unknown' : 'obstacle',
          owner: +map[x][y][1],
          army: +map[x][y].replace(/^[a-z][0-9]/, ''),
        }
      }
    for (let x = 0; x < this.height; x++)
      for (let y = 0; y < this.width; y++) {
        const cell = this.now[x][y]
        const td = this.$table.find(`td[data-x="${x}"][data-y="${y}"]`)
        const shouldRemove = (td.attr('class') || '').split(' ').filter((css) => css.startsWith('type--') || css.startsWith('owner--'))
        for (const css of shouldRemove) td.removeClass(css)
        td.addClass(`type--${cell.type}`), td.addClass(`owner--${cell.owner}`)
        this.updateSelectStatus(x, y)
      }
  }

  updateSelectStatus(x: number, y: number, flag = false) {
    if (x < 0 || y < 0) return
    if (flag) {
      this.updateSelectStatus(x + 1, y)
      this.updateSelectStatus(x - 1, y)
      this.updateSelectStatus(x, y + 1)
      this.updateSelectStatus(x, y - 1)
    }
    const td = this.$table.find(`td[data-x="${x}"][data-y="${y}"]`)
    const cell = this.now[x][y]
    const displayHalf = this.nowSelectX === x && this.nowSelectY === y && this.nowSelectStatus === SELECT_STATUS.SELECTED_HALF
    if (!displayHalf) td.text(getArmyDisplay(cell))
    if (displayHalf && td.text() !== '50%') td.text('50%')
    const ensureNoClass = (css: string) => { if (td.hasClass(css)) td.removeClass(css) }
    const ensureHasClass = (css: string) => { if (!td.hasClass(css)) td.addClass(css) }
    const ensureClass = (css: string, has: boolean) => { has ? ensureHasClass(css) : ensureNoClass(css) }
    if (this.nowSelectX === x && this.nowSelectY === y) {
      ensureHasClass('selected')
      ensureNoClass('attackable'), ensureHasClass('selectable')
    }
    else {
      const attackable = Math.abs(this.nowSelectX - x) + Math.abs(this.nowSelectY - y) === 1
      ensureNoClass('selected')
      ensureClass('attackable', attackable)
      ensureClass('selectable', attackable || cell.owner === this.me)
    }
  }

  handleAddStep(fromX: number, fromY: number, toX: number, toY: number, half: boolean) { }

  handleSelect(ev: JQuery.ClickEvent) {
    const target = $(ev.target)
    const x = this.nowSelectX, y = this.nowSelectY
    const newX = +(target.attr('data-x') || '0'), newY = +(target.attr('data-y') || '0')
    function clearSelect() {
      console.info('clearSelect:', this.nowSelectX, this.nowSelectY)
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
      if (this.nowSelectStatus === SELECT_STATUS.SELECTED_HALF) return clearSelect.bind(this)()
      this.nowSelectStatus = SELECT_STATUS.SELECTED_HALF
      this.updateSelectStatus(x, y)
    }
    else if (target.hasClass('selectable')) {
      this.nowSelectStatus = SELECT_STATUS.SELECTED
      this.nowSelectX = newX, this.nowSelectY = newY
      this.updateSelectStatus(x, y, true)
      this.updateSelectStatus(newX, newY, true)
    }
    else return clearSelect.bind(this)()
  }
}
