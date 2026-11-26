// VoteFlow — страница настроек, модуль 5/7: Форма добавления и редактирования проекта, проверка доступа, быстрое добавление
// Модули подключаются в options.html в порядке: init, notifications, modals, projects-list, project-form, settings, app
// Это обычные скрипты с общей глобальной областью; код верхнего уровня может вызывать
// только функции из этого же файла или из модулей, подключённых раньше

//Слушатели дополнительных параметров в добавлении нового проекта
document.getElementById('disableCheckProjects').addEventListener('change', function () {
    if (this.checked && !confirm(chrome.i18n.getMessage('confirmDisableCheckProjects'))) {
        this.checked = false
    }
})
document.getElementById('priority').addEventListener('change', function () {
    if (this.checked && !confirm(chrome.i18n.getMessage('confirmPriority'))) {
        this.checked = false
    }
})
document.getElementById('customTimeOut').addEventListener('change', function () {
    document.getElementById('hour').parentElement.style.display = 'none'
    document.getElementById('hour').required = false
    document.getElementById('time').parentElement.style.display = 'none'
    document.getElementById('time').required = false
    document.getElementById('week').parentElement.style.display = 'none'
    document.getElementById('week').required = false
    document.getElementById('month').parentElement.style.display = 'none'
    document.getElementById('month').required = false
    if (this.checked) {
        document.getElementById('lastDayMonth').disabled = false
        document.getElementById('selectTime').parentElement.removeAttribute('style')
        if (document.getElementById('selectTime').value === 'ms') {
            document.getElementById('time').parentElement.removeAttribute('style')
            document.getElementById('time').required = true
        } else {
            if (document.getElementById('selectTime').value === 'week') {
                document.getElementById('week').parentElement.removeAttribute('style')
                document.getElementById('week').required = true
            } else if (document.getElementById('selectTime').value === 'month') {
                document.getElementById('month').parentElement.removeAttribute('style')
                document.getElementById('month').required = true
            }
            document.getElementById('hour').parentElement.removeAttribute('style')
            document.getElementById('hour').required = true
        }
    } else {
        document.getElementById('lastDayMonth').disabled = true
        document.getElementById('selectTime').parentElement.style.display = 'none'
    }
})
document.getElementById('randomize').addEventListener('change', function () {
    if (this.checked) {
        document.getElementById('randomizeMin').parentElement.removeAttribute('style')
        document.getElementById('randomizeMin').required = true
        document.getElementById('randomizeMax').required = true
    } else {
        document.getElementById('randomizeMin').parentElement.style.display = 'none'
        document.getElementById('randomizeMin').required = false
        document.getElementById('randomizeMax').required = false
    }
})
document.getElementById('scheduleTimeCheckbox').addEventListener('change', function () {
    if (this.checked) {
        document.getElementById('scheduleTime').parentElement.removeAttribute('style')
        document.getElementById('scheduleTime').required = true
    } else {
        document.getElementById('scheduleTime').parentElement.style.display = 'none'
        document.getElementById('scheduleTime').required = false
    }
})
document.getElementById('voteMode').addEventListener('change', function () {
    if (this.checked) {
        document.getElementById('voteModeSelect').parentElement.removeAttribute('style')
    } else {
        document.getElementById('voteModeSelect').parentElement.style.display = 'none'
    }
})

//Слушатель на переключение ручного режима в добавлении
document.getElementById('switchAddMode').addEventListener('change', function (event) {
    if (event.target.checked) {
        linkChanged(null, true)
        document.getElementById('rating').dispatchEvent(new Event('input'))
        document.getElementById('rating').parentElement.removeAttribute('style')
        document.getElementById('rating').required = true
        document.getElementById('link').parentElement.style.display = 'none'
        document.getElementById('link').required = false
    } else {
        ratingChanged(null, true)
        document.getElementById('link').dispatchEvent(new Event('input'))
        document.getElementById('rating').parentElement.style.display = 'none'
        document.getElementById('rating').required = false
        document.getElementById('link').parentElement.removeAttribute('style')
        document.getElementById('link').required = true
    }
})

document.getElementById('submitCancelProject').addEventListener('click', () => resetEdit(editingProject))

function resetEdit(project) {
    editingProject = null
    document.getElementById('lastDayMonth').checked = false
    document.getElementById('lastDayMonth').dispatchEvent(new Event('change'))
    document.getElementById('customTimeOut').checked = false
    document.getElementById('customTimeOut').dispatchEvent(new Event('change'))
    document.getElementById('scheduleTimeCheckbox').checked = false
    document.getElementById('scheduleTimeCheckbox').dispatchEvent(new Event('change'))
    document.getElementById('priority').checked = false
    document.getElementById('priority').dispatchEvent(new Event('change'))
    document.getElementById('randomize').checked = false
    document.getElementById('randomize').dispatchEvent(new Event('change'))
    document.getElementById('voteMode').checked = false
    document.getElementById('voteMode').dispatchEvent(new Event('change'))
    document.getElementById('rating').value = ''
    document.getElementById('rating').dispatchEvent(new Event('input'))
    document.querySelector('#addTab .i').className = 'i i-plus'
    document.querySelector('#addTab div').textContent = chrome.i18n.getMessage('addButton')
    document.querySelector('[data-resource="addTitle"]').textContent = chrome.i18n.getMessage('addTitle')
    document.querySelector('.editSubtitle').removeAttribute('id')
    document.querySelector('.editSubtitle').textContent = ''
    document.querySelector('.editSubtitle').style.display = 'none'
    document.getElementById('submitAddProject').removeAttribute('style')
    document.getElementById('submitEditProject').parentElement.style.display = 'none'
    document.getElementById('switchAddMode').disabled = false
    document.getElementById('switchAddMode').checked = false
    document.getElementById('switchAddMode').dispatchEvent(new Event('change'))
    document.getElementById('disableCheckProjects').disabled = false
    document.getElementById('rating').disabled = false

    if (project) {
        // После сохранения возвращаемся к проекту: ждём загрузки списка его сайта, затем показываем карточку
        ;(async () => {
            document.getElementById('addedTab').click()
            const button = document.querySelector('[data-rating-button="' + project.rating + '"]')
            if (!button) return
            await listSelect({currentTarget: button}, project.rating)
            const card = document.getElementById('projects' + project.key)
            if (card) {
                card.scrollIntoView({block: 'center'})
                highlight(card)
            }
        })()
    }
}

