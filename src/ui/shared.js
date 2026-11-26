// Общие функции интерфейса: страница настроек и попап.
// Подключается через <script> раньше остальных скриптов интерфейса.

const REPO_URL = 'https://github.com/BazZziliuS/VoteFlow'
const UPDATE_CHECK_INTERVAL = 12 * 60 * 60 * 1000

/**
 * Сравнивает версии вида 8.1.0
 * @returns {number} >0 если a новее b, <0 если старее, 0 если равны
 */
function compareVersions(a, b) {
    const pa = String(a).replace(/^v/, '').split('.').map(Number)
    const pb = String(b).replace(/^v/, '').split('.').map(Number)
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const diff = (pa[i] || 0) - (pb[i] || 0)
        if (diff) return diff
    }
    return 0
}

/**
 * Проверяет последний релиз на GitHub не чаще раза в 12 часов (результат кэшируется в БД)
 * @param {Object} database - открытая БД (idb)
 * @returns {Promise<{version: string, url: string}|null>} новая версия или null
 */
async function checkForUpdate(database) {
    const current = chrome.runtime.getManifest().version
    let cache = await database.get('other', 'updateCheck')
    if (!cache || Date.now() - cache.checkedAt > UPDATE_CHECK_INTERVAL) {
        try {
            const response = await fetch('https://api.github.com/repos/BazZziliuS/VoteFlow/releases/latest', {
                headers: {accept: 'application/vnd.github+json'},
                credentials: 'omit',
                signal: AbortSignal.timeout(10000),
            })
            if (!response.ok) throw new Error('HTTP ' + response.status)
            const release = await response.json()
            cache = {checkedAt: Date.now(), version: String(release.tag_name).replace(/^v/, ''), url: release.html_url}
            await database.put('other', cache, 'updateCheck')
        } catch (error) {
            // Нет сети или лимит GitHub API — попробуем при следующем открытии, используем прошлый результат
            console.warn('Не удалось проверить обновления:', error.message)
            if (!cache) return null
        }
    }
    if (cache.version && compareVersions(cache.version, current) > 0) {
        return {version: cache.version, url: cache.url || REPO_URL + '/releases/latest'}
    }
    return null
}

/**
 * Ссылка на новую заявку на GitHub с заполненными сайтом, ошибкой и версией.
 * Ник игрока не передаётся: заявка публичная
 * @param {Object} project
 * @returns {string}
 */
function reportIssueUrl(project) {
    const version = chrome.runtime.getManifest().version
    const title = `${project.rating}: ${String(project.error || 'ошибка голосования').slice(0, 80)}`
    const body = [
        `**Сайт:** ${project.rating}`,
        project.id ? `**Проект (ID):** ${project.id}` : null,
        project.name ? `**Название:** ${project.name}` : null,
        `**Версия VoteFlow:** ${version}`,
        `**Браузер:** ${navigator.userAgent}`,
        '',
        '**Ошибка:**',
        '```',
        String(project.error || ''),
        '```',
        '',
        '**Что происходило:**',
        '',
    ]
        .filter(line => line !== null)
        .join('\n')
    return `${REPO_URL}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`
}

// Проекты, которые всегда показываются первыми в списках (без учёта регистра, пробелов и дефисов)
const FEATURED_PROJECTS = ['centurymine', 'sidemc']

function normalizeProjectText(value) {
    return String(value ?? '')
        .toLowerCase()
        .replace(/[\s_\-.]/g, '')
}

/**
 * Закреплён ли проект вверху списков: ID, название или игра содержат centurymine / sidemc
 * @param {Object} project
 * @returns {boolean}
 */
function isFeaturedProject(project) {
    if (!project) return false
    // Каждое поле отдельно: склейка «century» + «Mine Craft» дала бы ложное совпадение
    return [project.id, project.name, project.game].some(field => {
        const text = normalizeProjectText(field)
        return FEATURED_PROJECTS.some(name => text.includes(name))
    })
}

/**
 * Название проекта для списков: название с сайта, иначе ID, иначе сайт
 * @param {Object} project
 * @returns {string}
 */
function projectDisplayName(project) {
    return project.name || project.id || project.rating
}

/**
 * Относительное время до момента: «через 3 ч 12 мин». Пустая строка, если момент прошёл
 * @param {number} time timestamp
 * @returns {string}
 */
function formatRelative(time) {
    const diff = time - Date.now()
    if (diff <= 0) return ''
    const minutes = Math.round(diff / 60000)
    const lang = chrome.i18n.getUILanguage()
    const units = []
    const days = Math.floor(minutes / 1440)
    const hours = Math.floor((minutes % 1440) / 60)
    const mins = minutes % 60
    const fmt = (value, unit) => new Intl.NumberFormat(lang, {style: 'unit', unit, unitDisplay: 'short'}).format(value)
    if (days) units.push(fmt(days, 'day'))
    if (hours) units.push(fmt(hours, 'hour'))
    if (!days && (mins || units.length === 0)) units.push(fmt(Math.max(mins, 1), 'minute'))
    return chrome.i18n.getMessage('inTime', units.join(' '))
}

/**
 * Состояние проекта для статус-точки: now — голосует сейчас, queue — ждёт очереди на своём сайте,
 * error — последняя попытка с ошибкой, scheduled — ждёт своего времени
 * @param {Object} project
 * @param {Map} openedProjects открытые сейчас голосования из БД (other/openedProjects)
 * @returns {'now'|'queue'|'error'|'scheduled'}
 */
function projectState(project, openedProjects) {
    if (!(project.time != null && project.time !== '' && Date.now() < project.time) && openedProjects) {
        let state = null
        for (const value of openedProjects.values()) {
            if (project.rating === value.rating) {
                state = project.key === value.key ? 'now' : state || 'queue'
                if (state === 'now') break
            }
        }
        if (state) return state
    }
    if (project.error) return 'error'
    return 'scheduled'
}
