// noinspection ES6MissingAwait

const state = self.serviceWorker.state

importScripts('/libs/idb.umd.js')
importScripts('/src/shared/projects.js')
// Импорт утилит базы данных (должны быть ДО main.js)
importScripts('/src/shared/database/migrations/migration-v0.js')
importScripts('/src/shared/database/migrations/migration-v1-v12.js')
importScripts('/src/shared/database/migrations/migration-v13.js')
importScripts('/src/shared/database/migrations/migration-v14.js')
importScripts('/src/shared/database/migrations/migration-v15.js')
importScripts('/src/shared/database/migrations/migration-v16.js')
importScripts('/src/shared/database/migrations/migration-v17.js')
importScripts('/src/shared/database/migrations/migration-v18.js')
importScripts('/src/shared/database/migrations/migration-v19.js')
importScripts('/src/shared/database/migrations/migration-v20.js')
importScripts('/src/shared/database/migrations/index.js')
importScripts('/src/shared/database/db-init.js')
importScripts('/src/shared/main.js')
// CORE UTILITIES
importScripts('/src/background/helpers/constants.js')
importScripts('/src/background/helpers/time.js')
importScripts('/src/background/helpers/project.js')
importScripts('/src/background/helpers/retry.js')
// DATABASE UTILITIES
importScripts('/src/shared/database/database-helpers.js')
// VOTING UTILITIES
importScripts('/src/background/voting/opened-projects-manager.js')
importScripts('/src/background/voting/vote-time-calculator.js')
importScripts('/src/background/voting/vote-result-handler.js')
importScripts('/src/background/voting/stats-updater.js')
importScripts('/src/background/voting/silent-vote-handler.js')
importScripts('/src/background/voting/message-handlers.js')
importScripts('/src/background/voting/error-handler.js')
importScripts('/src/background/voting/end-vote-helpers.js')
// BROWSER UTILITIES
importScripts('/src/background/browser/alarms.js')
importScripts('/src/background/browser/tab-manager.js')
importScripts('/src/background/browser/notifications.js')
importScripts('/src/background/browser/cookies-manager.js')
importScripts('/src/background/browser/url-matchers.js')
importScripts('/src/background/browser/connection-checker.js')
importScripts('/src/background/browser/browser-detector.js')
importScripts('/src/background/browser/console-interceptor.js')
importScripts('/src/background/browser/script-injector.js')
importScripts('/src/background/browser/listener-manager.js')
importScripts('/src/background/browser/notification-handlers.js')
importScripts('/src/background/browser/badge.js')

// Service worker разрешает importScripts только до установки (https://crbug.com/1198822):
// скрипты тихого режима подключаются здесь, а не по требованию
self.addEventListener('install', () => {
    importScripts('/libs/linkedom.js')
    importScripts(
        '/src/background/silentvote/mcserver-list.eu_silentvote.js',
        '/src/background/silentvote/misterlauncher.org_silentvote.js',
        '/src/background/silentvote/bloodrust.com_silentvote.js',
    )
})

//ID группы вкладок в которой сейчас открыты вкладки расширения
let groupId
//Если этот браузер не поддерживает группировку вкладок
let notSupportedGroupTabs = false

// Проход по очереди уже идёт; новый запрос во время прохода откладывается до его конца
let isQueueRunning = false
let isQueueRerunRequested = false

/**
 * Проект пора голосовать: время не задано или наступило. Остановленный (time = Infinity) не голосует
 * @param {Object} project
 * @returns {boolean}
 */
function isProjectDue(project) {
    return !project.time || project.time < Date.now()
}

const silentResponseBody = {}

//Инициализация настроек расширения
// noinspection JSIgnoredPromiseFromCall
const initializeFunc = initializeConfig(true)
initializeFunc.finally(() => (initializeFunc.done = true))
initializeFunc.then(() => updateErrorBadge(db))

