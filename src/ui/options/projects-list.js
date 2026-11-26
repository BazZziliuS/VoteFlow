// VoteFlow — страница настроек, модуль 4/7: Список добавленных проектов: карточки, выбор сайта, статус и время следующего голоса
// Модули подключаются в options.html в порядке: init, notifications, modals, projects-list, project-form, settings, app
// Это обычные скрипты с общей глобальной областью; код верхнего уровня может вызывать
// только функции из этого же файла или из модулей, подключённых раньше

//Добавить проект в список проекта
async function addProjectList(project, preBend) {
    if (!document.querySelector('[data-rating-button="' + project.rating + '"]')) {
        generateBtnListRating(project.rating, 0)
    }
    if (isFeaturedProject(project)) markFeaturedRating(project.rating)
    if (!project.key) {
        if (project.priority) {
            preBend = true
            const store = db.transaction('projects', 'readwrite').store
            const cursor = await store.openCursor()
            if (!cursor || cursor.key === 1) {
                project.key = -1
            } else {
                project.key = cursor.key - 1
            }
            await store.put(project, project.key)
        } else {
            const store = db.transaction('projects', 'readwrite').store
            project.key = await store.put(project)
            await store.put(project, project.key)
        }
        usageSpace()

        const count = Number(document.querySelector('[data-rating-button="' + project.rating + '"] > span').textContent)
        document.querySelector('[data-rating-button="' + project.rating + '"] > span').textContent = String(count + 1)
        updateNavCount()

        if (project.time === Infinity) {
            // Автоголосование остановлено (stopVoting) — ни будильника, ни проверки очереди
        } else if (project.time != null && project.time > Date.now()) {
            let create = true
            const alarms = await chrome.alarms.getAll()
            for (const alarm of alarms) {
                // noinspection JSUnresolvedVariable
                if (alarm.scheduledTime === project.time) {
                    create = false
                    break
                }
            }
            if (create) {
                chrome.alarms.create(String(project.key), {when: project.time})
            }
        } else {
            chrome.runtime.sendMessage('checkVote')
        }
    }

    const listProject = document.querySelector('[data-rating-list="' + project.rating + '"]')
    if (listProject.childElementCount === 0 && listProject.parentElement.style.display === 'none') return
    const li = document.createElement('li')
    li.id = 'projects' + project.key
    li.classList.add('project')

    const statusDot = document.createElement('span')
    statusDot.classList.add('status-dot')

    const div = document.createElement('div')
    div.classList.add('controlItems')

    let img3
    if (settings.expertMode) {
        img3 = createProjectAction('pencil', chrome.i18n.getMessage('edit'))
        div.append(img3)
    }
    const img0 = createProjectAction('restart', chrome.i18n.getMessage('restart'))
    const img1 = createProjectAction('stats', chrome.i18n.getMessage('stats2'))
    const img2 = createProjectAction('trash', chrome.i18n.getMessage('deleteButton'))
    img2.classList.add('danger')
    div.append(img0, img1, img2)

    const contDiv = document.createElement('div')
    contDiv.classList.add('message')

    const nameProjectMes = document.createElement('div')
    nameProjectMes.classList.add('projectName')
    contDiv.append(nameProjectMes)

    const tags = document.createElement('div')
    tags.classList.add('tags')
    contDiv.append(tags)

    const nextVoteMes = document.createElement('div')
    nextVoteMes.classList.add('textNextVote')
    contDiv.append(nextVoteMes)

    const div2 = document.createElement('div')
    div2.classList.add('error')
    contDiv.append(div2)

    const div3 = document.createElement('div')
    div3.classList.add('warn')
    contDiv.append(div3)

    li.append(statusDot, contDiv, div)

    // centurymine и SideMC всегда наверху списка
    if (isFeaturedProject(project)) {
        preBend = true
        li.classList.add('featured')
        markFeaturedRating(project.rating)
    }

    if (preBend) {
        listProject.prepend(li)
    } else {
        listProject.append(li)
    }

    await updateProjectText(project)

    //Слушатель кнопки "Удалить" на проект
    // Удаление в два клика: первый клик просит подтверждение, второй в течение 3 секунд удаляет
    img2.addEventListener('click', async (event) => {
        if (event.target.disabled) return
        if (!img2.classList.contains('confirming')) {
            img2.classList.add('confirming')
            img2.querySelector('.tooltiptext').textContent = chrome.i18n.getMessage('confirmDeleteClick')
            img2.confirmTimer = setTimeout(() => {
                img2.classList.remove('confirming')
                img2.querySelector('.tooltiptext').textContent = chrome.i18n.getMessage('deleteButton')
            }, 3000)
            return
        }
        clearTimeout(img2.confirmTimer)
        event.target.disabled = true
        await removeProjectList(project, false, event)
        event.target.disabled = false
    })
    //Слушатель кнопка "Перезапустить голосование" на проект
    img0.addEventListener('click', async (event) => {
        if (event.target.disabled) return
        event.target.disabled = true
        project = await db.get('projects', project.key)
        let timer = setTimeout(() => lagServiceWorker(event), 5000)
        try {
            // noinspection JSVoidFunctionReturnValueUsed
            let message = await chrome.runtime.sendMessage({projectRestart: project})
            // noinspection JSIncompatibleTypesComparison
            if (message === 'confirmNow' || message === 'confirmQueue') {
                clearTimeout(timer)
                // noinspection JSCheckFunctionSignatures
                const confirmed = confirm(chrome.i18n.getMessage(message))
                if (confirmed) {
                    timer = setTimeout(() => lagServiceWorker(event), 5000)
                    try {
                        // noinspection JSVoidFunctionReturnValueUsed
                        await chrome.runtime.sendMessage({projectRestart: project, confirmed: true})
                    } catch (error) {
                        createNotif(error, 'error')
                        return
                    } finally {
                        clearTimeout(timer)
                    }
                } else {
                    return
                }
            }
        } catch (error) {
            createNotif(error, 'error')
            return
        } finally {
            event.target.disabled = false
            clearTimeout(timer)
        }
        createNotif(chrome.i18n.getMessage('restarted'), 'success')
    })
    //Слушатель кнопки Статистики и вывод её в модалку
    img1.addEventListener('click', () => updateModalStats(project, true))
    //Слушатель кнопки "Редактировать"
    if (settings.expertMode) {
        img3.addEventListener('click', async () => {
            project = await db.get('projects', project.key)
            editProject(project, true)
        })
    }
}