function editProject(project, switchToEdit) {
    resetEdit()
    editingProject = project
    document.querySelector('#addTab div').textContent = chrome.i18n.getMessage('edit')
    document.querySelector('#addTab .i').className = 'i i-pencil'
    if (switchToEdit) document.getElementById('addTab').click()
    document.getElementById('switchAddMode').checked = true
    document.getElementById('switchAddMode').dispatchEvent(new Event('change'))
    document.getElementById('switchAddMode').disabled = true
    document.getElementById('disableCheckProjects').checked = false
    document.getElementById('disableCheckProjects').disabled = true
    document.getElementById('rating').disabled = true

    const funcRating = allProjects[project.rating]
    document.getElementById('rating').value = project.rating
    if (project.rating === 'Custom') {
        document.getElementById('nick').value = project.id
    } else if (!funcRating.notRequiredId?.()) {
        document.getElementById('id').value = project.id
    }
    if (funcRating.exampleURLGame) {
        document.getElementById('chooseGame').value = project.game
    }
    if (funcRating.exampleURLListing) {
        document.getElementById('chooseListing').value = project.listing
    }
    if (funcRating.langList) {
        document.getElementById('chooseLang').value = project.lang
    }
    if (funcRating.additionExampleURL) {
        document.getElementById('additionURL').value = project.addition
    }
    if (project.rating !== 'Custom' && !funcRating.notRequiredNick?.(project)) {
        document.getElementById('nick').value = project.nick
    }
    if (funcRating.limitedCountVote?.()) {
        document.getElementById('countVote').value = project.maxCountVote
    }
    if (funcRating.ordinalWorld?.()) {
        document.getElementById('ordinalWorld').value = project.ordinalWorld
    }

    if (project.time > Date.now()) {
        document.getElementById('scheduleTimeCheckbox').checked = true
        document.getElementById('scheduleTimeCheckbox').dispatchEvent(new Event('change'))
        // TODO сомнительный код, я не знаю как ещё вынести обратно в input Date без смещений во времени из-за часового пояса
        // https://stackoverflow.com/a/61082536/11235240
        const time = new Date(project.time)
        // noinspection JSCheckFunctionSignatures
        if (!isNaN(time)) {
            time.setMinutes(time.getMinutes() - time.getTimezoneOffset())
            document.getElementById('scheduleTime').value = time.toISOString().slice(0, 23)
        } else {
            document.getElementById('scheduleTime').value = null
        }
    }
    if (project.timeout != null || project.timeoutHour != null || project.rating === 'Custom') {
        document.getElementById('customTimeOut').checked = true
        if (project.timeout) {
            document.getElementById('selectTime').value = 'ms'
            document.getElementById('time').valueAsNumber = project.timeout
        } else {
            if (project.timeoutWeek != null) {
                document.getElementById('selectTime').value = 'week'
                document.getElementById('week').value = project.timeoutWeek
            } else if (project.timeoutMonth != null) {
                document.getElementById('selectTime').value = 'month'
                document.getElementById('month').value = project.timeoutMonth
            } else {
                document.getElementById('selectTime').value = 'hour'
            }
            // TODO сомнительный код, я не знаю как ещё вынести обратно в input Date без смещений во времени из-за часового пояса
            // https://stackoverflow.com/a/61082536/11235240
            const hours = new Date(
                1980,
                0,
                1,
                project.timeoutHour,
                project.timeoutMinute,
                project.timeoutSecond,
                project.timeoutMS,
            )
            hours.setMinutes(hours.getMinutes() - hours.getTimezoneOffset())
            document.getElementById('hour').value = hours.toISOString().slice(11, 23)
        }
        document.getElementById('customTimeOut').dispatchEvent(new Event('change'))
    }
    if (project.lastDayMonth) {
        document.getElementById('lastDayMonth').checked = true
        document.getElementById('lastDayMonth').dispatchEvent(new Event('change'))
    }
    if (project.rating !== 'Custom' && !funcRating.silentVote?.(project)) {
        document.getElementById('voteMode').disabled = true
    }
    if (project.rating !== 'Custom' && (project.silentMode || project.emulateMode)) {
        if (project.silentMode) {
            document.getElementById('voteModeSelect').value = 'silentMode'
        } else {
            document.getElementById('voteModeSelect').value = 'emulateMode'
        }
        document.getElementById('voteMode').checked = true
        document.getElementById('voteMode').dispatchEvent(new Event('change'))
    }
    if (project.priority) {
        document.getElementById('priority').checked = true
    }
    if (project.randomize) {
        document.getElementById('randomizeMin').value = project.randomize.min
        document.getElementById('randomizeMax').value = project.randomize.max
        document.getElementById('randomize').checked = true
        document.getElementById('randomize').dispatchEvent(new Event('change'))
    }

    if (project.rating === 'Custom') {
        document.getElementById('customBody').value = JSON.stringify(project.body, null, '\t')
        document.getElementById('responseURL').value = project.responseURL
    }
    document.getElementById('rating').dispatchEvent(new Event('input'))

    document.getElementById('submitAddProject').style.display = 'none'
    document.getElementById('submitEditProject').parentElement.removeAttribute('style')
    document.querySelector('[data-resource="addTitle"]').textContent = chrome.i18n.getMessage('editTitle')
    document.querySelector('.editSubtitle').removeAttribute('style')
    document.querySelector('.editSubtitle').id = 'edit' + project.key
    let text = project.rating
    if (project.nick && project.nick !== '') text += ' – ' + project.nick
    if (project.game && project.game !== '') text += ' – ' + project.game
    if (project.name && project.name !== '') {
        text += ' – ' + project.name
    } else if (project.id && project.id !== '') {
        text += ' – ' + project.id
    }
    document.querySelector('.editSubtitle').textContent = text
}

