// VoteFlow — страница настроек, модуль 2/7: Всплывающие уведомления (createNotif / removeNotif)
// Модули подключаются в options.html в порядке: init, notifications, modals, projects-list, project-form, settings, app
// Это обычные скрипты с общей глобальной областью; код верхнего уровня может вызывать
// только функции из этого же файла или из модулей, подключённых раньше

//notifications
async function createNotif(message, type, options = {}) {
    if (!message || message === '') message = 'An empty error, see the details in the console'
    if (!type) type = 'hint'
    if (!options.dontLog) {
        if (type === 'error' && (message instanceof Error || message.stack || message.message)) console.error('[' + type + ']', message)
        // else if (type === 'warn') console.warn('['+type+']', message)
        // else console.log('['+type+']', message)
    }
    if (options.element != null) {
        options.element.textContent = ''
        if (typeof message[Symbol.iterator] === 'function' && typeof message === 'object') {
            for (const m of message) options.element.append(m)
        } else {
            options.element.textContent = message
        }
        options.element.className = type
        if (type === 'success') {
            options.element.parentElement.parentElement.parentElement.firstElementChild.src = '../../assets/images/icons/success.svg'
        }
        return
    }
    const notif = document.createElement('div')
    notif.classList.add('notif', 'show', type)
    if (!options.delay) {
        if (type === 'error') options.delay = 30000
        else options.delay = 5000
    }

    if (type !== 'hint') {
        const dot = document.createElement('span')
        dot.classList.add('notif-dot')
        notif.append(dot)
        let progressBlock = document.createElement('div')
        progressBlock.classList.add('progress')
        let progressBar = document.createElement('div')
        progressBar.style.animation = 'notif-progress ' + options.delay / 1000 + 's linear'
        progressBlock.append(progressBar)
        notif.append(progressBlock)
    }

    let mesBlock = document.createElement('div')
    if (typeof message[Symbol.iterator] === 'function' && typeof message === 'object') {
        for (const m of message) mesBlock.append(m)
    } else {
        mesBlock.append(message)
    }
    notif.append(mesBlock)
    notif.style.visibility = 'hidden'
    document.getElementById('notifBlock2').append(notif)

    let allNotifH

    function calcAllNotifH() {
        allNotifH = 10
        document.querySelectorAll('#notifBlock > .notif').forEach((el) => {
            allNotifH = allNotifH + el.clientHeight + 10
        })
        document.querySelectorAll('#notifBlock2 > .notif').forEach((el) => {
            allNotifH = allNotifH + el.clientHeight + 10
        })
    }

    calcAllNotifH()

    notif.remove()
    notif.removeAttribute('style')

    while (window.innerHeight < allNotifH) {
        await new Promise(resolve => {
            function listener(event) {
                if (event.animationName === 'notif-hide') {
                    document.getElementById('notifBlock').removeEventListener('animationend', listener)
                    resolve()
                }
            }

            document.getElementById('notifBlock').addEventListener('animationend', listener)
        })
        calcAllNotifH()
    }

    document.getElementById('notifBlock').append(notif)

    let timer
    if (type !== 'hint') timer = new Timer(() => removeNotif(notif), options.delay)

    if (notif.previousElementSibling != null && notif.previousElementSibling.classList.contains('hint')) {
        setTimeout(() => removeNotif(notif.previousElementSibling), options.delay >= 3000 ? 3000 : options.delay)
    }

    notif.addEventListener('click', (e) => {
        if (notif.querySelector('a') != null || notif.querySelector('button') != null || options.onClick) {
            if (options.onClick) options.onClick()
            if (e.detail === 2) removeNotif(notif)
        } else {
            removeNotif(notif)
        }
    })

    notif.addEventListener('mouseover', () => {
        if (!notif.classList.contains('hint')) {
            timer.pause()
            notif.querySelector('.progress div').style.animationPlayState = 'paused'
        }
    })

    notif.addEventListener('mouseout', () => {
        if (!notif.classList.contains('hint')) {
            timer.resume()
            notif.querySelector('.progress div').style.animationPlayState = 'running'
        }
    })
}

function removeNotif(elem) {
    if (!elem) return
    elem.classList.remove('show')
    elem.classList.add('hide')
    setTimeout(() => elem.classList.add('hidden'), 500)
    setTimeout(() => elem.remove(), 1000)
}

let Timer = function (callback, delay) {
    let timerId, start, remaining = delay

    this.pause = function () {
        clearTimeout(timerId)
        remaining -= Date.now() - start
    }

    this.resume = function () {
        start = Date.now()
        clearTimeout(timerId)
        timerId = setTimeout(callback, remaining)
    }

    this.getTimerId = function () {
        return timerId
    }

    this.resume()
}
