// VoteFlow — страница настроек, модуль 5/10: Форма добавления и редактирования проекта: поля, режимы, кнопка «Добавить»
// Модули подключаются в options.html в порядке: init, notifications, modals, projects-list, project-form,
// project-add, project-import, project-link, settings, app.
// Это обычные скрипты с общей глобальной областью; код верхнего уровня вызывает только функции этого файла
// или загруженных раньше. Функции из других модулей — только в обработчиках событий

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
