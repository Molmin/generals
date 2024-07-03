import { GeneralsGame, Message } from '../lib/game'

export class ChatBox {
  constructor(
    public game: GeneralsGame
  ) {
    $(document).on('keypress', '.chat-box-input', (ev) => this.handleInputKeypress(ev))
    if (this.game.isReplay) {
      $('.chat-box-input').addClass('hidden')
    }
  }

  getPlayerHtml(playerId: number): string | null {
    const player = this.game.players.filter((player) => player.id === playerId)
    if (player.length === 0) return null
    else return `<span class="inline-color-block owner--${playerId}"></span>${player[0].name}`
  }

  onMessage(message: Message) {
    $('.chat-messages-container').append(`
      <p class="chat-message${message.from === 0 ? ' system-message' : ''}">
        ${message.from === 0
        ? '<span class="system-message-spacer"></span>'
        : this.getPlayerHtml(message.from)}
        ${message.content.replace(/\{[0-9]\}/g, (str) => {
          const id = +str.replace(/[^0-9]/g, '')
          const playerId = message.params[id]
          if (!playerId) return str
          return this.getPlayerHtml(playerId) || str
        })}
        <span class="turn">${message.turn}${message.isHalf ? '.' : ''}</span>
      </p>
    `)
  }

  clearMessage() {
    $('.chat-messages-container').children().remove()
  }

  handleInputKeypress(ev: JQuery.KeyPressEvent) {
    if (ev.code !== 'Enter') return
    const content = $('.chat-box-input').val()?.toString() || ''
    if (content.trim()) this.game.socket.emit('sendMessage', content)
    $('.chat-box-input').val('')
  }
}
