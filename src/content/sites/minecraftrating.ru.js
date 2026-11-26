// Форма голосования: на страницах проектов — #form-vote с кнопкой #voteProject (раньше #submitVote),
// на страницах серверов — #voteForm
function mrVoteForm() {
    return document.querySelector('#form-vote, #voteForm')
}

// SmartCaptcha именно формы голосования. На странице есть и скрытая форма входа со своей капчей — её не учитываем
function mrVoteCaptcha() {
    const form = mrVoteForm()
    if (!form) return null
    return form.querySelector('iframe[src*="smartcaptcha"], iframe[src*="captcha-api.yandex.ru"], .smart-captcha')
}

// Голосование на странице проекта в два шага: «Голосовать» (#voteProject) открывает окно #popup-captcha
// со SmartCaptcha, а голос отправляет кнопка «Проголосовать» (#submitVote) в этом окне
function mrPopup() {
    return document.getElementById('popup-captcha')
}

let mrOpened = false
let mrSubmitted = false

// Начинает голосование: открывает окно с капчей или (старая разметка) сразу отправляет голос
function mrStart() {
    const open = document.querySelector('#voteProject')
    if (open) {
        if (!mrOpened) {
            mrOpened = true
            console.log('[minecraftrating] Нажимаем «Голосовать» — открывается окно с капчей')
            open.click()
            mrWaitCaptcha()
        }
        return true
    }
    const button =
        document.querySelector('#submitVote') ||
        mrVoteForm()?.querySelector('button[type="submit"], input[type="submit"]')
    return button ? mrFinalSubmit(button) : false
}

// Отправляет голос кнопкой «Проголосовать» в окне — один раз
function mrFinalSubmit(
    button = mrPopup()?.querySelector('#submitVote, button[type="submit"]') || document.querySelector('#submitVote'),
) {
    if (mrSubmitted || !button) return false
    mrSubmitted = true
    console.log('[minecraftrating] Нажимаем «Проголосовать»')
    button.click()
    mrWatchResult()
    return true
}

// Ждём прохождения капчи в окне: токен в smart-token появляется, кто бы её ни прошёл — расширение, пользователь или невидимо
function mrWaitCaptcha() {
    const started = Date.now()
    let asked = false
    const timer = setInterval(() => {
        if (mrSubmitted) {
            clearInterval(timer)
            return
        }
        const token = mrPopup()?.querySelector('input[name="smart-token"]')?.value
        if (token) {
            clearInterval(timer)
            console.log('[minecraftrating] Капча пройдена')
            setTimeout(() => mrFinalSubmit(), 500)
        } else if (!asked && Date.now() - started > 30000) {
            asked = true
            chrome.runtime.sendMessage({captcha: true})
        }
    }, 1000)
}

// captchaclicker сообщил о прохождении капчи — нажимаем «Проголосовать», если ещё не нажали
chrome.runtime.onMessage.addListener(function (message) {
    if (message.captchaPassed === true || message.captchaPassed === 'double') {
        setTimeout(() => mrFinalSubmit(), 1500)
    }
})

// Результат может появиться без перезагрузки страницы — ждём его до 30 секунд после нажатия
function mrWatchResult() {
    const started = Date.now()
    const timer = setInterval(() => {
        const text = [
            ...document.querySelectorAll(
                '#msgBox, div.alert, .swal2-popup, .toast, [role="alert"], .notification, .notify',
            ),
        ]
            .map(e => e.textContent.trim())
            .filter(Boolean)
            .join(' ')
        const lower = text.toLowerCase()
        if (/спасибо за ваш голос|голос (принят|учт[её]н|засчитан)/.test(lower)) {
            clearInterval(timer)
            chrome.runtime.sendMessage({successfully: true})
        } else if (/уже голосовали|сможете проголосовать|следующ\S* голос/.test(lower)) {
            clearInterval(timer)
            chrome.runtime.sendMessage({later: parseCooldown(text) || true})
        } else if (Date.now() - started > 30000) {
            clearInterval(timer)
            // Без сообщения — обычно значит, что страница перезагрузилась с результатом и его обработает vote()
            if (document.contains(mrVoteForm()))
                chrome.runtime.sendMessage({
                    message:
                        'minecraftrating.ru не ответил на голос за 30 секунд' + (text ? ': ' + text.slice(0, 200) : ''),
                })
        }
    }, 1000)
}

