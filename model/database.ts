import { readFileSync, existsSync, writeFileSync } from 'node:fs'

const db: Record<string, Object> = {}
const updated: Record<string, boolean> = {}

export class DataBase {
    constructor(
        public name: string
    ) {
        if (!existsSync(`db/${this.name}.writing`)) {
            db[this.name] = {}
            updated[this.name] = false
            return
        }
        let writing = readFileSync(`db/${this.name}.writing`).toString().trim()
        const toRead = [1, 2]
        if (writing === '1') toRead.reverse()
        for (const id of toRead) {
            try {
                const data = readFileSync(`db/${this.name}.${id}.json`).toString()
                const json = JSON.parse(data)
                db[this.name] = json
                updated[this.name] = false
                return
            }
            catch (e) { }
        }
        db[this.name] = {}
        updated[this.name] = false
    }

    get() {
        return db[this.name]
    }

    update(data: Object) {
        db[this.name] = data
        updated[this.name] = true
    }
}

export async function startSave() {
    while (true) {
        await new Promise((resolve) => setTimeout(resolve, 200))
        const keys = Object.keys(db)
        for (const key of keys) {
            if (!updated[key]) continue
            writeFileSync(`db/${key}.writing`, '1')
            writeFileSync(`db/${key}.1.json`, JSON.stringify(db[key]))
            writeFileSync(`db/${key}.writing`, '2')
            writeFileSync(`db/${key}.2.json`, JSON.stringify(db[key]))
            writeFileSync(`db/${key}.writing`, '0')
        }
    }
}
