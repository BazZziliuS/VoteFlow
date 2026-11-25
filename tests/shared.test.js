// Тесты общих функций интерфейса (src/ui/shared.js)
const test = require('node:test')
const assert = require('node:assert/strict')
const {loadScripts} = require('./helpers')

const chrome = {i18n: {getUILanguage: () => 'ru', getMessage: (key, sub) => key === 'inTime' ? 'через ' + sub : key}}
const ctx = loadScripts(['src/ui/shared.js'], {chrome})

test('centurymine и SideMC закрепляются по ID, названию или игре без учёта регистра', () => {
    assert.equal(ctx.isFeaturedProject({id: 'centurymine'}), true)
    assert.equal(ctx.isFeaturedProject({id: '4521', name: 'CenturyMine — выживание'}), true)
    assert.equal(ctx.isFeaturedProject({id: 'side-mc'}), true)
    assert.equal(ctx.isFeaturedProject({id: '77', name: 'Side MC'}), true)
    assert.equal(ctx.isFeaturedProject({id: 'x', game: 'SIDEMC'}), true)
    assert.equal(ctx.isFeaturedProject({id: 'mcskill', name: 'MCSKILL'}), false)
    assert.equal(ctx.isFeaturedProject({id: 'century', name: 'Mine Craft'}), false)
    assert.equal(ctx.isFeaturedProject(null), false)
})

test('ник игрока не делает проект закреплённым', () => {
    assert.equal(ctx.isFeaturedProject({id: 'mcskill', nick: 'centurymine'}), false)
})

test('projectState: сейчас, очередь, ошибка, ожидание', () => {
    const opened = new Map([['tab1', {rating: 'top.gg', key: 1}]])
    assert.equal(ctx.projectState({key: 1, rating: 'top.gg'}, opened), 'now')
    assert.equal(ctx.projectState({key: 2, rating: 'top.gg'}, opened), 'queue')
    assert.equal(ctx.projectState({key: 3, rating: 'mctop.su', error: 'fail'}, opened), 'error')
    assert.equal(ctx.projectState({key: 4, rating: 'mctop.su'}, opened), 'scheduled')
    // Время следующего голоса ещё не наступило — проект не может быть «в очереди»
    assert.equal(ctx.projectState({key: 5, rating: 'top.gg', time: Date.now() + 3600000}, opened), 'scheduled')
})

test('formatRelative: прошедшее время — пустая строка, будущее — «через …»', () => {
    assert.equal(ctx.formatRelative(Date.now() - 1000), '')
    assert.match(ctx.formatRelative(Date.now() + (3 * 60 + 12) * 60000), /^через 3 .+ 12 .+$/)
})

test('compareVersions', () => {
    assert.ok(ctx.compareVersions('8.2.0', '8.1.0') > 0)
    assert.ok(ctx.compareVersions('v8.10.0', '8.9.9') > 0)
    assert.equal(ctx.compareVersions('8.1.0', 'v8.1.0'), 0)
    assert.ok(ctx.compareVersions('8.1', '8.1.1') < 0)
})

function updateContext(fetchImpl, version = '8.1.0') {
    const chromeStub = {...chrome, runtime: {getManifest: () => ({version})}}
    return loadScripts(['src/ui/shared.js'], {chrome: chromeStub, fetch: fetchImpl, AbortSignal, console: {warn() {}}})
}

function fakeDb(initial = {}) {
    const store = new Map(Object.entries(initial))
    return {store, get: async (s, k) => store.get(k), put: async (s, v, k) => { store.set(k, v) }}
}

test('checkForUpdate: новая версия на GitHub', async () => {
    let calls = 0
    const c = updateContext(async () => { calls++; return {ok: true, json: async () => ({tag_name: 'v8.2.0', html_url: 'https://github.com/BazZziliuS/VoteFlow/releases/tag/v8.2.0'})} })
    const db = fakeDb()
    const update = await c.checkForUpdate(db)
    assert.equal(update.version, '8.2.0')
    // Второй вызов в течение 12 часов берёт результат из кэша, без запроса
    await c.checkForUpdate(db)
    assert.equal(calls, 1)
})

test('checkForUpdate: текущая версия — обновления нет, ошибка сети не ломает', async () => {
    const same = updateContext(async () => ({ok: true, json: async () => ({tag_name: 'v8.1.0'})}))
    assert.equal(await same.checkForUpdate(fakeDb()), null)
    const offline = updateContext(async () => { throw new Error('offline') })
    assert.equal(await offline.checkForUpdate(fakeDb()), null)
})

test('reportIssueUrl: сайт, ошибка и версия есть, ника нет', () => {
    const c = loadScripts(['src/ui/shared.js'], {chrome: {...chrome, runtime: {getManifest: () => ({version: '8.2.0'})}}, navigator: {userAgent: 'TestBrowser/1.0'}})
    const url = c.reportIssueUrl({rating: 'magicrust.gg', id: 'free daily case', nick: 'SecretNick', error: 'Не найдена кнопка'})
    const body = decodeURIComponent(new URL(url).searchParams.get('body'))
    assert.match(url, /^https:\/\/github\.com\/BazZziliuS\/VoteFlow\/issues\/new\?/)
    assert.match(body, /magicrust\.gg/)
    assert.match(body, /Не найдена кнопка/)
    assert.match(body, /8\.2\.0/)
    assert.doesNotMatch(body, /SecretNick/)
})
