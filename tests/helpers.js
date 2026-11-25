// Загрузка исходников расширения в Node для тестов.
// Файлы расширения — обычные скрипты без модулей, поэтому выполняем их в общем vm-контексте,
// как это делает браузер, и достаём глобальные имена из контекста.
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

const root = path.resolve(__dirname, '..')

function loadScripts(files, extraGlobals = {}) {
    const context = vm.createContext({console, URL, Date, Math, JSON, Intl, ...extraGlobals})
    for (const file of files) {
        vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, {filename: file})
    }
    // const/let верхнего уровня не становятся свойствами контекста — достаём их по имени
    context.get = name => vm.runInContext(name, context)
    return context
}

module.exports = {root, loadScripts}
