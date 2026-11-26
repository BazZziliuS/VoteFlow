# Архитектура VoteFlow

Расширение Manifest V3 без сборки: браузер загружает исходники как есть. Код — обычные скрипты (не ES-модули), поэтому имена верхнего уровня одного файла видны в других файлах того же контекста. Порядок подключения важен.

## Папки

Файлы разложены по тому, **где они выполняются**.

```
manifest.json
_locales/                  переводы (ru, en, uk, de)
assets/                    иконки, логотип, шрифт
libs/                      idb и linkedom, собираются npm run vendor (не правятся вручную)
src/
├── background/            service worker
│   ├── background.js      точка входа: подключение модулей, очередь голосований, будильники
│   ├── helpers/           константы, время, проекты, повторные попытки
│   ├── voting/            расчёт времени, результат голосования, статистика, тихий режим, сообщения
│   ├── browser/           вкладки, уведомления, будильники, cookies, внедрение скриптов, значок
│   └── silentvote/        тихий режим сайтов: <домен>_silentvote.js
├── content/               внедряется во вкладки сайтов-рейтингов
│   ├── common/            api.js для скриптов сайтов, решение капч, isTrusted, перехват alert
│   └── sites/             скрипт голосования для каждого сайта: <домен>.js
├── shared/                и в фоне, и в окнах расширения
│   ├── projects.js        настройки всех сайтов (allProjects)
│   ├── main.js            открытие базы, общие функции
│   └── database/          инициализация, помощники IndexedDB, migrations/
└── ui/                    окна расширения
    ├── options.html       страница настроек, логика — в options/
    ├── popup.html         окно по клику на иконку (popup.js)
    ├── shared.js          общее для настроек и окна
    └── styles/            CSS
scripts/                   проверки, сборка, журнал изменений, выпуск, правила коммитов
tests/                     unit-тесты (node --test) и тест страницы настроек (tests/ui)
docs/                      документация и заметки к версиям (docs/releases)
```

## Контексты и подключение

| Контекст | Как подключается | Пути |
|---|---|---|
| Service worker | `importScripts()` в `src/background/background.js` | абсолютные от корня: `/src/shared/main.js` |
| Окна (`options.html`, `popup.html`) | `<script src>` | относительные от `src/ui/`: `../shared/main.js` |
| Вкладки сайтов | `chrome.scripting.executeScript` в `src/background/browser/script-injector.js` | от корня без `/`: `src/content/sites/<домен>.js` |

- Файлы из `src/shared/` не вызывают `importScripts`: их зависимости подключает тот, кто их загружает
- Фон и обе страницы подключают **одни и те же миграции в одном порядке**. `npm run check` сверяет списки
- ESLint собирает имена верхнего уровня из всех файлов `src/` и считает их глобальными, чтобы `no-undef` ловил опечатки, а не общие функции

## Как проходит голосование

1. Пользователь добавляет ссылку: `parseURL()` из `projects.js` превращает её в проект, проект сохраняется в IndexedDB (`avr`, хранилище `projects`)
2. Фон ставит будильник на `project.time`. Когда он срабатывает, проект попадает в очередь
3. Проект с тихим режимом голосует из фона: `silentVote_<домен>(project)` через `fetch` и linkedom. Остальные — во вкладке
4. Во вкладку внедряются `hacktimer.js`, `sites/<домен>.js` и `api.js`; при `needIsTrusted` до загрузки страницы — `istrusted_*.js`; во фреймы капч — `captchaclicker.js`
5. `api.js` вызывает `vote(true)` после загрузки страницы и `vote(false)` после прохождения капчи
6. Скрипт сайта отправляет результат сообщением, фон записывает его и ставит время следующего голоса

## Сообщения скрипта сайта

| Сообщение | Значение |
|---|---|
| `{successfully: true}` | голос засчитан |
| `{later: timestamp}` | уже голосовали, следующий голос — в указанное время |
| `{later: true}` | уже голосовали, время — по `timeout()` сайта от последнего голоса |
| `{captcha: true}` | капчу нужно пройти вручную, вкладка остаётся открытой |
| `{errorVoteNoElement: text}` | не найден элемент страницы — скорее всего, сайт изменился |
| `{message: text, ignoreReport?, retryCoolDown?}` | ошибка с текстом для пользователя |
| `{message: text, stopVoting: true}` | сайт распознал автоматизацию и грозит блокировкой: проект останавливается (`time = Infinity`) до ручного «Перезапустить голосование» |

Отправляйте конкретное время в `later`, если сайт его показывает: `{later: true}` без истории голосов даёт повтор сразу же.

## Помощники для скриптов сайтов

`src/content/common/api.js` внедряется вместе с каждым скриптом сайта:

| Функция | Что делает |
|---|---|
| `getProject()` | текущий проект: ник, id, настройки |
| `parseCooldown(text, bufferMs = 30000)` | таймер «21 ч. 59 м.», «21:59:02», «22 hours», «Доступно через 5ч 19м» → время следующего голоса или `null` |
| `wait(ms)` | пауза |
| `waitForElement(selector, timeout)` | дождаться элемента |
| `isVisibleElement(el)` | элемент виден на странице |
| `isAutomationWarning(text)` | текст — предупреждение сайта о блокировке за автоматизацию (такие `alert` api.js распознаёт сам) |
| `waitTurnstileToken()` / `watchTurnstileToken()` | дождаться токена Cloudflare Turnstile |

Пример и шаблон нового сайта — в [CLAUDE.md](../CLAUDE.md#adding-support-for-new-sites).

## База данных

- IndexedDB `avr`, версия — константа `DB_VERSION` в `src/shared/main.js`, на 1 больше номера последней миграции (проверяет `npm run check`)
- Новая миграция:
  1. Создайте `src/shared/database/migrations/migration-vN.js` с функцией `migrateVN(transaction)`
  2. Вызовите её в `migrations/index.js` (`if (oldVersion <= N)`)
  3. Подключите файл в `background.js`, `options.html` и `popup.html` в том же порядке
  4. Поднимите `DB_VERSION` в `main.js` и добавьте тест в `tests/migrations.test.js`
- Миграция не должна терять данные пользователя

## Сборка и выпуск

- `node scripts/build.js` собирает в `build/VoteFlow` только нужное браузеру (`manifest.json`, `_locales`, `assets`, `libs`, `src`) и документы для пользователя. Этим же скриптом пользуются workflow сборки и выпуска
- Правила версий и порядок выпуска — в [CONTRIBUTING.md](../CONTRIBUTING.md#версии)
