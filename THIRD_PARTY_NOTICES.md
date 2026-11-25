# Сторонний код

VoteFlow распространяется по лицензии MIT (см. LICENSE). Она действует на изменения и новый код VoteFlow.

## Serega007/Auto-Vote-Rating

VoteFlow — продолжение расширения Auto Vote Rating: https://github.com/Serega007RU/Auto-Vote-Rating (автор — Serega007).
Оригинальный репозиторий опубликован без лицензии и переведён в архив, поэтому унаследованный из него код
остаётся © Serega007 и его участники; лицензия MIT VoteFlow на него не распространяется.

## Библиотеки в libs/

Собираются из пакетов npm командой `npm run vendor`, версии закреплены в `package.json`.

| Файл | Пакет | Лицензия |
|---|---|---|
| `libs/idb.umd.js` | [idb](https://github.com/jakearchibald/idb) 8.0.4 — Jake Archibald | ISC |
| `libs/linkedom.js` | [linkedom](https://github.com/WebReflection/linkedom) 0.18.15 (`linkedom/worker`) — Andrea Giammarchi; включает htmlparser2, css-select, cssom и другие зависимости linkedom под их лицензиями (MIT, BSD-2-Clause, ISC) | ISC |

## JustMordeckai/Auto-Vote-Rating

Часть кода перенесена из форка Auto Vote Rating — https://github.com/JustMordeckai/Auto-Vote-Rating (лицензия MIT), 2026-11-26:

- ожидание токена Cloudflare Turnstile в `src/content/common/api.js` (`waitTurnstileToken`, `watchTurnstileToken`) и метка `turnstile` в `src/content/common/captchaclicker.js`;
- скрипты голосования в `src/content/sites/`: curseforge.com, listforge.net, mclike.com, minecraft.buzz, minecraftbestservers.com, minecraftservers.org, planetminecraft.com, serveur-minecraft-vote.fr, serveur-prive.net, discords.com, mmotop.ru, minecraft-server.eu, top.gg, topg.org, top-games.net, minerank.com, topeaglerservers.com, voxelrank.com, 16bitmc.net;
- записи этих сайтов в `src/shared/projects.js`.

Перенесённые файлы помечены строкой «Перенесено из JustMordeckai/Auto-Vote-Rating» в начале.

```
MIT License

Copyright (c) 2026 JustMordeckai and contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
