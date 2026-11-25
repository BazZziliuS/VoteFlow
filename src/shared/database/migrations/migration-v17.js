/**
 * Миграция БД версии 17 → 18: снятие блокировки McTOP
 * Миграция v14 навсегда отключила проекты mctop.su (time = Infinity). Голосование McTOP обновлено
 * (SmartCaptcha на новых доменах Яндекса, отправка после прохождения капчи), поэтому проекты снова планируются.
 */

const MCTOP_RATINGS_V17 = ['mctop.su']

/**
 * Возвращает проекты McTOP в очередь голосования
 * @async
 * @param {IDBTransaction} transaction - Транзакция БД
 * @returns {Promise<number>} сколько проектов включено
 */
async function migrateV17(transaction) {
    let enabled = 0
    const index = transaction.objectStore('projects').index('rating')
    for (const rating of MCTOP_RATINGS_V17) {
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
    if (enabled) console.log('Снова включены проекты McTOP:', enabled)
    return enabled
}