function createProjectAction(icon, label) {
    const button = document.createElement('button')
    button.type = 'button'
    button.classList.add('projectStats')
    button.setAttribute('aria-label', label)
    const iconEl = document.createElement('span')
    iconEl.className = 'i i-' + icon
    const tooltip = document.createElement('span')
    tooltip.classList.add('tooltiptext')
    tooltip.textContent = label
    button.append(iconEl, tooltip)
    return button
}

//Счётчик проектов в боковом меню
async function updateNavCount() {
    const count = await db.count('projects')
    document.getElementById('navProjectsCount').textContent = count > 0 ? String(count) : ''
    // «Как это работает» показываем, пока не добавлен ни один проект
    document.getElementById('welcome').style.display = count > 0 ? 'none' : ''
}

// formatRelative, isFeaturedProject, projectState — в src/ui/shared.js
function renderNextVote(element, time, text) {
    element.replaceChildren()
    const label = document.createElement('span')
    label.textContent = chrome.i18n.getMessage('nextVote')
    const when = document.createElement('span')
    when.classList.add('when')
    if (time) when.classList.add('is-time')
    when.textContent = text
    element.append(label, when)
    if (time) {
        const rel = document.createElement('span')
        rel.classList.add('rel')
        rel.dataset.time = String(time)
        rel.textContent = formatRelative(time)
        element.append(rel)
    }
}

