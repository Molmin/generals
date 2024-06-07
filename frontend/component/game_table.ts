import { GeneralsGame } from '../lib/game'

export class GameTable {
  nowSize = 32
  nowLeft = 30
  nowTop = 30

  isDown = false
  fromX = 0
  fromY = 0
  lastLeft = 0
  lastTop = 0

  constructor(
    public game: GeneralsGame,
  ) {
    this.updateTableStyle()
    $(document).on('wheel', (ev) => this.handleWheelEvent((ev.originalEvent as Event)['deltaY']))
    $(document).on('mousedown', (ev) => this.handleMouseDown(ev))
    $(document).on('mouseup', (ev) => this.handleMouseUp(ev))
    $(document).on('mousemove', (ev) => this.handleMouseMove(ev))
  }

  updateSize(size: number) {
    this.nowSize = size
    this.updateTableStyle()
  }

  updateTableStyle() {
    $('.game-table-container').attr('style', [
      `top: ${this.nowTop}px;`,
      `left: ${this.nowLeft}px;`,
    ].join(' '))
    this.game.$table.attr('style', [
      `--cell-size: ${this.nowSize}px;`,
      `--bg-size: ${this.nowSize / 32 * 25}px;`,
      `--number-size: ${this.nowSize / 32 * 3 + 9}px;`,
    ].join(' '))
  }

  handleWheelEvent(deltaY: number) {
    if (Math.abs(deltaY) < 1) return
    this.nowSize += (Math.abs(deltaY) / deltaY) * Math.log(Math.abs(deltaY))
    this.nowSize = Math.min(Math.max(this.nowSize, 16), 100)
    this.updateTableStyle()
  }

  handleMouseDown(ev: JQuery.MouseDownEvent) {
    this.lastLeft = this.nowLeft
    this.lastTop = this.nowTop
    this.fromX = ev.clientX
    this.fromY = ev.clientY
    this.isDown = true
  }
  handleMouseUp(ev: JQuery.MouseUpEvent) {
    if (!this.isDown) return
    this.isDown = false
    this.nowLeft = this.lastLeft + ev.clientX - this.fromX
    this.nowTop = this.lastTop + ev.clientY - this.fromY
    this.updateTableStyle()
  }
  handleMouseMove(ev: JQuery.MouseMoveEvent) {
    if (!this.isDown) return
    this.nowLeft = this.lastLeft + ev.clientX - this.fromX
    this.nowTop = this.lastTop + ev.clientY - this.fromY
    this.updateTableStyle()
  }
}
