#!/usr/bin/env node
// Собирает сторонние библиотеки в libs/ из пакетов npm (версии закреплены в package.json):
//   libs/idb.umd.js   — idb, обёртка над IndexedDB (глобальный idb)
//   libs/linkedom.js  — linkedom/worker + замена DOMParser для service worker (тихий режим)
// Обновление: npm i -D -E idb@<версия> linkedom@<версия> && npm run vendor
// npm run vendor -- --check — libs/ совпадают с версиями из package.json (CI)
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const libs = path.join(root, 'libs')
const version = name => require(`${name}/package.json`).version

// В service worker нет DOMParser (https://crbug.com/1056354): подставляем его из LinkeDOM.
// LinkeDOM не создаёт специальных классов для querySelector, поэтому недостающие свойства
// добавляются в HTMLElement (https://github.com/WebReflection/linkedom/issues/183, /184)
const LINKEDOM_ENTRY = `
import * as linkedom from 'linkedom/worker'

if (!('DOMParser' in globalThis)) {
    globalThis.DOMParser = linkedom.DOMParser
    const attribute = name => ({configurable: true, get() { return this.getAttribute(name) ?? '' }})
    for (const name of ['type', 'poster', 'cite', 'content']) {
        if (!(name in linkedom.HTMLElement.prototype)) {
            Object.defineProperty(linkedom.HTMLElement.prototype, name, attribute(name))
        }
    }
}
globalThis.linkedom = linkedom
`

async function build() {
    const esbuild = require('esbuild')
    const out = {}

    out['idb.umd.js'] =
        `/*! idb ${version('idb')} | ISC | https://github.com/jakearchibald/idb */\n` +
        fs
            .readFileSync(require.resolve('idb/build/umd.js'), 'utf8')
            .replace(/\r\n/g, '\n')
            .replace(/\n?\/\/# sourceMappingURL=.*$/, '')
            .trimEnd() +
        '\n'

    const bundle = await esbuild.build({
        stdin: {contents: LINKEDOM_ENTRY, resolveDir: root, loader: 'js'},
        bundle: true,
        write: false,
        format: 'iife',
        target: 'chrome105',
        minify: true,
        legalComments: 'inline',
        charset: 'utf8',
    })
    out['linkedom.js'] =
        `/*! linkedom ${version('linkedom')} (linkedom/worker) | ISC | https://github.com/WebReflection/linkedom */\n` +
        `/* Собрано scripts/vendor.js — не редактировать вручную */\n` +
        bundle.outputFiles[0].text
    return out
}

async function main() {
    const files = await build()
    if (process.argv.includes('--check')) {
        const stale = Object.entries(files).filter(
            ([name, text]) =>
                !fs.existsSync(path.join(libs, name)) ||
                fs.readFileSync(path.join(libs, name), 'utf8').replace(/\r\n/g, '\n') !== text,
        )
        if (stale.length) {
            console.error(
                `✗ libs/ не совпадают с package.json: ${stale.map(([n]) => n).join(', ')} — выполните npm run vendor`,
            )
            process.exit(1)
        }
        console.log('libs/ совпадают с package.json')
        return
    }
    for (const [name, text] of Object.entries(files)) {
        fs.writeFileSync(path.join(libs, name), text)
        console.log(`libs/${name}: ${(Buffer.byteLength(text) / 1024).toFixed(1)} КБ`)
    }
}

main().catch(error => {
    console.error('✗ ' + error.message)
    process.exit(1)
})
