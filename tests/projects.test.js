// Проверка конфигурации всех сайтов из src/shared/projects.js:
// ссылка-пример из exampleURL() должна разбираться parseURL() обратно в тот же ID,
// а pageURL()/voteURL() — давать корректный адрес на том же сайте.
const test = require('node:test')
const assert = require('node:assert/strict')
const {loadScripts} = require('./helpers')

const ctx = loadScripts(['src/shared/projects.js'])
const allProjects = ctx.get('allProjects')
const getDomainWithoutSubdomain = ctx.get('getDomainWithoutSubdomain')

const entries = Object.entries(allProjects).filter(([domain, config]) => domain !== 'Custom' && Object.keys(config).length > 0)

test('projects.js содержит сайты', () => {
    assert.ok(entries.length > 100, `сайтов: ${entries.length}`)
})

for (const [domain, config] of entries) {
    test(domain, () => {
        // timeout() необязателен: без него калькулятор ставит 24 часа
        for (const fn of ['pageURL', 'voteURL', 'parseURL']) {
            assert.equal(typeof config[fn], 'function', `нет функции ${fn}()`)
        }
        assert.equal(typeof config.exampleURL, 'function', 'нет exampleURL()')

        const example = config.exampleURL()
        assert.ok(Array.isArray(example) && example.length === 3, 'exampleURL() должен вернуть [начало, ID, конец]')
        const [prefix, id, suffix] = example
        // Сайты без ссылки на проект (например, промокоды) пропускаем
        if (!prefix) return

        const url = new ctx.URL(prefix + id + suffix)
        const project = config.parseURL(url)
        assert.equal(typeof project, 'object', 'parseURL() должен вернуть объект')

        // Пустой ID в примере — сайт определяет проект по всей ссылке (например, hoyolab)
        if (!config.notRequiredId?.() && id !== '') {
            assert.equal(String(project.id), id, `parseURL(${url.href}).id`)
        }

        // Дозаполняем поля, которые в реальном потоке приходят из формы
        project.rating = domain
        project.nick ??= 'TestNick'
        if (config.exampleURLGame && project.game == null) project.game = config.defaultGame?.() ?? config.exampleURLGame()[1]
        if (config.exampleURLListing && project.listing == null) project.listing = config.defaultListing?.() ?? config.exampleURLListing()[1]
        if (config.langList && project.lang == null) project.lang = config.defaultLand?.() ?? [...config.langList().keys()][0]
        project.addition ??= ''

        for (const fn of ['pageURL', 'voteURL']) {
            const value = config[fn](project)
            assert.equal(typeof value, 'string', `${fn}() должен вернуть строку`)
            assert.doesNotMatch(value, /undefined|null/, `${fn}() = ${value}`)
            const parsed = new ctx.URL(value)
            assert.match(parsed.protocol, /^https?:$/, `${fn}() = ${value}`)
            assert.ok(getDomainWithoutSubdomain(value), `${fn}() = ${value}: не удалось определить домен`)
        }

        if (!config.timeout) return
        const timeout = config.timeout(project)
        assert.equal(typeof timeout, 'object', 'timeout() должен вернуть объект')
        const allowed = new Set(['hours', 'hour', 'minutes', 'minute', 'seconds', 'second', 'ms', 'week', 'month', 'day', 'days'])
        for (const key of Object.keys(timeout)) {
            assert.ok(allowed.has(key), `неизвестный ключ timeout(): ${key}`)
            assert.ok(Number.isFinite(timeout[key]), `timeout().${key} не число`)
        }
    })
}