//Слушатель кнопки "Добавить"
document.getElementById('append').addEventListener('submit', async event => {
    event.preventDefault()
    event.submitter.disabled = true
    let domain, funcRating
    let project = {}
    if (event.submitter.id === 'submitEditProject') {
        project = editingProject
    }
    if (!document.getElementById('switchAddMode').checked) {
        const url = document.getElementById('link').value
        try {
            domain = getDomainWithoutSubdomain(url)
            funcRating = allProjects[domain]
            if (!funcRating) {
                createNotif(chrome.i18n.getMessage('errorLink', domain), 'error')
                event.submitter.disabled = false
                return
            }
            project = funcRating.parseURL(new URL(url))
            project.rating = domain
            if (funcRating.URLMain) {
                const domain2 = funcRating.URLMain?.()
                if (domain2 !== domain) {
                    project.ratingMain = domain2
                }
            }

            if (!funcRating.notRequiredId?.() && (project.id == null || project.id === '')) {
                createNotif(chrome.i18n.getMessage('errorLinkParam', 'id'), 'error')
                event.submitter.disabled = false
                return
            }

            if (funcRating.exampleURLGame && project.game == null) {
                createNotif(chrome.i18n.getMessage('errorLinkParam', 'game'), 'error')
                event.submitter.disabled = false
                return
            }

            if (funcRating.exampleURLListing && project.listing == null) {
                createNotif(chrome.i18n.getMessage('errorLinkParam', 'listing'), 'error')
                event.submitter.disabled = false
                return
            }

            if (funcRating.langList && project.lang == null) {
                createNotif(chrome.i18n.getMessage('errorLinkParam', 'lang'), 'error')
                event.submitter.disabled = false
                return
            }
        } catch (error) {
            createNotif(error, 'error')
            event.submitter.disabled = false
            return
        }
    } else {
        domain = document.getElementById('rating').value
        funcRating = allProjects[domain]
        if (!funcRating) {
            createNotif(chrome.i18n.getMessage('errorSelectSiteRating'), 'error')
            event.submitter.disabled = false
            return
        }

        project.rating = domain

        if (domain === 'Custom') {
            project.id = document.getElementById('nick').value
        } else if (!funcRating.notRequiredId?.()) {
            project.id = document.getElementById('id').value
        }

        if (funcRating.exampleURLGame) {
            project.game = document.getElementById('chooseGame').value
        }

        if (funcRating.exampleURLListing) {
            project.listing = document.getElementById('chooseListing').value
        }

        if (funcRating.langList) {
            project.lang = document.getElementById('chooseLang').value
        }

        if (funcRating.additionExampleURL) {
            project.addition = document.getElementById('additionURL').value
        }

        const domain2 = getDomainWithoutSubdomain(funcRating.voteURL(project))
        if (domain2 !== domain && domain !== 'Custom') {
            if (!allProjects[domain2]) {
                if (!confirm(chrome.i18n.getMessage('notSupportedSiteRating', domain2))) {
                    event.submitter.disabled = false
                    return
                }
            } else {
                project.rating = domain2
                project.ratingMain = domain
            }
        }
    }

    if (project.rating !== 'Custom' && !funcRating.notRequiredNick?.(project)) {
        project.nick = document.getElementById('nick').value
    }

    if (funcRating.limitedCountVote?.()) {
        project.maxCountVote = document.getElementById('countVote').valueAsNumber
        project.countVote = 0
    }

    if (funcRating.ordinalWorld?.()) {
        project.ordinalWorld = document.getElementById('ordinalWorld').valueAsNumber
    }

    if (event.submitter.id !== 'submitEditProject') {
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
    }

    if (settings.expertMode || project.rating === 'Custom') {
        if (
            document.getElementById('scheduleTimeCheckbox').checked &&
            document.getElementById('scheduleTime').value !== ''
        ) {
            project.time = new Date(document.getElementById('scheduleTime').value).getTime()
        } else {
            project.time = null
        }
        if (document.getElementById('customTimeOut').checked || project.rating === 'Custom') {
            if (document.getElementById('selectTime').value === 'ms') {
                delete project.timeoutHour
                delete project.timeoutMinute
                delete project.timeoutSecond
                delete project.timeoutMS
                delete project.timeoutWeek
                delete project.timeoutMonth
                project.timeout = document.getElementById('time').valueAsNumber
            } else {
                delete project.timeout
                project.timeoutHour = Number(document.getElementById('hour').value.split(':')[0])
                if (Number.isNaN(project.timeoutHour)) project.timeoutHour = 0
                project.timeoutMinute = Number(document.getElementById('hour').value.split(':')[1])
                if (Number.isNaN(project.timeoutMinute)) project.timeoutMinute = 0
                project.timeoutSecond = Number(document.getElementById('hour').value.split(':')[2])
                if (Number.isNaN(project.timeoutSecond)) project.timeoutSecond = 0
                project.timeoutMS = Number(document.getElementById('hour').value.split('.')[1])
                if (Number.isNaN(project.timeoutMS)) project.timeoutMS = 0
                if (document.getElementById('selectTime').value === 'week') {
                    project.timeoutWeek = Number(document.getElementById('week').value)
                } else {
                    delete project.timeoutWeek
                }
                if (document.getElementById('selectTime').value === 'month') {
                    project.timeoutMonth = document.getElementById('month').valueAsNumber
                } else {
                    delete project.timeoutMonth
                }
            }
        } else {
            delete project.timeout
            delete project.timeoutHour
            delete project.timeoutMinute
            delete project.timeoutSecond
            delete project.timeoutMS
            delete project.timeoutWeek
            delete project.timeoutMonth
        }
        if (document.getElementById('lastDayMonth').checked) {
            project.lastDayMonth = true
        } else {
            delete project.lastDayMonth
        }

        delete project.silentMode
        delete project.emulateMode
        if (project.rating !== 'Custom' && document.getElementById('voteMode').checked) {
            if (document.getElementById('voteModeSelect').value === 'silentMode') {
                project.silentMode = true
            } else if (document.getElementById('voteModeSelect').value === 'emulateMode') {
                project.emulateMode = true
            }
        }

        delete project.randomize
        if (document.getElementById('randomize').checked) {
            project.randomize = {
                min: document.getElementById('randomizeMin').valueAsNumber,
                max: document.getElementById('randomizeMax').valueAsNumber,
            }
        }
    }

    if (project.rating === 'Custom') {
        let body
        try {
            body = JSON.parse(document.getElementById('customBody').value)
        } catch (error) {
            createNotif(error, 'error')
            event.submitter.disabled = false
            return
        }
        //      project.id = body
        project.body = body
        project.responseURL = document.getElementById('responseURL').value

        if (!settings.enableCustom) await addCustom()
    }

    if (event.submitter.id === 'submitEditProject') {
        if (document.getElementById('priority').checked && !project.priority) {
            project.priority = true
            if (!(await removeProjectList(project, true, event))) {
                event.submitter.disabled = false
                return
            }
            const store = db.transaction('projects', 'readwrite').store
            const cursor = await store.openCursor()
            if (!cursor || cursor.key === 1) {
                project.key = -1
            } else {
                project.key = cursor.key - 1
            }
            await store.put(project, project.key)
            await addProjectList(project, true)
        } else if (!document.getElementById('priority').checked && project.priority) {
            delete project.priority
            if (!(await removeProjectList(project, true, event))) {
                event.submitter.disabled = false
                return
            }
            const store = db.transaction('projects', 'readwrite').store
            project.key = await store.put(project)
            await store.put(project, project.key)
            await addProjectList(project)
        } else {
            await db.put('projects', project, project.key)
        }
        resetEdit(project)
        await onMessage({updateValue: 'projects', value: project})
        if (project.time == null || project.time < Date.now()) {
            chrome.runtime.sendMessage('checkVote')
        } else {
            let when = project.time
            if (when - Date.now() < 65000) when = Date.now() + 65000
            try {
                await chrome.alarms.create(String(project.key), {when})
            } catch (error) {
                createNotif('Ошибка при создании chrome.alarms ' + error.message, 'warn')
            }
        }
    } else {
        await addProject(project)
    }

    event.submitter.disabled = false
})

