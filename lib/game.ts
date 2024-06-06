import { GameInformation, sendGameEndMessage, sendGameInformation, sendMessage } from '../server'
import { generate } from './map'

export type CellType = 'general' | 'city' | 'empty' | 'mountain' | 'swamp' | 'obstacle' | 'unknown'

export interface Cell {
    type: CellType
    owner: number
    army: number
}

export function toShort(cell: Cell) {
    return `${cell.type[0]}${cell.owner}${cell.army}`
}

export enum PLAYER_STATUS {
    PLAYING = 1,
    SURRENDERED = 2,
    DEAD = 3,
}

export type Step = [[number, number], [number, number], boolean, string]

export interface GeneralsReplay {
    replayVersion: number
    playerToId: Record<number, number>
    idToPlayer: Record<number, number>
    initial: Array<string>
    turns: Array<string>
}

export class GeneralsGame {
    now: Array<Array<Cell>> = []
    playerToId: Record<number, number> = {}
    idToPlayer: Record<number, number> = {}
    died: Record<number, boolean> = {}
    replay: GeneralsReplay = {
        replayVersion: 20240606,
        playerToId: {},
        idToPlayer: {},
        initial: [],
        turns: [],
    }
    service: Array<NodeJS.Timeout> = []
    steps: Record<number, Array<Step>> = {}
    doneSteps: Record<number, Array<[string, number]>> = {}
    messages: Array<string> = []
    turn = 1
    isEnd = false

    constructor(
        public roomId: number,
        public players: number[],
        public startAt: number,
        public endCallback: (winner: number, replay: GeneralsReplay) => void,
    ) {
        for (let id = 0; id < players.length; id++) {
            this.playerToId[players[id]] = id + 1
            this.idToPlayer[id + 1] = players[id]
            this.died[id + 1] = false
            this.steps[id + 1] = []
            this.doneSteps[id + 1] = []
        }
        this.replay.playerToId = this.playerToId
        this.replay.idToPlayer = this.idToPlayer
    }

    async startService() {
        await new Promise((resolve) => setTimeout(resolve, this.startAt - Date.now()))
        this.service.push(setInterval(() => this.handle(), 500))
    }

    initialize() {
        const generals: Array<[number, number]> = []
        this.now = generate().map((row, x) => {
            return row.map((cell, y) => {
                if (cell.type === 'general') generals.push([x, y])
                return cell
            })
        })
        let ids: Array<[number, number]> = []
        for (let id = 1; id <= this.players.length; id++)ids.push([id, Math.random()])
        ids = ids.sort((x, y) => x[1] - y[1])
        for (let i = 0; i < generals.length; i++)
            this.now[generals[i][0]][generals[i][1]].owner = ids[i][0]
        this.replay.initial = this.now.map((row, x) => {
            return row.map(toShort).join(',')
        })
        this.startService()
    }

    getInformation(player: number, isHalf = false): GameInformation {
        const canView = new Set<string>()
        for (let i = 0; i < this.now.length; i++)
            for (let j = 0; j < this.now[0].length; j++)
                if (this.now[i][j].owner === player) {
                    for (let u = -1; u <= 1; u++)
                        for (let v = -1; v <= 1; v++)
                            canView.add([i + u, j + v].toString())
                }
        const data = this.now.map((line, x) => line.map((cell, y): Cell => {
            if (canView.has([x, y].toString())) return cell
            else return {
                type: ['city', 'mountain'].includes(cell.type) ? 'obstacle' : 'unknown',
                owner: 0,
                army: 0,
            }
        }))
        const playerArmy: Record<number, number> = {}
        const playerLand: Record<number, number> = {}
        for (let i = 0; i < this.now.length; i++)
            for (let j = 0; j < this.now[0].length; j++) {
                const { owner, army } = this.now[i][j]
                playerLand[owner] = (playerLand[owner] || 0) + 1
                playerArmy[owner] = (playerArmy[owner] || 0) + army
            }
        return {
            players: this.players.map((id, index) => ({
                id: index + 1,
                uid: id,
                name: id.toString(),
                army: playerArmy[index + 1] || 0,
                land: playerLand[index + 1] || 0,
                status: (playerLand[index + 1] || 0) === 0 ? PLAYER_STATUS.DEAD : PLAYER_STATUS.PLAYING,
            })).sort((x, y) => x.army === y.army ? y.land - x.land : y.army - x.army),
            map: data.map((line) => line.map((cell) => toShort(cell)).join(',')).join(';'),
            turn: this.turn,
            isHalf,
            doneSteps: this.doneSteps[player].map((step) => step[0]),
        }
    }

