import express from 'express'
import cors from 'cors'
import bodyparser from 'body-parser'
import superagent from 'superagent'
import http from 'http'
import { Server as SocketServer } from 'socket.io'
import { md5 } from './lib/hash'
import { readFileSync } from 'node:fs'
import crypto from 'node:crypto'
import Token from './model/token'
import { startSave } from './model/database'
import Game from './model/game'
import { addGame, getCurrentInformation, sendChatMessage, updateSteps } from './service/game'
import { Step } from './lib/game'

declare module 'superagent' {
    interface Request {
        user: { uid: number, name: string }
    }
}

const app = express()
const server = new http.Server(app)
const io = new SocketServer(server)
app.use(cors())
app.use(bodyparser.json())
app.use(bodyparser.urlencoded({ extended: false }))

app.all('*', (req, res, next) => {
    res.set('Access-Control-Allow-Origin', '*')
    res.set('Access-Control-Allow-Methods', 'GET')
    res.set('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type')
    if ('OPTIONS' == req.method) return res.send(200)
    next()
})

app.post('*', (req, res, next) => {
    const token = req.body.token
    if (typeof token !== 'string') return res.status(418)
    req.body.user = Token.getByToken(token)
    if (req.body.user) req.body.user.isAdmin = req.body.user.uid === 234641
    next()
})

const jqueryFile = readFileSync('frontend/node_modules/jquery/dist/jquery.min.js').toString()

const scriptFile = readFileSync('frontend/dist/ui.js').toString()
const scriptVersion = md5(scriptFile)

const styleFile = readFileSync('frontend/assets/ui.css').toString()
const styleVersion = md5(styleFile)

console.info(`UI file versions: script (${scriptVersion}) & style (${styleVersion})`)

const indexFile = readFileSync('frontend/assets/index.html').toString()
    .replace('{{ var.scriptVersion }}', scriptVersion)
    .replace('{{ var.styleVersion }}', styleVersion)
const favicon = readFileSync('frontend/assets/favicon.png')

app.get(`/ui-${scriptVersion}.js`, (req, res) => res.send(scriptFile))
app.get(`/ui.js`, (req, res) => res.send(readFileSync('frontend/dist/ui.js').toString()))
app.get(`/ui-${styleVersion}.css`, (req, res) => res.type('text/css').send(styleFile))
app.get(`/ui.css`, (req, res) => res.type('text/css').send(readFileSync('frontend/assets/ui.css').toString()))
app.get(`/jquery.min.js`, (req, res) => res.send(jqueryFile))
app.get('/favicon.png', (req, res) => res.send(favicon))

const pages = ['/', '/game/:id/play', '/login']
pages.forEach((url) => app.get(url, (req, res) => res.send(indexFile)))

const publicFiles = [
    'Quicksand-Regular.otf',
    'Quicksand-Bold.otf',
    'Quicksand-Light.otf',
    'city.png',
    'general.png',
    'mountain.png',
    'obstacle.png',
]
publicFiles.forEach((file) => app.get(`/public/${file}`, (req, res) => res.send(readFileSync(`frontend/assets/${file}`))))

const loginTokens: Record<string, number> = {}
app.post('/user/newToken', (req, res) => {
    const token = 'milmon-generals-luogu-verify-token-' + crypto.randomUUID()
    loginTokens[token] = Date.now()
    res.send(token)
})
app.post('/user/current', (req, res) => {
    if (!req.body.user) res.send({ loggedIn: false })
    else res.send({ loggedIn: true, ...req.body.user })
})
app.post('/user/login/luogu', async (req, res) => {
    const pasteId = req.body.pasteId
    if (typeof pasteId !== 'string' || !/^[a-z0-9]{8}$/.test(pasteId))
        return res.send({ error: '输入的信息不合法。' })
    try {
        const data = await superagent.get(`https://www.luogu.com/paste/${pasteId}`).query({ _contentOnly: true })
        const code = data.body.currentData.paste.data.trim()
        const user = data.body.currentData.paste.user
        if (typeof loginTokens[code] === 'number') {
            if (Date.now() - loginTokens[code] <= 1000 * 60 * 10) {
                const token = Token.add(user.uid, user.name)
                res.send({ token })
            }
            else res.send({ error: 'Token 失效或不存在。' })
        }
        else res.send({ error: 'Token 失效或不存在。' })
    } catch (e) {
        res.send({ error: '网络错误，请稍后再试。' })
        console.error(e)
    }
})
app.post('/game/create', (req, res) => {
    if (!req.body.user.isAdmin) return res.send({ error: '您没有相应的权限。' })
    const { player1, player2, startAt } = req.body
    if (typeof req.body.player1 !== 'string' || typeof req.body.player2 !== 'string' || typeof req.body.note !== 'string')
        return res.status(418)
    if (!Token.getByUser(+player1) || !Token.getByUser(+player2))
        return res.send({ error: '用户不存在。' })
    if (player1 === player2) return res.send({ error: '不能设为两个相同的用户。' })
    if (typeof req.body.startAt !== 'number' || Date.now() > req.body.startAt || req.body.startAt > Date.now() + 1000 * 60 * 60 * 24 * 3)
        return res.send({ error: '时间不合法。' })
    const id = Game.add(+player1, +player2, startAt, req.body.note)
    addGame(id, [+player1, +player2], startAt)
    res.send({ success: true })
})
app.post('/game/list', (req, res) => {
    res.send({ list: Game.list().reverse() })
})
app.post('/game/info', (req, res) => {
    if (typeof req.body.id !== 'number') return res.status(418)
    const game = Game.get(req.body.id)
    if (!game) res.send({ error: '游戏不存在。' })
    else res.send(game)
})

