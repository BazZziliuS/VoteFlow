// Изолированный мир, до загрузки страницы: создаёт элемент-«порт», через который alert_main.js
// сообщает расширению о вызовах alert/confirm/prompt на странице.
if (document.readyState === 'loading') {
    window.portAlert = document.createElement('div')
    window.portAlert.id = 'avr-alert-port'
    document.documentElement.appendChild(window.portAlert)
}