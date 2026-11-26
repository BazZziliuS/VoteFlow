// Распознавание закрытых сайтов в scripts/check-sites.js
const test = require('node:test')
const assert = require('node:assert/strict')
const {isParkedPage, markdownReport} = require('../scripts/check-sites.js')

test('страницы парковки и продажи домена', () => {
    for (const html of [
        '<title>serverpact.com</title> serverpact minecraft server list domain name for sale',
        '<!-- Send the parked domain origin --><script src="https://lander.parity.domains/js/pa.js"></script>',
        '<title>minecraftsurvivalservers.com is parked</title>',
        'Buy this domain today',
    ]) {
        assert.equal(isParkedPage(html), true, html)
    }
})

test('обычные страницы рейтингов не считаются закрытыми', () => {
    for (const html of [
        '<h1>Top Minecraft Servers</h1> Vote for your favourite server',
        '<title>Minecraft servers</title> Server te koop? Bekijk de serverlijst',
        'Голосовать за сервер — проверка от ботов',
    ]) {
        assert.equal(isParkedPage(html), false, html)
    }
})

test('отчёт перечисляет только сайты, требующие внимания', () => {
    const report = markdownReport(
        [
            {domain: 'closed.example', status: 'parked', code: 200, url: 'https://closed.example/'},
            {domain: 'fine.example', status: 'ok'},
            {domain: 'cf.example', status: 'protected'},
        ],
        ['parked', 'protected', 'ok'],
        {parked: 'Домен продаётся', protected: 'Защита', ok: 'Работает'},
    )
    assert.match(report, /closed\.example/)
    assert.doesNotMatch(report, /fine\.example|cf\.example/)
    assert.match(report, /работает 1, за защитой от ботов 1/)
})
