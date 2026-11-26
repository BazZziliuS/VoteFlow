// VoteFlow — страница настроек, модуль 6/10: Добавление проекта: проверки сайта, доступ к сайту, бонусы
// Модули подключаются в options.html в порядке: init, notifications, modals, projects-list, project-form,
// project-add, project-import, project-link, settings, app.
// Это обычные скрипты с общей глобальной областью; код верхнего уровня вызывает только функции этого файла
// или загруженных раньше. Функции из других модулей — только в обработчиках событий

async function addProject(project, element) {
    createNotif(chrome.i18n.getMessage('adding'), 'hint', {element})

    //Получение бонусов на проектах где требуется подтвердить получение бонуса
    let secondBonusText
    const secondBonusButton = document.createElement('button')
    secondBonusButton.type = 'button'
    secondBonusButton.textContent = chrome.i18n.getMessage('lets')
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
