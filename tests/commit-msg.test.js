// Правила сообщений коммитов (scripts/commit-msg.js)
const test = require('node:test')
const assert = require('node:assert/strict')
const {lint} = require('../scripts/commit-msg.js')

test('верные сообщения', () => {
    for (const message of [
        'fix(minecraftrating.ru): кнопка голосования #voteProject',
        'feat(popup): окно расширения по клику на иконку',
        'feat!: собственный ID расширения\n\nBREAKING CHANGE: данные старого расширения не переносятся',
        'docs: правила коммитов',
        'release: 9.1.0',
        'fix(topcraft.club): SmartCaptcha на cloud.yandex.ru',
        'fix(ui): VK ID ждёт загрузки страницы',
        'fix(opera): Opera — кнопки не вылезают за окно',
        'fix(captcha): Яндекс сменил домен капчи',
        "Merge branch 'dev' into refactor",
    ])
        assert.deepEqual(lint(message), [], message)
})

test('неверные сообщения', () => {
    const cases = {
        'Поправил кнопку': 'формате',
        'fixed: кнопка': 'неизвестный тип',
        'fix: кнопка голосования.': 'без точки',
        'fix: Кнопка голосования': 'маленькой буквы',
        'release: новая версия': 'release: 9.1.0',
        'fix: кнопка\nтело без пустой строки': 'пустая строка',
        ['fix: ' + 'очень '.repeat(20)]: 'длиннее',
    }
    for (const [message, expected] of Object.entries(cases)) {
        const errors = lint(message)
        assert.ok(
            errors.some(e => e.includes(expected)),
            `${message} → ${JSON.stringify(errors)}`,
        )
    }
})
