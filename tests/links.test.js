// Ссылки в тексте ошибок с сайтов (src/ui/options/projects-list.js → renderTextWithLinks)
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

// Минимальный DOM: элементы-ссылки и текстовые узлы
function fakeDocument() {
    return {
        createElement: () => ({classList: {add() {}}, href: '', target: '', rel: '', textContent: ''}),
    }
}
function fakeElement() {
    const nodes = []
    return {nodes, append: (...items) => nodes.push(...items.filter(item => item !== ''))}
}

const source = fs
    .readFileSync(path.join(__dirname, '../src/ui/options/projects-list.js'), 'utf8')
    .replace(/\r\n/g, '\n')
const start = source.indexOf('// Ссылки в тексте ошибки')
const end = source.indexOf('\nfunction highlight(')
const ctx = vm.createContext({document: fakeDocument(), String})
vm.runInContext(source.slice(start, end) + '\nthis.renderTextWithLinks = renderTextWithLinks', ctx)

test('адреса превращаются в ссылки, остальное остаётся текстом', () => {
    const element = fakeElement()
    ctx.renderTextWithLinks('Ошибка, подробнее: https://example.com/help?a=1. Попробуйте снова', element)
    const [before, link, after] = element.nodes
    assert.equal(before, 'Ошибка, подробнее: ')
    assert.equal(link.href, 'https://example.com/help?a=1')
    assert.equal(link.target, '_blank')
    assert.equal(link.rel, 'noopener noreferrer')
    assert.equal(after, '. Попробуйте снова')
})

test('текст без ссылок и с разметкой добавляется как текст', () => {
    const element = fakeElement()
    ctx.renderTextWithLinks('<img src=x onerror=alert(1)> Капча не пройдена', element)
    assert.deepEqual(element.nodes, ['<img src=x onerror=alert(1)> Капча не пройдена'])
})

test('длинная ссылка сокращается в подписи, но не в адресе', () => {
    const element = fakeElement()
    const url = 'https://example.com/' + 'a'.repeat(100)
    ctx.renderTextWithLinks(url, element)
    assert.equal(element.nodes[0].href, url)
    assert.equal(element.nodes[0].textContent.length, 67)
})
