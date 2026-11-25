/**
 * Миграция БД версии 16 → 17: снятие блокировки TopCraft
 * Миграция v14 навсегда отключила проекты topcraft.club / topcraft.ru (time = Infinity и ошибка disabledSite).
 * Голосование на TopCraft переписано под новый сайт, поэтому проекты снова планируются как обычно.
 */

const TOPCRAFT_RATINGS_V16 = ['topcraft.club', 'topcraft.ru']

/**
 * Возвращает проекты TopCraft в очередь голосования
 * @async
 * @param {IDBTransaction} transaction - Транзакция БД
 * @returns {Promise<number>} сколько проектов включено
 */
async function migrateV16(transaction) {
    let enabled = 0
    const index = transaction.objectStore('projects').index('rating')
    for (const rating of TOPCRAFT_RATINGS_V16) {
        let cursor = await index.openCursor(rating)
        while (cursor) {
            const project = cursor.value
            // Признак блокировки из v14 — время следующего голоса «никогда»
            if (project.time === Infinity) {
                project.time = null
                delete project.error
                await cursor.update(project)
                enabled++
            }
            cursor = await cursor.continue()
        }
    }
    if (enabled) console.log('Снова включены проекты TopCraft:', enabled)
    return enabled
}
