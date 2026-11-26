// topmcservers.com: форма голосования на /servers/<номер>/vote — ник (#username), галочка «Leave a review»
// (не трогаем) и кнопка «vote for this server». Капчи нет. Результат сайт показывает сообщением на странице
const TOPMC_LOG = '[topmcservers]'
const TOPMC_RESULTS = {
    success: ['vote added', 'thank', 'successfully voted', 'vote has been', 'vote counted'],
    later: ['already voted', 'can vote again', 'vote again', 'once every', 'next vote'],
}
let topmcSubmitted = false

function topmcVoteForm() {
    return document.querySelector('input#username')?.closest('form')
}

// Сообщения о результате ищем по всей странице, кроме самой формы и списка голосовавших
function topmcResultText() {
    const form = topmcVoteForm()
    const candidates = document.querySelectorAll(
        '[role="alert"], [role="status"], .toastify, [class*="toast"], [class*="alert"], [class*="flash"], [class*="notice"]',
    )
    for (const element of candidates) {
        if (form?.contains(element)) continue
        const text = element.innerText?.trim()
        if (text) return text
    }
    return ''
}

function topmcHandleResult(text) {
    const lower = text.toLowerCase()
    console.log(TOPMC_LOG, 'Результат:', text)
    if (TOPMC_RESULTS.later.some(phrase => lower.includes(phrase))) {
        chrome.runtime.sendMessage({later: parseCooldown(text) || true})
    } else if (TOPMC_RESULTS.success.some(phrase => lower.includes(phrase))) {
        chrome.runtime.sendMessage({successfully: true})
    } else {
        chrome.runtime.sendMessage({message: text})
    }
}

async function vote(first) {
    // Уже голосовали — сайт может сразу показать это на странице
    const shown = topmcResultText()
    if (shown) {
        topmcHandleResult(shown)
        return
    }
    if (!first || topmcSubmitted) return

    const form = topmcVoteForm()
    const button = form?.querySelector('button[type="submit"]')
    if (!form || !button) {
        chrome.runtime.sendMessage({errorVoteNoElement: 'Не найдена форма голосования (input#username)'})
        return
    }

    const project = await getProject()
    const username = form.querySelector('input#username')
    username.value = project.nick
    // Форма на Inertia/Vue: значение подхватывается по событию input
    username.dispatchEvent(new Event('input', {bubbles: true}))

    topmcSubmitted = true
    console.log(TOPMC_LOG, 'Отправляем голос')
    button.click()
    topmcWatchResult()
}

function topmcWatchResult() {
    const started = Date.now()
    const timer = setInterval(() => {
        try {
            const text = topmcResultText()
            if (text) {
                clearInterval(timer)
                topmcHandleResult(text)
            } else if (Date.now() - started > 30000) {
                clearInterval(timer)
                chrome.runtime.sendMessage({errorVoteNoElement: 'Сайт не показал результат голосования за 30 секунд'})
            }
        } catch (error) {
            clearInterval(timer)
            throwError(error)
        }
    }, 1000)
}
