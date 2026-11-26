/**
 * Утилиты для инициализации базы данных
 */

/**
 * Обрабатывает необработанные ошибки и rejection'ы
 * @param {Event} event - Событие ошибки
 * @param {Object} dbLogs - База данных логов
 */
function handleUnhandledError(event, dbLogs) {
    let error
    if (event.reason) {
        error = event.reason
    } else if (event.error) {
        error = event.error
    } else {
        error = 'Unidentified error, see the details in the console '
        if (console._error) console._error(event)
        else console.error(event)
        error += JSON.stringify(event)
    }

    if (self.createNotif) {
        // noinspection JSIgnoredPromiseFromCall
        createNotif(error, 'error', {dontLog: true})
        document.querySelectorAll('button[disabled]').forEach(el => (el.disabled = false))
    }

    if (!dbLogs) return

    const time = new Date().toLocaleString().replace(',', '')
    if (error.stack) error = error.stack
    const log = '[' + time + ' ERROR]: ' + error
    appendLog(dbLogs, log)
}

// Журнал хранит только последние записи: в него попадает каждый console.log фона,
// и без ограничения он растёт месяцами, а «Скачать логи» загружает его целиком
const MAX_LOG_ENTRIES = 5000
// Подрезаем не на каждой записи, а раз в несколько сотен — count() по всей таблице не бесплатный
const LOG_TRIM_INTERVAL = 200
let logWritesSinceTrim = 0

/**
 * Добавляет строку в журнал логов и время от времени удаляет самые старые записи
 * @param {Object} logsDb - База данных логов (idb)
 * @param {string} line - Строка журнала
 */
function appendLog(logsDb, line) {
    const reportLogError = error => (console._error || console.error).call(console, error)
    try {
        logsDb.add('logs', line).catch(reportLogError)
    } catch (error) {
        reportLogError(error)
        return
    }
    if (++logWritesSinceTrim >= LOG_TRIM_INTERVAL) {
        logWritesSinceTrim = 0
        trimLogs(logsDb).catch(reportLogError)
    }
}

/**
 * Удаляет самые старые записи журнала сверх лимита
 * @async
 * @param {Object} logsDb - База данных логов (idb)
 * @param {number} [maxEntries] - Сколько последних записей оставить
 * @returns {Promise<number>} сколько записей удалено
 */
async function trimLogs(logsDb, maxEntries = MAX_LOG_ENTRIES) {
    const excess = (await logsDb.count('logs')) - maxEntries
    if (excess <= 0) return 0
    // Ключи автоинкрементные: старые записи — с наименьшими ключами
    const oldestKeys = await logsDb.getAllKeys('logs', null, excess)
    await logsDb.delete('logs', IDBKeyRange.upperBound(oldestKeys[oldestKeys.length - 1]))
    return excess
}

/**
 * Обрабатывает ошибки базы данных
 * @param {Event} event - Событие ошибки БД
 * @param {boolean} logs - Является ли это БД логов
 * @param {boolean} background - Выполняется ли в background
 */
function handleDatabaseError(event, logs, background) {
    if (background) {
        sendNotification(
            chrome.i18n.getMessage('errordbTitle', event.target.source.name),
            event.target.error.message,
            'error',
            'openSettings',
        )
        if (logs) {
            console._error(chrome.i18n.getMessage('errordb', [event.target.source.name, event.target.error.message]))
        } else {
            console.error(chrome.i18n.getMessage('errordb', [event.target.source.name, event.target.error.message]))
        }
    } else {
        createNotif(chrome.i18n.getMessage('errordb', [event.target.source.name, event.target.error.message]), 'error')
    }
}

/**
 * Открывает базу данных логов
 * @async
 * @returns {Promise<Object>} База данных логов
 */
async function openLogsDatabase() {
    return await idb.openDB('logs', 1, {
        upgrade(db) {
            db.createObjectStore('logs', {autoIncrement: true})
        },
    })
}

/**
 * Загружает данные из базы данных
 * @async
 * @param {Object} db - База данных
 * @returns {Promise<Object>} Объект с настройками и статистикой
 */
async function loadDatabaseData(db) {
    return {
        settings: await db.get('other', 'settings'),
        generalStats: await db.get('other', 'generalStats'),
        todayStats: await db.get('other', 'todayStats'),
        openedProjects: await db.get('other', 'openedProjects'),
        onLine: await db.get('other', 'onLine'),
    }
}

/**
 * Инициализирует состояние для background скрипта
 * @async
 * @param {Object} state - Состояние service worker
 * @param {Object} openedProjects - Map открытых проектов
 * @param {Object} db - База данных
 * @param {Function} tryCloseTab - Функция закрытия вкладки
 * @param {Function} processVoteQueue - Функция проверки голосования
 * @param {Function} updateListeners - Функция обновления listeners
 * @returns {Promise<void>}
 */
async function initializeBackgroundState(state, openedProjects, db, tryCloseTab, processVoteQueue, updateListeners) {
    if (state !== 'activated') {
        console.log(chrome.i18n.getMessage('start', chrome.runtime.getManifest().version))

        if (openedProjects.size > 0) {
            for (const [key, value] of openedProjects) {
                openedProjects.delete(key)
                // noinspection ES6MissingAwait
                tryCloseTab(key, value, 0)
            }
            await db.put('other', openedProjects, 'openedProjects')
        }

        // noinspection ES6MissingAwait
        processVoteQueue()
    } else {
        if (!openedProjects.size) {
            updateListeners(false)
        }
    }
}
