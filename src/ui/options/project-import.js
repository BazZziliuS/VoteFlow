// VoteFlow — страница настроек, модуль 7/10: Добавление по ссылке со страницы сервера (fastAdd) и своих запросов (Custom)
// Модули подключаются в options.html в порядке: init, notifications, modals, projects-list, project-form,
// project-add, project-import, project-link, settings, app.
// Это обычные скрипты с общей глобальной областью; код верхнего уровня вызывает только функции этого файла
// или загруженных раньше. Функции из других модулей — только в обработчиках событий

//Достаёт все проекты указанные в URL
function getUrlProjects(element) {
    const projects = []
    let project = {}
    const url = new URL(document.location.href)
    for (let [key, value] of url.searchParams) {
        if (key === 'top') key = 'rating' // TODO временный код
        if (
            key === 'rating' ||
            key === 'nick' ||
            key === 'id' ||
            key === 'game' ||
            key === 'listing' ||
            key === 'lang' ||
            key === 'maxCountVote' ||
            key === 'ordinalWorld' ||
            key === 'addition'
        ) {
            if (key !== 'rating' && !project.rating) continue

            if (key === 'rating' && Object.keys(project).length > 0) {
                project.time = null
                project.stats = {
                    successVotes: 0,
                    monthSuccessVotes: 0,
                    lastMonthSuccessVotes: 0,
                    errorVotes: 0,
                    laterVotes: 0,
                    lastSuccessVote: null,
                    lastAttemptVote: null,
                    added: Date.now(),
                }
                if (allProjects[project.rating].URLMain) {
                    const domain2 = allProjects[project.rating].URLMain?.()
                    if (domain2 !== project.rating) {
                        project.ratingMain = domain2
                    }
                }
                projects.push(project)
                project = {}
            }

            if (key === 'rating') {
                if (!allProjects[value]) {
                    const html = document.createElement('div')
                    html.classList.add('fastAddEl')
                    html.append(svgFail.cloneNode(true))
                    const div = document.createElement('div')
                    const p = document.createElement('p')
                    p.textContent = chrome.i18n.getMessage('failParseUrlFastAdd', [value, url.searchParams.get('name')])
                    div.append(p)
                    html.append(div)
                    element.append(html)
                    element.scrollTop = element.scrollHeight
                    continue
                }
                project.rating = value
            } else if (key === 'maxCountVote' || key === 'ordinalWorld') {
                const number = Number(value)
                if (!isNaN(number)) {
                    project[key] = number
                } else {
                    project[key] = 1
                }
            } else {
                project[key] = value
            }
        }
    }

    if (Object.keys(project).length > 0) {
        project.time = null
        project.stats = {
            successVotes: 0,
            monthSuccessVotes: 0,
            lastMonthSuccessVotes: 0,
            errorVotes: 0,
            laterVotes: 0,
            lastSuccessVote: null,
            lastAttemptVote: null,
            added: Date.now(),
        }
        if (allProjects[project.rating].URLMain) {
            const domain2 = allProjects[project.rating].URLMain?.()
            if (domain2 !== project.rating) {
                project.ratingMain = domain2
            }
        }
        projects.push(project)
    }
    return projects
}

