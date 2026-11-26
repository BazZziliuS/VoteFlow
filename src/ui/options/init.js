// noinspection ES6MissingAwait
// VoteFlow — страница настроек, модуль 1/7: Инициализация страницы: подключение к БД, общие переменные, локализация разметки
// Модули подключаются в options.html в порядке: init, notifications, modals, projects-list, project-form, settings, app
// Это обычные скрипты с общей глобальной областью; код верхнего уровня может вызывать
// только функции из этого же файла или из модулей, подключённых раньше

const initializeFunc = initializeConfig()

let resolveLoad
const loaded = new Promise(resolve => (resolveLoad = resolve))

let editingProject

const authVKUrls = new Map([
    [
        'topcraft.ru',
        'https://oauth.vk.com/authorize?auth_type=reauthenticate&state=Pxjb0wSdLe1y&redirect_uri=close.html&response_type=token&client_id=5128935&scope=email',
    ],
    [
        'topcraft.club',
        'https://oauth.vk.com/authorize?auth_type=reauthenticate&state=Pxjb0wSdLe1y&redirect_uri=close.html&response_type=token&client_id=5128935&scope=email',
    ],
    [
        'mctop.su',
        'https://oauth.vk.com/authorize?auth_type=reauthenticate&state=4KpbnTjl0Cmc&redirect_uri=close.html&response_type=token&client_id=5113650&scope=email',
    ],
    [
        'mcrate.su',
        'https://oauth.vk.com/authorize?client_id=3059117&redirect_uri=close.html&response_type=token&scope=0&v=&state=&display=page&__q_hash=a11ee68ba006307dbef29f34297bee9a',
    ],
    [
        'minecraftrating.ru',
        'https://oauth.vk.com/authorize?client_id=5216838&display=page&redirect_uri=close.html&response_type=token&v=5.45',
    ],
    [
        'monitoringminecraft.ru',
        'https://oauth.vk.com/authorize?client_id=3697128&scope=0&response_type=token&redirect_uri=close.html',
    ],
    [
        'misterlauncher.org',
        'https://oauth.vk.com/authorize?client_id=7636705&display=page&redirect_uri=close.html&response_type=token',
    ],
    [
        'minecraft-servers.ru',
        'https://oauth.vk.com/authorize?response_type=token&client_id=53128143&redirect_uri=close.html&scope=email',
    ],
])

const svgFail = document.createElement('img')
svgFail.src = '../../assets/images/icons/error.svg'

const svgSuccess = document.createElement('img')
svgSuccess.src = '../../assets/images/icons/success.svg'

//Локализация
const elements = document.querySelectorAll('[data-resource]')
elements.forEach(function (el) {
    el.prepend(chrome.i18n.getMessage(el.getAttribute('data-resource')))
})
document.querySelectorAll('[placeholder]').forEach(function (el) {
    const message = chrome.i18n.getMessage(el.placeholder)
    if (!message || message === '') return
    el.placeholder = message
})
document.getElementById('nick').setAttribute('placeholder', chrome.i18n.getMessage('enterNick'))
// document.getElementById('donate').setAttribute('href', chrome.i18n.getMessage('donate'))
document.querySelector('#load div').textContent = chrome.i18n.getMessage('load')

// Переключатели настроек с data-invert="true" показывают включённую функцию,
// а в settings хранится флаг disabled… — значение инвертируется только в интерфейсе
function setSettingCheckbox(id, value) {
    const el = document.getElementById(id)
    el.checked = el.dataset.invert === 'true' ? !value : Boolean(value)
}

function readSettingCheckbox(el) {
    return el.dataset.invert === 'true' ? !el.checked : el.checked
}