//Раз в минуту обновляем «через N мин» у видимых проектов
setInterval(() => {
    document.querySelectorAll('.textNextVote .rel[data-time]').forEach(el => {
        el.textContent = formatRelative(Number(el.dataset.time))
    })
}, 60000)

async function updateModalStats(project, toggle) {
    if (toggle) {
        toggleModal('stats')
        project = await db.get('projects', project.key)
    } else {
        if (!document.getElementById('stats').classList.contains('active') || document.getElementById('stats' + project.key) == null) return
    }
    let text = project.rating
    if (project.nick && project.nick !== '') text += ' – ' + project.nick
    if (project.game && project.game !== '') text += ' – ' + project.game
    if (project.name && project.name !== '') {
        text += ' – ' + project.name
    } else if (project.id && project.id !== '') {
        text += ' – ' + project.id
    }
    document.querySelector('.statsSubtitle').textContent = text
    document.querySelector('.statsSubtitle').id = 'stats' + project.key
    document.querySelector('td[data-resource="statsSuccessVotes"]').nextElementSibling.textContent = project.stats.successVotes
    document.querySelector('td[data-resource="statsMonthSuccessVotes"]').nextElementSibling.textContent = project.stats.monthSuccessVotes
    document.querySelector('td[data-resource="statsLastMonthSuccessVotes"]').nextElementSibling.textContent = project.stats.lastMonthSuccessVotes
    document.querySelector('td[data-resource="statsErrorVotes"]').nextElementSibling.textContent = project.stats.errorVotes
    document.querySelector('td[data-resource="statsLaterVotes"]').nextElementSibling.textContent = project.stats.laterVotes
    document.querySelector('td[data-resource="statsLastSuccessVote"]').nextElementSibling.textContent = project.stats.lastSuccessVote ? new Date(project.stats.lastSuccessVote).toLocaleString().replace(',', '') : 'None'
    document.querySelector('td[data-resource="statsLastAttemptVote"]').nextElementSibling.textContent = project.stats.lastAttemptVote ? new Date(project.stats.lastAttemptVote).toLocaleString().replace(',', '') : 'None'
    document.querySelector('td[data-resource="statsAdded"]').nextElementSibling.textContent = project.stats.added ? new Date(project.stats.added).toLocaleString().replace(',', '') : 'None'
}

function generateBtnListRating(rating, count) {
    const button = document.createElement('button')
    button.setAttribute('class', 'selectsite')
    button.setAttribute('data-rating-button', rating)
    button.style.order = String(Object.keys(allProjects).indexOf(rating))
    button.textContent = rating
    const span = document.createElement('span')
    span.textContent = count
    button.append(span)
    document.querySelector('.buttonBlock').append(button)
    button.addEventListener('click', event => listSelect(event, rating))

    const ul = document.createElement('ul')
    ul.setAttribute('data-rating-tab', rating)
    ul.classList.add('listcontent')
    ul.style.display = 'none'
//  const div = document.createElement('div')
//  div.setAttribute('data-resource', 'notAdded')
//  div.textContent = chrome.i18n.getMessage('notAdded')
//  ul.append(div)
    if (!(allProjects[rating].notRequiredCaptcha?.())) {
        const label = document.createElement('label')
        label.setAttribute('data-resource', 'passageCaptcha')
        label.classList.add('callout', 'warn')
        label.textContent = chrome.i18n.getMessage('passageCaptcha')
        const link = createExternalLink('https://github.com/Serega007RU/Auto-Vote-Rating/wiki/Guide-how-to-automate-the-passage-of-captcha-(reCAPTCHA-and-hCaptcha)', chrome.i18n.getMessage('here'))
        link.setAttribute('data-resource', 'here')
        label.append(link)
        ul.append(label)
    }
    const div2 = document.createElement('div')
    div2.setAttribute('data-rating-list', rating)
    ul.append(div2)
    const dellAll = document.createElement('button')
    dellAll.type = 'button'
    dellAll.className = 'btn redBtn deleteAll'
    dellAll.textContent = chrome.i18n.getMessage('deleteAll')
    dellAll.addEventListener('click', async function () {
        if (confirm(chrome.i18n.getMessage('deleteAllRating'))) {
            let cursor = await db.transaction('projects', 'readwrite').store.index('rating').openCursor(rating)
            while (cursor) {
                await cursor.delete()
                chrome.alarms.clear(String(cursor.primaryKey))
                // noinspection JSVoidFunctionReturnValueUsed
                cursor = await cursor.continue()
            }
            document.querySelector('[data-rating-tab="' + rating + '"]').remove()
            document.querySelector('[data-rating-button="' + rating + '"]').remove()
            if (document.querySelector('.buttonBlock').childElementCount <= 0) {
                document.getElementById('notAddedAll').textContent = chrome.i18n.getMessage('notAddedAll')
            } else {
                selectFirstRating()
            }
            updateNavCount()
        }
    })
    ul.append(dellAll)
    document.querySelector('div.projectsBlock > div.contentBlock').append(ul)

    if (document.querySelector('.buttonBlock').childElementCount > 0) {
        document.getElementById('notAddedAll').textContent = ''
    }
}

