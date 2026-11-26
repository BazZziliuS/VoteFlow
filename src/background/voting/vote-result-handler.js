/**
 * Утилиты для обработки результатов голосования
 */

/**
 * Определяет тип результата голосования
 * @param {Object} request - Объект с результатом голосования
 * @returns {'success'|'later'|'error'} Тип результата
 */
function getVoteResultType(request) {
    if (request.successfully) return 'success'
    if (request.later != null) return 'later'
    return 'error'
}

/**
 * Вычисляет cooldown для retry при ошибке
 * @param {Object} request - Объект с результатом голосования
 * @param {Object} project - Объект проекта
 * @param {Object} settings - Настройки расширения
 * @returns {number} Время cooldown в миллисекундах
 */
function calculateErrorCooldown(request, project, settings) {
    if (request.retryCoolDown) {
        return request.retryCoolDown
    }

    if ((request.errorVote && request.errorVote[0] === '404') ||
        (request.message && project.rating === 'wargm.ru' && project.randomize)) {
        return TIME.ERROR_404_COOLDOWN
    }

    if (request.closedTab) {
        return 60000 // 1 минута
    }

    // Индивидуальный cooldown после ошибки из конфигурации проекта (projects.js)
    const projectErrorCoolDown = typeof allProjects !== 'undefined' ? allProjects[project.rating]?.errorCoolDown?.(project) : null
    if (projectErrorCoolDown) {
        return projectErrorCoolDown
    }

    return settings.timeoutError
}

/**
 * Применяет рандомизацию к времени cooldown
 * @param {number} baseCooldown - Базовое время cooldown
 * @param {Object} project - Объект проекта
 * @returns {number} Cooldown с рандомизацией
 */
function applyRandomization(baseCooldown, project) {
    if (project.randomize) {
        return baseCooldown + Math.floor(Math.random() * TIME.MAX_ERROR_RANDOMIZATION)
    }
    return baseCooldown
}

/**
 * Применяет рандомизацию к времени следующего голосования
 * @param {number} baseTime - Базовое время
 * @param {Object} project - Объект проекта
 * @returns {number} Время с рандомизацией
 */
function applyVoteTimeRandomization(baseTime, project) {
    if (project.randomize) {
        if (project.randomize.min == null) {
            project.randomize = {}
            project.randomize.min = 0
            project.randomize.max = 43200000
        }
        return baseTime + Math.floor(Math.random() * (project.randomize.max - project.randomize.min) + project.randomize.min)
    }

    // Рандомизация по умолчанию для TopCraft/McTOP
    if ((project.rating === 'topcraft.ru' || project.rating === 'topcraft.club' ||
         project.rating === 'mctop.su' ||
         (project.rating === 'minecraftrating.ru' && project.listing === 'projects')) &&
        !project.priority && project.timeoutHour == null) {
        return baseTime + Math.floor(Math.random() * (TIME.MAX_RANDOMIZATION_DEFAULT - TIME.MIN_RANDOMIZATION_DEFAULT) + TIME.MIN_RANDOMIZATION_DEFAULT)
    }

    return baseTime
}

/**
 * Форматирует сообщение об ошибке
 * @param {Object} request - Объект с результатом голосования
 * @param {Object} chrome - Chrome API
 * @returns {string} Форматированное сообщение
 */
function formatErrorMessage(request, chrome) {
    if (request.message) {
        return chrome.i18n.getMessage('siteError', request.message)
    }

    const name = Object.keys(request)[0]
    let message

    if (Object.values(request)[0] === true) {
        message = chrome.i18n.getMessage(name)
    } else {
        message = chrome.i18n.getMessage(name, Object.values(request)[0])
    }

    if (request.usedTranslator && name !== 'usedTranslator') {
        message += ' ' + chrome.i18n.getMessage('usedTranslator')
    }

    if (message.length === 0) {
        message = chrome.i18n.getMessage('emptyError')
    }

    if (request.incorrectDomain) {
        message += ' Incorrect domain ' + request.incorrectDomain
    }

    return message
}