async function vote(first) {
    // SECTION 1: INITIAL PAGE CHECKS
    if (document.querySelector('.container .text-center')?.textContent.includes('Страница не найдена')) {
        chrome.runtime.sendMessage({
            message: document.querySelector('.container .text-center').textContent,
            ignoreReport: true,
            retryCoolDown: 21600000,
        })
        return
    }
    if (document.body.innerText.trim().length < 150) {
        const message = document.body.innerText.trim()
        if (
            document.querySelector('body > #warning-container') ||
            message.toLocaleLowerCase() === '419\npage expired'
        ) {
            chrome.runtime.sendMessage({message: document.body.innerText.trim(), ignoreReport: true})
            return
        }
    }

    // SECTION 2: CHECK FOR VOTE RESULTS
    if (document.querySelector('div.alert.alert-success')?.textContent.includes('Спасибо за Ваш голос!')) {
        chrome.runtime.sendMessage({successfully: true})
        return
    }
    if (document.querySelector('div.alert.alert-danger')?.textContent.includes('Вы уже голосовали за этот проект')) {
        chrome.runtime.sendMessage({later: true})
        return
    }
    if (document.querySelector('#msgBox')?.textContent.includes('Спасибо за Ваш голос')) {
        chrome.runtime.sendMessage({successfully: true})
        return
    }
    if (document.querySelector('#msgBox')?.textContent.includes('уже голосовали')) {
        const message = document.querySelector('#msgBox').textContent
        const numbers = message.match(/\d+/g).map(Number)
        chrome.runtime.sendMessage({
            later:
                Date.UTC(numbers[2], numbers[1] - 1, numbers[0], numbers[3], numbers[4], numbers[5]) - 10800000 + 60000,
        })
        return
    }

    // SECTION 3: PREPARE FORM AND HANDLE CAPTCHA WORKFLOW
    const project = await getProject()

    if (first) {
        const nickInput = mrVoteForm()?.querySelector('input[name=nick]') || document.querySelector('input[name=nick]')
        if (nickInput) {
            nickInput.value = project.nick
            nickInput.dispatchEvent(new Event('input', {bubbles: true}))
            console.log(`[VOTE SCRIPT] Nickname '${project.nick}' has been entered.`)
        }
    }

    if (!mrVoteForm()) {
        chrome.runtime.sendMessage({errorVoteNoElement: 'Не найдена форма голосования #form-vote'})
        return
    }

    // Видимая SmartCaptcha прямо в форме — ждём её прохождения (captchaclicker пришлёт captchaPassed)
    if (first && mrVoteCaptcha()) {
        console.log('[minecraftrating] В форме голосования SmartCaptcha — ждём прохождения')
        setTimeout(() => {
            if (!mrSubmitted && !document.querySelector('div.alert.alert-success, #msgBox'))
                chrome.runtime.sendMessage({captcha: true})
        }, 30000)
        return
    }

    // «Голосовать» открывает окно со SmartCaptcha; после капчи нажимаем «Проголосовать» в окне
    if (!mrStart()) {
        chrome.runtime.sendMessage({errorVoteNoElement: 'Не найдена кнопка «Голосовать» (#voteProject)'})
    }
}

// --- The rest of your script (PerformanceObserver, etc.) remains unchanged ---
let unload = false
window.onbeforeunload = () => {
    unload = true
}
window.onunload = () => {
    unload = true
}
const observer = new PerformanceObserver(list => {
    for (const entry of list.getEntries()) {
        if (entry.name === 'https://minecraftrating.ru/set-cookie/') {
            // Дикий костыль в обход ошибки "CSRF token mismatch."
            setTimeout(async () => {
                if (unload) return
                const project = await getProject()

                let response
                try {
                    response = await fetch(document.location.href)
                } catch (error) {
                    chrome.runtime.sendMessage({message: error.toString(), ignoreReport: true})
                    return
                }
                if (!response.ok) {
                    chrome.runtime.sendMessage({errorVote: [String(response.status), response.url]})
                    return
                }
                const text = await response.text()
                const doc = new DOMParser().parseFromString(text, 'text/html')
                const csrfToken = doc.querySelector('#form-vote input[name="_token"]')?.value
                if (!csrfToken) {
                    chrome.runtime.sendMessage({
                        errorVoteNoElement: 'Не найден csrf токен',
                        html: text,
                        url: response.url,
                    })
                    return
                }
                document.querySelector('#form-vote input[name="_token"]').value = csrfToken

                try {
                    response = await fetch('/set-cookie/', {
                        headers: {
                            'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
                        },
                        method: 'POST',
                        body:
                            '_token=' +
                            csrfToken +
                            '&' +
                            'name=' +
                            'voted_project' +
                            '&' +
                            'value= ' +
                            document.querySelector('[name=url]').value +
                            '__' +
                            project.nick,
                    })
                } catch (error) {
                    chrome.runtime.sendMessage({message: error.toString(), ignoreReport: true})
                    return
                }
                if (!response.ok) {
                    chrome.runtime.sendMessage({errorVote: [String(response.status), response.url]})
                    return
                }

                document.querySelector('#form-vote').submit()
            }, 5000)
        }
    }
})
observer.observe({
    entryTypes: ['resource'],
})
