// ESLint для VoteFlow.
// Расширение собрано из обычных скриптов (не ES-модулей): service worker подключает их через
// importScripts, страница настроек — через <script>. Поэтому имена, объявленные на верхнем
// уровне одного файла, доступны в других. Чтобы no-undef ловил опечатки, а не ругался на
// общие функции, собираем такие имена из всех файлов и объявляем их глобальными.
const fs = require('node:fs')
const path = require('node:path')
const globals = require('globals')

function collectTopLevelNames(dir) {
    const names = new Set()
    const walk = d => {
        for (const entry of fs.readdirSync(d, {withFileTypes: true})) {
            const full = path.join(d, entry.name)
            if (entry.isDirectory()) walk(full)
            else if (entry.name.endsWith('.js')) {
                const text = fs.readFileSync(full, 'utf8')
                const re = /^(?:async\s+)?(?:function\*?\s+([\w$]+)|(?:const|let|var|class)\s+([\w$]+))/gm
                for (const m of text.matchAll(re)) names.add(m[1] || m[2])
            }
        }
    }
    walk(dir)
    return Object.fromEntries([...names].map(name => [name, 'writable']))
}

const projectGlobals = {
    ...collectTopLevelNames(path.join(__dirname, 'src')),
    idb: 'readonly',
    linkedom: 'readonly',
    opr: 'readonly',
    InstallTrigger: 'readonly',
}

const commonRules = {
    'no-undef': 'error',
    'no-dupe-keys': 'error',
    'no-unreachable': 'error',
    'no-const-assign': 'error',
    'no-self-assign': 'error',
    'use-isnan': 'error',
    'valid-typeof': 'error',
    'no-unused-vars': ['warn', {vars: 'local', args: 'none', caughtErrors: 'none'}],
}

module.exports = [
    // Служебные скрипты и тесты — Node.js (CommonJS). Строки страниц внутри тестов собираются как текст, а не код
    {
        files: ['scripts/**/*.js', 'tests/**/*.js', 'eslint.config.js'],
        languageOptions: {
            ecmaVersion: 2023,
            sourceType: 'commonjs',
            globals: {...globals.node},
        },
        rules: commonRules,
    },
    {
        files: ['src/**/*.js'],
        languageOptions: {
            ecmaVersion: 2023,
            sourceType: 'script',
            globals: {
                ...globals.browser,
                ...globals.serviceworker,
                ...globals.webextensions,
                ...projectGlobals,
            },
        },
        linterOptions: {
            reportUnusedDisableDirectives: 'off',
        },
        rules: {
            // Ошибки, которые почти всегда означают баг
            'no-undef': 'error',
            'no-dupe-keys': 'error',
            'no-duplicate-case': 'error',
            'no-unreachable': 'error',
            'no-const-assign': 'error',
            'no-func-assign': 'error',
            'no-self-assign': 'error',
            'no-unsafe-finally': 'error',
            'no-unsafe-negation': 'error',
            'use-isnan': 'error',
            'valid-typeof': 'error',
            'no-compare-neg-zero': 'error',
            'no-cond-assign': ['error', 'except-parens'],
            'no-dupe-else-if': 'error',
            'no-import-assign': 'error',
            'getter-return': 'error',
            'no-async-promise-executor': 'error',
            // Сигналы для уборки, сборку не ломают
            'no-unused-vars': ['warn', {vars: 'local', args: 'none', caughtErrors: 'none'}],
            'no-empty': ['warn', {allowEmptyCatch: true}],
            'no-useless-escape': 'off',
        },
    },
]