/**
 * Форматирует сообщение об успешном голосовании
 * @param {Object} request - Объект с результатом голосования
 * @param {Object} chrome - Chrome API
 * @returns {string} Форматированное сообщение
 */
function formatSuccessMessage(request, chrome) {
    if (typeof request.successfully === 'string') {
        return chrome.i18n.getMessage('successAutoVoteWarn', request.successfully)
    }
    return chrome.i18n.getMessage('successAutoVote')
}

/**
 * Форматирует сообщение о том, что голос уже был подан
 * @param {Object} request - Объект с результатом голосования
 * @param {Object} chrome - Chrome API
 * @returns {string} Форматированное сообщение
 */
function formatLaterMessage(request, chrome) {
    if (typeof request.later === 'string') {
        return chrome.i18n.getMessage('alreadyVotedWarn', request.later)
    }
    return chrome.i18n.getMessage('alreadyVoted')
}

/**
 * Проверяет нужно ли отправлять уведомление об ошибке
 * @param {Object} request - Объект с результатом голосования
 * @returns {boolean} true если нужно отправить уведомление
 */
function shouldNotifyError(request) {
    // Не отправляем уведомление для серверных ошибок 5xx
    if (request.errorVote && request.errorVote[0].charAt(0) === '5') {
        return false
    }
    return true
}

/**
 * Применяет результат голосования к проекту и статистике: время следующей попытки, ошибка или
 * предупреждение, счётчики. Без побочных действий — уведомление, лог и сохранение делает endVote
 * @param {Object} project - Проект (изменяется)
 * @param {Object} request - Сообщение скрипта сайта: successfully, later, message, stopVoting…
 * @param {Object} context
 * @param {Object} context.settings - Настройки расширения
 * @param {Object} context.allProjects - Конфигурация сайтов
 * @param {Object} context.generalStats - Общая статистика (изменяется)
 * @param {Object} context.todayStats - Статистика за сегодня (изменяется)
 * @param {Object} context.chrome - Для chrome.i18n
 * @returns {{outcome: 'success'|'later'|'error'|'stopped', message: string, level: 'info'|'warn'|'error', notify: boolean}}
 */
function applyVoteResult(project, request, {settings, allProjects, generalStats, todayStats, chrome}) {
    if (request.successfully || request.later != null) {
        project.time = applyTimeRandomization(project, calculateNextVoteTime(project, request, allProjects))
        delete project.error
        delete project.warn

        const isSuccess = Boolean(request.successfully)
        // Строка вместо true — предупреждение сайта, которое стоит показать рядом с проектом
        const siteWarning = isSuccess ? request.successfully : request.later
        if (typeof siteWarning === 'string') project.warn = siteWarning

        if (isSuccess) {
            updateSuccessStats(project, generalStats, todayStats)
            return {outcome: 'success', message: formatSuccessMessage(request, chrome), level: 'info', notify: true}
        }
        updateLaterStats(project, generalStats, todayStats)
        return {outcome: 'later', message: formatLaterMessage(request, chrome), level: project.warn ? 'warn' : 'info', notify: true}
    }

    const error = formatErrorMessage(request, chrome)
    project.error = error
    updateErrorStats(project, generalStats, todayStats)

    if (request.stopVoting) {
        // Сайт запрещает автоматизацию: повторные попытки только приблизят блокировку аккаунта.
        // Проект ждёт, пока пользователь не перезапустит его сам
        project.time = Infinity
        return {outcome: 'stopped', message: error + '. ' + chrome.i18n.getMessage('votingStopped'), level: 'error', notify: true}
    }

    const retryDelay = applyRandomization(calculateErrorCooldown(request, project, settings), project)
    project.time = Date.now() + retryDelay
    const retryMinutes = (Math.round(retryDelay / 1000 / 60 * 100) / 100).toString()
    return {
        outcome: 'error',
        message: error + '. ' + chrome.i18n.getMessage('errorNextVote', retryMinutes),
        level: 'error',
        notify: shouldNotifyError(request),
    }
}
