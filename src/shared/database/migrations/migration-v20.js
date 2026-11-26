/**
 * Миграция БД версии 20 → 21: удаление проектов на serveur-minecraft.fr
 * (проверено 2026-11-26: сайт перезапущен с нуля — серверов нет, старые ссылки на серверы не работают)
 */

const REMOVED_SITES_V20 = ['serveur-minecraft.fr']

/**
 * Удаляет проекты закрытых сайтов и их будильники
 * @async
 * @param {IDBTransaction} transaction - Транзакция БД
 * @returns {Promise<number>} сколько проектов удалено
 */
async function migrateV20(transaction) {
    let removed = 0
    const index = transaction.objectStore('projects').index('rating')
    for (const rating of REMOVED_SITES_V20) {
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
