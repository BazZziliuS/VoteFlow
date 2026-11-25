// Дымовой тест страницы настроек в настоящем Chromium.
// Берёт src/ui/options.html со всеми скриптами, подменяет chrome.* заглушкой (IndexedDB настоящая),
// проходит по основным сценариям и падает, если на странице была хоть одна ошибка.
//
// Запуск: npm run test:ui
// Chromium ищется в CHROME_PATH, затем в стандартных местах (Chrome, Edge, кэш Playwright)
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const {spawn} = require('node:child_process')

const root = path.resolve(__dirname, '..', '..')
const uiDir = path.join(root, 'src/ui')
const fileUrl = p => 'file:///' + path.resolve(p).replace(/\\/g, '/')
const sleep = ms => new Promise(r => setTimeout(r, ms))

function findChrome() {
    if (process.env.CHROME_PATH) return process.env.CHROME_PATH
    const candidates = [
        '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        'C:/Program Files/Google/Chrome/Application/chrome.exe',
        'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    ]
    const playwright = process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'ms-playwright')
    if (playwright && fs.existsSync(playwright)) {
        for (const dir of fs.readdirSync(playwright).filter(d => d.startsWith('chromium-')).sort().reverse()) {
            candidates.unshift(path.join(playwright, dir, 'chrome-win64', 'chrome.exe'))
        }
    }
    return candidates.find(p => fs.existsSync(p))
}

