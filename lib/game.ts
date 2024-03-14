import { GameInformation, sendMessage } from '../server'
import { generate } from './map'

export interface Cell {
    type: 'general' | 'city' | 'empty' | 'mountain'
    owner: number
    army: number
}

export interface GeneralsPlayback {
    playerToId: Record<number, number>
    idToPlayer: Record<number, number>
    initial: Array<string>
    turns: Array<Record<number, [[number, number], [number, number]] | null>>
}

export class GeneralsGame {
    now: Array<Array<Cell>> = []
    playerToId: Record<number, number> = {}
    idToPlayer: Record<number, number> = {}
    died: Record<number, boolean> = {}
    record: GeneralsPlayback = {
        playerToId: {},
        idToPlayer: {},
        initial: [],
        turns: [],
    }
    service: Array<NodeJS.Timeout> = []
    turn = 1

    constructor(
        public roomId: number,
        public players: number[],
        public startAt: number,
    ) {
        for (let id = 0; id < players.length; id++) {
            this.playerToId[players[id]] = id + 1
            this.idToPlayer[id + 1] = players[id]
            this.died[id + 1] = false
        }
        this.record.playerToId = this.playerToId
        this.record.idToPlayer = this.idToPlayer
    }

    async startService() {
        await new Promise((resolve) => setTimeout(resolve, this.startAt - 500 - Date.now()))
        this.service.push(setInterval(() => this.handleHalfTurn(), 1000))
        await new Promise((resolve) => setTimeout(resolve, this.startAt - Date.now()))
        this.service.push(setInterval(() => this.handleTurn(), 1000))
        this.sendMap(false)
    }

    initialize() {
        this.record = {
            playerToId: {},
            idToPlayer: {},
            initial: [],
            turns: [],
        }
        this.record.initial = generate()
        const generals: Array<[number, number]> = []
        this.now = this.record.initial.map((line, x) => {
            return line.split('').map((cell, y) => {
                if (cell === '.') return { type: 'empty', owner: 0, army: 0 }
                if (cell === 'm') return { type: 'mountain', owner: 0, army: 0 }
                if (cell === 'g') {
                    generals.push([x, y])
                    return { type: 'general', owner: 0, army: 1 }
                }
                const cost = cell === 'x' ? 50 : 40 + +cell
                return { type: 'city', owner: 0, army: cost }
            })
        })
        let ids: Array<[number, number]> = []
        for (let id = 1; id <= this.players.length; id++)ids.push([id, Math.random()])
        ids = ids.sort((x, y) => x[1] - y[1])
        for (let i = 0; i < generals.length; i++)
            this.now[generals[i][0]][generals[i][1]].owner = ids[i][0]
        this.startService()
    }

    getInformation(player: number, isHalf = false): GameInformation {
        const canView: string[] = []
        for (let i = 0; i < this.now.length; i++)
            for (let j = 0; j < this.now[0].length; j++)
                if (this.now[i][j].owner === player) {
                    for (let u = -1; u <= 1; u++)
                        for (let v = -1; v <= 1; v++)
                            canView.push([i + u, j + v].toString())
                }
        const data = this.now.map((line, x) => line.map((cell, y) => {
            if (canView.includes([x, y].toString())) return cell
            else return {
                type: ['city', 'mountain'].includes(cell.type) ? 'obstacle' : 'unknown',
                owner: 0,
                army: 0,
            }
        }))
        return {
            players: this.players.map((id) => ({
                uid: id,
                name: id.toString(),
                army: 0,
                land: 0,
            })),
            map: data.map((line) => line.map((cell) => `${cell.type[0]}${cell.owner}${cell.army}`).join(',')).join(';'),
            turn: this.turn,
            isHalf,
        }
    }

    sendMap(isHalf: boolean) {
        sendMessage(this.roomId, (uid: number) => {
            const id = this.playerToId[uid]
            return this.getInformation(id, isHalf)
        })
    }

    handleTurn() {
        this.turn++
        for (let i = 0; i < this.now.length; i++)
            for (let j = 0; j < this.now[0].length; j++) {
                if (this.now[i][j].owner) {
                    if (['city', 'general'].includes(this.now[i][j].type)) {
                        this.now[i][j].army++
                    }
                    else if (this.now[i][j].type === 'empty') {
                        if (this.turn % 25 === 0) this.now[i][j].army++
                    }
                }
            }
        this.sendMap(false)
    }

    handleHalfTurn() {
        this.sendMap(true)
    }
}
