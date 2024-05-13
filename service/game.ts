import { GeneralsGame, Step } from '../lib/game'

const games: Record<number, GeneralsGame> = {}

export function addGame(id: number, players: Array<number>, startAt: number) {
    games[id] = new GeneralsGame(id, players, startAt)
    games[id].initialize()
}

export function getCurrentInformation(id: number, player: number) {
    return games[id].getInformation(games[id].playerToId[player])
}

export function updateSteps(id: number, player: number, steps: Array<Step>) {
    games[id].steps[games[id].playerToId[player]] = steps
}
