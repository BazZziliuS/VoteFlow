// Изолированный мир, до загрузки страницы: создаёт порт для istrusted_main.js. Скрипт сайта задаёт
// port.dataset.ITtype (например, 'click') перед событием, которое должно выглядеть действием пользователя.
// Порт создаётся только до загрузки страницы: позже istrusted_main.js уже не успеет подменить
// addEventListener до скриптов сайта, и подмена isTrusted не сработает
if (document.readyState === 'loading') {
    window.portIsTrusted = document.createElement('div')
    window.portIsTrusted.id = 'avr-it-port'
    document.documentElement.appendChild(window.portIsTrusted)
}
