#!/usr/bin/env node
// Проверка сообщений коммитов по правилам CONTRIBUTING.md (Conventional Commits, описание на русском).
//
//   node scripts/commit-msg.js <файл-с-сообщением>   — хук commit-msg (.githooks/commit-msg)
//   node scripts/commit-msg.js --range <from>..<to>  — все коммиты диапазона (CI)
//   node scripts/commit-msg.js --message "<текст>"   — одно сообщение
const fs = require('node:fs')
const {execFileSync} = require('node:child_process')

const TYPES = {
    feat: 'новая возможность или новый сайт',
    fix: 'исправление ошибки или голосования на сайте',
    perf: 'ускорение без изменения поведения',
    refactor: 'переработка кода без изменения поведения',
    test: 'тесты',
    docs: 'документация',
    style: 'оформление кода, без изменения логики',
    build: 'сборка, зависимости',
    ci: 'GitHub Actions',
    chore: 'прочее обслуживание',
    revert: 'откат коммита',
    release: 'выпуск версии',
}

const HEADER = /^(?<type>[a-z]+)(?:\((?<scope>[^()\s][^()]*)\))?(?<breaking>!)?: (?<subject>.+)$/
const MAX_HEADER = 100
const PROPER_NOUNS = new Set(['Яндекс', 'Яндекса', 'ВКонтакте', 'Хром', 'Опера', 'Майнкрафт', 'Дискорд', 'Стим'])

/**
 * @param {string} message полное сообщение коммита
 * @returns {string[]} список нарушений (пустой — сообщение верное)
 */
function lint(message) {
    const lines = message
        .replace(/\r\n/g, '\n')
        .split('\n')
        .filter(line => !line.startsWith('#'))
    const header = (lines[0] || '').trim()
    // Служебные коммиты git проверять не нужно
    if (/^(Merge|Revert ") /.test(header) || /^(fixup|squash|amend)! /.test(header)) return []

    const errors = []
    const match = header.match(HEADER)
    if (!match) {
        errors.push(
            'заголовок должен быть в формате «тип(область): описание», например «fix(mctop.su): отправка после капчи»',
        )
        return errors
    }
    const {type, scope, subject} = match.groups
    if (!TYPES[type]) errors.push(`неизвестный тип «${type}». Допустимые: ${Object.keys(TYPES).join(', ')}`)
    if (scope !== undefined && scope.trim() !== scope) errors.push('область без пробелов по краям')
    if (header.length > MAX_HEADER) errors.push(`заголовок длиннее ${MAX_HEADER} символов (${header.length})`)
    if (/[.。]$/.test(subject)) errors.push('описание в заголовке без точки в конце')
    // Русское описание начинается с маленькой буквы; латиница и имена собственные (Opera, Яндекс) — как пишутся
    const firstWord = subject.split(/[\s,:;«»"']/)[0]
    if (/^[А-ЯЁ][а-яё]/.test(firstWord) && !PROPER_NOUNS.has(firstWord)) {
        errors.push('описание с маленькой буквы (кроме названий): «fix: кнопка…», а не «fix: Кнопка…»')
    }
    if (type === 'release' && !/^v?\d+\.\d+\.\d+$/.test(subject)) errors.push('коммит выпуска: «release: 9.1.0»')
    if (lines.length > 1 && lines[1].trim() !== '') errors.push('между заголовком и телом — пустая строка')
    return errors
}

function report(label, message) {
    const errors = lint(message)
    if (!errors.length) return true
    console.error(`✗ ${label}: ${message.split('\n')[0]}`)
    for (const error of errors) console.error('    ' + error)
    return false
}

function main(argv) {
    if (argv[0] === '--message') return report('сообщение', argv.slice(1).join(' '))
    if (argv[0] === '--range') {
        const out = execFileSync('git', ['log', '--format=%H%x00%B%x1e', argv[1]], {encoding: 'utf8'})
        let ok = true
        let count = 0
        for (const entry of out
            .split('\x1e')
            .map(e => e.trim())
            .filter(Boolean)) {
            const [hash, body] = entry.split('\x00')
            count++
            if (!report(hash.slice(0, 7), body)) ok = false
        }
        console.log(
            ok ? `Сообщения коммитов в порядке (${count})` : 'Исправьте сообщения коммитов: см. CONTRIBUTING.md',
        )
        return ok
    }
    if (argv[0]) {
        const ok = report('коммит', fs.readFileSync(argv[0], 'utf8'))
        if (!ok) console.error('\nПравила — в CONTRIBUTING.md. Пример: «fix(topcraft.club): автовход через VK ID»')
        return ok
    }
    console.error('Использование: commit-msg.js <файл> | --range <from>..<to> | --message <текст>')
    return false
}

if (require.main === module) process.exit(main(process.argv.slice(2)) ? 0 : 1)
module.exports = {lint, TYPES}
