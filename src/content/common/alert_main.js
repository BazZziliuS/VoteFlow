// Мир страницы (MAIN): перехватывает alert/confirm/prompt, чтобы окна не блокировали голосование,
// и передаёт их текст расширению через порт из alert_isolated.js.
{
    const port = document.getElementById('avr-alert-port')

    if (port) {
        port.remove()

        alert = new Proxy(alert, {
            apply(target, thisArg, args) {
                port.dispatchEvent(new CustomEvent('state', {
                    detail: {
                        alert: true,
                        url: document.location.href,
                        message: args[0]
                    }
                }))
            }
        })

        confirm = new Proxy(confirm, {
            apply(target, thisArg, args) {
                port.dispatchEvent(new CustomEvent('state', {
                    detail: {
                        confirm: true,
                        url: document.location.href,
                        message: args[0]
                    }
                }))
                return true
            }
        })
    }
}