startSave()

function markSystemError() {
    const list = Game.list()
    for (const game of list) {
        if (game && !game.done) {
            Game.update(game.gameId, true, false, game.note, true)
        }
    }
}
markSystemError()

const socketIdToUser: Record<string, number> = {}
const socketIdToRoom: Record<string, number> = {}

io.on('connection', (socket) => {
    socket.on('token', (token: string) => {
        const user = Token.getByToken(token)
        if (!user) return socket.emit('error', 'Token 已经失效。')
        socketIdToUser[socket.id] = user.uid
        console.info(`User ${user.name} (id=${user.uid}) logged in socket (id=${socket.id})`)
    })

    socket.on('disconnect', () => {
        delete socketIdToRoom[socket.id]
        delete socketIdToUser[socket.id]
        console.info(`Socket ${socket.id} disconnected`)
    })

    socket.on('ping', () => {
        socket.emit('pong')
    })

    socket.on('updateSteps', (steps: Array<Step>) => {
        if (!socketIdToUser[socket.id] || !socketIdToRoom[socket.id]) return
        const user = Token.getByUser(socketIdToUser[socket.id])
        const gameId = socketIdToRoom[socket.id]
        const game = Game.get(gameId)
        if (!game || !user) return socket.emit('error', '游戏不存在。')
        if (game.done) return socket.emit('error', '游戏已经结束。')
        updateSteps(gameId, user.uid, steps)
    })

    socket.on('sendMessage', (message: string) => {
        if (!socketIdToUser[socket.id] || !socketIdToRoom[socket.id]) return
        const user = Token.getByUser(socketIdToUser[socket.id])
        const gameId = socketIdToRoom[socket.id]
        const game = Game.get(gameId)
        if (!game || !user) return socket.emit('error', '游戏不存在。')
        if (game.done) return socket.emit('error', '游戏已经结束。')
        sendChatMessage(gameId, user.uid, message)
    })

    socket.on('join', (id: number) => {
        if (!socketIdToUser[socket.id]) return
        const user = Token.getByUser(socketIdToUser[socket.id])
        const game = Game.get(id)
        if (!game || !user) return socket.emit('error', '游戏不存在。')
        if (game.done) return socket.emit('error', '游戏已经结束。')
        if (![game.player1, game.player2].includes(user.uid)) return socket.emit('error', '没有进入权限。')
        socketIdToRoom[socket.id] = id
        console.info(`User ${user.name} joined game ${id}`)
        socket.emit('update', getCurrentInformation(id, user.uid))
    })
})

export interface GameInformation {
    players: Array<{
        uid: number
        name: string
        army: number
        land: number
    }>
    map: string
    turn: number
    isHalf: boolean
    doneSteps: Array<number>
}

export function sendGameInformation(id: number, func: (uid: number) => GameInformation) {
    const uids = Object.entries(socketIdToRoom)
        .filter((x) => x[1] === id).map(([socketId]) => socketId)
    for (const socketId of uids) {
        io.to(socketId).emit('update', func(socketIdToUser[socketId]))
    }
}

export function sendMessage(id: number, message: string) {
    const uids = Object.entries(socketIdToRoom)
        .filter((x) => x[1] === id).map(([socketId]) => socketId)
    for (const socketId of uids) {
        io.to(socketId).emit('recieveMessage', message)
    }
}

server.listen(1233)
console.info('Server started')