/**
 * Проверяет необходимость голосования для всех проектов
 * Сверяет текущее время с временем из конфигурации каждого проекта
 * @async
 * @returns {Promise<void>}
 */
async function processVoteQueue() {
    await initializeFunc

    // Проверка браузера Opera
    if (shouldSkipForOpera(settings)) {
        return
    }

    // Проверка восстановления интернет-соединения
    const restorationCheck = await checkInternetRestoration(settings, db, onLine)
    if (restorationCheck.shouldReturn) return
    if (restorationCheck.newOnLineStatus !== null) {
        onLine = restorationCheck.newOnLineStatus
    }

    if (isQueueRunning) {
        isQueueRerunRequested = true
        return
    }
    isQueueRunning = true

    try {
        // Проекты читаются заранее: startProjectVote ждёт API браузера, а IndexedDB закрывает транзакцию,
        // как только управление уходит в чужой асинхронный вызов (TransactionInactiveError на cursor.continue)
        const dueProjects = (await db.getAll('projects')).filter(isProjectDue)
        for (const project of dueProjects) {
            await startProjectVote(project)
        }
    } finally {
        // Даже после ошибки очередь должна снова запускаться, иначе голосования встанут до перезапуска браузера
        isQueueRunning = false
    }

    if (isQueueRerunRequested) {
        isQueueRerunRequested = false
        processVoteQueue()
    } else if (!openedProjects.size) {
        // Голосование завершилось и более не планируется
        promises = []
        updateListeners(false)
    }
}

//Триггер на голосование когда подходит время голосования
chrome.alarms.onAlarm.addListener(function (alarm) {
    if (settings?.debug) console.log('chrome.alarms.onAlarm', JSON.stringify(alarm))
    // noinspection JSIgnoredPromiseFromCall
    processVoteQueue()
})

// После сна компьютера будильники срабатывают с опозданием или пропускаются (https://crbug.com/471524):
// при возвращении пользователя проверяем очередь сами
chrome.idle.onStateChanged.addListener(async function (newState) {
    if (newState === 'active') {
        // noinspection JSIgnoredPromiseFromCall
        processVoteQueue()
    }
})

/**
 * Перезагружает все будильники для проектов
 * Очищает старые алармы и создает новые на основе текущих данных проектов
 * @async
 * @returns {Promise<void>}
 */
async function reloadAllAlarms() {
    await chrome.alarms.clearAll()
    let cursor = await db.transaction('projects').store.openCursor()
    const times = []
    while (cursor) {
        const project = cursor.value
        if (project.time != null && project.time > Date.now() && times.indexOf(project.time) === -1) {
            await createSafeAlarm(String(cursor.key), project.time, project)
            times.push(project.time)
        }
        // noinspection JSVoidFunctionReturnValueUsed
        cursor = await cursor.continue()
    }
}

let promises = []

/**
 * Проверяет возможность запуска голосования для проекта
 * Валидирует состояние интернета, открытые вкладки и запускает процесс голосования
 * @async
 * @param {Object} project - Объект проекта для голосования
 * @returns {Promise<void>}
 */
async function startProjectVote(project) {
    // Проверка интернет-соединения
    const connectionCheck = await checkInternetConnection(project, settings, db, onLine)
    if (connectionCheck.shouldReturn) return
    if (connectionCheck.newOnLineStatus !== null) {
        onLine = connectionCheck.newOnLineStatus
    }

    // Очистка истекших записей из очереди
    const removed = cleanupExpiredQueue(openedProjects)
    if (removed.length > 0) {
        db.put('other', openedProjects, 'openedProjects')
    }

    // Проверка и обработка конфликтов с уже открытыми проектами
    const shouldStop = await handleProjectConflicts(project, openedProjects, settings, db)
    if (shouldStop) return

    // Очистка временных полей и создание объекта opened
    cleanupProjectTempFields(project)
    const opened = createOpenedProject(project, settings)

    // Голосование запускается впервые
    if (!openedProjects.size) {
        updateListeners(true)
    }

    openedProjects.set('start_' + project.key, opened)
    db.put('other', openedProjects, 'openedProjects')

    if (settings.debug) console.log(getProjectPrefix(project, true), 'пред запуск')

    if (project.rating === 'monitoringminecraft.ru') {
        promises.push(clearMonitoringMinecraftCookies(project, settings.debug))
    }

    // noinspection JSIgnoredPromiseFromCall
    openVoteWindow(project, opened)
}