//Удалить проект из списка проекта
async function removeProjectList(project, editing, event) {
    if (!editing && editingProject?.key === project.key) resetEdit()

    const li = document.getElementById('projects' + project.key)
    if (li != null) {
        const timer = setTimeout(() => lagServiceWorker(event), 5000)
        try {
            // noinspection JSVoidFunctionReturnValueUsed
            const message = await chrome.runtime.sendMessage({projectDeleted: project})
            // noinspection JSIncompatibleTypesComparison
            if (message === 'reject') {
                createNotif(chrome.i18n.getMessage('rejectDelete'), 'error')
                return false
            }
        } catch (error) {
            createNotif(error, 'error')
            return false
        } finally {
            clearTimeout(timer)
        }
        usageSpace()
        updateNavCount()

        if (!editing) {
            const count = Number(document.querySelector('[data-rating-button="' + project.rating + '"] > span').textContent) - 1
            if (count <= 0) {
                document.querySelector('[data-rating-tab="' + project.rating + '"]').remove()
                document.querySelector('[data-rating-button="' + project.rating + '"]').remove()
                if (document.querySelector('.buttonBlock').childElementCount <= 0) {
                    document.getElementById('notAddedAll').textContent = chrome.i18n.getMessage('notAddedAll')
                } else {
                    selectFirstRating()
                }
            } else {
                li.remove()
                document.querySelector('[data-rating-button="' + project.rating + '"] > span').textContent = String(count)
            }
        } else {
            li.remove()
        }
    }
    return true
}

//Перезагрузка списка проектов
async function reloadProjectList() {
    document.querySelector('.projectsBlock .buttonBlock').replaceChildren()
    document.querySelector('.projectsBlock .contentBlock').replaceChildren()
    const index = db.transaction('projects').store.index('rating')
    for (const item of Object.keys(allProjects)) {
        const count = await index.count(item)
        if (count > 0) {
            generateBtnListRating(item, count)
            if (item === 'Custom') {
                if (!settings.enableCustom) addCustom()
            }
        }
    }
    updateNavCount()
    for (const project of await db.getAll('projects')) {
        if (isFeaturedProject(project)) markFeaturedRating(project.rating)
    }
    if (document.getElementById('added').style.display !== 'none') selectFirstRating()
}

//Сайт-рейтинг с закреплённым проектом показывается первым в списке сайтов
function markFeaturedRating(rating) {
    const button = document.querySelector('[data-rating-button="' + rating + '"]')
    if (button) button.style.order = '-1'
}

