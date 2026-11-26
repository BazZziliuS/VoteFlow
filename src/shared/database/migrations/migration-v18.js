/**
 * Миграция БД версии 18 → 19: удаление проектов на закрытых сайтах
 * (домены выставлены на продажу — отдают страницу парковки; проверено 2026-11-26)
 */

const REMOVED_SITES_V18 = ['mc-lists.org', 'minecraftservers100.com']

/**
 * Удаляет проекты закрытых сайтов и их будильники
 * @async
 * @param {IDBTransaction} transaction - Транзакция БД
 * @returns {Promise<number>} сколько проектов удалено
 */
async function migrateV18(transaction) {
    let removed = 0
    const index = transaction.objectStore('projects').index('rating')
    for (const rating of REMOVED_SITES_V18) {
        let cursor = await index.openCursor(rating)
        while (cursor) {
            // Будильник голосования назван ключом проекта
            if (self.chrome?.alarms) chrome.alarms.clear(String(cursor.primaryKey))
            await cursor.delete()
            removed++
            cursor = await cursor.continue()
        }
    }
    if (removed) console.log('Удалены проекты закрытых сайтов:', removed)
    return removed
}
