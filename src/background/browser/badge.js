/**
 * Значок на иконке расширения: число проектов с ошибкой
 * Работает и в service worker, и на страницах расширения (chrome.action доступен везде)
 */

/**
 * Пересчитывает проекты с ошибкой и обновляет значок
 * @async
 * @param {Object} database - открытая БД (idb)
 * @returns {Promise<number>} количество проектов с ошибкой
 */
async function updateErrorBadge(database) {
    if (!database || !self.chrome?.action) return 0
    let errors = 0
    let cursor = await database.transaction('projects').store.openCursor()
    while (cursor) {
        if (cursor.value.error) errors++
        cursor = await cursor.continue()
    }
    await chrome.action.setBadgeBackgroundColor({color: '#e5484d'})
    if (chrome.action.setBadgeTextColor) await chrome.action.setBadgeTextColor({color: '#ffffff'})
    await chrome.action.setBadgeText({text: errors > 0 ? String(errors) : ''})
    await chrome.action.setTitle({
        title: errors > 0 ? chrome.i18n.getMessage('badgeErrors', String(errors)) : chrome.i18n.getMessage('appName'),
    })
    return errors
}
