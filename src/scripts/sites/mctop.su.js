async function vote(first) {
    if (document.getElementById('summary') != null) {
        if (document.getElementById('summary').textContent.includes('Ошибка проверки CSRF')) {
            //Костыль костыля, перезагружаем страницу в случае возникновения Ошибки проверки CSRF (данная ошибка выскакивает после прохождения проверки CloudFlare)
            document.location.replace(document.URL)
            return
        } else if (document.querySelector('#summary > h1') != null && document.querySelector('#summary > p') != null) {
            chrome.runtime.sendMessage({message: document.getElementById('summary').textContent})
            return
        }
    }

    if (document.querySelector('#container > h1')) {
        let request = {}
        request.message = document.querySelector('#container > h1').textContent
        if (document.querySelector('#container > h1').nextElementSibling) {
            request.message = request.message + ' ' + document.querySelector('#container > h1').nextElementSibling.textContent
        }
        if (request.message.toLowerCase().includes('ошибка авторизации через социальную сеть')) {
            request.ignoreReport = true
        }
        chrome.runtime.sendMessage(request)
        return
    }

    const verifyUUID = crypto.randomUUID()
    window.portIsTrusted.dataset.avrId = verifyUUID

    //Авторизованы ли мы в аккаунте?
    if (!document.querySelector('#userLoginWrap').classList.contains('hidden')) {
        window.portIsTrusted.dataset.ITtype = 'click'
        document.querySelector('.voteBtn').dispatchEvent(new CustomEvent('mousedown', {detail: {avrId: verifyUUID, eventName: 'MouseEvent', eventType: 'mousedown', isTrusted: true, detail: 1}}))
        document.querySelector('.voteBtn').click()
        window.portIsTrusted.dataset.ITtype = null
        return
    }

    const project = await getProject()
    const nick = document.querySelector('#voteForm input[name=nick], input[name=nick]')
    if (nick && project.nick && nick.value !== project.nick) nick.value = project.nick

    // Сначала Yandex SmartCaptcha (галочка в форме): captchaclicker пришлёт captchaPassed и api.js вызовет vote(false).
    // Если капчу прошли иначе (вручную), голос отправит наблюдатель за токеном smart-token
    if (first) {
        mctopWatchCaptchaToken()
        setTimeout(() => {
            if (!mctopSubmitted) chrome.runtime.sendMessage({captcha: true})
        }, 30000)
        return
    }
    mctopSubmit()
}

let mctopSubmitted = false

function mctopSubmit() {
    if (mctopSubmitted) return
    const button = document.querySelector('#voteForm .voteBtn, .voteBtn')
    if (!button) {
        chrome.runtime.sendMessage({errorVoteNoElement: 'Не найдена кнопка «Голосовать» (.voteBtn)'})
        return
    }
    mctopSubmitted = true
    console.log('[mctop] Отправляем голос')
    const verifyUUID = crypto.randomUUID()
    window.portIsTrusted.dataset.avrId = verifyUUID
    window.portIsTrusted.dataset.ITtype = 'click'
    button.dispatchEvent(new CustomEvent('mousedown', {detail: {avrId: verifyUUID, eventName: 'MouseEvent', eventType: 'mousedown', isTrusted: true, detail: 1}}))
    button.click()
    window.portIsTrusted.dataset.ITtype = null
}

function mctopWatchCaptchaToken() {
    const timer = setInterval(() => {
        if (mctopSubmitted) {
            clearInterval(timer)
            return
        }
        if (document.querySelector('#voteForm input[name="smart-token"]')?.value) {
            clearInterval(timer)
            console.log('[mctop] SmartCaptcha пройдена')
            setTimeout(mctopSubmit, 500)
        }
    }, 1000)
}

// Текст результата: подсказка у кнопки (старая разметка) или, после отправки голоса, открытое окно / сообщение на странице
function mctopResultText() {
    const tooltip = document.querySelector('div.tooltip-inner')
    if (tooltip?.textContent.trim()) return tooltip.textContent.trim()
    if (!mctopSubmitted) return ''
    for (const element of document.querySelectorAll('.modal.in .modal-body, .modal.show .modal-body, .modal.in, .modal.show, #voteForm .alert, .alert-success, .alert-danger, .swal2-popup, [role="alert"]')) {
        if (element.offsetParent !== null && element.textContent.trim()) return element.textContent.trim().replace(/\s+/g, ' ')
    }
    return ''
}

let fixTimer
const timer = setInterval(()=>{
    try {
        //Ищет надпись в которой написано что вы проголосовали или вы уже голосовали, по этой надписи скрипт завершается
        const resultText = document.readyState === 'complete' ? mctopResultText() : ''
        if (resultText) {
            const textContent = resultText.toLowerCase()
            if (
                textContent.includes('уже голосовали')
                || textContent.includes('уже проголосовали')
                || textContent.includes('сможете проголосовать')
                || textContent.includes('вы сегодня голосовали')
                || textContent.includes('вы сегодня проголосовали')
                || textContent.includes('голос уже был учтен')) {
                chrome.runtime.sendMessage({later: true})
            } else if (textContent.includes('за ваш голос')
                || textContent.includes('спасибо за голос')
                ||  textContent.includes('голос принят')
                || textContent.includes('голос засчитан')
                || textContent.includes('успех')
                || textContent.includes('успешн')) {
                chrome.runtime.sendMessage({successfully: true})
            } else if (
                    textContent.includes('некорректный ник')
                    || textContent.includes('ваш айпи находится в базе данных спамеров')
                    || textContent.includes('ваш айпи попал в базу данных спамеров')
                    || (textContent.includes('код ошибки') && textContent.includes('обновить страницу'))
                    || textContent.includes('ошибка авторизации через социальную сеть')
                    || textContent.includes('ошибка 500')
                    || textContent === 'ошибка'
                    || textContent.includes('капча временно не работает')
                    || textContent.includes('аккаунт заблокирован')) {
                chrome.runtime.sendMessage({message: resultText, ignoreReport: true})
            } else if (textContent.includes('поставьте галочку в капче') || textContent.includes('обязательное поле')) {
                return
            } else {
                chrome.runtime.sendMessage({message: resultText})
            }
            clearInterval(timer)
            clearTimeout(fixTimer)
        }
    } catch (e) {
        clearInterval(timer)
        clearTimeout(fixTimer)
        throwError(e)
    }
}, 1000)

//Фикс-костыль на случай если у нас ошибка в vote запросе
const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
        if (entry.name === 'https://mctop.su/projects/vote/') {
            fixTimer = setTimeout(()=>{
                chrome.runtime.sendMessage({message: 'Мы получили что vote запрос прошёл но ответ от McTOP так и не поступил, скорее всего в vote запросе произошла ошибка, смотрите подробности в консоли в момент голосования', ignoreReport: true})
            }, 5000)
        }
    }
})
observer.observe({
    entryTypes: ["resource"]
})