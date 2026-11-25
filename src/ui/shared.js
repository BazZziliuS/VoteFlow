// Общие функции интерфейса: страница настроек и попап.
// Подключается через <script> раньше остальных скриптов интерфейса.

// Проекты, которые всегда показываются первыми в списках (без учёта регистра, пробелов и дефисов)
const FEATURED_PROJECTS = ['centurymine', 'sidemc']

function normalizeProjectText(value) {
    return String(value ?? '').toLowerCase().replace(/[\s_\-.]/g, '')
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
                state = project.key === value.key ? 'now' : (state || 'queue')
                if (state === 'now') break
            }
        }
        if (state) return state
    }
    if (project.error) return 'error'
    return 'scheduled'
}