    sendMap(isHalf: boolean) {
        sendGameInformation(this.roomId, (uid: number) => {
            const id = this.playerToId[uid]
            return this.getInformation(id, isHalf)
        })
    }

    handleGameEnd(winner: number) {
        this.isEnd = true
        this.service.forEach((service) => clearInterval(service))
        this.service = []
        sendGameEndMessage(this.roomId, (uid: number) => {
            const id = this.playerToId[uid]
            if (winner === id) return { won: true }
            else return null
        })
        this.endCallback(this.idToPlayer[winner], this.replay)
    }
    handleKill(killed: number, killBy: number) {
        this.died[killed] = true
        sendGameEndMessage(this.roomId, (uid: number) => {
            const id = this.playerToId[uid]
            if (killed === id) return { won: false, killBy }
            else return null
        })
    }

    previousMap: Array<Array<string>> = []
    handleMove() {
        const players = Object.keys(this.idToPlayer).map((player) => ({ player, priority: Math.random() }))
            .sort((x, y) => x.priority - y.priority).map((doc) => +doc.player)
        for (const player of players) {
            const remove = this.doneSteps[player].filter((step) => Date.now() - step[1] >= 1000 * 10).map((step) => step[0])
            this.steps[player] = this.steps[player].filter((step) => !remove.includes(step[3]))
            const steps = this.steps[player].filter((step) => this.doneSteps[player].filter((doc) => doc[0] === step[3]).length === 0)
            let i = 0
            while (true) {
                const doStep = steps[i++]
                if (!doStep) break
                this.doneSteps[player].push([doStep[3], Date.now()])
                const [[fromX, fromY], [toX, toY], isHalf] = doStep
                const isInteger = (x: number) => Math.floor(x) === x && x >= 0
                if (![fromX, fromY, toX, toY].every(isInteger)) continue
                if (![fromX, toX].every((x) => x < this.now.length) || ![fromY, toY].every((x) => x < this.now[0].length)) continue
                const cell = this.now[fromX][fromY]
                const targetCell = this.now[toX][toY]
                if (cell.owner !== player || cell.army <= 1 || targetCell.type === 'mountain') continue
                const movableArmy = isHalf ? Math.floor(cell.army / 2) : cell.army - 1
                if (targetCell.owner === player) {
                    this.now[toX][toY].army += movableArmy
                    this.now[fromX][fromY].army -= movableArmy
                }
                else if (targetCell.army < movableArmy) {
                    this.now[toX][toY].army = movableArmy - targetCell.army
                    if (targetCell.type === 'general') {
                        const killed = this.now[toX][toY].owner
                        this.now[toX][toY].type = 'city'
                        for (let i = 0; i < this.now.length; i++)
                            for (let j = 0; j < this.now[0].length; j++)
                                if (this.now[i][j].owner === killed) this.now[i][j].owner = player
                        this.handleKill(killed, player)
                    }
                    else this.now[toX][toY].owner = player
                    this.now[fromX][fromY].army -= movableArmy
                }
                else {
                    this.now[toX][toY].army -= movableArmy
                    this.now[fromX][fromY].army -= movableArmy
                }
                break
            }
        }
        const changes: string[] = []
        for (let i = 0; i < this.now.length; i++)
            for (let j = 0; j < this.now[0].length; j++) {
                if (toShort(this.now[i][j]) !== this.previousMap[i][j])
                    changes.push(`${i * this.now[0].length + j}${toShort(this.now[i][j])}`)
            }
        this.replay.turns.push(changes.join(','))
        if (Object.values(this.died).filter((val) => !val).length === 1) {
            this.handleGameEnd(+Object.keys(this.idToPlayer).filter((player) => !this.died[+player])[0])
        }
    }

    handleTurn() {
        this.turn++
        this.previousMap = this.now.map((row) => row.map(toShort))
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
        this.handleMove()
        this.sendMap(false)
    }
    handleHalfTurn() {
        this.previousMap = this.now.map((row) => row.map(toShort))
        this.handleMove()
        this.sendMap(true)
    }

    __isHalf = true
    handle() {
        if (this.__isHalf) this.handleHalfTurn()
        else this.handleTurn()
        this.__isHalf = !this.__isHalf
    }

    handleMessage(player: number, message: string) {
        if (this.isEnd) return
        this.messages.push(message)
        sendMessage(this.roomId, message)
    }
}
