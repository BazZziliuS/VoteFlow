// VoteFlow — страница настроек, модуль 3/7: Модальные окна и статистика (общая, за сегодня, по проекту)
// Модули подключаются в options.html в порядке: init, notifications, modals, projects-list, project-form, settings, app
// Это обычные скрипты с общей глобальной областью; код верхнего уровня может вызывать
// только функции из этого же файла или из модулей, подключённых раньше

//Слушатель закрытия модалки статистики и её сброс
document.querySelector('#stats .close').addEventListener('click', resetModalStats)

//Сброс модалки статистики
function resetModalStats() {
    if (document.querySelector('td[data-resource="statsSuccessVotes"]').nextElementSibling.textContent !== '') {
        document.querySelector('.statsSubtitle').firstChild.remove()
        document.querySelector('.statsSubtitle').append('\u00A0')
        document.querySelector('.statsSubtitle').removeAttribute('id')
        document.querySelector('td[data-resource="statsSuccessVotes"]').nextElementSibling.textContent = ''
        document.querySelector('td[data-resource="statsMonthSuccessVotes"]').nextElementSibling.textContent = ''
        document.querySelector('td[data-resource="statsLastMonthSuccessVotes"]').nextElementSibling.textContent = ''
        document.querySelector('td[data-resource="statsErrorVotes"]').nextElementSibling.textContent = ''
        document.querySelector('td[data-resource="statsLaterVotes"]').nextElementSibling.textContent = ''
        document.querySelector('td[data-resource="statsLastSuccessVote"]').nextElementSibling.textContent = ''
        document.querySelector('td[data-resource="statsLastAttemptVote"]').nextElementSibling.textContent = ''
        document.querySelector('td[data-resource="statsAdded"]').textContent = chrome.i18n.getMessage('statsAdded')
        document.querySelector('td[data-resource="statsAdded"]').nextElementSibling.textContent = ''
    }
}


//Слушатель общей статистики и вывод её в модалку
document.getElementById('generalStats').addEventListener('click', async () => {
    const store = db.transaction('other', 'readwrite').store
    generalStats = await store.get('generalStats')
    if (new Date(generalStats.lastAttemptVote).getMonth() < new Date().getMonth() || new Date(generalStats.lastAttemptVote).getFullYear() < new Date().getFullYear()) {
        generalStats.lastMonthSuccessVotes = generalStats.monthSuccessVotes
        generalStats.monthSuccessVotes = 0
    }
    toggleModal('stats')
    await store.put(generalStats, 'generalStats')
    document.querySelector('.statsSubtitle').textContent = chrome.i18n.getMessage('generalStats')
    document.querySelector('td[data-resource="statsSuccessVotes"]').nextElementSibling.textContent = generalStats.successVotes
    document.querySelector('td[data-resource="statsMonthSuccessVotes"]').nextElementSibling.textContent = generalStats.monthSuccessVotes
    document.querySelector('td[data-resource="statsLastMonthSuccessVotes"]').nextElementSibling.textContent = generalStats.lastMonthSuccessVotes
    document.querySelector('td[data-resource="statsErrorVotes"]').nextElementSibling.textContent = generalStats.errorVotes
    document.querySelector('td[data-resource="statsLaterVotes"]').nextElementSibling.textContent = generalStats.laterVotes
    document.querySelector('td[data-resource="statsLastSuccessVote"]').nextElementSibling.textContent = generalStats.lastSuccessVote ? new Date(generalStats.lastSuccessVote).toLocaleString().replace(',', '') : 'None'
    document.querySelector('td[data-resource="statsLastAttemptVote"]').nextElementSibling.textContent = generalStats.lastAttemptVote ? new Date(generalStats.lastAttemptVote).toLocaleString().replace(',', '') : 'None'
    document.querySelector('td[data-resource="statsAdded"]').textContent = chrome.i18n.getMessage('statsInstalled')
    document.querySelector('td[data-resource="statsAdded"]').nextElementSibling.textContent = generalStats.added ? new Date(generalStats.added).toLocaleString().replace(',', '') : 'None'
})

