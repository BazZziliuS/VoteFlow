#!/usr/bin/env node
// Таблица поддерживаемых сайтов в README.md строится из src/shared/projects.js:
// по алфавиту, в 4 колонки сверху вниз, плюс число сайтов в заголовке списка и в бейдже.
//   node scripts/readme-sites.js          — обновить README.md
//   node scripts/readme-sites.js --check  — README.md совпадает с projects.js (npm run check, CI)
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

const root = path.resolve(__dirname, '..')
const readmeFile = path.join(root, 'README.md')
const COLUMNS = 4

function siteDomains() {
    const context = vm.createContext({console, URL})
    vm.runInContext(fs.readFileSync(path.join(root, 'src/shared/projects.js'), 'utf8'), context)
    const allProjects = vm.runInContext('allProjects', context)
    return Object.keys(allProjects)
        .filter(domain => domain !== 'Custom')
        .sort()
}

function buildTable(domains) {
    const rows = Math.ceil(domains.length / COLUMNS)
    const lines = ['|' + ' |'.repeat(COLUMNS), '|' + ' --- |'.repeat(COLUMNS)]
    for (let row = 0; row < rows; row++) {
        const cells = []
        for (let column = 0; column < COLUMNS; column++) {
            const domain = domains[column * rows + row]
            cells.push(domain ? `[${domain}](https://${domain}/)` : '')
        }
        lines.push('| ' + cells.join(' | ') + ' |')
    }
    return lines
}

function build(readme) {
    const domains = siteDomains()
    const lines = readme.replace(/\r\n/g, '\n').split('\n')
    const summary = lines.findIndex(line => /^<summary>\d+ сайтов/.test(line))
    if (summary < 0) throw new Error('в README.md нет <summary>N сайтов — показать список</summary>')
    const start = lines.findIndex((line, index) => index > summary && line.startsWith('|'))
    let end = start
    while (end < lines.length && lines[end].startsWith('|')) end++

    lines[summary] = lines[summary].replace(/^<summary>\d+/, `<summary>${domains.length}`)
    lines.splice(start, end - start, ...buildTable(domains))
    return lines.join('\n').replace(/(badge\/%D1%81%D0%B0%D0%B9%D1%82%D0%BE%D0%B2-)\d+(-)/, `$1${domains.length}$2`)
}

if (require.main === module) {
    const current = fs.readFileSync(readmeFile, 'utf8')
    const updated = build(current)
    const normalized = current.replace(/\r\n/g, '\n')
    if (process.argv.includes('--check')) {
        if (normalized !== updated) {
            console.error('✗ Список сайтов в README.md не совпадает с projects.js: выполните npm run readme')
            process.exit(1)
        }
        console.log('Список сайтов в README.md актуален')
    } else {
        const nl = current.includes('\r\n') ? '\r\n' : '\n'
        fs.writeFileSync(readmeFile, updated.replace(/\n/g, nl))
        console.log(`README.md: ${siteDomains().length} сайтов`)
    }
}

module.exports = {build, buildTable, siteDomains}
