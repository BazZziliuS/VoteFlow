// Тесты расчёта времени следующего голосования (src/background/voting/vote-time-calculator.js)
// и разбора таймера кулдауна (parseCooldown из src/content/common/api.js).
// «Сейчас» фиксируется подменой Date внутри vm-контекста.
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const {root, loadScripts} = require('./helpers')

process.env.TZ = 'UTC'

function fixedDate(iso) {
    const now = new Date(iso).getTime()
    return class extends Date {
        constructor(...args) {
            super(...(args.length ? args : [now]))
        }

        static now() {
            return now
        }
    }
}

function calculator(nowIso, sites = {}) {
    const ctx = loadScripts(['src/background/voting/vote-time-calculator.js'], {Date: fixedDate(nowIso)})
    const calc = (project, request) =>
        new Date(ctx.calculateNextVoteTime({stats: {}, ...project}, request, sites)).toISOString()
    return calc
}

test('стандартный таймаут: hours от текущего времени', () => {
    const calc = calculator('2026-11-25T10:00:00Z', {site: {timeout: () => ({hours: 12})}})
    assert.equal(calc({rating: 'site'}, {successfully: true}), '2026-11-25T22:00:00.000Z')
})

test('стандартный таймаут: later=true считается от последнего успешного голоса', () => {
    const calc = calculator('2026-11-25T10:00:00Z', {site: {timeout: () => ({hours: 12})}})
    const project = {rating: 'site', stats: {lastSuccessVote: Date.parse('2026-11-25T08:30:00Z')}}
    assert.equal(calc(project, {later: true}), '2026-11-25T20:30:00.000Z')
})

test('стандартный таймаут: hours + minutes', () => {
    const calc = calculator('2026-11-25T10:00:00Z', {site: {timeout: () => ({hours: 1, minutes: 30})}})
    assert.equal(calc({rating: 'site'}, {successfully: true}), '2026-11-25T11:30:00.000Z')
})

test('ежедневный сброс: до часа сброса — сегодня, после — завтра (+10 минут без приоритета)', () => {
    const sites = {site: {timeout: () => ({hour: 21})}}
    assert.equal(
        calculator('2026-11-25T10:00:00Z', sites)({rating: 'site'}, {successfully: true}),
        '2026-11-25T21:10:00.000Z',
    )
    assert.equal(
        calculator('2026-11-25T22:00:00Z', sites)({rating: 'site'}, {successfully: true}),
        '2026-11-26T21:10:00.000Z',
    )
    assert.equal(
        calculator('2026-11-25T22:00:00Z', sites)({rating: 'site', priority: true}, {successfully: true}),
        '2026-11-26T21:00:00.000Z',
    )
})

test('ежедневный сброс через границу месяца', () => {
    const calc = calculator('2026-11-30T23:00:00Z', {site: {timeout: () => ({hour: 0})}})
    assert.equal(calc({rating: 'site'}, {successfully: true}), '2026-12-01T00:10:00.000Z')
})

test('еженедельный сброс', () => {
    // 2026-11-25 — среда (3). Сброс в понедельник (1) в 00:00
    const calc = calculator('2026-11-25T10:00:00Z', {site: {timeout: () => ({week: 1, hour: 0})}})
    assert.equal(calc({rating: 'site'}, {successfully: true}), '2026-11-30T00:10:00.000Z')
})

test('ежемесячный сброс', () => {
    const calc = calculator('2026-11-25T10:00:00Z', {site: {timeout: () => ({month: 1, hour: 0})}})
    assert.equal(calc({rating: 'site'}, {successfully: true}), '2026-12-01T00:10:00.000Z')
})

test('later с конкретным временем имеет приоритет над таймаутом сайта', () => {
    const calc = calculator('2026-11-25T10:00:00Z', {site: {timeout: () => ({hours: 24})}})
    const later = Date.parse('2026-11-25T15:19:16Z')
    assert.equal(calc({rating: 'site'}, {later}), '2026-11-25T15:19:16.000Z')
})

test('неизвестный таймаут: +24 часа', () => {
    const calc = calculator('2026-11-25T10:00:00Z', {site: {}})
    assert.equal(calc({rating: 'site'}, {successfully: true}), '2026-11-26T10:00:00.000Z')
})

test('свой таймаут проекта в миллисекундах', () => {
    const calc = calculator('2026-11-25T10:00:00Z', {site: {timeout: () => ({hours: 24})}})
    assert.equal(calc({rating: 'site', timeout: 3600000}, {successfully: true}), '2026-11-25T11:00:00.000Z')
})

