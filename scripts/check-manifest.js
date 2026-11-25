// Проверка целостности расширения перед релизом.
// Ловит ошибки, из-за которых расширение не загружается или молча не голосует:
//   - importScripts / manifest.json / options.html ссылаются на несуществующий файл
//   - у сайта из projects.js нет скрипта голосования
//   - у сайта с тихим режимом нет _silentvote-скрипта или он не подключён в background.js
//   - в коде или разметке используется ключ локализации, которого нет в _locales/ru и _locales/en
// Запуск: node scripts/check-manifest.js (или npm run check)
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

const root = path.resolve(__dirname, '..')
const errors = []
const warnings = []
const exists = p => fs.existsSync(path.join(root, p.replace(/^\//, '')))
const read = p => fs.readFileSync(path.join(root, p), 'utf8')

function walk(dir, out = []) {
    for (const entry of fs.readdirSync(path.join(root, dir), {withFileTypes: true})) {
        const rel = path.posix.join(dir, entry.name)
        if (entry.isDirectory()) walk(rel, out)
        else out.push(rel)
    }
    return out
}

const sourceFiles = walk('src').filter(f => f.endsWith('.js'))

// 1. importScripts
for (const file of sourceFiles) {
    // Комментарии пропускаем: в них бывают примеры путей
    const text = read(file).split('\n').filter(line => !/^\s*(\/\/|\*)/.test(line)).join('\n')
    for (const call of text.matchAll(/importScripts\(([^)]*)\)/g)) {
        // Каждый аргумент: проверяем первую строку. Если путь склеивается с переменной, проверяем только префикс
        for (const arg of call[1].split(',')) {
            const m = arg.match(/^\s*'([^']+)'(\s*\+)?/)
            if (!m) continue
            const [, literal, concatenated] = m
            if (!literal.startsWith('/')) errors.push(`${file}: importScripts('${literal}') — путь должен начинаться с /`)
            else if (!concatenated && !exists(literal)) errors.push(`${file}: importScripts('${literal}') — файла нет`)
        }
    }
}

// 2. manifest.json
const manifest = JSON.parse(read('manifest.json'))
const manifestPaths = [
    manifest.background?.service_worker,
    manifest.options_ui?.page,
    manifest.action?.default_popup,
    ...Object.values(manifest.icons || {}),
    ...Object.values(manifest.action?.default_icon || {}),
    ...(manifest.web_accessible_resources || []).flatMap(r => r.resources),
].filter(Boolean)
for (const p of manifestPaths) {
    if (!p.includes('*') && !exists(p)) errors.push(`manifest.json: «${p}» — файла нет`)
}
// VoteFlow не публикуется в Chrome Web Store: update_url стора вместе с key оригинала заставит Chrome
// вести название расширения в стор и пытаться «обновить» его до старого Auto Vote Rating
if (/clients2\.google\.com/.test(manifest.update_url || '')) {
    errors.push('manifest.json: update_url указывает на Chrome Web Store — уберите его')
}
if (!manifest.homepage_url) errors.push('manifest.json: нет homepage_url (ссылка с названия расширения)')

// 3. HTML-страницы интерфейса (options.html, popup.html): все подключённые файлы существуют
const htmlPages = fs.readdirSync(path.join(root, 'src/ui')).filter(f => f.endsWith('.html'))
const optionsHtml = read('src/ui/options.html')
const htmlKeys = []
for (const page of htmlPages) {
    const html = read('src/ui/' + page)
    for (const m of html.matchAll(/(?:src|href)="((?:\.\.\/|[\w-]+\/|[\w-]+\.js)[^"]*)"/g)) {
        if (/^https?:/.test(m[1])) continue
        const resolved = path.posix.normalize(path.posix.join('src/ui', m[1]))
        if (!exists(resolved)) errors.push(`src/ui/${page}: «${m[1]}» — файла нет`)
    }
    for (const m of html.matchAll(/data-resource="([^"]+)"/g)) htmlKeys.push([m[1], 'src/ui/' + page])
}

// 4. Скрипты сайтов
const sandbox = {console, URL}
vm.createContext(sandbox)
vm.runInContext(read('src/core/projects.js'), sandbox, {filename: 'projects.js'})
const allProjects = sandbox.allProjects
const background = read('src/core/background.js')
for (const [domain, config] of Object.entries(allProjects)) {
    if (domain === 'Custom') continue
    // Записи-алиасы вида 'topcraft.club': {} голосуют скриптом основного домена
    if (Object.keys(config).length === 0) continue
    const main = config.URLMain?.() || domain
    let silent = false
    try { silent = !!config.silentVote?.({}) } catch { silent = true }
    if (!exists(`src/scripts/sites/${main}.js`) && !silent) {
        errors.push(`projects.js: «${domain}» — нет скрипта src/scripts/sites/${main}.js`)
    }
    if (silent) {
        // Тихий режим загружает скрипт основного домена: ratingMain || rating
        const silentFile = `src/scripts/silentvote/${main}_silentvote.js`
        const generic = background.includes(`silentVote_${main}`) || read('src/utils/voting/silent-vote-handler.js').includes(`'${main}'`)
        if (exists(silentFile)) {
            if (!background.includes(silentFile)) errors.push(`background.js: ${silentFile} не подключён через importScripts`)
        } else if (!generic) {
            warnings.push(`projects.js: «${domain}» включает silentVote, но отдельного _silentvote-скрипта нет (проверьте общий обработчик)`)
        }
    }
}

// 5. Ключи локализации
const locales = Object.fromEntries(['ru', 'en'].map(l => [l, JSON.parse(read(`_locales/${l}/messages.json`))]))
const usedKeys = new Map()
const addKey = (key, where) => { if (!usedKeys.has(key)) usedKeys.set(key, where) }
for (const [key, where] of htmlKeys) addKey(key, where)
for (const m of optionsHtml.matchAll(/placeholder="([A-Za-z]\w+)"/g)) addKey(m[1], 'src/ui/options.html (placeholder)')
for (const file of sourceFiles) {
    for (const m of read(file).matchAll(/i18n\.getMessage\('([^']+)'/g)) addKey(m[1], file)
}
const optionalPlaceholders = new Set(['min', 'max'])
for (const [key, where] of usedKeys) {
    if (optionalPlaceholders.has(key)) continue
    for (const [lang, messages] of Object.entries(locales)) {
        if (!messages[key]) {
            // Плейсхолдеры без перевода остаются как есть — это не ошибка
            if (where.includes('placeholder')) warnings.push(`_locales/${lang}: нет ключа «${key}» (${where})`)
            else errors.push(`_locales/${lang}: нет ключа «${key}» (используется в ${where})`)
        }
    }
}

for (const w of warnings) console.warn('⚠ ' + w)
for (const e of errors) console.error('✗ ' + e)
console.log(`\nПроверено: ${sourceFiles.length} js-файлов, ${Object.keys(allProjects).length} сайтов, ${usedKeys.size} ключей локализации`)
if (errors.length) {
    console.error(`Ошибок: ${errors.length}`)
    process.exit(1)
}
console.log('Ошибок нет' + (warnings.length ? `, предупреждений: ${warnings.length}` : ''))
