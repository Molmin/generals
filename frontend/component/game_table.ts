import { GeneralsGame } from '../lib/game'

export function registerGameTableComponent(game: GeneralsGame) {
  let nowSize = 32
  let nowLeft = 30, nowTop = 30
  function updateTableStyle() {
    $('.game-table-container').attr('style', [
      `top: ${nowTop}px;`,
      `left: ${nowLeft}px;`,
    ].join(' '))
    game.$table.attr('style', [
      `--cell-size: ${nowSize}px;`,
      `--bg-size: ${nowSize / 32 * 25}px;`,
      `--number-size: ${nowSize / 32 * 3 + 9}px;`,
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