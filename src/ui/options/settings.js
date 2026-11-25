// VoteFlow — страница настроек, модуль 6/7: Настройки расширения, тайм-ауты, импорт/экспорт, логи
// Модули подключаются в options.html в порядке: init, notifications, modals, projects-list, project-form, settings, app
// Это обычные скрипты с общей глобальной областью; код верхнего уровня может вызывать
// только функции из этого же файла или из модулей, подключённых раньше

//Слушатель дополнительных настроек
for (const check of document.querySelectorAll('input[name=checkbox]')) {
    check.addEventListener('change', async function (event) {
        event.target.disabled = true
        if (this.id === 'disabledNotifStart')
            settings.disabledNotifStart = this.checked
        else if (this.id === 'disabledNotifInfo')
            settings.disabledNotifInfo = this.checked
        else if (this.id === 'disabledNotifWarn')
            settings.disabledNotifWarn = this.checked
        else if (this.id === 'disabledNotifError') {
            if (this.checked && confirm(chrome.i18n.getMessage('confirmDisableErrors'))) {
                settings.disabledNotifError = this.checked
            } else if (this.checked) {
                this.checked = false
                return
            } else {
                settings.disabledNotifError = this.checked
            }
        } else if (this.id === 'disabledCheckInternet')
            settings.disabledCheckInternet = this.checked
        else if (this.id === 'disabledOneVote')
            settings.disabledOneVote = this.checked
        else if (this.id === 'disabledRestartOnTimeout')
            settings.disabledRestartOnTimeout = this.checked
        else if (this.id === 'disabledFocusedTab')
            settings.disabledFocusedTab = this.checked
        else if (this.id === 'disabledWarnCaptcha')
            settings.disabledWarnCaptcha = this.checked
        else if (this.id === 'disabledClickCaptcha')
            settings.disabledClickCaptcha = this.checked
        else if (this.id === 'disabledDebug')
            settings.debug = this.checked
        else if (this.id === 'disableCloseTabsOnSuccess')
            settings.disableCloseTabsOnSuccess = this.checked
        else if (this.id === 'disableCloseTabsOnError')
            settings.disableCloseTabsOnError = this.checked
        else if (this.id === 'expertMode') {
            settings.expertMode = this.checked
            if (this.checked) {
                document.getElementById('timeout').parentElement.removeAttribute('style')
                document.getElementById('timeoutError').parentElement.removeAttribute('style')
                document.getElementById('timeoutVote').parentElement.removeAttribute('style')
                document.getElementById('disabledOneVote').parentElement.removeAttribute('style')
                document.getElementById('disabledDebug').parentElement.removeAttribute('style')
                document.getElementById('disableCloseTabsOnSuccess').parentElement.removeAttribute('style')
                document.getElementById('disableCloseTabsOnError').parentElement.removeAttribute('style')
                document.getElementById('addProject').classList.add('addProjectExpert')
                document.getElementById('addProject').classList.remove('addProjectExpertManual')
                document.getElementById('advSettingsAdd').removeAttribute('style')
                document.getElementById('emptyDiv')?.remove()
            } else {
                document.getElementById('timeout').parentElement.style.display = 'none'
                document.getElementById('timeoutError').parentElement.style.display = 'none'
                document.getElementById('timeoutVote').parentElement.style.display = 'none'
                document.getElementById('disabledOneVote').parentElement.style.display = 'none'
                document.getElementById('disabledDebug').parentElement.style.display = 'none'
                document.getElementById('disableCloseTabsOnSuccess').parentElement.style.display = 'none'
                document.getElementById('disableCloseTabsOnError').parentElement.style.display = 'none'
                document.getElementById('addProject').classList.add('addProjectExpertManual')
                document.getElementById('addProject').classList.remove('addProjectExpert')
                document.getElementById('advSettingsAdd').style.display = 'none'
                document.getElementById('advSettingsAdd').querySelectorAll('input[type="checkbox"]').forEach(el => {
                    el.checked = false
                    el.dispatchEvent(new Event('change'))
                })
                if (!document.getElementById('emptyDiv')) {
                    const div = document.createElement('div')
                    div.id = 'emptyDiv'
                    document.getElementById('addProject').prepend(div)
                }
            }
            if (event.isTrusted) reloadProjectList()
        } else {
            return
        }
        await db.put('other', settings, 'settings')
        chrome.runtime.sendMessage('reloadSettings')
        usageSpace()
        event.target.disabled = false
    })
}

//Слушатель кнопки "Установить" на таймауте
document.getElementById('timeout').addEventListener('submit', async (event) => {
    event.preventDefault()
    event.submitter.disabled = true
    settings.timeout = document.getElementById('timeoutValue').valueAsNumber
    await db.put('other', settings, 'settings')
    createNotif(chrome.i18n.getMessage('successSave'), 'success')
    chrome.runtime.sendMessage('reloadSettings')
    event.submitter.disabled = false
})

//Слушатель кнопки "Установить" на таймауте при ошибке
document.getElementById('timeoutError').addEventListener('submit', async (event) => {
    event.preventDefault()
    event.submitter.disabled = true
    settings.timeoutError = document.getElementById('timeoutErrorValue').valueAsNumber
    await db.put('other', settings, 'settings')
    createNotif(chrome.i18n.getMessage('successSave'), 'success')
    chrome.runtime.sendMessage('reloadSettings')
    event.submitter.disabled = false
})