let promiseGroup
let promiseWindow

//Открывает вкладку для голосования или начинает выполнять fetch запросы
async function openVoteWindow(project, opened) {
    //Ожидаем очистку куки
    let result = await Promise.all(promises)
    while (result.length < promises.length) {
        result = await Promise.all(promises)
    }

    console.log(getProjectPrefix(project, true), chrome.i18n.getMessage('startedAutoVote'))
    sendNotification(
        getProjectPrefix(project, false),
        chrome.i18n.getMessage('startedAutoVote'),
        'start',
        'openProject_' + project.key,
    )

    // Инициализация статистики перед голосованием
    todayStats = initializeStatsBeforeVote(project, generalStats, todayStats)

    await db.put('other', generalStats, 'generalStats')
    await db.put('other', todayStats, 'todayStats')
    await updateValue('projects', project)

    // Создание nextAttempt alarm
    await createNextAttemptAlarmIfNeeded(project, opened, settings)

    // Определяем режим голосования (silent или tab)
    if (shouldUseSilentVote(project, allProjects)) {
        openedProjects.set('background_' + project.key, opened)
        openedProjects.delete('start_' + project.key)
        db.put('other', openedProjects, 'openedProjects')
        silentVote(project)
    } else {
        let result = await promiseWindow
        if (result === false) return
        promiseWindow = checkWindow(project)
        result = await promiseWindow
        if (result === false) return

        const url = allProjects[project.rating].voteURL(project)

        const tab = await tryOpenTab(
            {
                url,
                active: settings.disabledFocusedTab || Boolean(allProjects[project.rating].focusedTab?.(project)),
            },
            project,
            0,
        )
        if (tab == null) return
        openedProjects.set(tab.id, opened)
        openedProjects.delete('start_' + project.key)
        db.put('other', openedProjects, 'openedProjects')

        // Группировка вкладки
        if (!notSupportedGroupTabs) {
            const result = await handleTabGrouping(tab, groupId, promiseGroup, project, chrome.i18n.getMessage)
            groupId = result.groupId
            promiseGroup = result.promiseGroup
            notSupportedGroupTabs = result.notSupported
        }
    }
}

// Функции checkWindow и groupTabs перенесены в utils/tab-manager.js
// checkWindow → checkWindow
// groupTabs → groupTabIntoAutoVoteGroup

/**
 * Выполняет silent vote для проекта
 * Обертка над модульной функцией для совместимости
 */
async function silentVote(project) {
    await executeSilentVote(project, silentResponseBody)
}

/**
 * Проверяет ответ на ошибки
 * Обертка над модульной функцией для совместимости
 */
async function checkResponseError(project, response, url, bypassCodes, vk) {
    return await validateSilentVoteResponse(project, response, url, bypassCodes, vk, silentResponseBody)
}

const webNavigationOnCommittedListener = function (details) {
    if (!initializeFunc.done) {
        ;(async () => {
            await initializeFunc
            const opened = openedProjects.get(details.tabId)
            if (!opened) return
            const project = await db.get('projects', opened.key)
            const message = chrome.i18n.getMessage('notReadyInject')
            if (project.error === message) return
            console.warn(getProjectPrefix(project, true), message)
            sendNotification(getProjectPrefix(project, false), message, 'warn', 'openProject_' + project.key)
            project.error = message
            updateValue('projects', project)
        })()
        return
    }

    const opened = openedProjects.get(details.tabId)
    if (!opened) return
    if (details.url.startsWith('blob:')) return

    // Проверка URL авторизации
    if (details.frameId === 0 && isAuthUrl(details.url)) {
        return
    }

    // Определение скриптов для инъекции
    const {filesIsolated, filesMain} = determineScriptsToInject(
        details,
        getDomainWithoutSubdomain,
        isCaptchaUrlForCommitted,
        allProjects,
    )

    // Выполнение инъекции
    executeScriptInjection(
        details.tabId,
        details.frameId,
        filesIsolated,
        filesMain,
        catchTabError,
        opened,
        db,
        settings.debug,
        details.url,
    )
}

