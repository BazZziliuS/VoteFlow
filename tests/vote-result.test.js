// Результат голосования → проект и статистика (applyVoteResult из src/background/voting/vote-result-handler.js)
const test = require('node:test')
const assert = require('node:assert/strict')
const {loadScripts} = require('./helpers')

const chrome = {i18n: {getMessage: (key, args) => args == null ? key : key + '(' + [].concat(args).join(',') + ')'}}
const ctx = loadScripts([
    'src/shared/projects.js',
    'src/background/helpers/constants.js',
    'src/background/voting/vote-time-calculator.js',
    'src/background/voting/stats-updater.js',
    'src/background/voting/end-vote-helpers.js',
    'src/background/voting/vote-result-handler.js',
], {chrome})
const allProjects = ctx.get('allProjects')
const HOUR = 60 * 60 * 1000

function newProject(extra = {}) {
    return {key: 1, rating: 'topcraft.club', id: '7411', nick: 'Steve', time: null,
        stats: {successVotes: 0, monthSuccessVotes: 0, laterVotes: 0, errorVotes: 0}, ...extra}
}
function newContext() {
    const stats = () => ({successVotes: 0, monthSuccessVotes: 0, laterVotes: 0, errorVotes: 0})
    // timeoutError — значение по умолчанию из migration-v0.js (15 минут)
    return {settings: {timeoutError: 900000}, allProjects, generalStats: stats(), todayStats: stats(), chrome}
}

test('успех: время следующего голоса в будущем, ошибка снята, счётчики выросли', () => {
    const project = newProject({error: 'старая ошибка', warn: 'старое предупреждение'})
    const context = newContext()
    const result = ctx.applyVoteResult(project, {successfully: true}, context)
    assert.equal(result.outcome, 'success')
    assert.equal(result.level, 'info')
    assert.ok(project.time > Date.now() + HOUR, 'следующий голос не раньше чем через час')
    assert.equal(project.error, undefined)
    assert.equal(project.warn, undefined)
    assert.equal(project.stats.successVotes, 1)
    assert.equal(context.generalStats.successVotes, 1)
    assert.equal(context.todayStats.successVotes, 1)
})

test('успех с предупреждением сайта: текст сохраняется у проекта', () => {
    const project = newProject()
    ctx.applyVoteResult(project, {successfully: 'Голос учтён, но ник не найден на сервере'}, newContext())
    assert.equal(project.warn, 'Голос учтён, но ник не найден на сервере')
})

test('уже голосовали с точным временем: следующий голос в указанное время', () => {
    const project = newProject()
    const next = Date.now() + 5 * HOUR
    const result = ctx.applyVoteResult(project, {later: next}, newContext())
    assert.equal(result.outcome, 'later')
    assert.ok(Math.abs(project.time - next) < 15 * 60 * 1000, 'время сайта плюс не больше случайной задержки')
    assert.equal(project.stats.laterVotes, 1)
})

test('ошибка: повтор позже, текст ошибки у проекта, счётчик ошибок', () => {
    const project = newProject()
    const context = newContext()
    const result = ctx.applyVoteResult(project, {message: 'Капча не пройдена'}, context)
    assert.equal(result.outcome, 'error')
    assert.equal(result.level, 'error')
    assert.equal(result.notify, true)
    assert.ok(Number.isFinite(project.time) && project.time > Date.now())
    assert.match(project.error, /Капча не пройдена/)
    assert.equal(project.stats.errorVotes, 1)
    assert.equal(context.todayStats.errorVotes, 1)
})

test('ошибка с retryCoolDown: повтор ровно через заданное время', () => {
    const project = newProject()
    const before = Date.now()
    ctx.applyVoteResult(project, {message: 'Войдите на сайт', retryCoolDown: HOUR}, newContext())
    assert.ok(project.time >= before + HOUR && project.time <= Date.now() + HOUR)
})

test('stopVoting: проект останавливается, повторных попыток нет', () => {
    const project = newProject()
    const result = ctx.applyVoteResult(project, {message: 'Используйте сайт вручную', stopVoting: true}, newContext())
    assert.equal(result.outcome, 'stopped')
    assert.equal(project.time, Infinity)
    assert.match(project.error, /Используйте сайт вручную/)
    assert.match(result.message, /votingStopped/)
})

test('серверная ошибка 5xx: без уведомления', () => {
    const result = ctx.applyVoteResult(newProject(), {errorVote: ['503', 'https://topcraft.club/']}, newContext())
    assert.equal(result.outcome, 'error')
    assert.equal(result.notify, false)
})