async function addProject(project, element) {
    createNotif(chrome.i18n.getMessage('adding'), 'hint', {element})

    //Получение бонусов на проектах где требуется подтвердить получение бонуса
    let secondBonusText
    const secondBonusButton = document.createElement('button')
    secondBonusButton.type = 'button'
    secondBonusButton.textContent = chrome.i18n.getMessage('lets')
    /*if (project.id == 'mythicalworld' || project.id == 5323 || project.id == 1654 || project.id == 6099) {
        secondBonusText = chrome.i18n.getMessage('secondBonus', 'MythicalWorld')
        secondBonusButton.id = 'secondBonusMythicalWorld'
        secondBonusButton.className = 'secondBonus'
    } else*/
    if (project.id === 'victorycraft' || project.id === '8179' || project.id === '4729') {
        secondBonusText = chrome.i18n.getMessage('secondBonus', 'VictoryCraft')
        secondBonusButton.id = 'secondBonusVictoryCraft'
        secondBonusButton.className = 'secondBonus'
    }

    if (project.rating !== 'Custom' && !allProjects[project.rating].notRequiredNick?.(project)) {
        if (project.nick?.includes?.(' ')) {
            createNotif(chrome.i18n.getMessage('nickWithSpace'), 'warn')
            if (!confirm(chrome.i18n.getMessage('nickWithSpaceConfirm'))) {
                return
            }
        }
    }

    if (!document.getElementById('disableCheckProjects').checked) {
        if (project.id == null || allProjects[project.rating].oneProject?.() > 0) {
            // noinspection JSUnresolvedFunction
            const found = await db.countFromIndex('projects', 'rating', project.rating)
            if (found >= allProjects[project.rating].oneProject?.()) {
                createNotif(
                    chrome.i18n.getMessage('oneProject', [
                        project.rating,
                        String(allProjects[project.rating].oneProject?.()),
                    ]),
                    'error',
                    {element},
                )
                return
            }
        } else {
            // noinspection JSUnresolvedFunction
            const found = await db.countFromIndex('projects', 'rating, id', [project.rating, project.id])
            if (found > 0) {
                const message = chrome.i18n.getMessage('alreadyAdded')
                if (!secondBonusText) {
                    createNotif(message, 'success', {element})
                } else {
                    createNotif(
                        [message, document.createElement('br'), secondBonusText, secondBonusButton],
                        'success',
                        {
                            delay: 30000,
                            element,
                        },
                    )
                }
                addProjectsBonus(project, element)
                return
            }
        }
    }

    if (!(await checkPermissions([project]))) return

    if (!(document.getElementById('disableCheckProjects').checked || project.rating === 'Custom')) {
        createNotif(chrome.i18n.getMessage('checkHasProject'), 'hint', {element})

        let response
        try {
            const url = allProjects[project.rating].pageURL(project)
            if (project.rating === 'minecraftiplist.com') {
                response = await fetch(url, {credentials: 'omit'})
            } else {
                response = await fetch(url, {credentials: 'include'})
            }
        } catch (error) {
            if (error === 'TypeError: Failed to fetch') {
                createNotif(chrome.i18n.getMessage('notConnectInternet'), 'error', {element})
                return
            } else {
                createNotif(error, 'error', {element})
                return
            }
        }

        // Иногда некоторые проекты намеренно выдаёт ошибку в status code, нам ничего не остаётся кроме как игнорировать все ошибки, подробнее https://discord.com/channels/371699266747629568/760393040174120990/1053016256535593022
        if (allProjects[project.rating].ignoreErrors?.()) {
            // None
        } else if (response.status === 404) {
            createNotif(chrome.i18n.getMessage('notFoundProjectCode', String(response.status)), 'error', {element})
            return
        } else if (response.redirected) {
            createNotif(chrome.i18n.getMessage('notFoundProjectRedirect', response.url), 'error', {element})
            return
        } else if (response.status === 503 || response.status === 403) {
            // Игнорируем проверку CloudFlare
            //None
        } else if (!response.ok) {
            createNotif(chrome.i18n.getMessage('notConnect', [project.rating, String(response.status)]), 'error', {
                element,
            })
            return
        }

        const html = await response.text()
        const doc = new DOMParser().parseFromString(html, 'text/html')

        try {
            const notFound = allProjects[project.rating].notFound?.(doc, project)
            if (notFound) {
                if (notFound === true) {
                    createNotif(chrome.i18n.getMessage('notFoundProject'), 'error', {element})
                } else {
                    createNotif(notFound, 'error', {element})
                }
                return
            }

            project.name = allProjects[project.rating].projectName(doc, project).trim()
            if (!project.name) project.name = ''
        } catch (error) {
            console.error(error.message)
            if (!project.name) project.name = ''
        }
        createNotif(chrome.i18n.getMessage('checkHasProjectSuccess'), 'hint', {element})

        //Проверка авторизации ВКонтакте
        if (allProjects[project.rating].needAdditionalOrigins?.(project)?.includes?.('*://*.vk.com/*')) {
            createNotif(chrome.i18n.getMessage('checkAuthVK'), 'hint', {element})
            const url2 = authVKUrls.get(project.rating)
            let response2
            try {
                response2 = await fetch(url2, {redirect: 'manual', credentials: 'include'})
            } catch (error) {
                if (error === 'TypeError: Failed to fetch') {
                    createNotif(chrome.i18n.getMessage('notConnectInternetVPN'), 'error', {element})
                    return
                } else {
                    createNotif(error, 'error', {element})
                    return
                }
            }

            if (response2.ok) {
                const message = chrome.i18n.getMessage('authVK', project.rating)
                const button = document.createElement('button')
                button.id = 'authvk'
                button.classList.add('btn')
                const img = document.createElement('span')
                img.className = 'i i-external'
                button.append(img)
                const text = document.createElement('div')
                text.textContent = chrome.i18n.getMessage('authButton')
                button.append(text)
                createNotif([message, document.createElement('br'), button], 'warn', {delay: 30000, element})
                button.addEventListener('click', event => {
                    if (element != null) {
                        openPopup(url2, () => document.location.reload(true))
                    } else {
                        openPopup(url2, async () => {
                            event.target.disabled = true
                            await addProject(project, element)
                            event.target.disabled = false
                        })
                    }
                })
                return
            } else if (response2.status !== 0) {
                createNotif(
                    chrome.i18n.getMessage('notConnect', [extractHostname(response.url), String(response2.status)]),
                    'error',
                    {element},
                )
                return
            }
            createNotif(chrome.i18n.getMessage('checkAuthVKSuccess'), 'hint', {element})
        }
    }

    await addProjectList(project)

    // noinspection JSUnresolvedVariable
    if (
        !settings.operaAttention &&
        (navigator?.userAgentData?.brands?.[0]?.brand === 'Opera' ||
            (!!window.opr && !!opr.addons) ||
            !!window.opera ||
            navigator.userAgent.indexOf(' OPR/') >= 0) &&
        !(
            allProjects[project.rating].notRequiredCaptcha?.(project) ||
            allProjects[project.rating].alertManualCaptcha?.()
        )
    ) {
        settings.operaAttention = true
        db.put('other', settings, 'settings')
    }

    const array = []
    array.push(chrome.i18n.getMessage('addSuccess') + ' ' + project.name)
    if (secondBonusText) {
        array.push(document.createElement('br'))
        array.push(secondBonusText)
        array.push(secondBonusButton)
    }
    // if (!(element != null || allProjects[project.rating].notRequiredCaptcha?.(project) || allProjects[project.rating].alertManualCaptcha?.())) {
    //     array.push(document.createElement('br'))
    //     array.push(document.createElement('br'))
    //     array.push(createMessage(chrome.i18n.getMessage('passageCaptcha'), 'warn'))
    //     const a = document.createElement('a')
    //     a.target = 'blank_'
    //     a.classList.add('link')
    //     a.href = 'https://github.com/Serega007RU/Auto-Vote-Rating/wiki/Guide-how-to-automate-the-passage-of-captcha-(reCAPTCHA-and-hCaptcha)'
    //     a.textContent = chrome.i18n.getMessage('here')
    //     array.push(a)
    // }
    if (array.length > 1) {
        createNotif(array, 'success', {delay: 15000, element})
    } else {
        createNotif(array, 'success', {element})
    }

    if (allProjects[project.rating].alertManualCaptcha?.()) {
        alert(chrome.i18n.getMessage('alertCaptcha'))
    }
    if (allProjects[project.rating].focusedTab?.(project)) {
        alert(chrome.i18n.getMessage('alertFocusedTab'))
    }

    addProjectsBonus(project, element)
}