//Слушатель на обновление вкладок, если вкладка полностью загрузилась, загружает туда скрипт который сам нажимает кнопку проголосовать
const webNavigationOnCompletedListener = async function (details) {
    await initializeFunc
    const opened = openedProjects.get(details.tabId)
    if (!opened) return

    if (details.frameId === 0) {
        // Проверка URL авторизации
        if (isAuthUrl(details.url)) {
            return
        }

        const project = await db.get('projects', opened.key)

        // Проверка лимита попыток инъекции
        if (opened.countInject >= LIMITS.MAX_INJECT_ATTEMPTS) {
            endVote({tooManyVoteAttempts: true}, {tab: {id: details.tabId}, url: details.url}, opened)
            return
        }

        // Инъекция скриптов голосования
        try {
            await injectVoteScripts(details.tabId, project, settings, allProjects, settings.debug, details.url)

            if (openedProjects.has(details.tabId)) {
                opened.countInject++
                db.put('other', openedProjects, 'openedProjects')
            }
        } catch (error) {
            catchTabError(error, project, db)
        }
    } else if (details.frameId !== 0 && isCaptchaUrl(details.url)) {
        // Инъекция скриптов капчи
        const project = await db.get('projects', opened.key)

        try {
            await injectCaptchaScripts(details.tabId, details.frameId, project, settings, settings.debug, details.url)
        } catch (error) {
            catchTabError(error, project, db)
        }
    }
}

// Функция catchTabError перенесена в utils/error-handler.js

const tabsOnRemovedListener = async function (tabId) {
    await initializeFunc
    const opened = openedProjects.get(tabId)
    if (!opened) return
    endVote({closedTab: true}, {tab: {id: tabId}}, opened)
}

const webRequestOnCompletedListener = async function (details) {
    await initializeFunc
    const opened = openedProjects.get(details.tabId)
    if (!opened) return

    // Иногда некоторые проекты намеренно выдаёт ошибку в status code, нам ничего не остаётся кроме как игнорировать все ошибки, подробнее https://discord.com/channels/371699266747629568/760393040174120990/1053016256535593022
    if (allProjects[opened.rating].ignoreErrors?.()) return

    if (details.type === 'main_frame' && (details.statusCode < 200 || details.statusCode > 299)) {
        if (details.statusCode === 503 || details.statusCode === 403) {
            // Если проверка CloudFlare
            opened.countInject--
            db.put('other', openedProjects, 'openedProjects')
        } else {
            const sender = {tab: {id: details.tabId}, url: details.url}
            endVote({errorVote: [String(details.statusCode), details.url]}, sender, opened)
        }
    }
}

const webRequestOnErrorOccurredListener = async function (details) {
    await initializeFunc
    if (openedProjects.has(details.tabId)) {
        if (details.type === 'main_frame' || isCaptchaDomain(details.url)) {
            const opened = openedProjects.get(details.tabId)
            if (isIgnorableNetworkError(details.error)) {
                return
            }
            const sender = {tab: {id: details.tabId}, url: details.url}
            endVote({errorVoteNetwork: [details.error, details.url]}, sender, opened)
        }
    }
}