//Слушатель кнопки "Установить" на таймауте при голосовании
document.getElementById('timeoutVote').addEventListener('submit', async (event) => {
    event.preventDefault()
    event.submitter.disabled = true
    settings.timeoutVote = document.getElementById('timeoutVoteValue').valueAsNumber
    await db.put('other', settings, 'settings')
    createNotif(chrome.i18n.getMessage('successSave'), 'success')
    chrome.runtime.sendMessage('reloadSettings')
    event.submitter.disabled = false
})

//Слушатель на экспорт настроек
document.getElementById('file-download').addEventListener('click', async () => {
    createNotif(chrome.i18n.getMessage('exporting'), 'hint')
    generalStats = await db.get('other', 'generalStats')
    todayStats = await db.get('other', 'todayStats')
    const allSetting = {
        settings,
        generalStats,
        todayStats,
        version: db.version
    }
    allSetting.projects = await db.getAll('projects')
    const text = JSON.stringify(allSetting, null, '\t')
    const blob = new Blob([text], {type: 'text/json;charset=UTF-8;'})
    const anchor = document.createElement('a')

    anchor.download = 'VoteFlow.json'
    anchor.href = (window.webkitURL || window.URL).createObjectURL(blob)
    anchor.dataset.downloadurl = ['text/json;charset=UTF-8;', anchor.download, anchor.href].join(':')
    anchor.click()
    createNotif(chrome.i18n.getMessage('exportingEnd'), 'success')
})

document.getElementById('logs-download').addEventListener('click', async () => {
    createNotif(chrome.i18n.getMessage('exporting'), 'hint')
    const logs = await dbLogs.getAll('logs')
    let text = ''
    for (const log of logs) {
        text += log
        text += '\n'
    }

    const blob = new Blob([text], {type: 'text/plain;charset=UTF-8;'})
    const anchor = document.createElement('a')

    anchor.download = 'console_history.txt'
    anchor.href = (window.webkitURL || window.URL).createObjectURL(blob)
    anchor.dataset.downloadurl = ['text/plain;charset=UTF-8;', anchor.download, anchor.href].join(':')

    // openPopup(anchor.href)
    anchor.click()

    createNotif(chrome.i18n.getMessage('exportingEnd'), 'success')
})

//Сколько использовано места на логи
// noinspection JSIgnoredPromiseFromCall
usageSpace()

async function usageSpace() {
    const quota = await navigator.storage.estimate()
    // Код рассчитывающий использованное место позаимствовано из uBlock Origin https://github.com/gorhill/uBlock/blob/feaa338678ab64e334d33d5b5fb06749877454e7/src/js/settings.js#L118
    let v, unit
    v = quota.usage
    if (v < 1e3) {
        unit = 'genericBytes'
    } else if (v < 1e6) {
        v /= 1e3
        unit = 'KB'
    } else if (v < 1e9) {
        v /= 1e6
        unit = 'MB'
    } else {
        v /= 1e9
        unit = 'GB'
    }
    document.getElementById('storageUsed').textContent = chrome.i18n.getMessage('storageUsed', [v.toFixed(1), unit])
}

//Очистка логов
document.getElementById('logs-clear').addEventListener('click', async () => {
    createNotif(chrome.i18n.getMessage('clearingLogs'), 'hint')
    await dbLogs.clear('logs')
    usageSpace()
    createNotif(chrome.i18n.getMessage('clearedLogs'), 'success')
})

//Слушатель на импорт настроек
document.getElementById('file-upload').addEventListener('change', async (event) => {
    createNotif(chrome.i18n.getMessage('importing'), 'hint')
    try {
        if (event.target.files.length === 0) return
        const [file] = event.target.files
        const data = await new Response(file).json()

        const projects = data.projects

        const transaction = db.transaction(['projects', 'other'], 'readwrite')

        await transaction.objectStore('projects').clear()

        let key = 0
        for (const project of projects) {
            if (project.key == null) {
                key++
                project.key = key
            }
            await transaction.objectStore('projects').add(project, project.key)
        }
        await transaction.objectStore('other').put(data.settings, 'settings')
        await transaction.objectStore('other').put(data.generalStats, 'generalStats')
        await transaction.objectStore('other').put(data.todayStats, 'todayStats')

        settings = data.settings
        generalStats = data.generalStats
        todayStats = data.todayStats

        await runDatabaseUpgrade(db, data.version, db.version, transaction, allProjects, getDomainWithoutSubdomain)

        if (!await checkPermissions(await transaction.objectStore('projects').getAll())) {
            await db.clear('projects')
            chrome.runtime.sendMessage('reloadAllSettings')
            await restoreOptions()
            return
        }

        chrome.runtime.sendMessage('reloadAllSettings')
        await restoreOptions()

        createNotif(chrome.i18n.getMessage('importingEnd'), 'success')
    } catch (error) {
        createNotif(error, 'error')
    } finally {
        document.getElementById('file-upload').value = ''
    }
}, false)
