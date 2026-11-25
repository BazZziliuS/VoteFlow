// Тест миграции v15: удаление проектов на закрытых сайтах
const test = require('node:test')
const assert = require('node:assert/strict')
const {loadScripts} = require('./helpers')

// Минимальная имитация idb: index('rating').openCursor(rating) с delete()/continue()
function fakeTransaction(projects) {
    const store = new Map(projects.map(p => [p.key, p]))
    const cursorFor = (rating, keys) => {
        const key = keys.shift()
        if (key == null) return null
        return {
            primaryKey: key,
            value: store.get(key),
            delete: async () => { store.delete(key) },
            continue: async () => cursorFor(rating, keys),
        }
    }
    return {
        store,
        objectStore: () => ({
            index: () => ({
                openCursor: async rating => cursorFor(rating, [...store.values()].filter(p => p.rating === rating).map(p => p.key)),
            }),
        }),
    }
}

test('migrateV15 удаляет только проекты закрытых сайтов и снимает их будильники', async () => {
    const cleared = []
    const chrome = {alarms: {clear: key => cleared.push(key)}}
    const ctx = loadScripts(['src/utils/database/db-migrations/migration-v15.js'], {chrome, self: {chrome}})
    const tx = fakeTransaction([
        {key: 1, rating: 'discord.boats'},
        {key: 2, rating: 'top.gg'},
        {key: 3, rating: 'ionmc.top'},
        {key: 4, rating: 'ionmc.top'},
        {key: 5, rating: 'minecraftrating.ru'},
    ])
    const removed = await ctx.migrateV15(tx)
    assert.equal(removed, 3)
    assert.deepEqual([...tx.store.keys()].sort(), [2, 5])
    assert.deepEqual(cleared.sort(), ['1', '3', '4'])
})

test('удалённые сайты отсутствуют в projects.js', () => {
    const migration = loadScripts(['src/utils/database/db-migrations/migration-v15.js'], {self: {}})
    const projects = loadScripts(['src/core/projects.js'])
    const allProjects = projects.get('allProjects')
    for (const site of migration.get('REMOVED_SITES_V15')) {
        assert.equal(allProjects[site], undefined, site)
    }
})
