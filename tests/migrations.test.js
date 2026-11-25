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
    const ctx = loadScripts(['src/shared/database/migrations/migration-v15.js'], {chrome, self: {chrome}})
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
    const migration = loadScripts(['src/shared/database/migrations/migration-v15.js'], {self: {}})
    const projects = loadScripts(['src/shared/projects.js'])
    const allProjects = projects.get('allProjects')
    for (const site of migration.get('REMOVED_SITES_V15')) {
        assert.equal(allProjects[site], undefined, site)
    }
})

// Курсор с update() для миграций, которые меняют проекты, а не удаляют
function fakeUpdatableTransaction(projects) {
    const store = new Map(projects.map(p => [p.key, {...p}]))
    const cursorFor = keys => {
        const key = keys.shift()
        if (key == null) return null
        return {
            primaryKey: key,
            value: {...store.get(key)},
            update: async value => { store.set(key, value) },
            continue: async () => cursorFor(keys),
        }
    }
    return {
        store,
        objectStore: () => ({
            index: () => ({
                openCursor: async rating => cursorFor([...store.values()].filter(p => p.rating === rating).map(p => p.key)),
            }),
        }),
    }
}

test('migrateV16 снимает блокировку v14 только с проектов TopCraft', async () => {
    const ctx = loadScripts(['src/shared/database/migrations/migration-v16.js'], {self: {}})
    const tx = fakeUpdatableTransaction([
        {key: 1, rating: 'topcraft.club', id: '7411', time: Infinity, error: 'Высокий риск быть заблокированным'},
        {key: 2, rating: 'topcraft.ru', id: '10496', time: Infinity, error: 'Высокий риск быть заблокированным'},
        {key: 3, rating: 'topcraft.club', id: '1', time: 1700000000000, error: 'Обычная ошибка голосования'},
        {key: 4, rating: 'mctop.su', id: '5', time: Infinity, error: 'Высокий риск быть заблокированным'},
    ])
    assert.equal(await ctx.migrateV16(tx), 2)
    assert.equal(tx.store.get(1).time, null)
    assert.equal(tx.store.get(1).error, undefined)
    assert.equal(tx.store.get(2).time, null)
    // Незаблокированный проект с обычной ошибкой не трогаем
    assert.equal(tx.store.get(3).error, 'Обычная ошибка голосования')
    // mctop.su по-прежнему заблокирован: его голосование не переписывалось
    assert.equal(tx.store.get(4).time, Infinity)
})

test('migrateV17 снимает блокировку v14 с проектов McTOP', async () => {
    const ctx = loadScripts(['src/shared/database/migrations/migration-v17.js'], {self: {}})
    const tx = fakeUpdatableTransaction([
        {key: 1, rating: 'mctop.su', id: '4888', time: Infinity, error: 'Высокий риск быть заблокированным'},
        {key: 2, rating: 'mctop.su', id: '5231', time: 1700000000000, error: 'Обычная ошибка'},
        {key: 3, rating: 'topcraft.club', id: '7411', time: Infinity},
    ])
    assert.equal(await ctx.migrateV17(tx), 1)
    assert.equal(tx.store.get(1).time, null)
    assert.equal(tx.store.get(1).error, undefined)
    assert.equal(tx.store.get(2).error, 'Обычная ошибка')
    assert.equal(tx.store.get(3).time, Infinity)
})
