// Общее состояние фона и страниц расширения. Обычные скрипты (не модули) делят одну глобальную
// область видимости, поэтому let/const верхнего уровня видны и в остальных файлах контекста.
// Зависимости (idb, projects.js, database/*) подключает тот, кто загружает этот файл

//Настройки
let settings
//Общая статистика
let generalStats
//Статистика за сегодня
let todayStats
//Основная база данных
let db
//База данных логов
let dbLogs
//Текущие открытые вкладки расширением
let openedProjects = new Map()
let onLine

// Версия схемы IndexedDB 'avr'. Поднимается вместе с новой миграцией в database/migrations/
const DB_VERSION = 20

self.addEventListener('error', event => handleUnhandledError(event, dbLogs))
self.addEventListener('unhandledrejection', event => handleUnhandledError(event, dbLogs))

//Инициализация настроек расширения
async function initializeConfig(background) {
    // Открываем базу данных логов
    if (!dbLogs) {
        dbLogs = await openLogsDatabase()
        // Журналы, накопленные до появления ротации, подрезаются при запуске
        trimLogs(dbLogs).catch(error => console.warn('Не удалось подрезать журнал логов', error))
    }

    // Открываем основную базу данных
    try {
        db = await idb.openDB('avr', DB_VERSION, {
            upgrade: (db, oldVersion, newVersion, transaction) => {
                return runDatabaseUpgrade(
                    db,
                    oldVersion,
                    newVersion,
                    transaction,
                    allProjects,
                    getDomainWithoutSubdomain,
                )
            },
        })
    } catch (error) {
        // База новее кода: расширение откатили на старую версию поверх новой
        const reported = error.name === 'VersionError' ? new Error(chrome.i18n.getMessage('dbNewerVersion')) : error
        handleDatabaseError({target: {source: {name: 'avr'}, error: reported}}, false, background)
        return
    }

    // Устанавливаем обработчики ошибок
    db.onerror = event => handleDatabaseError(event, false, background)
    dbLogs.onerror = event => handleDatabaseError(event, true, background)

    // Загружаем данные из БД
    const data = await loadDatabaseData(db)
    settings = data.settings
    generalStats = data.generalStats
    todayStats = data.todayStats
    openedProjects = data.openedProjects
    onLine = data.onLine

    if (!background) return

    // Инициализация состояния для background скрипта
    await initializeBackgroundState(state, openedProjects, db, tryCloseTab, processVoteQueue, updateListeners)
}
