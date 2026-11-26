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
    const text = read(file)
        .split('\n')
        .filter(line => !/^\s*(\/\/|\*)/.test(line))
        .join('\n')
    for (const call of text.matchAll(/importScripts\(([^)]*)\)/g)) {
        // Каждый аргумент: проверяем первую строку. Если путь склеивается с переменной, проверяем только префикс
        for (const arg of call[1].split(',')) {
            const m = arg.match(/^\s*'([^']+)'(\s*\+)?/)
            if (!m) continue
            const [, literal, concatenated] = m
            if (!literal.startsWith('/'))
                errors.push(`${file}: importScripts('${literal}') — путь должен начинаться с /`)
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
// Версия одна на проект: manifest.json и package.json поднимаются вместе (npm run release)
{
    const pkg = JSON.parse(read('package.json'))
    if (!/^\d+\.\d+\.\d+$/.test(manifest.version))
        errors.push(`manifest.json: версия «${manifest.version}» не в формате X.Y.Z`)
    if (pkg.version !== manifest.version)
        errors.push(
            `версии расходятся: manifest.json ${manifest.version}, package.json ${pkg.version} — используйте npm run release`,
        )
}

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

// 3б. Миграции базы: фон и обе страницы подключают все файлы миграций в одном порядке,
// а index.js вызывает каждую. Иначе база откроется по-разному в фоне и в окне настроек
{
    const dir = 'src/shared/database/migrations'
    const order = f => (f === 'index.js' ? Infinity : Number(f.match(/^migration-v(\d+)/)?.[1] ?? -1))
    const expected = fs
        .readdirSync(path.join(root, dir))
        .filter(f => f.endsWith('.js'))
        .sort((a, b) => order(a) - order(b))
    const listed = (text, re) => [...text.matchAll(re)].map(m => m[1])
    const sources = {
        'src/background/background.js': listed(
            read('src/background/background.js'),
            /importScripts\('\/src\/shared\/database\/migrations\/([^']+)'\)/g,
        ),
        'src/ui/options.html': listed(
            read('src/ui/options.html'),
            /src="\.\.\/shared\/database\/migrations\/([^"]+)"/g,
        ),
        'src/ui/popup.html': listed(read('src/ui/popup.html'), /src="\.\.\/shared\/database\/migrations\/([^"]+)"/g),
    }
    for (const [file, list] of Object.entries(sources)) {
        if (list.join() !== expected.join()) {
            errors.push(`${file}: миграции подключены не так, как лежат в ${dir}. Нужно: ${expected.join(', ')}`)
        }
    }
    // Версия базы = номер последней миграции + 1 (миграция vN переводит базу с N на N+1)
    const lastMigration = Math.max(...expected.map(order).filter(Number.isFinite))
    const dbVersion = Number(read('src/shared/main.js').match(/^const DB_VERSION = (\d+)/m)?.[1])
    if (dbVersion !== lastMigration + 1) {
        errors.push(
            `src/shared/main.js: DB_VERSION = ${dbVersion}, а последняя миграция — v${lastMigration}; нужно ${lastMigration + 1}`,
        )
    }

    const index = read(`${dir}/index.js`)
    for (const file of expected.filter(f => f !== 'index.js')) {
        const fn = read(`${dir}/${file}`).match(/^async function (migrateV[\w]+)\(/m)?.[1]
        if (fn && !index.includes(fn + '(')) errors.push(`${dir}/index.js: не вызывается ${fn} из ${file}`)
    }
}

// 4. Скрипты сайтов
const sandbox = {console, URL}
vm.createContext(sandbox)
vm.runInContext(read('src/shared/projects.js'), sandbox, {filename: 'projects.js'})
const allProjects = vm.runInContext('allProjects', sandbox)
const background = read('src/background/background.js')
for (const [domain, config] of Object.entries(allProjects)) {
    if (domain === 'Custom') continue
    // Записи-алиасы вида 'topcraft.club': {} голосуют скриптом основного домена
    if (Object.keys(config).length === 0) continue
    const main = config.URLMain?.() || domain
    let silent = false
    try {
        silent = !!config.silentVote?.({})
    } catch {
        silent = true
    }
    if (!exists(`src/content/sites/${main}.js`) && !silent) {
        errors.push(`projects.js: «${domain}» — нет скрипта src/content/sites/${main}.js`)
    }
    if (silent) {
        // Тихий режим загружает скрипт основного домена: ratingMain || rating
        const silentFile = `src/background/silentvote/${main}_silentvote.js`
        const generic =
            background.includes(`silentVote_${main}`) ||
            read('src/background/voting/silent-vote-handler.js').includes(`'${main}'`)
        if (exists(silentFile)) {
            if (!background.includes(silentFile))
                errors.push(`background.js: ${silentFile} не подключён через importScripts`)
        } else if (!generic) {
            warnings.push(
                `projects.js: «${domain}» включает silentVote, но отдельного _silentvote-скрипта нет (проверьте общий обработчик)`,
            )
        }
    }
}