//Получение бонусов на проектах где требуется подтвердить получение бонуса
function addProjectsBonus(project, element) {
    //  if (project.id == 'mythicalworld' || project.id == 5323 || project.id == 1654 || project.id == 6099) {
    //      document.getElementById('secondBonusMythicalWorld').addEventListener('click', async()=>{
    //          let response = await fetch('https://mythicalworld.su/bonus')
    //          if (!response.ok) {
    //              createNotif(chrome.i18n.getMessage('notConnect', [response.url, String(response.status)]), 'error', {element})
    //              return
    //          } else if (response.redirected) {
    //              createNotif(chrome.i18n.getMessage('redirectedSecondBonus', response.url), 'error', {element})
    //              return
    //          }
    //          await addProject('Custom', 'MythicalWorldBonus1Day', '{"credentials":"include","headers":{"accept":"text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9","accept-language":"ru,en;q=0.9,en-US;q=0.8","cache-control":"max-age=0","content-type":"application/x-www-form-urlencoded","sec-fetch-dest":"document","sec-fetch-mode":"navigate","sec-fetch-site":"same-origin","sec-fetch-user":"?1","upgrade-insecure-requests":"1"},"referrer":"https://mythicalworld.su/bonus","referrerPolicy":"no-referrer-when-downgrade","body":"give=1&item=1","method":"POST","mode":"cors"}', null, 'https://mythicalworld.su/bonus', {ms: 86400000}, priorityOption, null)
    //          await addProject('Custom', 'MythicalWorldBonus2Day', '{"credentials":"include","headers":{"accept":"text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9","accept-language":"ru,en;q=0.9,en-US;q=0.8","cache-control":"max-age=0","content-type":"application/x-www-form-urlencoded","sec-fetch-dest":"document","sec-fetch-mode":"navigate","sec-fetch-site":"same-origin","sec-fetch-user":"?1","upgrade-insecure-requests":"1"},"referrer":"https://mythicalworld.su/bonus","referrerPolicy":"no-referrer-when-downgrade","body":"give=2&item=2","method":"POST","mode":"cors"}', null, 'https://mythicalworld.su/bonus', {ms: 86400000}, priorityOption, null)
    //          await addProject('Custom', 'MythicalWorldBonus3Day', '{"credentials":"include","headers":{"accept":"text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9","accept-language":"ru,en;q=0.9,en-US;q=0.8","cache-control":"max-age=0","content-type":"application/x-www-form-urlencoded","sec-fetch-dest":"document","sec-fetch-mode":"navigate","sec-fetch-site":"same-origin","sec-fetch-user":"?1","upgrade-insecure-requests":"1"},"referrer":"https://mythicalworld.su/bonus","referrerPolicy":"no-referrer-when-downgrade","body":"give=3&item=4","method":"POST","mode":"cors"}', null, 'https://mythicalworld.su/bonus', {ms: 86400000}, priorityOption, null)
    //          await addProject('Custom', 'MythicalWorldBonus4Day', '{"credentials":"include","headers":{"accept":"text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9","accept-language":"ru,en;q=0.9,en-US;q=0.8","cache-control":"max-age=0","content-type":"application/x-www-form-urlencoded","sec-fetch-dest":"document","sec-fetch-mode":"navigate","sec-fetch-site":"same-origin","sec-fetch-user":"?1","upgrade-insecure-requests":"1"},"referrer":"https://mythicalworld.su/bonus","referrerPolicy":"no-referrer-when-downgrade","body":"give=4&item=7","method":"POST","mode":"cors"}', null, 'https://mythicalworld.su/bonus', {ms: 86400000}, priorityOption, null)
    //          await addProject('Custom', 'MythicalWorldBonus5Day', '{"credentials":"include","headers":{"accept":"text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9","accept-language":"ru,en;q=0.9,en-US;q=0.8","cache-control":"max-age=0","content-type":"application/x-www-form-urlencoded","sec-fetch-dest":"document","sec-fetch-mode":"navigate","sec-fetch-site":"same-origin","sec-fetch-user":"?1","upgrade-insecure-requests":"1"},"referrer":"https://mythicalworld.su/bonus","referrerPolicy":"no-referrer-when-downgrade","body":"give=5&item=9","method":"POST","mode":"cors"}', null, 'https://mythicalworld.su/bonus', {ms: 86400000}, priorityOption, null)
    //          await addProject('Custom', 'MythicalWorldBonus6Day', '{"credentials":"include","headers":{"accept":"text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9","accept-language":"ru,en;q=0.9,en-US;q=0.8","cache-control":"max-age=0","content-type":"application/x-www-form-urlencoded","sec-fetch-dest":"document","sec-fetch-mode":"navigate","sec-fetch-site":"same-origin","sec-fetch-user":"?1","upgrade-insecure-requests":"1"},"referrer":"https://mythicalworld.su/bonus","referrerPolicy":"no-referrer-when-downgrade","body":"give=6&item=11","method":"POST","mode":"cors"}', null, 'https://mythicalworld.su/bonus', {ms: 86400000}, priorityOption, null)
    //          await addProject('Custom', 'MythicalWorldBonusMith', '{"credentials":"include","headers":{"accept":"text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9","accept-language":"ru,en;q=0.9,en-US;q=0.8","cache-control":"max-age=0","content-type":"application/x-www-form-urlencoded","sec-fetch-dest":"document","sec-fetch-mode":"navigate","sec-fetch-site":"same-origin","sec-fetch-user":"?1","upgrade-insecure-requests":"1"},"referrer":"https://mythicalworld.su/bonus","referrerPolicy":"no-referrer-when-downgrade","body":"type=1&bonus=1&value=5","method":"POST","mode":"cors"}', null, 'https://mythicalworld.su/bonus', {ms: 86400000}, priorityOption, null)
    //      })
    /*  } else */
    if (project.id === 'victorycraft' || project.id === '8179' || project.id === '4729') {
        document.getElementById('secondBonusVictoryCraft').addEventListener('click', async event => {
            event.target.disabled = true
            const vict = {
                rating: 'Custom',
                nick: '',
                id: 'VictoryCraft ' + chrome.i18n.getMessage('dailyBonus'),
                body: JSON.parse(
                    '{"headers": {"accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9","accept-language": "ru,en-US;q=0.9,en;q=0.8","content-type": "application/x-www-form-urlencoded","sec-fetch-dest": "document","sec-fetch-mode": "navigate","sec-fetch-site": "same-origin","sec-fetch-user": "?1","upgrade-insecure-requests": "1"},"body": "give_daily_posted=1&token=%7Btoken%7D&return=%252F","method": "POST"}',
                ),
                time: null,
                responseURL: 'https://victorycraft.ru/?do=cabinet&loc=bonuses',
                timeoutHour: 0,
                timeoutMinute: 10,
                timeoutSecond: 0,
                timeoutMS: 0,
                stats: {
                    successVotes: 0,
                    monthSuccessVotes: 0,
                    lastMonthSuccessVotes: 0,
                    errorVotes: 0,
                    laterVotes: 0,
                    lastSuccessVote: null,
                    lastAttemptVote: null,
                    added: Date.now(),
                },
            }
            await addProject(vict, element)
            //await addProject('Custom', 'VictoryCraft Голосуйте минимум в 2х рейтингах в день', '{"credentials":"include","headers":{"accept":"text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9","accept-language":"ru,en;q=0.9,en-US;q=0.8","cache-control":"max-age=0","content-type":"application/x-www-form-urlencoded","sec-fetch-dest":"document","sec-fetch-mode":"navigate","sec-fetch-site":"same-origin","sec-fetch-user":"?1","upgrade-insecure-requests":"1"},"referrer":"https://victorycraft.ru/?do=cabinet&loc=vote","referrerPolicy":"no-referrer-when-downgrade","body":"receive_month_bonus_posted=1&reward_id=1&token=%7Btoken%7D","method":"POST","mode":"cors"}', {ms: 604800000}, 'https://victorycraft.ru/?do=cabinet&loc=vote', null, priorityOption, null)
            event.target.disabled = false
        })
    }
}

