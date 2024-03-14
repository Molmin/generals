import { } from './jquery'
import { UserService } from './user'

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
      $(document).on('click', '.page--game_play .game-table td', (ev) => this.handleSelect(ev))
      initializedTable = true
    }
    for (let x = 0; x < this.height; x++)
      for (let y = 0; y < this.width; y++) {
        const type = map[x][y][0]
        const cell = this.now[x][y] = {
          type: type === 'g' ? 'general' : type === 'c' ? 'city' : type === 'e'
            ? 'empty' : type === 'm' ? 'mountain' : type === 'u' ? 'unknown' : 'obstacle',
          owner: +map[x][y][1],
          army: +map[x][y].replace(/^[a-z][0-9]/, ''),
        }
        const td = this.$table.find(`td[data-x="${x}"][data-y="${y}"]`)
        const nowClass = (td.attr('class') || '').split(' ')
        td.attr('class', [
          `type--${cell.type}`,
          `owner--${cell.owner}`,
          cell.owner === this.me ? 'selectable' : '',
          nowClass.includes('selected') ? 'selected' : '',
          nowClass.includes('attackable') ? 'attackable' : '',
        ].filter((x) => x).join(' '))
        if (this.nowSelectStatus === SELECT_STATUS.SELECTED_HALF && this.nowSelectX === x && this.nowSelectY === y) td.text('50%')
        else td.text(cell.army > 0 ? cell.army.toString() : '')
      }
  }


  addSelectClass(x: number, y: number) {
    this.$table.find(`td[data-x="${x}"][data-y="${y}"]`).addClass('selected')
    this.$table.find(`td[data-x="${x + 1}"][data-y="${y}"]`).addClass('attackable')
    this.$table.find(`td[data-x="${x - 1}"][data-y="${y}"]`).addClass('attackable')
    this.$table.find(`td[data-x="${x}"][data-y="${y + 1}"]`).addClass('attackable')
    this.$table.find(`td[data-x="${x}"][data-y="${y - 1}"]`).addClass('attackable')
  }
  removeSelectClass(x: number, y: number) {
    this.$table.find(`td[data-x="${x}"][data-y="${y}"]`).text(this.now[x][y].army > 0 ? this.now[x][y].army.toString() : '')
    this.$table.find(`td[data-x="${x}"][data-y="${y}"]`).removeClass('selected')
    this.$table.find(`td[data-x="${x + 1}"][data-y="${y}"]`).removeClass('attackable')
    this.$table.find(`td[data-x="${x - 1}"][data-y="${y}"]`).removeClass('attackable')
    this.$table.find(`td[data-x="${x}"][data-y="${y + 1}"]`).removeClass('attackable')
    this.$table.find(`td[data-x="${x}"][data-y="${y - 1}"]`).removeClass('attackable')
  }

  handleSelect(ev: JQuery.ClickEvent) {
    const target = $(ev.currentTarget)
    if (!target.hasClass('attackable') && !target.hasClass('selectable')) {
      if (this.nowSelectStatus === SELECT_STATUS.NOT_SELECTED) return
      this.removeSelectClass(this.nowSelectX, this.nowSelectY)
      this.nowSelectStatus = SELECT_STATUS.NOT_SELECTED
      this.nowSelectX = -1
      this.nowSelectY = -1
      return
    }
    const x = +(target.attr('data-x') || '')
    const y = +(target.attr('data-y') || '')
    if (this.nowSelectStatus !== SELECT_STATUS.NOT_SELECTED) {
      if (this.nowSelectX === x && this.nowSelectY === y) {
        if (this.nowSelectStatus === SELECT_STATUS.SELECTED) {
          this.nowSelectStatus = SELECT_STATUS.SELECTED_HALF
          target.text('50%')
        }
        else {
          this.removeSelectClass(x, y)
          this.nowSelectStatus = SELECT_STATUS.NOT_SELECTED
          this.nowSelectX = -1
          this.nowSelectY = -1
        }
      }
      else if (Math.abs(this.nowSelectX - x) + Math.abs(this.nowSelectY - y) === 1) {
        this.removeSelectClass(this.nowSelectX, this.nowSelectY)
        this.nowSelectStatus = SELECT_STATUS.SELECTED
        this.nowSelectX = x
        this.nowSelectY = y
      }
    }
    else {
      this.nowSelectStatus = SELECT_STATUS.SELECTED
      this.nowSelectX = x
      this.nowSelectY = y
      this.addSelectClass(x, y)
    }
  }
}
