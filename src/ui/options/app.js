// VoteFlow — страница настроек, модуль 7/7: Запуск страницы, переключение вкладок, сообщения от service worker
// Модули подключаются в options.html в порядке: init, notifications, modals, projects-list, project-form, settings, app
// Это обычные скрипты с общей глобальной областью; код верхнего уровня может вызывать
// только функции из этого же файла или из модулей, подключённых раньше

document.addEventListener('DOMContentLoaded', async () => {
    await initializeFunc

    await restoreOptions(true)

    document.querySelector('div[data-resource="version"]').textContent += chrome.runtime.getManifest().version
    document.getElementById('navVersion').textContent = 'v' + chrome.runtime.getManifest().version

    //Для FireFox почему-то не доступно это API
    // noinspection JSUnresolvedVariable
    if (typeof InstallTrigger === 'undefined') {
        if (chrome.notifications.getPermissionLevel != null) {
            chrome.notifications.getPermissionLevel(function (callback) {
                if (callback !== 'granted' && (!settings.disabledNotifError || !settings.disabledNotifWarn)) {
                    createNotif(chrome.i18n.getMessage('notificationsDisabled'), 'error')
                }
            })
        }
    }

    if (!onLine && !navigator.onLine) {
        createNotif(chrome.i18n.getMessage('internetDisconnected'), 'warn', {delay: 15000})
    }

    document.getElementById('switchAddMode').dispatchEvent(new Event('change'))

    document.getElementById('customTimeOut').dispatchEvent(new Event('change'))
    document.getElementById('scheduleTimeCheckbox').dispatchEvent(new Event('change'))
    document.getElementById('randomize').dispatchEvent(new Event('change'))
    document.getElementById('voteMode').dispatchEvent(new Event('change'))

    // noinspection JSUnresolvedReference
    if (!settings.operaAttention2 && (navigator?.userAgentData?.brands?.[0]?.brand === 'Opera' || (!!window.opr && !!opr.addons) || !!window.opera || navigator.userAgent.indexOf(' OPR/') >= 0)) {
        toggleModal('notSupportedBrowser')
    } else {
        fastAdd()
    }
})

window.addEventListener('load', async () => {
    await initializeFunc
    await reloadProjectList()
    generateDataList()
    document.getElementById('addedLoading').style.display = 'none'
    document.getElementById('notAddedAll').removeAttribute('style')
    resolveLoad()
})

// Restores select box and checkbox state using the preferences
async function restoreOptions(first) {
    //Считывает настройки расширение и выдаёт их в html
    setSettingCheckbox('disabledNotifStart', settings.disabledNotifStart)
    setSettingCheckbox('disabledNotifInfo', settings.disabledNotifInfo)
    setSettingCheckbox('disabledNotifWarn', settings.disabledNotifWarn)
    setSettingCheckbox('disabledNotifError', settings.disabledNotifError)
    setSettingCheckbox('disabledCheckInternet', settings.disabledCheckInternet)
    setSettingCheckbox('disabledOneVote', settings.disabledOneVote)
    setSettingCheckbox('disabledRestartOnTimeout', settings.disabledRestartOnTimeout)
    setSettingCheckbox('disabledFocusedTab', settings.disabledFocusedTab)
    document.getElementById('timeoutValue').value = settings.timeout
    document.getElementById('timeoutErrorValue').value = settings.timeoutError
    document.getElementById('timeoutVoteValue').value = settings.timeoutVote
    setSettingCheckbox('disabledWarnCaptcha', settings.disabledWarnCaptcha)
    setSettingCheckbox('disabledClickCaptcha', settings.disabledClickCaptcha)
    document.getElementById('disabledDebug').checked = settings.debug
    document.getElementById('disableCloseTabsOnSuccess').checked = settings.disableCloseTabsOnSuccess
    document.getElementById('disableCloseTabsOnError').checked = settings.disableCloseTabsOnError
    document.getElementById('expertMode').checked = settings.expertMode
    document.getElementById('expertMode').dispatchEvent(new Event('change'))
    if (first) {
        document.getElementById('addTab').classList.add('active')
        document.getElementById('load').style.display = 'none'
        document.getElementById('append').removeAttribute('style')
    } else {
        await reloadProjectList()
    }
}

document.querySelector('.burger').addEventListener('click', () => {
    document.querySelector('.burger').classList.toggle('active')
    document.querySelector('nav').classList.toggle('active')
})

//Переключение между вкладками
document.querySelectorAll('.tablinks').forEach((item) => {
    item.addEventListener('click', () => {
        if (document.getElementById('load').style.display !== 'none') return
        if (item.classList.contains('active')) return

        if (document.querySelector('.burger.active')) {
            document.querySelector('.burger.active').classList.remove('active')
            document.querySelector('nav').classList.remove('active')
        }

        document.querySelectorAll('.tabcontent').forEach((elem) => {
            elem.style.display = 'none'
        })
        document.querySelectorAll('.tablinks').forEach((elem) => {
            elem.classList.remove('active')
        })

        item.classList.add('active')
        document.getElementById(item.getAttribute('data-tab')).style.display = 'block'
        if (item.getAttribute('data-tab') === 'added') selectFirstRating()
        window.scrollTo({top: 0})
    })
})

function lagServiceWorker(event) {
    const button = document.createElement('button')
    button.classList.add('btn')
    button.id = 'restartBtn'
    button.addEventListener('click', () => {
        if (confirm(chrome.i18n.getMessage('confirmRestartExtension'))) {
            chrome.runtime.reload()
        }
    })
    button.textContent = chrome.i18n.getMessage('restartExtension')
    createNotif([chrome.i18n.getMessage('lagServiceWorker'), button], 'warn', 60000)
    if (event.target) event.target.disabled = false
    if (event.submitter) event.submitter.disabled = false
}

chrome.runtime.onMessage.addListener(onMessage)

async function onMessage(request) {
    if (request.updateValue) {
        usageSpace()
        if (request.updateValue === 'projects') {
            updateProjectText(request.value)
        }
    } else if (request.installed) {
        // Первый запуск: вместо системного alert на вкладке «Добавить» показывается карточка «Как это работает»
        document.getElementById('addTab').click()
        document.getElementById('link').focus()
    } else if (request.openProject) {
        await initializeFunc
        document.getElementById('addedTab').click()
        await loaded
        const project = await db.get('projects', request.openProject)
        await listSelect({currentTarget: document.querySelector('[data-rating-button="' + project.rating + '"]')}, project.rating)
        document.getElementById('projects' + project.key).scrollIntoView({block: 'center'})
        highlight(document.getElementById('projects' + project.key))
        window.history.replaceState(null, null, 'options.html')
    } else if (request.notification) {
        if (request.notification.type !== 'warn' && request.notification.type !== 'error') request.notification.type = 'hint'
        let onClick
        if (request.notification.notificationId.startsWith('openTab_')) {
            onClick = async () => {
                const tabId = Number(request.notification.notificationId.replace('openTab_', ''))
                if (!tabId) return
                const tab = await chrome.tabs.update(tabId, {active: true})
                if (!tab) return
                await chrome.windows.update(tab.windowId, {focused: true})
            }
        } else if (request.notification.notificationId.startsWith('openProject_')) {
            onClick = () => {
                try {
                    const projectKey = Number(request.notification.notificationId.replace('openProject_', ''))
                    onMessage({openProject: projectKey})
                } catch (error) {
                    console.warn('Ошибка открытия настроек с определённым проектом', error.message)
                }
            }
        }
        createNotif([request.notification.title, document.createElement('br'), request.notification.message], request.notification.type, {onClick})
    }
}
