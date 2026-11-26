# GitHub Actions

## Check (`check.yml`)

Запускается на каждый push и pull request:
- ESLint
- сообщения коммитов по правилам [CONTRIBUTING.md](../../CONTRIBUTING.md#коммиты) (`scripts/commit-msg.js`)
- актуальность `CHANGELOG.md` (`scripts/changelog.js --check`)
- проверка целостности (`scripts/check-manifest.js`): пути в `importScripts`, манифесте и HTML-страницах, скрипты сайтов, ключи локализации
- юнит-тесты (`npm test`)
- дымовой тест страницы настроек в headless Chrome (`npm run test:ui`)

Локально то же самое: `npm install`, затем `npm run check` и `npm run test:ui`.

## Site health (`sites.yml`)

Раз в неделю (понедельник, 06:00 UTC) и вручную. `scripts/check-sites.js` открывает пример проекта на каждом сайте-рейтинге и распознаёт закрытые сайты (домен продаётся или припаркован, DNS, переадресация на чужой сайт), устаревшие примеры и сетевые ошибки. Отчёт записывается в одну задачу «Состояние сайтов» с меткой `site-health`: она создаётся при первом запуске и дальше обновляется. Голоса не отправляются.

Локально: `npm run sites` (или `node scripts/check-sites.js --markdown report.md`).

## Build Extension (`build.yml`)

Запускается на push в `dev`, `main`, `refactor`, на pull request и вручную. Собирает `VoteFlow-{версия}-{ветка}.zip` и выкладывает его в артефакты запуска (хранится 90 дней).

## Create Release (`release.yml`)

Запускается пушем тега `v*` или вручную с указанием тега. Собирает `VoteFlow-{версия}.zip` и публикует релиз на GitHub.

Перед сборкой workflow проверяет, что тег совпадает с версией в `manifest.json` и `package.json`, а заметки `docs/releases/{версия}.md` существуют и содержат дату. Иначе релиз не публикуется. Описание релиза берётся из этих заметок.

### Как выпустить версию

Порядок и правила версий — в [CONTRIBUTING.md](../../CONTRIBUTING.md#выпуск). Коротко:

```bash
npm run release -- patch        # версия, черновик заметок, CHANGELOG.md
# отредактировать docs/releases/X.Y.Z.md, затем npm run changelog и npm run check
git add -A && git commit -m "release: X.Y.Z"
git tag -a vX.Y.Z -m "VoteFlow X.Y.Z"
git push origin HEAD vX.Y.Z
```

Публикуется только zip: расширение не размещено в Chrome Web Store, а Chrome на Windows и macOS не устанавливает `.crx` из других источников.

### Установка из релиза

1. Скачайте `VoteFlow-{версия}.zip` и распакуйте
2. Откройте `chrome://extensions/`, включите «Режим разработчика»
3. «Загрузить распакованное расширение» → папка `VoteFlow`

При обновлении замените содержимое папки и нажмите «Обновить» на странице расширений — проекты и настройки сохранятся.