function buildPage(outFile) {
    let html = fs.readFileSync(path.join(uiDir, 'options.html'), 'utf8')
    html = html.replace(/(src|href)="(\.\.\/[^"]+|(?:options|styles)\/[^"]+|[\w-]+\.(?:js|css))"/g, (m, attr, rel) => `${attr}="${fileUrl(path.join(uiDir, rel))}"`)
    html = html.replace(/<script src="[^"]*sentry[^"]*"><\/script>/g, '')
    const messages = fs.readFileSync(path.join(root, '_locales/ru/messages.json'), 'utf8')
    const manifest = fs.readFileSync(path.join(root, 'manifest.json'), 'utf8')

    const stub = `<script>
window.__errors = []
window.addEventListener('error', e => __errors.push('error: ' + e.message + ' @' + (e.filename || '').split('/').pop() + ':' + e.lineno))
window.addEventListener('unhandledrejection', e => __errors.push('rejection: ' + (e.reason && (e.reason.stack || e.reason.message) || e.reason)))
const __M = ${messages}
const __MANIFEST = ${manifest}
window.alert = window.confirm = () => true
const __listeners = () => ({addListener() {}, removeListener() {}, hasListener: () => false})
window.chrome = {
    i18n: {
        getUILanguage: () => 'ru',
        getMessage(key, sub) {
            const m = __M[key]
            if (!m) return ''
            let s = m.message
            const subs = Array.isArray(sub) ? sub : sub != null ? [sub] : []
            for (const [name, ph] of Object.entries(m.placeholders || {})) {
                s = s.split(new RegExp('\\\\$' + name + '\\\\$', 'i')).join(subs[Number(ph.content.slice(1)) - 1] ?? '')
            }
            return s
        }
    },
    runtime: {getManifest: () => __MANIFEST, sendMessage: async () => undefined, onMessage: __listeners(), reload() {}, id: 'smoke'},
    alarms: {getAll: async () => [], create: async () => {}, clear: async () => true, onAlarm: __listeners()},
    permissions: {contains: async () => true, request: async () => true},
    notifications: {getPermissionLevel: cb => cb('granted')},
    tabs: {onRemoved: __listeners(), onUpdated: __listeners(), update: async () => ({}), query: async () => []},
    windows: {create: async () => ({tabs: [{id: 1}]}), update: async () => ({})},
    management: {uninstallSelf() {}},
    cookies: {getAll: async () => []},
    storage: {local: {get: async () => ({}), set: async () => {}}},
}
</script>`

    const scenario = `<script>
window.addEventListener('load', async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms))
    const checks = []
    const check = (name, ok) => { if (!ok) checks.push('check failed: ' + name) }
    const step = async (name, fn) => { try { await fn(); await sleep(150) } catch (e) { __errors.push('step ' + name + ': ' + e.message) } }
    const toggle = (id, value) => { const c = document.getElementById(id); c.checked = value; c.dispatchEvent(new Event('change')) }
    await initializeFunc
    await loaded
    await sleep(300)

    await updateNavCount()
    check('«Как это работает» видно без проектов', document.getElementById('welcome').style.display !== 'none')
    await step('link: unsupported', () => { const l = document.getElementById('link'); l.value = 'https://example.org/server/1'; l.dispatchEvent(new Event('input')) })
    check('неподдерживаемый сайт отмечен ошибкой', document.getElementById('linkStatus').classList.contains('error'))
    await step('link: recognized', () => { const l = document.getElementById('link'); l.value = 'https://minecraftrating.ru/projects/mcskill/'; l.dispatchEvent(new Event('input')) })
    check('ссылка распознана', document.getElementById('linkStatus').classList.contains('ok') && document.getElementById('linkStatus').textContent.includes('mcskill'))
    check('список сайтов заполнен', document.querySelectorAll('#sitesList .site-chip').length > 100)
    // Переключатель «О начале голосования» включён = уведомления не отключены
    check('инверсия: уведомления о начале включены по умолчанию', document.getElementById('disabledNotifStart').checked === !settings.disabledNotifStart)
    await step('invert toggle', () => { const c = document.getElementById('disabledNotifStart'); c.checked = !c.checked; c.dispatchEvent(new Event('change')) })
    await sleep(200)
    check('инверсия: выключение переключателя отключает уведомления', settings.disabledNotifStart === !document.getElementById('disabledNotifStart').checked)

    // Тестовый проект прямо в БД — так же, как его сохраняет форма
    await step('seed project', async () => {
        const project = {rating: 'minecraftrating.ru', listing: 'projects', id: 'mcskill', nick: 'Steve_2011', name: 'MCSKILL',
            time: Date.now() + 3 * 3600000, priority: false,
            stats: {successVotes: 12, monthSuccessVotes: 3, lastMonthSuccessVotes: 9, errorVotes: 0, laterVotes: 1, lastSuccessVote: null, lastAttemptVote: null, added: Date.now()}}
        const store = db.transaction('projects', 'readwrite').store
        project.key = await store.put(project)
        await store.put(project, project.key)
        await reloadProjectList()
    })
    await step('tab added', () => document.getElementById('addedTab').click())
    await sleep(400)
    check('карточка проекта отрисована', document.querySelector('.project .projectName')?.textContent.includes('MCSKILL'))
    check('время следующего голоса', !!document.querySelector('.project .textNextVote .rel')?.textContent)
    check('счётчик в меню', document.getElementById('navProjectsCount').textContent === '1')
    check('«Как это работает» скрыто при наличии проектов', document.getElementById('welcome').style.display === 'none')
    // Регрессия: переход к проекту на первом сайте списка, пока список ещё грузится
    // (автовыбор первого сайта и openProject загружали один список одновременно → null.scrollIntoView)
    await step('openProject race', async () => {
        const key = (await db.getAllKeys('projects'))[0]
        await reloadProjectList()
        document.getElementById('addTab').click()
        await onMessage({openProject: key})
        check('переход к проекту из уведомления показывает карточку', !!document.getElementById('projects' + key)?.classList.contains('highlight'))
    })
    await step('project stats', () => document.querySelector('.project .projectStats:nth-child(2)').click())
    await sleep(300)
    check('статистика проекта', document.querySelector('#stats td[data-resource="statsSuccessVotes"] + th')?.textContent === '12')
    await step('close project stats', () => document.querySelector('#stats .close').click())

    await step('tab settings', () => document.getElementById('settingsTab').click())
    await step('expert on', () => toggle('expertMode', true))
    await step('tab add', () => document.getElementById('addTab').click())
    check('расширенные параметры видны', document.getElementById('advSettingsAdd').style.display !== 'none')
    await step('manual mode', () => toggle('switchAddMode', true))
    await step('pick rating', () => { const r = document.getElementById('rating'); r.value = 'minecraftrating.ru'; r.dispatchEvent(new Event('input')) })
    check('поле ID появилось', document.getElementById('id').parentElement.style.display !== 'none')
    await step('custom timeout', () => toggle('customTimeOut', true))
    await step('link mode', () => toggle('switchAddMode', false))
    await step('type link', () => { const l = document.getElementById('link'); l.value = 'https://minecraftrating.ru/projects/mcskill/'; l.dispatchEvent(new Event('input')) })
    check('поле ника появилось', document.getElementById('nick').parentElement.style.display !== 'none')

    await step('general stats', () => document.getElementById('generalStats').click())
    await sleep(300)
    await step('close stats', () => document.querySelector('#stats .close').click())
    await step('today stats', () => document.getElementById('todayStats').click())
    await sleep(300)
    await step('close today', () => document.querySelector('#statsToday .close').click())
    await step('notification', () => createNotif('Проверка уведомления', 'success'))
    check('уведомление показано', document.querySelectorAll('#notifBlock .notif').length > 0)

    await step('delete: first click asks', async () => {
        document.getElementById('addedTab').click()
        await sleep(200)
        document.querySelector('.project .projectStats.danger').click()
    })
    check('первый клик не удаляет', !!document.querySelector('.project'))
    await step('delete: second click deletes', () => document.querySelector('.project .projectStats.danger').click())
    await sleep(400)
    check('второй клик удаляет', !document.querySelector('.project'))

    await step('tab help', () => document.getElementById('helpTab').click())
    await sleep(300)
    document.title = 'SMOKE ' + JSON.stringify({errors: __errors.concat(checks)})
})
</script>`
    html = html.replace('<head>', () => '<head>\n' + stub)
    html = html.replace('</body>', () => scenario + '\n</body>')
    fs.writeFileSync(outFile, html)
}

