#!/usr/bin/env node
// Сборка расширения в папку для архива: node scripts/build.js [папка, по умолчанию build/VoteFlow]
// Копирует только то, что нужно браузеру, и документы, которые идут вместе с расширением.
// Архив создают workflow (zip) — так один список файлов используется и для сборок, и для релизов.
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const EXTENSION = ['manifest.json', '_locales', 'assets', 'libs', 'src']
const DOCUMENTS = ['README.md', 'PRIVACY.md', 'THIRD_PARTY_NOTICES.md', 'LICENSE']

const out = path.resolve(root, process.argv[2] || 'build/VoteFlow')
fs.rmSync(out, {recursive: true, force: true})
fs.mkdirSync(out, {recursive: true})
for (const entry of [...EXTENSION, ...DOCUMENTS]) {
    const from = path.join(root, entry)
    if (!fs.existsSync(from)) throw new Error(`нет ${entry}`)
    fs.cpSync(from, path.join(out, entry), {recursive: true})
}

let files = 0
const count = dir => {
    for (const e of fs.readdirSync(dir, {withFileTypes: true}))
        e.isDirectory() ? count(path.join(dir, e.name)) : files++
}
count(out)
const {version} = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'))
console.log(`VoteFlow ${version}: ${files} файлов → ${path.relative(root, out) || out}`)
