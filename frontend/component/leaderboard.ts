import { PLAYER_STATUS, PlayerInfo } from '../lib/game'

export function update(players: Array<PlayerInfo>) {
  $('.game-leaderboard > tbody').html(`
    <tr>
      <td><span style="white-space: nowrap;"><span style="color: gold;">★ </span></span></td>
      <td>Player</td>
      <td>Army</td>
      <td>Land</td>
    </tr>
    ${players.map((player) => `
      <tr class="${player.status === PLAYER_STATUS.DEAD ? 'dead' : player.status === PLAYER_STATUS.SURRENDERED ? 'surrendered' : ''}">
        <td><span style="white-space: nowrap;"><span style="color: gold;">★ </span>0</span></td>
        <td class="leaderboard-name owner--${player.id}">${player.name}</td>
        <td>${player.army}</td>
        <td>${player.land}</td>
      </tr>
    `).join('')}
  `)
}