//Если страница настроек была открыта сторонним проектом то, расширение переходит к быстрому добавлению проектов
async function fastAdd() {
    if (document.location.href.includes('addFastProject')) {
        toggleModal('addFastProject')
        const searchParams = new URL(document.location.href).searchParams
        if (searchParams.get('name'))
            document.querySelector('[data-resource="fastAdd"]').textContent = searchParams.get('name')
        const listFastAdd = document.querySelector('#addFastProject > div.content > .message')
        listFastAdd.textContent = ''

        if (searchParams.get('disableNotifInfo') === 'true') {
            settings.disabledNotifInfo = true
            await db.put('other', settings, 'settings')
            chrome.runtime.sendMessage('reloadSettings')
            setSettingCheckbox('disabledNotifInfo', settings.disabledNotifInfo)
            const html = document.createElement('div')
            html.classList.add('fastAddEl')
            html.append(svgSuccess.cloneNode(true))
            const div = document.createElement('div')
            const p = document.createElement('p')
            p.textContent = chrome.i18n.getMessage('disableNotifInfo')
            div.append(p)

            html.append(div)
            listFastAdd.append(html)
            listFastAdd.scrollTop = listFastAdd.scrollHeight
        }
        if (searchParams.get('disableNotifWarn') === 'true') {
            settings.disabledNotifWarn = true
            await db.put('other', settings, 'settings')
            chrome.runtime.sendMessage('reloadSettings')
            setSettingCheckbox('disabledNotifWarn', settings.disabledNotifWarn)
            const html = document.createElement('div')
            html.classList.add('fastAddEl')
            html.append(svgSuccess.cloneNode(true))
            const div = document.createElement('div')
            const p = document.createElement('p')
            p.textContent = chrome.i18n.getMessage('disableNotifWarn')
            div.append(p)

            html.append(div)
            listFastAdd.append(html)
            listFastAdd.scrollTop = listFastAdd.scrollHeight
        }
        if (searchParams.get('disableNotifStart') === 'true') {
            settings.disabledNotifStart = true
            await db.put('other', settings, 'settings')
            chrome.runtime.sendMessage('reloadSettings')
            setSettingCheckbox('disabledNotifStart', settings.disabledNotifStart)
            const html = document.createElement('div')
            html.classList.add('fastAddEl')
            html.append(svgSuccess.cloneNode(true))
            const div = document.createElement('div')
            const p = document.createElement('p')
            p.textContent = chrome.i18n.getMessage('disableNotifStart')
            div.append(p)
            html.append(div)
            listFastAdd.append(html)
            listFastAdd.scrollTop = listFastAdd.scrollHeight
        }

        const projects = getUrlProjects(listFastAdd)
        const html2 = document.createElement('div')
        html2.classList.add('fastAddEl')
        html2.append(svgFail.cloneNode(true))
        const div2 = document.createElement('div')
        const p2 = document.createElement('p')
        p2.textContent = chrome.i18n.getMessage('permissions')
        const status2 = document.createElement('span')
        p2.append(document.createElement('br'))
        p2.append(status2)
        div2.append(p2)
        html2.append(div2)
        listFastAdd.append(html2)
        listFastAdd.scrollTop = listFastAdd.scrollHeight
        if (!(await checkPermissions(projects, status2))) {
            const buttonRetry = document.createElement('button')
            buttonRetry.classList.add('btn')
            buttonRetry.textContent = chrome.i18n.getMessage('retry')
            document.querySelector('#addFastProject > div.content > .events').append(buttonRetry)
            buttonRetry.addEventListener('click', () => document.location.reload(true))
            return
        }

        for (const project of projects) {
            const html = document.createElement('div')
            html.classList.add('fastAddEl')
            let divName = project.rating
            if (project.nick && project.nick !== '') divName += '–' + project.nick
            if (project.id && project.id !== '') divName += '–' + project.id
            html.setAttribute('div', divName)
            html.appendChild(svgFail.cloneNode(true))

            const div = document.createElement('div')
            const p = document.createElement('p')
            p.textContent = project.rating
            if (project.nick && project.nick !== '') p.textContent += ' – ' + project.nick
            if (project.id && project.id !== '') p.textContent += ' – ' + project.id
            const status = document.createElement('span')
            p.append(document.createElement('br'))
            p.append(status)

            div.append(p)
            html.append(div)
            listFastAdd.append(html)
            listFastAdd.scrollTop = listFastAdd.scrollHeight
            await addProject(project, status)
        }

        if (document.querySelector('#addFastProject img[src$="error.svg"]') != null) {
            const buttonRetry = document.createElement('button')
            buttonRetry.classList.add('btn')
            buttonRetry.textContent = chrome.i18n.getMessage('retry')
            document.querySelector('#addFastProject > div.content > .events').append(buttonRetry)
            buttonRetry.addEventListener('click', () => document.location.reload(true))
        } else if (document.querySelector('#addFastProject > div.content > div.message').childElementCount > 0) {
            const successFastAdd = document.createElement('div')
            successFastAdd.setAttribute('class', 'successFastAdd')
            successFastAdd.append(chrome.i18n.getMessage('successFastAdd'))
            successFastAdd.append(document.createElement('br'))
            successFastAdd.append(chrome.i18n.getMessage('closeTab'))
            listFastAdd.append(successFastAdd)
            listFastAdd.scrollTop = listFastAdd.scrollHeight
        } else {
            return
        }

        const buttonClose = document.createElement('button')
        buttonClose.classList.add('btn', 'redBtn')
        buttonClose.textContent = chrome.i18n.getMessage('closeTabButton')
        document.querySelector('#addFastProject > div.content > .events').append(buttonClose)
        buttonClose.addEventListener('click', () => window.close())
    }
}

async function addCustom() {
    if (document.querySelector('option[name="Custom"]')?.disabled) {
        document.querySelector('option[name="Custom"]').disabled = false
    }

    if (!settings.enableCustom) {
        settings.enableCustom = true
        await db.put('other', settings, 'settings')
        chrome.runtime.sendMessage('reloadSettings')
    }
}

async function openPopup(url, onClose) {
    const width = 900
    const height = 700
    const left = parseInt(Math.max(0, (screen.width - width) / 2) + (screen.availLeft | 0)),
        top = parseInt(Math.max(0, (screen.height - height) / 2) + (screen.availTop | 0))
    let close = 'setSelfAsOpener'
    // noinspection JSUnresolvedVariable
    if (typeof InstallTrigger !== 'undefined') {
        //Костыль с FireFox
        //FireFox зачем-то решил это называть allowScriptsToClose когда в Chrome это называется setSelfAsOpener, как же это "удобно"
        close = 'allowScriptsToClose'
    }
    const tab = await chrome.windows.create({type: 'popup', url, [close]: true, top, left, width, height})
    const tabID = tab.tabs[0].id
    if (onClose) {
        function onRemoved(tabId /*, removeInfo*/) {
            if (tabID === tabId) {
                onClose()
                chrome.tabs.onRemoved.removeListener(onRemoved)
            }
        }

        chrome.tabs.onRemoved.addListener(onRemoved)
    }
    return tabID
}
