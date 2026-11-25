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