async function checkPermissions(projects, element) {
    const origins = []
    const permissions = []
    for (const project of projects) {
        const funcProject = allProjects[project.rating]
        const url = funcProject.pageURL(project)
        const domain = getDomainWithoutSubdomain(url)
        if (!origins.includes('*://*.' + domain + '/*')) origins.push('*://*.' + domain + '/*')
        if (!funcProject.notRequiredCaptcha?.(project)) {
            // noinspection JSUnresolvedReference
            for (const origin of chrome.runtime.getManifest().host_permissions) {
                if (!origins.includes(origin)) origins.push(origin)
            }
        }
        if (funcProject.needAdditionalOrigins) {
            for (const origin of funcProject.needAdditionalOrigins(project)) {
                if (!origins.includes(origin)) origins.push(origin)
            }
        }
        if (funcProject.needAdditionalPermissions) {
            for (const permission of funcProject.needAdditionalPermissions(project)) {
                if (!permissions.includes(permission)) permissions.push(permission)
            }
        }
    }

    // noinspection JSUnresolvedFunction
    let granted = await chrome.permissions.contains({origins, permissions})
    if (!granted) {
        if (element == null) {
            try {
                // noinspection JSVoidFunctionReturnValueUsed
                granted = await chrome.permissions.request({origins, permissions})
                if (!granted) {
                    createNotif(chrome.i18n.getMessage('notGrantUrl'), 'error', {element})
                    return false
                } else {
                    return true
                }
            } catch (error) {
                if (
                    !error.message.includes('must be called during a user gesture') &&
                    !error.message.includes('may only be called from a user input handler')
                ) {
                    createNotif(error, 'error', {element})
                    return false
                }
            }
        }
        document.getElementById('submitAddProject').disabled = false
        const button = document.createElement('button')
        button.textContent = chrome.i18n.getMessage('grant')
        button.classList.add('submitBtn')
        createNotif([chrome.i18n.getMessage('grantUrl'), button], 'hint', {element})
        granted = await new Promise(resolve => {
            button.addEventListener('click', async () => {
                try {
                    // noinspection JSVoidFunctionReturnValueUsed
                    granted = await chrome.permissions.request({origins, permissions})
                } catch (error) {
                    createNotif(error, 'error', {element})
                    resolve(false)
                }
                if (element == null) removeNotif(button.parentElement.parentElement)
                if (!granted) {
                    createNotif(chrome.i18n.getMessage('notGrantUrl'), 'error', {element})
                    resolve(false)
                } else {
                    if (element != null) createNotif(chrome.i18n.getMessage('granted'), 'success', {element})
                    resolve(true)
                }
            })
        })
        return granted
    }
    if (element != null) createNotif(chrome.i18n.getMessage('granted'), 'success', {element})
    return true
}

function createMessage(text, level) {
    const span = document.createElement('span')
    if (level) {
        if (level === 'success') {
            span.style.color = '#4CAF50'
        } else if (level === 'error') {
            span.style.color = '#da5e5e'
        } else if (level === 'warn') {
            span.style.color = '#f1af4c'
        }
    }
    span.textContent = text
    return span
}

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

let laterChoose = false
document.getElementById('link').addEventListener('input', linkChanged)

function linkChanged(event, reset) {
    if (laterChoose || reset) {
        document.getElementById('nick').parentElement.style.display = 'none'
        document.getElementById('nick').required = false
        document.getElementById('nick').placeholder = chrome.i18n.getMessage('enterNick')
        document.getElementById('countVote').parentElement.style.display = 'none'
        document.getElementById('countVote').required = false
        document.getElementById('ordinalWorld').parentElement.style.display = 'none'
        document.getElementById('ordinalWorld').required = false
        document.getElementById('banAttention').style.display = 'none'
        document.getElementById('rewardAttention').style.display = 'none'
        document.getElementById('operaAttention').style.display = 'none'
        document.getElementById('voteMode').disabled = true
        document.getElementById('voteMode').checked = false
        document.getElementById('voteMode').dispatchEvent(new Event('change'))
        laterChoose = false
        if (reset) return
    }

    let domain, project, funcRating
    try {
        domain = getDomainWithoutSubdomain(this.value)
        funcRating = allProjects[domain]
        if (!funcRating) return
        project = funcRating.parseURL(new URL(this.value))
    } catch (error) {
        return
    }
    laterChoose = true

    project.rating = domain
    if (!funcRating.notRequiredNick?.(project)) {
        document.getElementById('nick').parentElement.removeAttribute('style')
        document.getElementById('nick').required = true
        if (funcRating.optionalNick?.()) {
            document.getElementById('nick').placeholder = chrome.i18n.getMessage('enterNickOptional')
        }
    }
    if (funcRating.limitedCountVote?.()) {
        document.getElementById('countVote').parentElement.removeAttribute('style')
        document.getElementById('countVote').required = true
    }
    if (funcRating.ordinalWorld?.()) {
        document.getElementById('ordinalWorld').parentElement.removeAttribute('style')
        document.getElementById('ordinalWorld').required = true
    }
    if (funcRating.silentVote?.(project)) {
        document.getElementById('voteMode').disabled = false
    }
    if (funcRating.banAttention?.(project)) {
        document.getElementById('banAttention').removeAttribute('style')
    }
    if (project.rating === 'minecraftrating.ru' && project.listing === 'servers') {
        document.getElementById('rewardAttention').removeAttribute('style')
    }
    // noinspection JSUnresolvedVariable
    if (
        !settings.operaAttention &&
        (navigator?.userAgentData?.brands?.[0]?.brand === 'Opera' ||
            (!!window.opr && !!opr.addons) ||
            !!window.opera ||
            navigator.userAgent.indexOf(' OPR/') >= 0) &&
        !(funcRating.notRequiredCaptcha?.(project) || funcRating.alertManualCaptcha?.())
    ) {
        document.getElementById('operaAttention').removeAttribute('style')
    }
}

