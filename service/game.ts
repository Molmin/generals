import { GeneralsGame } from '../lib/game'

const games: Record<number, GeneralsGame> = {}

export function addGame(id: number, players: Array<number>, startAt: number) {
    games[id] = new GeneralsGame(id, players, startAt)
    games[id].initialize()
}

export function getCurrentInformation(id: number, player: number) {
    return games[id].getInformation(games[id].playerToId[player])
}