test('свой таймаут проекта по часам: сегодня или завтра', () => {
    const project = {rating: 'site', timeoutHour: 18, timeoutMinute: 30}
    assert.equal(calculator('2026-11-25T10:00:00Z')(project, {successfully: true}), '2026-11-25T18:30:00.000Z')
    assert.equal(calculator('2026-11-25T19:00:00Z')(project, {successfully: true}), '2026-11-26T18:30:00.000Z')
})

test('lastDayMonth: свой таймаут применяется только в последний день месяца', () => {
    const sites = {site: {timeout: () => ({hours: 24})}}
    const project = {rating: 'site', timeoutHour: 18, timeoutMinute: 0, lastDayMonth: true}
    // 30 ноября — последний день месяца: используется свой таймаут (18:00)
    assert.equal(calculator('2026-11-30T10:00:00Z', sites)(project, {successfully: true}), '2026-11-30T18:00:00.000Z')
    // 25 ноября — обычный день: стандартные +24 часа сайта
    assert.equal(calculator('2026-11-25T10:00:00Z', sites)(project, {successfully: true}), '2026-11-26T10:00:00.000Z')
})

test('ограниченное число голосов в день: после последнего — следующий день', () => {
    const sites = {site: {timeout: () => ({hours: 1}), limitedCountVote: () => true}}
    const calc = calculator('2026-11-25T10:00:00Z', sites)
    assert.equal(
        calc({rating: 'site', countVote: 0, maxCountVote: 3}, {successfully: true}),
        '2026-11-25T11:00:00.000Z',
    )
    assert.equal(
        calc({rating: 'site', countVote: 2, maxCountVote: 3}, {successfully: true}),
        '2026-11-26T00:10:00.000Z',
    )
})

test('у каждого сайта таймаут задаёт период (hour, hours, week или month)', () => {
    const ctx = loadScripts(['src/shared/projects.js'])
    const problems = []
    for (const [domain, config] of Object.entries(ctx.get('allProjects'))) {
        if (!config.timeout) continue
        const t = config.timeout({id: '', game: '', listing: ''})
        if (t.hour == null && t.hours == null && t.week == null && t.month == null)
            problems.push(`${domain}: ${JSON.stringify(t)}`)
    }
    assert.deepEqual(problems, [], 'без периода время следующего голоса = «сейчас», вкладка будет открываться по кругу')
})

// parseCooldown из api.js: функция чистая, выполняем только её
const apiSource = fs.readFileSync(path.join(root, 'src/content/common/api.js'), 'utf8').replace(/\r\n/g, '\n')
const start = apiSource.indexOf('function parseCooldown(')
const end = apiSource.indexOf('\n}\n', start) + 2
const cooldownCtx = vm.createContext({Date: fixedDate('2026-11-25T10:00:00Z'), String, Number})
vm.runInContext(apiSource.slice(start, end), cooldownCtx)
const parseCooldown = text => {
    const result = cooldownCtx.parseCooldown(text, 0)
    return result == null ? null : (result - Date.parse('2026-11-25T10:00:00Z')) / 1000
}

const cooldownCases = {
    '3 ч. 37 м. 36 с.': 13056,
    'Доступно через 5ч 19м 16с': 19156,
    '19м 16с': 1156,
    '21:59:02': 79142,
    '22 hours': 79200,
    '2h 5m': 7500,
    '1 день 2 часа': 93600,
    '2 дня': 172800,
    '19 мин': 1140,
    '45 сек': 45,
    'Открыть кейс': null,
    '': null,
    'через 1 мес': null,
}
for (const [text, seconds] of Object.entries(cooldownCases)) {
    test(`parseCooldown(${JSON.stringify(text)})`, () => assert.equal(parseCooldown(text), seconds))
}

test('isAutomationWarning: предупреждения сайтов о блокировке за автоматизацию', () => {
    const start = apiSource.indexOf('const AUTOMATION_WARNINGS')
    const end = apiSource.indexOf('\n}\n', apiSource.indexOf('function isAutomationWarning(', start)) + 2
    const ctx = vm.createContext({String})
    vm.runInContext(apiSource.slice(start, end) + '\nthis.isAutomationWarning = isAutomationWarning', ctx)
    const warning =
        'Пожалуйста, используйте сайт вручную. Использование автоматизации может привести к блокировке вашего аккаунта. ' +
        'При повторении нарушений ваш аккаунт (ID: 123) будет заблокирован без права восстановления.'
    assert.equal(ctx.isAutomationWarning(warning), true)
    for (const text of [
        'Спасибо за голос!',
        'Вы уже голосовали сегодня',
        'Аккаунт заблокирован',
        'Некорректный ник',
        '',
        undefined,
    ]) {
        assert.equal(ctx.isAutomationWarning(text), false, String(text))
    }
})
