// Распознавание адресов капч (src/utils/browser/url-matchers.js)
const test = require('node:test')
const assert = require('node:assert/strict')
const {loadScripts} = require('./helpers')

const ctx = loadScripts(['src/utils/browser/url-matchers.js'])

test('Yandex SmartCaptcha на всех доменах', () => {
    for (const url of [
        'https://smartcaptcha.cloud.yandex.ru/slider?sitekey=abc',
        'https://captcha-api.yandex.ru/checkbox.ru.e05501d67102945a.html?sitekey=abc',
        'https://smartcaptcha.yandexcloud.net/checkbox?sitekey=abc',
    ]) {
        assert.ok(ctx.isSmartCaptchaUrl(url), url)
        assert.ok(ctx.isCaptchaUrl(url), url)
        assert.ok(ctx.isCaptchaUrlForCommitted(url), url)
    }
})

test('не капча: похожие, но чужие адреса', () => {
    for (const url of ['https://topcraft.club/servers/7411/#vote', 'https://evil.example/?u=https://smartcaptcha.cloud.yandex.ru/', 'https://yandex.ru/']) {
        assert.equal(ctx.isSmartCaptchaUrl(url), false, url)
    }
})
