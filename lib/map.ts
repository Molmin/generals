import { Cell, CellType } from './game'

export function random(l: number, r: number) {
    return Math.floor(Math.random() * (r - l + 1)) + l
}
export function randomByProbability(p: number) {
    return Math.random() < p
}

function _generate(): Array<Array<Cell>> {
    const width = random(20, 30), height = Math.floor(600 / width)
    const res: Array<Array<Cell>> = new Array(height)
    for (let i = 0; i < height; i++) {
        res[i] = []
        for (let j = 0; j < width; j++)res[i][j] = { type: 'empty', army: 0, owner: 0 }
    }
    const p: Record<string, number> = {}
    for (let i = 0; i * 4 < height; i++)
        for (let j = 0; j * 4 < width; j++)
            p[[i, j].toString()] = Math.random() * 0.3 + 0.1
    for (let i = 0; i < height; i++)
        for (let j = 0; j < width; j++)
            if (randomByProbability(p[[Math.floor(i / 4), Math.floor(j / 4)].toString()]))
                res[i][j].type = 'mountain'
    function find(type: CellType) {
        let x = random(0, height - 1), y = random(0, width - 1)
        while (res[x][y].type !== type) x = random(0, height - 1), y = random(0, width - 1)
        return [x, y]
    }
    let cntCity = random(10, 13)
    while (cntCity--) {
        const [x, y] = find('mountain')
        res[x][y].type = 'city'
        res[x][y].army = random(40, 50)
    }
    let cntGeneral = 2
    while (cntGeneral--) {
        const [x, y] = find('empty')
        res[x][y].type = 'general'
        res[x][y].army = 1
    }
    return res
}

function getConnection(
    map: Array<Array<Cell>>,
    start: [number, number],
    check: (cell: Cell) => boolean,
): Array<[number, number]> {
    const queue: Array<[number, number]> = []
    const visited: Record<string, boolean> = {}
    queue.push(start)
    visited[start.toString()] = true
    for (let head = 0; head < queue.length; head++) {
        function insert(x: number, y: number) {
            if (x < 0 || y < 0 || x >= map.length || y >= map[0].length) return
            if (visited[[x, y].toString()] || !check(map[x][y])) return
            visited[[x, y].toString()] = true
            queue.push([x, y])
        }
        const [x, y] = queue[head]
        insert(x - 1, y)
        insert(x + 1, y)
        insert(x, y - 1)
        insert(x, y + 1)
    }
    return queue
}

export function mapValidation(map: Array<Array<Cell>>) {
    const height = map.length, width = map[0].length
    const generals: Array<[number, number]> = []
    for (let i = 0; i < height; i++)
        for (let j = 0; j < width; j++)
            if (map[i][j].type === 'general') generals.push([i, j])
    for (let i = 0; i < generals.length; i++)
        for (let j = i + 1; j < generals.length; j++)
            if (Math.abs(generals[i][0] - generals[j][0]) + Math.abs(generals[i][1] - generals[j][1]) <= 15)
                return false
    const connection1 = getConnection(map, generals[0], (cell) => cell.type === 'empty')
    const connection2 = getConnection(map, generals[0], (cell) => ['empty', 'general', 'city'].includes(cell.type))
    if (!generals.every((general) => !connection1.every((pos) => Math.abs(general[0] - pos[0]) + Math.abs(general[1] - pos[1]) > 1))) return false
    if (connection2.length < width * height * 0.75) return false
    return true
}

export function generate(): Array<Array<Cell>> {
    let map = _generate()
    while (!mapValidation(map)) map = _generate()
    return map
}
