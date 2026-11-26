// TopCraft (topcraft.club / topcraft.ru)
// С редизайна сайта (2026) голосование — модальное окно #vote на странице сервера.
// Для вошедшего пользователя сайт сам открывает его по адресу /servers/<id>/#vote.
// Без входа вместо него кнопка «Войти и голосовать», открывающая окно входа (#loginModal).

const TOPCRAFT_LOG = '[TopCraft]'

const TOPCRAFT_RESULTS = {
    later: ['уже голосовали', 'уже проголосовали', 'сможете проголосовать', 'вы сегодня голосовали',
        'вы сегодня проголосовали', 'голос уже был учтен', 'голос уже был учтён', 'следующий голос'],
    success: ['за ваш голос', 'спасибо за голос', 'голос принят', 'голос засчитан', 'голос учтён',
        'голос учтен', 'вы проголосовали', 'успех', 'успешн'],
    // Ошибки, о которых не нужно сообщать разработчику: их исправляет сам пользователь
    userErrors: ['некорректный ник', 'базе данных спамеров', 'базу данных спамеров', 'ошибка авторизации',
        'капча временно не работает', 'аккаунт заблокирован'],
    // Не результат, а подсказка формы — ждём дальше
    pending: ['поставьте галочку', 'обязательное поле', 'пройдите проверку', 'подтвердите, что вы не робот'],
}

function topcraftIncludes(text, words) {
    return words.some(word => text.includes(word))
}

// Окно голосования и признак «не вошли в аккаунт»
function topcraftVoteModal() {
    return document.querySelector('#vote.modal')
}

function topcraftNeedsLogin() {
    const voteLink = document.querySelector('#vote:not(.modal), [data-bs-target="#vote"]')
    return Boolean(
        document.querySelector('a#vote[data-bs-target="#loginModal"]')
        || (!topcraftVoteModal() && voteLink?.getAttribute('data-bs-target') === '#loginModal')
    )
}

function topcraftHasCaptcha(container) {
    return Boolean(container.querySelector(
        'iframe[src*="captcha"], iframe[src*="recaptcha"], iframe[src*="smartcaptcha"], .g-recaptcha, .h-captcha, .smart-captcha, [data-sitekey], input[name="smart-token"]'
    ))
}

// Yandex SmartCaptcha в окне голосования может дорисоваться после открытия окна — ждём её до 5 секунд
async function topcraftWaitCaptcha(container) {
    for (let i = 0; i < 10; i++) {
        if (topcraftHasCaptcha(container)) return true
        await wait(500)
    }
    return false
}

// Токен SmartCaptcha появляется в скрытом поле, когда капча пройдена — автоматически, вручную или невидимо.
// По нему отправляем голос, даже если captchaclicker не прислал captchaPassed
function topcraftWatchCaptchaToken(modal) {
    const timer = setInterval(() => {
        if (topcraftSubmitted) {
            clearInterval(timer)
            return
        }
        const token = modal.querySelector('input[name="smart-token"]')?.value
        if (token) {
            clearInterval(timer)
            console.log(TOPCRAFT_LOG, 'SmartCaptcha пройдена — отправляем голос')
            topcraftSubmit(modal)
        }
    }, 1000)
}

let topcraftSubmitted = false