// 4а. Скрипты сайтов без записи в projects.js никогда не внедряются — это мёртвый код
{
    const knownScripts = new Set()
    for (const [domain, config] of Object.entries(allProjects)) {
        knownScripts.add(domain)
        try {
            if (config.URLMain) knownScripts.add(config.URLMain())
        } catch {}
    }
    for (const file of fs.readdirSync(path.join(root, 'src/content/sites'))) {
        // <домен>_world.js — часть скрипта сайта, внедряемая в мир страницы
        const site = file.replace(/\.js$/, '').replace(/_world$/, '')
        if (!knownScripts.has(site))
            errors.push(`src/content/sites/${file}: сайта «${site}» нет в projects.js — скрипт не используется`)
    }
}

// 4б. README: число сайтов в бейдже и в списке совпадает с projects.js
{
    const siteCount = Object.keys(allProjects).filter(site => site !== 'Custom').length
    const readme = read('README.md')
    const badge = readme.match(/badge\/%D1%81%D0%B0%D0%B9%D1%82%D0%BE%D0%B2-(\d+)-/)?.[1]
    const summary = readme.match(/<summary>(\d+) сайтов/)?.[1]
    for (const [where, value] of [
        ['бейдж «сайтов»', badge],
        ['заголовок списка сайтов', summary],
    ]) {
        if (value && Number(value) !== siteCount)
            errors.push(`README.md: ${where} — ${value}, а в projects.js ${siteCount} сайтов`)
    }
}

// 5. Ключи локализации
const LOCALES = fs.readdirSync(path.join(root, '_locales'))
const locales = Object.fromEntries(LOCALES.map(l => [l, JSON.parse(read(`_locales/${l}/messages.json`))]))
const usedKeys = new Map()
const addKey = (key, where) => {
    if (!usedKeys.has(key)) usedKeys.set(key, where)
}
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

// 5б. Все языки полные: те же ключи, что в ru, и описаны все $плейсхолдеры$ —
// иначе пользователь увидит английский текст или пустое место вместо подстановки
{
    const reference = locales.ru
    for (const [lang, messages] of Object.entries(locales)) {
        const missing = Object.keys(reference).filter(key => !messages[key])
        const extra = Object.keys(messages).filter(key => !reference[key])
        if (missing.length) errors.push(`_locales/${lang}: нет перевода ${missing.length} строк: ${missing.join(', ')}`)
        if (extra.length) errors.push(`_locales/${lang}: ключи, которых нет в ru: ${extra.join(', ')}`)
        for (const [key, {message, placeholders = {}}] of Object.entries(messages)) {
            for (const [, name] of message.matchAll(/\$([a-zA-Z_][\w]*)\$/g)) {
                if (!placeholders[name.toLowerCase()] && !placeholders[name]) {
                    errors.push(`_locales/${lang}: «${key}» — плейсхолдер $${name}$ не описан в placeholders`)
                }
            }
        }
    }

    // Ключ, название которого не встречается ни в одном файле кода, не может быть показан.
    // Ищем само имя: ключи бывают динамическими (имя поля сообщения скрипта сайта)
    const allCode = [...sourceFiles, ...htmlPages.map(page => 'src/ui/' + page), 'manifest.json'].map(read).join('\n')
    const unusedKeys = Object.keys(reference).filter(key => !new RegExp(`[^\w]${key}[^\w]`).test(allCode))
    if (unusedKeys.length) errors.push(`_locales: ключи нигде не используются — удалите их: ${unusedKeys.join(', ')}`)
}

for (const w of warnings) console.warn('⚠ ' + w)
for (const e of errors) console.error('✗ ' + e)
console.log(
    `\nПроверено: ${sourceFiles.length} js-файлов, ${Object.keys(allProjects).length} сайтов, ${usedKeys.size} ключей локализации`,
)
if (errors.length) {
    console.error(`Ошибок: ${errors.length}`)
    process.exit(1)
}
console.log('Ошибок нет' + (warnings.length ? `, предупреждений: ${warnings.length}` : ''))