//Открывает первый по порядку рейтинг, если ни один не выбран
function selectFirstRating() {
    if (document.querySelector('.selectsite.activeList')) return
    const buttons = Array.from(document.querySelectorAll('.buttonBlock .selectsite'))
    if (!buttons.length) return
    buttons.sort((a, b) => Number(a.style.order) - Number(b.style.order))
    buttons[0].click()
}

//Переключение между списками добавленных проектов
async function listSelect(event, tabs) {
    let listcontent, selectsite

    listcontent = document.getElementsByClassName('listcontent')
    for (let x = 0; x < listcontent.length; x++) {
        listcontent[x].style.display = 'none'
    }

    selectsite = document.getElementsByClassName('selectsite')
    for (let x = 0; x < selectsite.length; x++) {
        selectsite[x].className = selectsite[x].className.replace(' activeList', '')
    }

    document.querySelector('[data-rating-tab="' + tabs + '"]').style.display = 'flex'
    event.currentTarget.className += ' activeList'

    const list = document.querySelector('[data-rating-list="' + tabs + '"]')
    // Загрузка списка одна на всех: если её уже начал другой вызов (например, автовыбор первого сайта
    // одновременно с переходом к проекту из уведомления), дожидаемся её, а не возвращаемся с пустым списком
    if (!list.loading && list.childElementCount === 0) {
        list.loading = (async () => {
            let div = document.createElement('div')
            div.setAttribute('data-resource', 'load')
            div.textContent = chrome.i18n.getMessage('load')
            list.append(div)
            const transaction = db.transaction(['projects', 'other'])
            openedProjects = await transaction.objectStore('other').get('openedProjects')
            let cursor = await transaction.objectStore('projects').index('rating').openCursor(tabs)
            while (cursor) {
                const project = cursor.value
                addProjectList(project)
                // noinspection JSVoidFunctionReturnValueUsed
                cursor = await cursor.continue()
            }
            div.remove()
        })()
        list.loading.finally(() => { list.loading = null })
    }
    if (list.loading) await list.loading
}