let laterChooseManual = false
document.getElementById('rating').addEventListener('input', ratingChanged)

function ratingChanged(event, reset) {
    if (laterChooseManual || reset) {
        document.getElementById('id').parentElement.style.display = 'none'
        document.getElementById('id').name = 'id'
        document.getElementById('id').required = false
        document.getElementById('projectIDTooltip1').textContent = ''
        document.getElementById('projectIDTooltip2').textContent = ''
        document.getElementById('projectIDTooltip3').textContent = ''
        document.querySelector('[data-resource="yourNick"]').textContent = chrome.i18n.getMessage('yourNick')
        document.getElementById('nick').parentElement.style.display = 'none'
        document.getElementById('nick').required = false
        document.getElementById('nick').placeholder = chrome.i18n.getMessage('enterNick')
        document.getElementById('chooseGame').parentElement.style.display = 'none'
        document.getElementById('chooseGame').name = 'chooseGame'
        document.getElementById('urlGameTooltip1').textContent = ''
        document.getElementById('urlGameTooltip2').textContent = ''
        document.getElementById('urlGameTooltip3').textContent = ''
        document.getElementById('gameList').replaceChildren()
        document.getElementById('chooseListing').parentElement.style.display = 'none'
        document.getElementById('chooseListing').name = 'chooseListing'
        document.getElementById('urlListingTooltip1').textContent = ''
        document.getElementById('urlListingTooltip2').textContent = ''
        document.getElementById('urlListingTooltip3').textContent = ''
        document.getElementById('listingList').replaceChildren()
        document.getElementById('chooseLang').parentElement.style.display = 'none'
        document.getElementById('chooseLang').name = 'chooseLang'
        document.getElementById('langList').replaceChildren()
        document.getElementById('countVote').parentElement.style.display = 'none'
        document.getElementById('countVote').required = false
        document.getElementById('ordinalWorld').parentElement.style.display = 'none'
        document.getElementById('ordinalWorld').required = false
        document.getElementById('banAttention').style.display = 'none'
        document.getElementById('rewardAttention').style.display = 'none'
        document.getElementById('operaAttention').style.display = 'none'
        document.getElementById('additionURL').parentElement.style.display = 'none'
        document.getElementById('additionURL').name = 'additionURL'
        document.getElementById('additionURLTooltip1').textContent = ''
        document.getElementById('additionURLTooltip2').textContent = ''
        document.getElementById('additionURLTooltip3').textContent = ''
        document.getElementById('customTimeOut').disabled = false
        document.getElementById('customTimeOut').dispatchEvent(new Event('change'))
        document.getElementById('voteMode').disabled = true
        document.getElementById('voteMode').checked = false
        document.getElementById('voteMode').dispatchEvent(new Event('change'))
        if (!document.getElementById('customTimeOut').checked)
            document.getElementById('selectTime').parentElement.style.display = 'none'
        document.getElementById('customBody').parentElement.style.display = 'none'
        document.getElementById('responseURL').parentElement.style.display = 'none'
        laterChooseManual = false
        if (reset) return
    }

    if (this.value === 'Custom') {
        laterChooseManual = true
        document.getElementById('customTimeOut').disabled = true
        document.getElementById('customTimeOut').checked = false
        document.getElementById('lastDayMonth').disabled = true
        document.getElementById('lastDayMonth').checked = false
        document.getElementById('voteMode').disabled = true
        document.getElementById('voteMode').checked = false
        document.getElementById('voteMode').dispatchEvent(new Event('change'))
        document.getElementById('nick').parentElement.removeAttribute('style')
        document.getElementById('nick').required = true
        document.getElementById('id').required = false

        document.getElementById('selectTime').parentElement.removeAttribute('style')
        document.getElementById('selectTime').dispatchEvent(new Event('change'))
        document.getElementById('customBody').parentElement.removeAttribute('style')
        document.getElementById('responseURL').parentElement.removeAttribute('style')

        document.querySelector('[data-resource="yourNick"]').textContent = chrome.i18n.getMessage('name')
        document.getElementById('nick').placeholder = chrome.i18n.getMessage('enterName')
        return
    }

    const rating = this.value
    const funcRating = allProjects[rating]

    if (!funcRating) return
    laterChooseManual = true

    if (!funcRating.notRequiredId?.()) {
        document.getElementById('id').parentElement.removeAttribute('style')
        document.getElementById('id').required = true
        document.getElementById('projectIDTooltip1').textContent = funcRating.exampleURL()[0]
        document.getElementById('projectIDTooltip2').textContent = funcRating.exampleURL()[1]
        document.getElementById('projectIDTooltip3').textContent = funcRating.exampleURL()[2]
        document.getElementById('id').name = 'id_' + rating
    }

    if (!funcRating.notRequiredNick?.()) {
        document.getElementById('nick').parentElement.removeAttribute('style')
        document.getElementById('nick').required = true
        if (funcRating.optionalNick?.()) {
            document.getElementById('nick').placeholder = chrome.i18n.getMessage('enterNickOptional')
        }
    }

    if (funcRating.URLMain?.() && this.value !== funcRating.URLMain()) {
        if (funcRating.exampleURLGame && !funcRating.defaultGame)
            document.getElementById('chooseGame').value = this.value
        this.value = funcRating.URLMain()
    }
    if (funcRating.exampleURLGame) {
        document.getElementById('chooseGame').parentElement.removeAttribute('style')
        document.getElementById('chooseGame').name = 'chooseGame_' + this.value
        if (
            funcRating.defaultGame &&
            !editingProject &&
            !funcRating.gameList().has(document.getElementById('chooseGame').value)
        ) {
            document.getElementById('chooseGame').value = funcRating.defaultGame()
        }
        document.getElementById('urlGameTooltip1').textContent = funcRating.exampleURLGame()[0]
        document.getElementById('urlGameTooltip2').textContent = funcRating.exampleURLGame()[1]
        document.getElementById('urlGameTooltip3').textContent = funcRating.exampleURLGame()[2]
        if (funcRating.gameList) {
            const gameList = document.getElementById('gameList')
            for (const [value, name] of funcRating.gameList()) {
                const option = document.createElement('option')
                option.value = value
                option.textContent = name
                gameList.append(option)
            }
        }
    }

    if (funcRating.exampleURLListing) {
        document.getElementById('chooseListing').parentElement.removeAttribute('style')
        document.getElementById('chooseListing').name = 'chooseListing_' + rating
        if (
            funcRating.defaultListing &&
            !editingProject &&
            !funcRating.listingList().has(document.getElementById('chooseListing').value)
        ) {
            document.getElementById('chooseListing').value = funcRating.defaultListing()
        }
        document.getElementById('chooseListing').dispatchEvent(new Event('change'))
        document.getElementById('urlListingTooltip1').textContent = funcRating.exampleURLListing()[0]
        document.getElementById('urlListingTooltip2').textContent = funcRating.exampleURLListing()[1]
        document.getElementById('urlListingTooltip3').textContent = funcRating.exampleURLListing()[2]
        if (funcRating.listingList) {
            const listingList = document.getElementById('listingList')
            for (const [value, name] of funcRating.listingList()) {
                const option = document.createElement('option')
                option.value = value
                option.textContent = name
                listingList.append(option)
            }
        }
    }

    if (funcRating.langList) {
        document.getElementById('chooseLang').parentElement.removeAttribute('style')
        document.getElementById('chooseLang').name = 'chooseLang_' + rating
        if (
            funcRating.defaultLand &&
            !editingProject &&
            !funcRating.langList().has(document.getElementById('chooseLang').value)
        ) {
            document.getElementById('chooseLang').value = funcRating.defaultLand()
        }
        const langList = document.getElementById('langList')
        for (const [value, name] of funcRating.langList()) {
            const option = document.createElement('option')
            option.value = value
            option.textContent = name
            langList.append(option)
        }
    }

    if (funcRating.limitedCountVote?.()) {
        document.getElementById('countVote').parentElement.removeAttribute('style')
        document.getElementById('countVote').required = true
    }

    if (funcRating.ordinalWorld?.()) {
        document.getElementById('ordinalWorld').parentElement.removeAttribute('style')
        document.getElementById('ordinalWorld').required = true
    }

    if (funcRating.silentVote?.()) {
        document.getElementById('voteMode').disabled = false
    }

    if (funcRating.banAttention?.()) {
        document.getElementById('banAttention').removeAttribute('style')
        if (!document.getElementById('randomize').checked) {
            document.getElementById('randomize').click()
            document.getElementById('randomizeMin').value = '0'
            document.getElementById('randomizeMax').value = '14400000'
        }
    }

    // noinspection JSUnresolvedVariable
    if (
        !settings.operaAttention &&
        navigator?.userAgentData?.brands?.[0]?.brand === 'Opera' &&
        !(funcRating.notRequiredCaptcha?.() || funcRating.alertManualCaptcha?.())
    ) {
        document.getElementById('operaAttention').removeAttribute('style')
    }

    if (funcRating.additionExampleURL) {
        document.getElementById('additionURL').parentElement.removeAttribute('style')
        document.getElementById('additionURL').name = 'additionURL_' + rating
        document.getElementById('additionURLTooltip1').textContent = funcRating.additionExampleURL()[0]
        document.getElementById('additionURLTooltip2').textContent = funcRating.additionExampleURL()[1]
        document.getElementById('additionURLTooltip3').textContent = funcRating.additionExampleURL()[2]
    }
}