const webNavigationOnErrorOccurredListener = async function (details) {
    await initializeFunc
    if (openedProjects.has(details.tabId)) {
        if (details.frameId === 0 || isCaptchaDomain(details.url)) {
            const opened = openedProjects.get(details.tabId)
            if (isIgnorableNetworkError(details.error)) {
                return
            }
            const sender = {tab: {id: details.tabId}, url: details.url}
            endVote({errorVoteNetwork: [details.error, details.url]}, sender, opened)
        }
    }
}

/**
 * Управляет регистрацией/разрегистрацией слушателей событий
 * Оптимизирует работу фонового процесса - отключает слушатели когда голосование не активно
 * @param {boolean} enable - true для регистрации, false для разрегистрации слушателей
 */
function updateListeners(enable) {
    updateAllVoteListeners(
        enable,
        {
            webNavigationOnErrorOccurred: webNavigationOnErrorOccurredListener,
            webNavigationOnCommitted: webNavigationOnCommittedListener,
            webNavigationOnCompleted: webNavigationOnCompletedListener,
            tabsOnRemoved: tabsOnRemovedListener,
            webRequestOnCompleted: webRequestOnCompletedListener,
            webRequestOnErrorOccurred: webRequestOnErrorOccurredListener,
        },
        openedProjects,
        settings,
    )
}

// Так как Service Worker может уснуть прямо во время голосования, мы прям при запуске всё равно регистрируем слушателей
// после инициализации базы данных если обнаруживается что сейчас мы не голосуем и нет необходимости голосовать - мы разрегистрируем слушатели
updateListeners(true)

//Слушатель сообщений и ошибок
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    // noinspection JSIgnoredPromiseFromCall
    onRuntimeMessage(request, sender, sendResponse)
    if (request.projectDeleted || request.projectRestart) {
        return true
    }
})

const fakeIdToId = {}

async function onRuntimeMessage(request, sender, sendResponse) {
    if (request.reloadCaptcha) {
        await handleReloadCaptcha(sender, settings)
        return
    } else if (request.captchaPassed) {
        await handleCaptchaPassed(request, sender)
        if (request.captchaPassed !== 'double') return
    } else if (request.HackTimer) {
        handleHackTimer(request, sender, fakeIdToId)
        return
    }

    await initializeFunc

    const fromExtensionPage = isExtensionPageSender(sender, chrome.runtime.getURL(''))
    if (isExtensionPageCommand(request) && !fromExtensionPage) {
        console.warn('Команда со страницы сайта отклонена', JSON.stringify(request).slice(0, 200), sender.url)
        sendResponse('denied')
        return
    }

    if (request === 'checkVote') {
        processVoteQueue()
        return
    } else if (request === 'reloadAllSettings') {
        const result = await handleReloadAllSettings(db, openedProjects, tryCloseTab, reloadAllAlarms, processVoteQueue)
        settings = result.settings
        generalStats = result.generalStats
        todayStats = result.todayStats
        updateErrorBadge(db)
        return
    } else if (request === 'reloadSettings') {
        settings = await db.get('other', 'settings')
        return
    } else if (request.projectDeleted) {
        const result = await handleProjectDeleted(request, openedProjects, db)
        sendResponse(result)
        updateErrorBadge(db)
        return
    } else if (request.projectRestart) {
        const result = await handleProjectRestart(request, openedProjects, db, settings)
        sendResponse(result)
        return
    }

    if (request.changeProject) {
        if (fromExtensionPage || canTabChangeProject(sender, request.changeProject, openedProjects)) {
            updateValue('projects', request.changeProject)
        } else {
            console.warn('Вкладка пытается изменить чужой проект — отклонено', sender.url)
        }
        return
    }

    // Дальше — результаты голосования, они приходят только из вкладок
    if (!sender.tab || !openedProjects.has(sender.tab.id)) {
        console.warn(
            'A double attempt to complete the vote? chrome.runtime.onMessage',
            JSON.stringify(request),
            JSON.stringify(sender),
        )
        return
    }

    const opened = openedProjects.get(sender.tab.id)

    // Обработка ручных действий (капча, авторизация и т.д.)
    if (requiresManualAction(request)) {
        await handleManualActionRequired(request, sender, opened, settings, db)
    } else {
        endVote(request, sender, opened)
    }
}