async function run() {
    const chrome = findChrome()
    if (!chrome) {
        console.error('Chromium не найден. Укажите путь в переменной CHROME_PATH')
        process.exit(1)
    }
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'voteflow-smoke-'))
    const page = path.join(tmp, 'options-smoke.html')
    buildPage(page)

    // На CI браузер иногда стартует медленно: ждём до 30 секунд и при неудаче пробуем ещё раз
    let proc, target
    for (let attempt = 1; attempt <= 2 && !target; attempt++) {
        const port = 9300 + Math.floor(Math.random() * 500)
        const args = ['--headless=new', '--disable-gpu', '--allow-file-access-from-files', '--no-first-run',
            `--remote-debugging-port=${port}`, `--user-data-dir=${path.join(tmp, 'profile-' + attempt)}`, 'about:blank']
        if (process.platform === 'linux') args.unshift('--no-sandbox', '--disable-dev-shm-usage')
        proc = spawn(chrome, args, {stdio: 'ignore'})
        for (let i = 0; i < 150 && !target; i++) {
            await sleep(200)
            try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(t => t.type === 'page') } catch {}
        }
        if (!target) {
            console.warn(`Chromium не открыл порт отладки (попытка ${attempt})`)
            proc.kill()
        }
    }

    try {
        if (!target) throw new Error('Chromium не открыл порт отладки')
        const ws = new WebSocket(target.webSocketDebuggerUrl)
        await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject })
        let id = 0
        const pending = new Map()
        ws.onmessage = ev => {
            const msg = JSON.parse(ev.data)
            if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg.result); pending.delete(msg.id) }
        }
        const send = (method, params = {}) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({id: i, method, params})) })
        await send('Page.enable')
        await send('Page.navigate', {url: fileUrl(page)})

        let title = ''
        for (let i = 0; i < 150 && !title.startsWith('SMOKE'); i++) {
            await sleep(200)
            title = (await send('Runtime.evaluate', {expression: 'document.title', returnByValue: true}))?.result?.value || ''
        }
        ws.close()
        if (!title.startsWith('SMOKE')) throw new Error('сценарий не завершился за 30 секунд')
        const {errors} = JSON.parse(title.slice(6))
        if (errors.length) {
            console.error('Страница настроек: ошибки')
            for (const e of errors) console.error('  ✗ ' + e)
            process.exitCode = 1
        } else {
            console.log('Страница настроек: все сценарии прошли без ошибок')
        }
    } finally {
        proc.kill()
        await sleep(300)
        fs.rmSync(tmp, {recursive: true, force: true, maxRetries: 3})
    }
}

run().catch(e => { console.error(e.message); process.exit(1) })
