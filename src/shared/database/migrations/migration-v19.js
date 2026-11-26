/**
 * Миграция БД версии 19 → 20: удаление проектов на закрытых сайтах
 * (проверено 2026-11-26: семейство serverpact — домены выставлены на продажу,
 * minecraftsurvivalservers.com — домен припаркован, infinitybots.gg — заглушка вместо каталога)
 */

const REMOVED_SITES_V19 = [
    'serverpact.com',
    'serverpact.nl',
    'minecraftserverlijst.nl',
    'minecraftserverlist.eu',
    'minecraftsurvivalservers.com',
    'infinitybots.gg',
]

/**
 * Удаляет проекты закрытых сайтов и их будильники
 * @async
 * @param {IDBTransaction} transaction - Транзакция БД
 * @returns {Promise<number>} сколько проектов удалено
 */
async function migrateV19(transaction) {
    let removed = 0
    const index = transaction.objectStore('projects').index('rating')
    for (const rating of REMOVED_SITES_V19) {
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