async function vote(first) {
    // Страница ошибки после проверки Cloudflare
    const summary = document.getElementById('summary')
    if (summary) {
        if (summary.textContent.includes('Ошибка проверки CSRF')) {
            document.location.replace(document.URL)
            return
        } else if (document.querySelector('#summary > h1') && document.querySelector('#summary > p')) {
            chrome.runtime.sendMessage({message: summary.textContent.trim()})
            return
        }
    }

    // Отдельная страница ошибки сайта
    const errorTitle = document.querySelector('#container > h1')
    if (errorTitle) {
        let message = errorTitle.textContent.trim()
        if (errorTitle.nextElementSibling) message += ' ' + errorTitle.nextElementSibling.textContent.trim()
        chrome.runtime.sendMessage({message, ignoreReport: message.toLowerCase().includes('ошибка авторизации')})
        return
    }

    if (topcraftNeedsLogin()) {
        // Автовход через VK ID, как было в оригинале: форма входа уводит на VK, где api.js сам подтверждает доступ
        // (если пользователь вошёл в VK в этом браузере), и TopCraft возвращает на страницу сервера с открытым окном голосования.
        // Одна попытка на вкладку за 10 минут, чтобы не зациклиться, если вход не удался
        const tried = Number(sessionStorage.getItem('voteflowTopcraftLogin') || 0)
        const loginForm = document.querySelector('#loginModal form[action*="/accounts/vk/login/"]')
        const vkButton = loginForm?.querySelector('button[type="submit"]:not([formaction])')
        if (loginForm && vkButton && Date.now() - tried > 10 * 60 * 1000) {
            sessionStorage.setItem('voteflowTopcraftLogin', String(Date.now()))
            const next = loginForm.querySelector('input[name="next"]')
            if (next) next.value = location.pathname + location.search + '#vote'
            console.log(TOPCRAFT_LOG, 'Не выполнен вход — входим через VK ID')
            loginForm.requestSubmit(vkButton)
            return
        }
        console.log(TOPCRAFT_LOG, 'Не выполнен вход, автовход через VK не удался')
        // Повтор раз в час, а не каждые 15 минут: без входа результат не изменится
        chrome.runtime.sendMessage({message: chrome.i18n.getMessage('topcraftLogin'), ignoreReport: true, retryCoolDown: 60 * 60 * 1000})
        return
    }

    const modal = topcraftVoteModal()
    if (!modal) {
        chrome.runtime.sendMessage({errorVoteNoElement: 'Не найдено окно голосования #vote'})
        return
    }

    // Окно открывается по #vote само, но на всякий случай открываем его кнопкой
    if (!modal.classList.contains('show')) {
        const opener = document.querySelector('[data-bs-target="#vote"]')
        if (opener) opener.click()
        else location.hash = '#vote'
        await wait(800)
    }

    const form = modal.querySelector('form')
    if (!form) {
        chrome.runtime.sendMessage({errorVoteNoElement: 'Не найдена форма в окне голосования'})
        return
    }

    const project = await getProject()
    const nickInput = form.querySelector('input[name="nick"], input[name="nickname"], input[name*="nick" i], input[type="text"]:not([type="hidden"])')
    if (nickInput && project.nick && nickInput.value !== project.nick) {
        nickInput.value = project.nick
        nickInput.dispatchEvent(new Event('input', {bubbles: true}))
        nickInput.dispatchEvent(new Event('change', {bubbles: true}))
    }

    // С капчей (Yandex SmartCaptcha) ждём её прохождения: captchaclicker пришлёт captchaPassed и api.js вызовет vote(false),
    // а наблюдатель за токеном отправит голос, если капчу прошли иначе
    if (first && (topcraftHasCaptcha(modal) || await topcraftWaitCaptcha(modal))) {
        console.log(TOPCRAFT_LOG, 'Ждём прохождения капчи')
        topcraftWatchCaptchaToken(modal)
        setTimeout(() => {
            if (!topcraftSubmitted) chrome.runtime.sendMessage({captcha: true})
        }, 30000)
        return
    }

    topcraftSubmit(modal)
}

// Результат голосования: тост сайта, подсказка у кнопки или сообщение внутри окна
let topcraftResultSent = false

function readTopcraftResult(modal) {
    const sources = [
        document.querySelector('[data-page-toast].show .toast-body'),
        document.querySelector('div.tooltip-inner'),
        modal?.querySelector('.alert:not(.d-none), .invalid-feedback:not(:empty), .form-text.text-danger, [role="alert"]'),
    ]
    for (const element of sources) {
        const text = element?.textContent.trim()
        if (text) return text
    }
    return ''
}

function handleTopcraftResult(text) {
    const lower = text.toLowerCase()
    if (topcraftIncludes(lower, TOPCRAFT_RESULTS.pending)) return false
    console.log(TOPCRAFT_LOG, 'Результат:', text)
    if (isAutomationWarning(text)) {
        chrome.runtime.sendMessage({message: text, stopVoting: true, ignoreReport: true})
    } else if (topcraftIncludes(lower, TOPCRAFT_RESULTS.later)) {
        chrome.runtime.sendMessage({later: true})
    } else if (topcraftIncludes(lower, TOPCRAFT_RESULTS.success)) {
        chrome.runtime.sendMessage({successfully: true})
    } else if (topcraftIncludes(lower, TOPCRAFT_RESULTS.userErrors)) {
        chrome.runtime.sendMessage({message: text, ignoreReport: true})
    } else {
        chrome.runtime.sendMessage({message: text})
    }
    return true
}

