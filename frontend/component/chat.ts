import { GeneralsGame, Message } from '../lib/game'

export class ChatBox {
  constructor(
    public game: GeneralsGame
  ) { }

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
}
