#!/usr/bin/env node
// Собирает CHANGELOG.md из заметок к релизам docs/releases/<версия>.md (новые версии сверху).
//   node scripts/changelog.js          — пересобрать CHANGELOG.md
//   node scripts/changelog.js --check  — проверить, что CHANGELOG.md актуален (CI)
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const releasesDir = path.join(root, 'docs/releases')
const REPO = 'https://github.com/BazZziliuS/VoteFlow'

function compareSemver(a, b) {
    const pa = a.split('.').map(Number), pb = b.split('.').map(Number)
    for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] - pb[i]
    return 0
}

function releaseNotes() {
    return fs.readdirSync(releasesDir)
        .filter(f => /^\d+\.\d+\.\d+\.md$/.test(f))
        .map(f => f.replace(/\.md$/, ''))
        .sort((a, b) => compareSemver(b, a))
        .map(version => {
            const raw = fs.readFileSync(path.join(releasesDir, version + '.md'), 'utf8').replace(/\r\n/g, '\n')
            const date = raw.match(/^<!--\s*date:\s*(\d{4}-\d{2}-\d{2})\s*-->/)?.[1] || null
            // Раздел «Установка» одинаковый во всех заметках — в журнал изменений не переносим
            const body = raw.replace(/^<!--[\s\S]*?-->\n?/, '').replace(/\n### Установка\n[\s\S]*?(?=\n### |\n?$)/, '\n').trim()
            return {version, date, body}
        })
}

function build() {
    const parts = [
        '# Журнал изменений',
        '',
        'Все заметные изменения VoteFlow. Формат — [Keep a Changelog](https://keepachangelog.com/ru/1.1.0/), версии — [SemVer](https://semver.org/lang/ru/) по правилам из [CONTRIBUTING.md](CONTRIBUTING.md#версии).',
        '',
        '<!-- Файл собирается командой `npm run changelog` из docs/releases/*.md — правьте заметки там -->',
        '',
    ]
    for (const {version, date, body} of releaseNotes()) {
        parts.push(`## [${version}](${REPO}/releases/tag/v${version}) — ${date || 'не выпущено'}`, '', body, '')
    }
    return parts.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n'
}

if (require.main === module) {
    const file = path.join(root, 'CHANGELOG.md')
    const content = build()
    if (process.argv.includes('--check')) {
        const current = fs.existsSync(file) ? fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n') : ''
        if (current !== content) {
            console.error('✗ CHANGELOG.md устарел: выполните npm run changelog')
            process.exit(1)
        }
        console.log('CHANGELOG.md актуален')
    } else {
        fs.writeFileSync(file, content)
        console.log('CHANGELOG.md собран:', releaseNotes().length, 'версий')
    }
}

module.exports = {build, compareSemver, releaseNotes}
