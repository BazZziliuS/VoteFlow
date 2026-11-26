// Проверка доступности всех сайтов из projects.js: открывает пример страницы проекта (pageURL)
// и классифицирует ответ. Только чтение публичных страниц, ничего не отправляет.
// Запуск: node scripts/check-sites.js [--json report.json]
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

const root = path.resolve(__dirname, '..')
const ctx = vm.createContext({console, URL})
vm.runInContext(fs.readFileSync(path.join(root, 'src/shared/projects.js'), 'utf8'), ctx)
const allProjects = vm.runInContext('allProjects', ctx)
const getDomain = vm.runInContext('getDomainWithoutSubdomain', ctx)

const TIMEOUT = 20000
const CONCURRENCY = 8
const HEADERS = {
    'user-agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36',
    accept: 'text/html,application/xhtml+xml',
    'accept-language': 'en-US,en;q=0.9,ru;q=0.8',
}

function exampleProject(domain, config) {
    const [prefix, id, suffix] = config.exampleURL?.() || ['', '', '']
    let project = {}
    if (prefix) {
        try {
            project = config.parseURL(new URL(prefix + id + suffix))
        } catch {}
    }
    project.rating = domain
    project.nick ??= 'test'
    project.addition ??= ''
    if (config.exampleURLGame && project.game == null)
        project.game = config.defaultGame?.() ?? config.exampleURLGame()[1]
    if (config.exampleURLListing && project.listing == null)
        project.listing = config.defaultListing?.() ?? config.exampleURLListing()[1]
    if (config.langList && project.lang == null)
        project.lang = config.defaultLand?.() ?? [...config.langList().keys()][0]
    return project
}

// Признаки страницы «домен продаётся / припаркован»: такой сайт отвечает 200, но рейтинга на нём больше нет
const PARKED_PAGE =
    /domain(?: name)? (?:is |may be )?for sale|buy this domain|parked domain|is parked|domain parking|this domain is for sale|lander\.parity\.domains|namepros\.com\/parked|sedoparking|afternic|dan\.com\/buy/i

function isParkedPage(html) {
    return PARKED_PAGE.test(html.slice(0, 50000))
}

async function readText(response) {
    try {
        return await response.text()
    } catch {
        return ''
    }
}

async function checkSite(domain, config) {
    const url = config.pageURL(exampleProject(domain, config))
    const started = Date.now()
    try {
        const response = await fetch(url, {headers: HEADERS, redirect: 'follow', signal: AbortSignal.timeout(TIMEOUT)})
        const ms = Date.now() - started
        const finalDomain = getDomain(response.url)
        const expected = [domain, config.URLMain?.(), getDomain(url)].filter(Boolean)
        const server = response.headers.get('server') || ''
        let status
        if (!expected.includes(finalDomain))
            status = /namepros|sedo|dan\.com|afternic|parking/i.test(finalDomain) ? 'parked' : 'redirect'
        else if (response.ok) status = isParkedPage(await readText(response)) ? 'parked' : 'ok'
        else if ([403, 429, 503].includes(response.status) && /cloudflare|ddos-guard|qrator/i.test(server))
            status = 'protected'
        else if (response.status === 404 || response.status === 410) {
            // 404 на примере проекта часто значит лишь, что тот сервер удалили. Проверяем главную сайта
            const home = await fetch(new URL(url).origin + '/', {
                headers: HEADERS,
                signal: AbortSignal.timeout(TIMEOUT),
            }).catch(() => null)
            if (home?.ok && isParkedPage(await readText(home))) status = 'parked'
            else
                status =
                    home && (home.ok || [403, 503].includes(home.status)) && getDomain(home.url) === finalDomain
                        ? 'stale-example'
                        : 'not-found'
        } else status = 'http-error'
        return {domain, url, status, code: response.status, finalUrl: response.url, ms}
    } catch (error) {
        const cause = error.cause?.code || error.name
        const status = ['ENOTFOUND', 'EAI_AGAIN'].includes(cause)
            ? 'dns'
            : cause === 'TimeoutError'
              ? 'timeout'
              : 'network'
        return {domain, url, status, error: cause + (error.cause?.message ? ': ' + error.cause.message : '')}
    }
}

