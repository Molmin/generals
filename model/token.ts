import { DataBase } from './database'
import crypto from 'node:crypto'

export type User = [number, string, Array<[string, number]>]

const db = new DataBase('token')
const data = db.get() as Record<number, User>

export default class Token {
    static add(uid: number, name: string) {
        if (!data[uid]) data[uid] = [uid, name, []]
        else data[uid][2] = data[uid][2].filter(([token, time]) => Date.now() - time <= 1000 * 60 * 60 * 24 * 7)
        const token = crypto.randomUUID()
        data[uid][2].push([token, Date.now()])
        db.update(data)
        return token
    }

    static getByToken(token: string) {
        const result = Object.values(data).filter((user) => user[2].filter((session) => session[0] === token).length > 0)
        if (result.length > 0) return { uid: result[0][0], name: result[0][1] }
        else return null
    }

    static getByUser(uid: number) {
        const result = Object.values(data).filter((user) => user[0] === uid)
        if (result.length > 0) return { uid: result[0][0], name: result[0][1] }
        else return null
    }
}