//Слушатель сегодняшней статистики и вывод её в модалку
document.getElementById('todayStats').addEventListener('click', async () => {
    const store = db.transaction('other', 'readwrite').store
    todayStats = await store.get('todayStats')
    if (new Date(todayStats.lastAttemptVote).getDay() < new Date().getDay()) {
        todayStats = {
            successVotes: 0,
            errorVotes: 0,
            laterVotes: 0,
            lastSuccessVote: null,
            lastAttemptVote: null
        }
    }
    toggleModal('statsToday')
    await store.put(todayStats, 'todayStats')
    document.querySelector('#statsToday td[data-resource="statsSuccessVotes"]').nextElementSibling.textContent = todayStats.successVotes
    document.querySelector('#statsToday td[data-resource="statsErrorVotes"]').nextElementSibling.textContent = todayStats.errorVotes
    document.querySelector('#statsToday td[data-resource="statsLaterVotes"]').nextElementSibling.textContent = todayStats.laterVotes
    document.querySelector('#statsToday td[data-resource="statsLastSuccessVote"]').nextElementSibling.textContent = todayStats.lastSuccessVote ? new Date(generalStats.lastSuccessVote).toLocaleString().replace(',', '') : 'None'
    document.querySelector('#statsToday td[data-resource="statsLastAttemptVote"]').nextElementSibling.textContent = todayStats.lastAttemptVote ? new Date(generalStats.lastAttemptVote).toLocaleString().replace(',', '') : 'None'
})

//Модалки
document.querySelectorAll('#modals .modal .close').forEach((closeBtn) => {
    closeBtn.addEventListener('click', () => {
        if (closeBtn.parentElement.parentElement.id === 'addFastProject') {
            location.href = 'options.html'
        }
        toggleModal(closeBtn.parentElement.parentElement.id)
        if (closeBtn.parentElement.parentElement.id === 'notSupportedBrowser2') {
            toggleModal('notSupportedBrowser')
            clearInterval(timerConfirm)
        }
    })
})

const modalsBlock = document.querySelector('#modals')

function toggleModal(modalID) {
    if (modalsBlock.querySelector('.overlay').classList.contains('active')) {
        modalsBlock.querySelector('.overlay').style.transition = '.3s'
        modalsBlock.querySelector('#' + modalID).style.transition = '.3s'
        setTimeout(() => {
            modalsBlock.querySelector('.overlay').removeAttribute('style')
            modalsBlock.querySelector('#' + modalID).removeAttribute('style')
        }, 300)
    }
    modalsBlock.querySelector('.overlay').classList.toggle('active')
    modalsBlock.querySelector('#' + modalID).classList.toggle('active')
}

modalsBlock.querySelector('.overlay').addEventListener('click', () => {
    const activeModal = modalsBlock.querySelector('.modal.active')
    if (activeModal.id === 'stats' || activeModal.id === 'statsToday') {
        document.querySelector('#' + activeModal.id + ' .close').click()
        return
    }
    activeModal.animate([
        {transform: 'translate(-50%, -50%) scale(1)'},
        {transform: 'translate(-50%, -50%) scale(1.02)'},
        {transform: 'translate(-50%, -50%) scale(1)'}
    ], {duration: 200, easing: 'cubic-bezier(.22, 1, .36, 1)'})
})

document.querySelectorAll('button[data-resource="deleteExtension"]').forEach(element => {
    element.addEventListener('click', () => {
        if (confirm(chrome.i18n.getMessage('confirmUninstallSelf'))) {
            chrome.management.uninstallSelf()
        }
    })
})
let timerConfirm
document.querySelector('button[data-resource="limitedModeButton1"]').addEventListener('click', () => {
    toggleModal('notSupportedBrowser')
    toggleModal('notSupportedBrowser2')
    let count = 90
    document.querySelector('button[data-resource="limitedModeButton2"]').textContent = chrome.i18n.getMessage('limitedModeButton2') + ' (' + chrome.i18n.getMessage('waitSeconds', String(count)) + ')'
    timerConfirm = setInterval(() => {
        if (!count) {
            clearInterval(timerConfirm)
            document.querySelector('button[data-resource="limitedModeButton2"]').textContent = chrome.i18n.getMessage('limitedModeButton2')
            document.querySelector('button[data-resource="limitedModeButton2"]').disabled = false
        } else {
            document.querySelector('button[data-resource="limitedModeButton2"]').textContent = chrome.i18n.getMessage('limitedModeButton2') + ' (' + chrome.i18n.getMessage('waitSeconds', String(--count)) + ')'
        }
    }, 1000)
})
document.querySelector('button[data-resource="limitedModeButton2"]').addEventListener('click', async () => {
    toggleModal('notSupportedBrowser2')
    settings.operaAttention2 = true
    await db.put('other', settings, 'settings')
    await chrome.runtime.sendMessage('reloadSettings')
    usageSpace()
    await chrome.runtime.sendMessage('checkVote')
    fastAdd()
})
