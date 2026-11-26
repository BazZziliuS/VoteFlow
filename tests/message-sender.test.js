// Проверка отправителя служебных сообщений (src/background/voting/message-handlers.js)
const test = require('node:test')
const assert = require('node:assert/strict')
const {loadScripts} = require('./helpers')

const ctx = loadScripts(['src/background/voting/message-handlers.js'], {chrome: {}})
const EXTENSION = 'chrome-extension://fbbachmmbemdckddpilggkohkpfojgka/'
const optionsPage = {id: 'x', url: EXTENSION + 'src/ui/options.html', tab: {id: 5}}
const popup = {id: 'x', url: EXTENSION + 'src/ui/popup.html'}
const siteTab = {id: 'x', url: 'https://topcraft.club/servers/7411/', tab: {id: 42}}

test('страницы расширения — свои, вкладки сайтов — нет', () => {
    assert.equal(ctx.isExtensionPageSender(optionsPage, EXTENSION), true)
    assert.equal(ctx.isExtensionPageSender(popup, EXTENSION), true)
    assert.equal(ctx.isExtensionPageSender(siteTab, EXTENSION), false)
    assert.equal(ctx.isExtensionPageSender({url: 'chrome-extension://другое/src/ui/options.html'}, EXTENSION), false)
    assert.equal(ctx.isExtensionPageSender({}, EXTENSION), false)
})

test('служебные команды: настройки, удаление и перезапуск проектов', () => {
    for (const request of [
        'reloadSettings',
        'reloadAllSettings',
        {projectDeleted: {key: 1}},
        {projectRestart: {key: 1}},
    ]) {
        assert.equal(ctx.isExtensionPageCommand(request), true, JSON.stringify(request))
    }
    for (const request of ['checkVote', {successfully: true}, {message: 'x'}, {captchaPassed: true}, null]) {
        assert.equal(ctx.isExtensionPageCommand(request), false, JSON.stringify(request))
    }
})

test('вкладка сайта меняет только проект, который в ней голосует', () => {
    const openedProjects = new Map([[42, {key: 7}]])
    assert.equal(ctx.canTabChangeProject(siteTab, {key: 7}, openedProjects), true)
    assert.equal(ctx.canTabChangeProject(siteTab, {key: 8}, openedProjects), false)
    assert.equal(ctx.canTabChangeProject({...siteTab, tab: {id: 43}}, {key: 7}, openedProjects), false)
    assert.equal(ctx.canTabChangeProject(popup, {key: 7}, openedProjects), false)
})
