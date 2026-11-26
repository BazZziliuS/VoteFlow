// Распознавание закрытых сайтов в scripts/check-sites.js
const test = require('node:test')
const assert = require('node:assert/strict')
const {isParkedPage} = require('../scripts/check-sites.js')

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
