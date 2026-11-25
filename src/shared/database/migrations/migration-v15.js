/**
 * Миграция БД версии 15 → 16: удаление проектов на закрытых сайтах
 * (домен не существует, редирект на другой сайт или сервер сайта не отвечает, проверено 2026-11-25)
 */

const REMOVED_SITES_V15 = [
    'discord.boats', 'genshindrop.com', 'mc-serverlist.cz', 'minecraft-index.com', 'minecraft-server.sk',
    'minecraft-servers.biz', 'trackingservers.cloud', 'craft-list.net', 'mc-server-list.com',
    'minecraft-server.net', 'serverlocator.com', 'servers-minecraft.net', 'mc-monitoring.info',
    'topminecraft.io', 'ionmc.top'
]

/**
 * Удаляет проекты закрытых сайтов и их будильники
 * @async
 * @param {IDBTransaction} transaction - Транзакция БД
 * @returns {Promise<number>} сколько проектов удалено
 */
async function migrateV15(transaction) {
    let removed = 0
    const index = transaction.objectStore('projects').index('rating')
    for (const rating of REMOVED_SITES_V15) {
        let cursor = await index.openCursor(rating)
        while (cursor) {
            // Будильник голосования назван ключом проекта
            if (self.chrome?.alarms) chrome.alarms.clear(String(cursor.primaryKey))
            await cursor.delete()
            removed++
            cursor = await cursor.continue()
        }
    }
    if (removed) console.log('Удалено проектов на закрытых сайтах:', removed)
    return removed
}
