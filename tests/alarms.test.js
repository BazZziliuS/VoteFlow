// Будильники проектов (src/background/browser/alarms.js): остановленный проект (time = Infinity) не планируется
const test = require('node:test')
const assert = require('node:assert/strict')
const {loadScripts} = require('./helpers')

function setup() {
    const created = []
    const chrome = {alarms: {
        clear: async () => true,
        getAll: async () => [],
        create: async (name, info) => { created.push({name, ...info}) },
    }}
    const ctx = loadScripts(['src/background/helpers/constants.js', 'src/background/browser/alarms.js'],
        {chrome, getProjectPrefix: () => '[test]'})
    return {ctx, created}
}

test('scheduleProjectAlarm ставит будильник на время следующего голоса', async () => {
    const {ctx, created} = setup()
    const time = Date.now() + 3600000
    await ctx.scheduleProjectAlarm({key: 1, time})
    assert.equal(created.length, 1)
    assert.equal(created[0].when, time)
})

test('scheduleProjectAlarm не планирует остановленный проект (stopVoting → time = Infinity)', async () => {
    const {ctx, created} = setup()
    await ctx.scheduleProjectAlarm({key: 2, time: Infinity})
    await ctx.scheduleProjectAlarm({key: 3, time: null})
    assert.equal(created.length, 0)
})
