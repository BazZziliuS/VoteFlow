// Мир страницы (MAIN): подменяет event.isTrusted = true для событий, отмеченных через порт из
// istrusted_isolated.js. Нужен сайтам, которые отличают клик скрипта от настоящего (needIsTrusted).
{
    // https://github.com/69Type/istrusted-bypass

    const port = document.getElementById('avr-it-port')

    if (port) {
        port.remove()

        let ITLastEvent

        Node.prototype.addEventListener = new Proxy(Node.prototype.addEventListener, {
            apply(target, thisArg, args) {
                if (!args?.[1]) return Reflect.apply(...arguments)
                args[1] = new Proxy(args[1], {
                    apply(target, thisArg, args) {
                        if (ITLastEvent && !port.dataset.ITtype) ITLastEvent = null

                        const detail = args?.[0]?.detail
                        // извращённый, но безопасный метод
                        if (detail?.avrId && port.dataset?.avrId && detail.avrId === port.dataset.avrId) {
                            const event = new self[detail.eventName](detail.eventType)
                            args[0] = new Proxy(event, {
                                get(target, prop, receiver) {
                                    const value = target[prop]
                                    if (value instanceof Function) {
                                        return target[prop].bind(target)
                                    }
                                    if (prop === 'detail') {
                                        if (detail.detail) {
                                            return detail.detail
                                        } else {
                                            return null
                                        }
                                    }
                                    if (prop === 'avrId') {
                                        return null
                                    }
                                    if (detail[prop] != null) {
                                        if (detail[prop] === 'avrDelete_' + port.dataset.avrId) {
                                            return null
                                        }
                                        return detail[prop]
                                    }
                                    if (port.dataset[port.dataset?.avrId + prop] != null) {
                                        return port.dataset[prop]
                                    }
                                    // TODO ошибка Illegal invocation, хз почему
                                    // return Reflect.get(...arguments)
                                    return value
                                },
                            })
                            // более простой, но менее безопасный метод
                        } else if (args[0].type === port.dataset.ITtype) {
                            // Новое событие того же типа после завершения обработки предыдущего (eventPhase 0) тоже подменяем:
                            // так работает серия событий (протягивание слайдера SmartCaptcha), а не только одиночный клик
                            if (!ITLastEvent || (ITLastEvent !== args[0] && ITLastEvent.eventPhase === 0)) {
                                ITLastEvent = args[0]
                            } else if (ITLastEvent !== args[0]) {
                                return Reflect.apply(...arguments)
                            }
                            args[0] = new Proxy(args[0], {
                                get(target, prop, receiver) {
                                    const value = target[prop]
                                    if (value instanceof Function) {
                                        return target[prop].bind(target)
                                    }
                                    if (port.dataset[port.dataset?.avrId + prop] != null) {
                                        return port.dataset[prop]
                                    }
                                    if (prop === 'isTrusted') {
                                        return true
                                    }
                                    // TODO ошибка Illegal invocation, хз почему
                                    // return Reflect.get(...arguments)
                                    return value
                                },
                            })
                        }
                        return Reflect.apply(...arguments)
                    },
                })
                return Reflect.apply(...arguments)
            },
        })
    }
}
