// VoteFlow — попап по клику на иконку расширения:
// ближайшие голосования со статусами, сводка за сегодня и переходы в настройки

const MAX_ITEMS = 50

document.querySelectorAll('[data-resource]').forEach(el => el.prepend(chrome.i18n.getMessage(el.getAttribute('data-resource'))))

// Открывает страницу настроек на нужном разделе. Если она уже открыта — переключается на неё
async function openOptions(hash = '') {
    const base = chrome.runtime.getURL('src/ui/options.html')
    const [tab] = await chrome.tabs.query({url: base + '*'})
    if (tab) {
        await chrome.tabs.update(tab.id, {active: true, url: base + (hash ? '#' + hash : '')})
        await chrome.windows.update(tab.windowId, {focused: true})
    } else {
        await chrome.tabs.create({url: base + (hash ? '#' + hash : '')})
    }
    window.close()
}

document.getElementById('openSettings').addEventListener('click', () => openOptions('settings'))
document.getElementById('openProjects').addEventListener('click', () => openOptions('projects'))
document.getElementById('openAdd').addEventListener('click', () => openOptions('add'))

// Порядок: закреплённые, идущие сейчас, в очереди, затем по времени следующего голоса; ошибки — после ожидающих
function sortProjects(projects, opened) {
    const stateRank = {now: 0, queue: 1, scheduled: 2, error: 3}
    return projects
        .map(project => ({project, state: projectState(project, opened)}))
        .sort((a, b) => {
            const featured = Number(isFeaturedProject(b.project)) - Number(isFeaturedProject(a.project))
            if (featured) return featured
            const rank = stateRank[a.state] - stateRank[b.state]
            if (rank) return rank
            return (a.project.time || 0) - (b.project.time || 0)
        })
}

function renderToday() {
    let stats = todayStats
    // Статистика за сегодня обнуляется в начале нового дня
    if (!stats || !stats.lastAttemptVote || new Date(stats.lastAttemptVote).toDateString() !== new Date().toDateString()) {
        stats = {successVotes: 0, errorVotes: 0}
    }
    document.getElementById('today').textContent = chrome.i18n.getMessage('popupToday', [String(stats.successVotes || 0), String(stats.errorVotes || 0)])
}

function statusText(project, state) {
    if (state === 'now') return chrome.i18n.getMessage('now')
    if (state === 'queue') return chrome.i18n.getMessage('inQueue')
    if (project.time && project.time > Date.now()) return formatRelative(project.time)
    if (state === 'error') return chrome.i18n.getMessage('popupError')
    return chrome.i18n.getMessage('soon')
}

function renderList(projects) {
    const list = document.getElementById('popupList')
    const items = sortProjects(projects, openedProjects).slice(0, MAX_ITEMS)
    list.replaceChildren(...items.map(({project, state}) => {
        const li = document.createElement('li')
        const button = document.createElement('button')
        button.type = 'button'
        button.className = 'popup-item'
        button.dataset.state = state
        if (isFeaturedProject(project)) button.classList.add('featured')
        button.title = project.error || ''

        const dot = document.createElement('span')
        dot.className = 'status-dot'

        const text = document.createElement('span')
        text.className = 'popup-item-text'
        const name = document.createElement('span')
        name.className = 'popup-item-name'
        name.textContent = projectDisplayName(project)
        const site = document.createElement('span')
        site.className = 'popup-item-site'
        site.textContent = project.nick ? project.rating + ' · ' + project.nick : project.rating
        text.append(name, site)

        const when = document.createElement('span')
        when.className = 'popup-item-when mono'
        when.textContent = statusText(project, state)

        button.append(dot, text, when)
        button.addEventListener('click', () => openOptions('project=' + project.key))
        li.append(button)
        return li
    }))
    document.getElementById('popupEmpty').hidden = projects.length > 0
}

;(async () => {
    await initializeConfig()
    const projects = await db.getAll('projects')
    document.getElementById('popupLoading').remove()
    renderToday()
    renderList(projects)
})()
