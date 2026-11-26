// Ротация журнала логов (src/shared/database/db-init.js): хранятся только последние записи
const test = require('node:test')
const assert = require('node:assert/strict')
const {loadScripts} = require('./helpers')

// Хранилище с автоинкрементными ключами, как object store 'logs'
function fakeLogsDb(count) {
    const rows = new Map(Array.from({length: count}, (_, i) => [i + 1, 'line ' + (i + 1)]))
    let nextKey = count + 1
    return {
        rows,
        add: async (store, value) => { rows.set(nextKey++, value) },
        count: async () => rows.size,
        getAllKeys: async (store, query, limit) => [...rows.keys()].sort((a, b) => a - b).slice(0, limit),
        delete: async (store, range) => { for (const key of [...rows.keys()]) if (key <= range.upper) rows.delete(key) },
    }
}

const IDBKeyRange = {upperBound: upper => ({upper})}
// const верхнего уровня не становятся свойствами контекста vm — loadScripts отдаёт их через get()
const limits = loadScripts(['src/shared/database/db-init.js'], {IDBKeyRange})
const MAX_LOG_ENTRIES = limits.get('MAX_LOG_ENTRIES')
const LOG_TRIM_INTERVAL = limits.get('LOG_TRIM_INTERVAL')

test('trimLogs оставляет последние записи и удаляет самые старые', async () => {
    const ctx = loadScripts(['src/shared/database/db-init.js'], {IDBKeyRange})
    const logs = fakeLogsDb(12)
    assert.equal(await ctx.trimLogs(logs, 5), 7)
    assert.deepEqual([...logs.rows.keys()], [8, 9, 10, 11, 12])
    assert.equal(await ctx.trimLogs(logs, 5), 0)
})

test('appendLog подрезает журнал раз в LOG_TRIM_INTERVAL записей', async () => {
    const ctx = loadScripts(['src/shared/database/db-init.js'], {IDBKeyRange})
    const logs = fakeLogsDb(MAX_LOG_ENTRIES)
    for (let i = 0; i < LOG_TRIM_INTERVAL; i++) ctx.appendLog(logs, 'new ' + i)
    await new Promise(resolve => setTimeout(resolve, 10))
    assert.equal(logs.rows.size, MAX_LOG_ENTRIES)
    assert.equal(logs.rows.get(Math.max(...logs.rows.keys())), 'new ' + (LOG_TRIM_INTERVAL - 1))
})