async function main() {
    const sites = Object.entries(allProjects).filter(([d, c]) => d !== 'Custom' && c.pageURL)
    const results = []
    let next = 0
    await Promise.all(
        Array.from({length: CONCURRENCY}, async () => {
            while (next < sites.length) {
                const [domain, config] = sites[next++]
                const result = await checkSite(domain, config)
                results.push(result)
                process.stderr.write(`\r${results.length}/${sites.length}`)
            }
        }),
    )
    process.stderr.write('\n')

    const order = [
        'parked',
        'dns',
        'not-found',
        'redirect',
        'timeout',
        'network',
        'http-error',
        'stale-example',
        'protected',
        'ok',
    ]
    const titles = {
        parked: 'Домен продаётся или припаркован — сайт закрыт',
        dns: 'Домен не существует (DNS)',
        'not-found': 'Не найдены ни проект, ни главная страница (404/410)',
        'stale-example': 'Сайт жив, но пример проекта в exampleURL() устарел (404)',
        redirect: 'Редирект на другой домен',
        timeout: `Не ответил за ${TIMEOUT / 1000} с`,
        network: 'Сетевая ошибка (TLS, соединение сброшено)',
        'http-error': 'Другая HTTP-ошибка',
        protected: 'Защита Cloudflare/DDoS-Guard (сайт, скорее всего, жив)',
        ok: 'Работает',
    }
    for (const status of order) {
        const group = results.filter(r => r.status === status).sort((a, b) => a.domain.localeCompare(b.domain))
        if (!group.length) continue
        console.log(`\n${titles[status]}: ${group.length}`)
        if (status === 'ok') continue
        for (const r of group) {
            const detail = r.error || `${r.code}${r.finalUrl && r.finalUrl !== r.url ? ' → ' + r.finalUrl : ''}`
            console.log(`  ${r.domain.padEnd(32)} ${detail}`)
        }
    }

    const jsonIndex = process.argv.indexOf('--json')
    if (jsonIndex > 0) fs.writeFileSync(process.argv[jsonIndex + 1], JSON.stringify(results, null, 2))
    const markdownIndex = process.argv.indexOf('--markdown')
    if (markdownIndex > 0) fs.writeFileSync(process.argv[markdownIndex + 1], markdownReport(results, order, titles))
}

// Отчёт для задачи «Состояние сайтов» на GitHub (.github/workflows/sites.yml)
function markdownReport(results, order, titles) {
    const needsAttention = [
        'parked',
        'dns',
        'not-found',
        'redirect',
        'timeout',
        'network',
        'http-error',
        'stale-example',
    ]
    const lines = [
        `Проверка ${new Date().toISOString().slice(0, 10)}: ${results.length} сайтов, работает ${results.filter(r => r.status === 'ok').length}, ` +
            `за защитой от ботов ${results.filter(r => r.status === 'protected').length}.`,
        '',
        'Один сбой ещё не значит, что сайт закрыт: перед удалением перепроверьте вручную. Как удалять — в CONTRIBUTING.md («Новый сайт»).',
    ]
    for (const status of order.filter(s => needsAttention.includes(s))) {
        const group = results.filter(r => r.status === status).sort((a, b) => a.domain.localeCompare(b.domain))
        if (!group.length) continue
        lines.push('', `### ${titles[status]}: ${group.length}`, '')
        for (const r of group) {
            const detail = r.error || `${r.code}${r.finalUrl && r.finalUrl !== r.url ? ' → ' + r.finalUrl : ''}`
            lines.push(`- **${r.domain}** — \`${detail.replace(/`/g, "'").slice(0, 160)}\``)
        }
    }
    if (!results.some(r => needsAttention.includes(r.status))) lines.push('', 'Проблем не найдено.')
    return lines.join('\n') + '\n'
}

if (require.main === module) main()

module.exports = {isParkedPage, markdownReport}
