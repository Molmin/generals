import { DataBase } from './database'

export type GameSummary = [number, number, number, number, boolean, boolean, string, boolean]
// [0 gameId, 1 startAt, 2 player1, 3 player2, 4 done, 5 winner, 6 note, 7 system_error]

const db = new DataBase('game')
const data = db.get() as Record<number, GameSummary>

export default class Game {
    static add(player1: number, player2: number, startAt: number, note: string) {
        const maxId = Math.max(0, ...Object.keys(data).map((id) => +id))
        data[maxId + 1] = [maxId + 1, startAt, player1, player2, false, false, note, false]
        db.update(data)
        return maxId + 1
    }

    static get(id: number) {
        const game = data[id]
        if (!game) return null
        else return {
            gameId: game[0],
            startAt: game[1],
            player1: game[2],
            player2: game[3],
            done: game[4],
            winner: game[5] ? game[3] : game[2],
            note: game[6],
            system_error: game[7],
        }
    }

    static update(id: number, done: boolean, winner: boolean | number, note: string, system_error: boolean) {
        const game = data[id]
        if (!game) return
        data[id] = [id, game[1], game[2], game[3], done, typeof winner === 'boolean' ? winner : winner === game[3], note, system_error]
    }

    static list() {
        const ids = Object.keys(data)
        return ids.map((id) => Game.get(+id))
    }
}