//Слушатель на выбор типа timeout для Custom
document.getElementById('selectTime').addEventListener('change', function () {
    document.getElementById('hour').parentElement.style.display = 'none'
    document.getElementById('hour').required = false
    document.getElementById('time').parentElement.style.display = 'none'
    document.getElementById('time').required = false
    document.getElementById('week').parentElement.style.display = 'none'
    document.getElementById('week').required = false
    document.getElementById('month').parentElement.style.display = 'none'
    document.getElementById('month').required = false
    if (this.value === 'ms') {
        document.getElementById('time').parentElement.removeAttribute('style')
        document.getElementById('time').required = true
    } else {
        if (this.value === 'week') {
            document.getElementById('week').parentElement.removeAttribute('style')
            document.getElementById('week').required = true
        } else if (this.value === 'month') {
            document.getElementById('month').parentElement.removeAttribute('style')
            document.getElementById('month').required = true
        }
        document.getElementById('hour').parentElement.removeAttribute('style')
        document.getElementById('hour').required = true
    }
})

document.getElementById('chooseListing').addEventListener('change', function () {
    if (this.name === 'chooseListing_minecraftrating.ru') {
        if (this.value === 'servers') {
            document.getElementById('nick').required = false
            document.getElementById('nick').parentElement.style.display = 'none'
            document.getElementById('rewardAttention').removeAttribute('style')
        } else {
            document.getElementById('nick').required = true
            document.getElementById('nick').parentElement.removeAttribute('style')
            document.getElementById('rewardAttention').style.display = 'none'
        }
    }
})

function generateDataList() {
    const datalist = document.getElementById('ratingList')
    for (const rating of Object.keys(allProjects)) {
        const option = document.createElement('option')
        option.setAttribute('name', rating)
        option.value = rating
        if (rating === 'Custom') {
            option.disabled = !settings.enableCustom
            option.textContent = chrome.i18n.getMessage('Custom')
        }
        datalist.append(option)
    }
}

//Подсказка под полем ссылки: распознан ли сайт и проект ещё до нажатия «Добавить»
function updateLinkStatus() {
    const status = document.getElementById('linkStatus')
    const value = document.getElementById('link').value.trim()
    status.className = 'field-status'
    status.textContent = ''
    if (!value) return

    let url
    try {
        url = new URL(value)
    } catch {
        status.classList.add('error')
        status.textContent = chrome.i18n.getMessage('linkInvalid')
        return
    }
    const domain = getDomainWithoutSubdomain(value)
    const funcRating = allProjects[domain]
    if (!funcRating || domain === 'Custom') {
        status.classList.add('error')
        status.textContent = chrome.i18n.getMessage('linkUnsupported', domain)
        return
    }
    let project
    try {
        project = funcRating.parseURL(url)
    } catch {
        project = {}
    }
    if (!funcRating.notRequiredId?.() && !project?.id) {
        status.classList.add('warn')
        status.textContent = chrome.i18n.getMessage('linkNoProject', domain)
        return
    }
    status.classList.add('ok')
    status.textContent = project?.id
        ? chrome.i18n.getMessage('linkRecognized', [domain, String(project.id)])
        : chrome.i18n.getMessage('linkRecognizedSite', domain)
}

document.getElementById('link').addEventListener('input', updateLinkStatus)

//Список поддерживаемых сайтов с поиском
function renderSupportedSites() {
    const sites = Object.keys(allProjects)
        .filter(site => site !== 'Custom')
        .sort()
    document.getElementById('sitesCount').textContent = String(sites.length)
    const list = document.getElementById('sitesList')
    list.replaceChildren(
        ...sites.map(site => {
            const link = document.createElement('a')
            link.className = 'site-chip'
            link.href = 'https://' + site + '/'
            link.target = '_blank'
            link.rel = 'noopener'
            link.textContent = site
            return link
        }),
    )
}

renderSupportedSites()

document.getElementById('sitesFilter').addEventListener('input', function () {
    const query = this.value.trim().toLowerCase()
    for (const chip of document.querySelectorAll('#sitesList .site-chip')) {
        chip.hidden = query !== '' && !chip.textContent.includes(query)
    }
})

document.getElementById('emptyAddButton').addEventListener('click', () => {
    document.getElementById('addTab').click()
    document.getElementById('link').focus()
})
