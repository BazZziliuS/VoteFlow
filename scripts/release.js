#!/usr/bin/env node
// Подготовка выпуска: npm run release -- <patch|minor|major|X.Y.Z>
//
// 1. Поднимает версию в manifest.json и package.json
// 2. Создаёт черновик заметок docs/releases/<версия>.md из коммитов с прошлого тега (если файла ещё нет)
// 3. Пересобирает CHANGELOG.md
// Коммит, тег и push остаются за вами — команды выводятся в конце.
const fs = require('node:fs')
const path = require('node:path')
const {execFileSync} = require('node:child_process')
const {compareSemver} = require('./changelog.js')

const root = path.resolve(__dirname, '..')
const git = (...args) => execFileSync('git', args, {cwd: root, encoding: 'utf8'}).trim()
const HEADER = /^(?<type>[a-z]+)(?:\((?<scope>[^()]+)\))?(?<breaking>!)?: (?<subject>.+)$/

function nextVersion(current, bump) {
    if (/^\d+\.\d+\.\d+$/.test(bump)) return bump
    const [major, minor, patch] = current.split('.').map(Number)
    if (bump === 'major') return `${major + 1}.0.0`
    if (bump === 'minor') return `${major}.${minor + 1}.0`
    if (bump === 'patch') return `${major}.${minor}.${patch + 1}`
    throw new Error('укажите patch, minor, major или версию X.Y.Z')
}

function setVersion(file, version) {
    const full = path.join(root, file)
    const text = fs.readFileSync(full, 'utf8')
    const updated = text.replace(/("version":\s*")\d+\.\d+\.\d+(")/, `$1${version}$2`)
    if (updated === text) throw new Error(`не нашлось поле version в ${file}`)
    JSON.parse(updated)
    fs.writeFileSync(full, updated)
}

// Коммиты с прошлого тега, сгруппированные по типам
function collectCommits() {
    let range = 'HEAD'
    try {
        range = git('describe', '--tags', '--abbrev=0') + '..HEAD'
    } catch {}
    const log = git('log', '--format=%s%x00%b%x1e', range)
    const groups = {breaking: [], feat: [], fix: [], perf: [], other: []}
    for (const entry of log.split('\x1e').map(e => e.trim()).filter(Boolean)) {
        const [subject, body] = entry.split('\x00')
        const match = subject.match(HEADER)
        if (!match) {
            groups.other.push(subject)
            continue
        }
        const {type, scope, breaking, subject: text} = match.groups
        if (type === 'release') continue
        const line = (scope ? `**${scope}:** ` : '') + text
        if (breaking || /BREAKING CHANGE/.test(body || '')) groups.breaking.push(line)
        if (groups[type]) groups[type].push(line)
        else if (!['docs', 'test', 'ci', 'build', 'style', 'chore', 'refactor'].includes(type)) groups.other.push(line)
    }
    return {range, groups}
}

function draftNotes(version, groups) {
    const date = new Date().toLocaleDateString('sv') // ГГГГ-ММ-ДД по местному времени
    const section = (title, lines) => lines.length ? `### ${title}\n${lines.map(l => '- ' + l).join('\n')}\n\n` : ''
    return `<!-- date: ${date} -->\n` +
        section('Важно', groups.breaking) +
        section('Новое', groups.feat) +
        section('Исправлено', groups.fix) +
        section('Быстрее', groups.perf) +
        section('Прочее', groups.other) +
        `### Установка
1. Скачайте \`VoteFlow-${version}.zip\` и распакуйте
2. Откройте страницу расширений браузера (\`chrome://extensions/\`, \`edge://extensions/\` и т. п.) и включите «Режим разработчика»
3. Нажмите «Загрузить распакованное расширение» и выберите папку \`VoteFlow\`

Если VoteFlow уже установлен, замените содержимое папки и нажмите «Обновить» на странице расширений: проекты и настройки сохранятся.
`
}

function main() {
    const bump = process.argv[2]
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'))
    const current = manifest.version
    const version = nextVersion(current, bump)
    if (compareSemver(version, current) <= 0) throw new Error(`новая версия ${version} должна быть больше текущей ${current}`)

    const {range, groups} = collectCommits()
    if (groups.breaking.length && version.split('.')[0] === current.split('.')[0]) {
        console.warn(`⚠ В ${range} есть несовместимые изменения (тип с «!» или BREAKING CHANGE) — по правилам это major-версия`)
    }

    setVersion('manifest.json', version)
    setVersion('package.json', version)

    const notes = path.join(root, 'docs/releases', version + '.md')
    if (fs.existsSync(notes)) {
        console.log(`Заметки ${path.relative(root, notes)} уже есть — оставлены как есть`)
    } else {
        fs.writeFileSync(notes, draftNotes(version, groups))
        console.log(`Создан черновик заметок ${path.relative(root, notes)} из коммитов ${range} — отредактируйте его для пользователей`)
    }
    execFileSync(process.execPath, [path.join(__dirname, 'changelog.js')], {cwd: root, stdio: 'inherit'})

    console.log(`
Версия ${current} → ${version}. Дальше:
  1. Отредактируйте docs/releases/${version}.md и выполните npm run changelog
  2. npm run check
  3. git add -A && git commit -m "release: ${version}"
  4. git tag -a v${version} -m "VoteFlow ${version}"
  5. git push origin HEAD v${version}   — релиз соберёт GitHub Actions`)
}

try {
    main()
} catch (error) {
    console.error('✗ ' + error.message)
    process.exit(1)
}