// Функция triggerTimer перенесена в utils/message-handlers.js
// Функции tryOpenTab, tryCloseTab, tryGroupTabs перенесены в utils/tab-manager.js

//Завершает голосование, если есть ошибка то обрабатывает её
async function endVote(request, sender, project) {
    const timeout = settings.timeout

    // Найти и подготовить opened проект
    const opened = findAndPrepareOpenedProject(openedProjects, project, timeout, db)
    if (!opened) return

    // Получить актуальные данные проекта
    project = await db.get('projects', project.key)

    // Проверить неправильный домен
    checkIncorrectDomain(request, sender, project)

    // Закрыть вкладку при необходимости
    closeTabIfNeeded(request, sender, project, settings)

    // Повторно достаём project так как за время отправки отчёта или использования удалённого кода он мог измениться
    project = await db.get('projects', project.key)

    const result = applyVoteResult(project, request, {settings, allProjects, generalStats, todayStats, chrome})
    const logLine =
        getProjectPrefix(project, true) +
        ' ' +
        result.message +
        ', ' +
        chrome.i18n.getMessage('timeStamp') +
        ' ' +
        project.time
    if (result.level === 'error') console.error(logLine)
    else console.log(logLine)
    if (result.notify) {
        sendNotification(getProjectPrefix(project, false), result.message, result.level, 'openProject_' + project.key)
    }

    // Сохраняем статистику и проект
    await saveStatsAndProject(db, generalStats, todayStats, project)

    // Планируем alarm для следующего голосования
    await scheduleProjectAlarm(project)

    // Планируем cleanup очереди и следующую проверку голосования
    scheduleQueueCleanup(project, openedProjects, timeout, db, processVoteQueue)
}

chrome.notifications.onClicked.addListener(async function (notificationId) {
    await handleNotificationClick(notificationId, db, openOptionsPage)
})

async function openOptionsPage() {
    await chrome.runtime.openOptionsPage()
    // Дикий костыль на ожидание загрузки вкладки, мы не можем адекватно передать в настройки нужные данные, поэтому придётся так костылять
    const tab = await chrome.tabs.query({active: true, lastFocusedWindow: true})
    if (!tab.length) return
    if (tab[0].status !== 'complete') {
        for (let i = 0; i < LIMITS.MAX_TAB_LOAD_WAIT_CYCLES; i++) {
            await wait(TIME.TAB_LOAD_CHECK_DELAY)
            const t = await chrome.tabs.get(tab[0].id)
            if (t.status === 'complete') break
        }
    }
}

/**
 * Обновляет значение в хранилище базы данных
 * @async
 * @param {string} objStore - Имя хранилища ('projects', 'other')
 * @param {Object} value - Объект для обновления (должен содержать поле key)
 * @returns {Promise<void>}
 */
async function updateValue(objStore, value) {
    await updateStoreValue(db, objStore, value)
    // Значок с числом ошибок на иконке расширения
    if (objStore === 'projects') updateErrorBadge(db)
}

chrome.runtime.onInstalled.addListener(async function (details) {
    await initializeFunc
    // Проверка браузера Opera
    if (shouldSkipForOpera(settings)) {
        chrome.runtime.openOptionsPage()
        return
    }
    if (details.reason === 'install') {
        await openOptionsPage()
        chrome.runtime.sendMessage({installed: true})
    } else if (details.reason === 'update') {
        processVoteQueue()
    }
})

/*
VoteFlow — новое расширение, вдохновлённое Auto Vote Rating и созданное на основе его кода.
Репозиторий: https://github.com/BazZziliuS/VoteFlow
Оригинальный проект (Serega007): https://github.com/Serega007RU/Auto-Vote-Rating/
*/