async function updateProjectText(project) {
    const el = document.getElementById('projects' + project.key)
    if (el) {
        let state = 'scheduled'
        let text = chrome.i18n.getMessage('soon')
        let time = null
        if (project.time === Infinity) {
            text = chrome.i18n.getMessage('stopped')
            state = 'error'
        } else if (!(project.time == null || project.time === '') && Date.now() < project.time) {
            time = project.time
            text = new Date(project.time).toLocaleString().replace(',', '')
        } else {
            openedProjects = await db.get('other', 'openedProjects')
            for (const value of openedProjects.values()) {
                if (project.rating === value.rating) {
                    text = chrome.i18n.getMessage('inQueue')
                    state = 'queue'
                    if (project.key === value.key) {
                        text = chrome.i18n.getMessage('now')
                        state = 'now'
                        break
                    }
                }
            }
        }
        if (project.error) state = 'error'
        el.dataset.state = state

        let textProject = ''
        if (project.nick && project.nick !== '') textProject += ' – ' + project.nick
        if (project.game && project.game !== '') textProject += ' – ' + project.game
        if (project.id && project.id !== '') textProject += ' – ' + project.id
        if (project.name && project.name !== '') textProject += ' – ' + project.name
        if (textProject === '') {
            textProject = project.rating
        } else {
            textProject = textProject.replace(' – ', '')
        }
        el.querySelector('.projectName').textContent = textProject

        const tags = []
        if (project.priority) tags.push(chrome.i18n.getMessage('inPriority'))
        if (project.randomize) tags.push(chrome.i18n.getMessage('inRandomize'))
        if (project.rating !== 'Custom' && (project.timeout != null || project.timeoutHour != null)) tags.push(chrome.i18n.getMessage('customTimeOut2'))
        if (project.lastDayMonth) tags.push(chrome.i18n.getMessage('lastDayMonth2'))
        if (project.silentMode) tags.push(chrome.i18n.getMessage('enabledSilentVoteSilent'))
        if (project.emulateMode) tags.push(chrome.i18n.getMessage('enabledSilentVoteNoSilent'))
        el.querySelector('.tags').replaceChildren(...tags.map(tagText => {
            const tag = document.createElement('span')
            tag.classList.add('tag')
            tag.textContent = tagText
            return tag
        }))

        renderNextVote(el.querySelector('.textNextVote'), time, text)

        const errorElement = el.querySelector('.error')
        errorElement.textContent = ''
        const warnElement = el.querySelector('.warn')
        warnElement.textContent = ''
        const controlItems = el.querySelector('.controlItems')
        const accessButton = controlItems.querySelector('.access')
        if (project.error) {
            renderTextWithLinks(project.error, errorElement)
            // Заявка на GitHub с уже заполненными сайтом, ошибкой и версией
            const report = document.createElement('a')
            report.className = 'report-link'
            report.href = reportIssueUrl(project)
            report.target = '_blank'
            report.rel = 'noopener'
            report.textContent = chrome.i18n.getMessage('reportProblem')
            errorElement.append(document.createElement('br'), report)
            if (project.error.includes('Cannot access contents of the page')) {
                if (!accessButton) {
                    const button = createProjectAction('shield', chrome.i18n.getMessage('access'))
                    button.classList.add('access', 'attention')
                    controlItems.prepend(button)
                    button.addEventListener('click', async () => {
                        if (await checkPermissions([project])) {
                            delete project.error
                            await chrome.runtime.sendMessage({projectRestart: project, confirmed: true})
                            createNotif(chrome.i18n.getMessage('restarted'), 'success')
                        }
                    })
                }
            } else if (accessButton) {
                accessButton.remove()
            }
        } else if (accessButton) {
            accessButton.remove()
        }
        if (project.warn) {
            renderTextWithLinks(project.warn, warnElement)
        }
        updateModalStats(project)
    }
    const el2 = document.getElementById('edit' + project.key)
    if (el2) {
        editProject(project)
    }
}

// Ссылки в тексте ошибки или предупреждения. Текст приходит со стороннего сайта, поэтому только textContent
const URL_IN_TEXT = /https?:\/\/[^\s<>"'«»]+/g
const TRAILING_PUNCTUATION = /[.,;:!?)\]]+$/
const MAX_LINK_TEXT_LENGTH = 64

/**
 * Ссылка на внешний сайт: новая вкладка без доступа к странице настроек (window.opener) и без Referer
 * @param {string} href
 * @param {string} text
 * @returns {HTMLAnchorElement}
 */
function createExternalLink(href, text) {
    const link = document.createElement('a')
    link.classList.add('link')
    link.href = href
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    link.textContent = text
    return link
}

/**
 * Добавляет в элемент текст, превращая адреса http(s) в ссылки
 * @param {string} text
 * @param {Element} element
 */
function renderTextWithLinks(text, element) {
    text = String(text)
    let position = 0
    for (const match of text.matchAll(URL_IN_TEXT)) {
        // Точка или скобка в конце предложения — не часть адреса
        const href = match[0].replace(TRAILING_PUNCTUATION, '')
        const label = href.length > MAX_LINK_TEXT_LENGTH ? href.slice(0, MAX_LINK_TEXT_LENGTH) + '...' : href
        element.append(text.slice(position, match.index), createExternalLink(href, label))
        position = match.index + href.length
    }
    element.append(text.slice(position))
}

function highlight(element) {
    if (element.classList.contains('highlight')) return

    element.classList.add('highlight')

    element.addEventListener('animationend', () => element.classList.remove('highlight'))
    element.addEventListener('animationcancel', () => element.classList.remove('highlight'))
}