function watchTopcraftResult(modal) {
    const started = Date.now()
    const timer = setInterval(() => {
        if (topcraftResultSent) {
            clearInterval(timer)
            return
        }
        const text = readTopcraftResult(modal)
        if (text && handleTopcraftResult(text)) {
            topcraftResultSent = true
            clearInterval(timer)
        } else if (Date.now() - started > 25000) {
            clearInterval(timer)
            topcraftResultSent = true
            chrome.runtime.sendMessage({message: chrome.i18n.getMessage('topcraftNoResponse')})
        }
    }, 500)
}

function topcraftUnhookButton(btn) {
    if (!btn) return
    try { delete btn.click } catch {}
    try {
        Object.defineProperty(btn, 'click', {
            value: () => HTMLElement.prototype.click.call(btn),
            writable: true, configurable: true
        })
    } catch {}
}

function topcraftMapError(text) {
    const map = {
        incorrect_nick: 'В нике можно использовать буквы, цифры, точку, дефис и подчёркивание.',
        incorrect_votifier_nick: 'Для голосования за этот сервер введите ник длиной до 16 символов.',
        incorrect_votifier_v1_nick: 'Для этого сервера нужен ник от 3 до 16 символов. Допустимы латинские буквы, цифры, точка, дефис и подчёркивание.',
        incorrect_google_recaptcha: 'Не удалось пройти проверку. Пройдите её ещё раз перед голосованием.',
        incorrect_google_recaptcha_service: 'Проверка временно недоступна. Попробуйте позже.',
        error: 'Голос не принят. Обновите страницу и попробуйте снова.',
        g: 'Не удалось принять голос с вашего IP-адреса. Если вы используете VPN или прокси, отключите его и попробуйте снова.'
    }
    return map[String(text).trim()] || 'Не удалось отправить голос. Обновите страницу и попробуйте снова.'
}

async function topcraftSubmit(modal) {
    if (topcraftSubmitted) return
    const form = modal.querySelector('form')
    if (!form) {
        chrome.runtime.sendMessage({errorVoteNoElement: 'Не найдена форма в окне голосования'})
        return
    }

    // Кнопку разблокируем на случай, если понадобится клик в fallback-ветке
    const btn = form.querySelector('button[type="submit"], input[type="submit"]')
    topcraftUnhookButton(btn)

    // Токен SmartCaptcha появляется в скрытом поле после решения капчи
    const token = modal.querySelector('input[name="smart-token"]')?.value
    if (!token) {
        // Капча не пройдена — не отправляем, ждём captchaclicker / token-watcher
        console.log(TOPCRAFT_LOG, 'Нет smart-token — ждём прохождения капчи')
        chrome.runtime.sendMessage({captcha: true})
        return
    }

    topcraftSubmitted = true
    console.log(TOPCRAFT_LOG, 'Отправляем голос напрямую (обход isTrusted)')

    const fd = new FormData(form)
    fd.set('smart-token', token)
    // vv (fingerprint) и event (base64 от jQuery-события) сервер не валидирует жёстко —
    // убираем, чтобы не зависеть от FingerprintJS и их обёртки
    fd.delete('vv')
    fd.delete('event')
    fd.set('vv', '')
    fd.set('event', btoa('{}'))

    try {
        const res = await fetch('/projects/vote/', {
            method: 'POST',
            body: new URLSearchParams(fd),
            credentials: 'same-origin',
            headers: {'X-Requested-With': 'XMLHttpRequest'}
        })
        const retryAfter = Number(res.headers.get('Retry-After'))
        const text = await res.text()

        let result
        if (Number.isFinite(retryAfter) && retryAfter > 0) {
            result = 'Достигнут дневной лимит. Снова можно проголосовать в 00:00 мск.'
        } else if (res.ok) {
            result = 'Голос учтён.'
        } else {
            result = topcraftMapError(text)
        }
        handleTopcraftResult(result)
    } catch (e) {
        topcraftSubmitted = false
        chrome.runtime.sendMessage({message: 'Не удалось отправить голос. ' + (e?.message || e)})
    }
}

// Результат может прийти и без нашего клика (например, если голос отправил сам пользователь)
const topcraftPassiveTimer = setInterval(() => {
    if (topcraftResultSent || document.readyState !== 'complete') return
    const toast = document.querySelector('[data-page-toast].show .toast-body')?.textContent.trim()
    if (toast && /голос/i.test(toast) && handleTopcraftResult(toast)) {
        topcraftResultSent = true
        clearInterval(topcraftPassiveTimer)
    }
}, 1000)
