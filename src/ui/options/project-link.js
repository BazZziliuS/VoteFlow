// VoteFlow — страница настроек, модуль 8/10: Поле ссылки: распознавание сайта и проекта, подсказки, список поддерживаемых сайтов
// Модули подключаются в options.html в порядке: init, notifications, modals, projects-list, project-form,
// project-add, project-import, project-link, settings, app.
// Это обычные скрипты с общей глобальной областью; код верхнего уровня вызывает только функции этого файла
// или загруженных раньше. Функции из других модулей — только в обработчиках событий

let laterChoose = false
document.getElementById('link').addEventListener('input', linkChanged)

function linkChanged(event, reset) {
    if (laterChoose || reset) {
        document.getElementById('nick').parentElement.style.display = 'none'
        document.getElementById('nick').required = false
        document.getElementById('nick').placeholder = chrome.i18n.getMessage('enterNick')
        document.getElementById('countVote').parentElement.style.display = 'none'
        document.getElementById('countVote').required = false
        document.getElementById('ordinalWorld').parentElement.style.display = 'none'
        document.getElementById('ordinalWorld').required = false
        document.getElementById('banAttention').style.display = 'none'
        document.getElementById('rewardAttention').style.display = 'none'
        document.getElementById('operaAttention').style.display = 'none'
        document.getElementById('voteMode').disabled = true
        document.getElementById('voteMode').checked = false
        document.getElementById('voteMode').dispatchEvent(new Event('change'))
        laterChoose = false
        if (reset) return
    }

    let domain, project, funcRating
    try {
        domain = getDomainWithoutSubdomain(this.value)
        funcRating = allProjects[domain]
        if (!funcRating) return
        project = funcRating.parseURL(new URL(this.value))
    } catch (error) {
        return
    }
    laterChoose = true

    project.rating = domain
    if (!funcRating.notRequiredNick?.(project)) {
        document.getElementById('nick').parentElement.removeAttribute('style')
        document.getElementById('nick').required = true
        if (funcRating.optionalNick?.()) {
            document.getElementById('nick').placeholder = chrome.i18n.getMessage('enterNickOptional')
        }
    }
    if (funcRating.limitedCountVote?.()) {
        document.getElementById('countVote').parentElement.removeAttribute('style')
        document.getElementById('countVote').required = true
    }
    if (funcRating.ordinalWorld?.()) {
        document.getElementById('ordinalWorld').parentElement.removeAttribute('style')
        document.getElementById('ordinalWorld').required = true
    }
    if (funcRating.silentVote?.(project)) {
        document.getElementById('voteMode').disabled = false
    }
    if (funcRating.banAttention?.(project)) {
        document.getElementById('banAttention').removeAttribute('style')
    }
    if (project.rating === 'minecraftrating.ru' && project.listing === 'servers') {
        document.getElementById('rewardAttention').removeAttribute('style')
    }
    // noinspection JSUnresolvedVariable
    if (
        !settings.operaAttention &&
        (navigator?.userAgentData?.brands?.[0]?.brand === 'Opera' ||
            (!!window.opr && !!opr.addons) ||
            !!window.opera ||
            navigator.userAgent.indexOf(' OPR/') >= 0) &&
        !(funcRating.notRequiredCaptcha?.(project) || funcRating.alertManualCaptcha?.())
    ) {
        document.getElementById('operaAttention').removeAttribute('style')
    }
}

let laterChooseManual = false
document.getElementById('rating').addEventListener('input', ratingChanged)

function ratingChanged(event, reset) {
    if (laterChooseManual || reset) {
        document.getElementById('id').parentElement.style.display = 'none'
        document.getElementById('id').name = 'id'
        document.getElementById('id').required = false
        document.getElementById('projectIDTooltip1').textContent = ''
        document.getElementById('projectIDTooltip2').textContent = ''
        document.getElementById('projectIDTooltip3').textContent = ''
        document.querySelector('[data-resource="yourNick"]').textContent = chrome.i18n.getMessage('yourNick')
        document.getElementById('nick').parentElement.style.display = 'none'
        document.getElementById('nick').required = false
        document.getElementById('nick').placeholder = chrome.i18n.getMessage('enterNick')
        document.getElementById('chooseGame').parentElement.style.display = 'none'
        document.getElementById('chooseGame').name = 'chooseGame'
        document.getElementById('urlGameTooltip1').textContent = ''
        document.getElementById('urlGameTooltip2').textContent = ''
        document.getElementById('urlGameTooltip3').textContent = ''
        document.getElementById('gameList').replaceChildren()
        document.getElementById('chooseListing').parentElement.style.display = 'none'
        document.getElementById('chooseListing').name = 'chooseListing'
        document.getElementById('urlListingTooltip1').textContent = ''
        document.getElementById('urlListingTooltip2').textContent = ''
        document.getElementById('urlListingTooltip3').textContent = ''
        document.getElementById('listingList').replaceChildren()
        document.getElementById('chooseLang').parentElement.style.display = 'none'
        document.getElementById('chooseLang').name = 'chooseLang'
        document.getElementById('langList').replaceChildren()
        document.getElementById('countVote').parentElement.style.display = 'none'
        document.getElementById('countVote').required = false
        document.getElementById('ordinalWorld').parentElement.style.display = 'none'
        document.getElementById('ordinalWorld').required = false
        document.getElementById('banAttention').style.display = 'none'
        document.getElementById('rewardAttention').style.display = 'none'
        document.getElementById('operaAttention').style.display = 'none'
        document.getElementById('additionURL').parentElement.style.display = 'none'
        document.getElementById('additionURL').name = 'additionURL'
        document.getElementById('additionURLTooltip1').textContent = ''
        document.getElementById('additionURLTooltip2').textContent = ''
        document.getElementById('additionURLTooltip3').textContent = ''
        document.getElementById('customTimeOut').disabled = false
        document.getElementById('customTimeOut').dispatchEvent(new Event('change'))
        document.getElementById('voteMode').disabled = true
        document.getElementById('voteMode').checked = false
        document.getElementById('voteMode').dispatchEvent(new Event('change'))
        if (!document.getElementById('customTimeOut').checked)
            document.getElementById('selectTime').parentElement.style.display = 'none'
        document.getElementById('customBody').parentElement.style.display = 'none'
        document.getElementById('responseURL').parentElement.style.display = 'none'
        laterChooseManual = false
        if (reset) return
    }

    if (this.value === 'Custom') {
        laterChooseManual = true
        document.getElementById('customTimeOut').disabled = true
        document.getElementById('customTimeOut').checked = false
        document.getElementById('lastDayMonth').disabled = true
        document.getElementById('lastDayMonth').checked = false
        document.getElementById('voteMode').disabled = true
        document.getElementById('voteMode').checked = false
        document.getElementById('voteMode').dispatchEvent(new Event('change'))
        document.getElementById('nick').parentElement.removeAttribute('style')
        document.getElementById('nick').required = true
        document.getElementById('id').required = false

        document.getElementById('selectTime').parentElement.removeAttribute('style')
        document.getElementById('selectTime').dispatchEvent(new Event('change'))
        document.getElementById('customBody').parentElement.removeAttribute('style')
        document.getElementById('responseURL').parentElement.removeAttribute('style')

        document.querySelector('[data-resource="yourNick"]').textContent = chrome.i18n.getMessage('name')
        document.getElementById('nick').placeholder = chrome.i18n.getMessage('enterName')
        return
    }

    const rating = this.value
    const funcRating = allProjects[rating]

    if (!funcRating) return
    laterChooseManual = true

    if (!funcRating.notRequiredId?.()) {
        document.getElementById('id').parentElement.removeAttribute('style')
        document.getElementById('id').required = true
        document.getElementById('projectIDTooltip1').textContent = funcRating.exampleURL()[0]
        document.getElementById('projectIDTooltip2').textContent = funcRating.exampleURL()[1]
        document.getElementById('projectIDTooltip3').textContent = funcRating.exampleURL()[2]
        document.getElementById('id').name = 'id_' + rating
    }

    if (!funcRating.notRequiredNick?.()) {
        document.getElementById('nick').parentElement.removeAttribute('style')
        document.getElementById('nick').required = true
        if (funcRating.optionalNick?.()) {
            document.getElementById('nick').placeholder = chrome.i18n.getMessage('enterNickOptional')
        }
    }

    if (funcRating.URLMain?.() && this.value !== funcRating.URLMain()) {
        if (funcRating.exampleURLGame && !funcRating.defaultGame)
            document.getElementById('chooseGame').value = this.value
        this.value = funcRating.URLMain()
    }
    if (funcRating.exampleURLGame) {
        document.getElementById('chooseGame').parentElement.removeAttribute('style')
        document.getElementById('chooseGame').name = 'chooseGame_' + this.value
        if (
            funcRating.defaultGame &&
            !editingProject &&
            !funcRating.gameList().has(document.getElementById('chooseGame').value)
        ) {
            document.getElementById('chooseGame').value = funcRating.defaultGame()
        }
        document.getElementById('urlGameTooltip1').textContent = funcRating.exampleURLGame()[0]
        document.getElementById('urlGameTooltip2').textContent = funcRating.exampleURLGame()[1]
        document.getElementById('urlGameTooltip3').textContent = funcRating.exampleURLGame()[2]
        if (funcRating.gameList) {
            const gameList = document.getElementById('gameList')
            for (const [value, name] of funcRating.gameList()) {
                const option = document.createElement('option')
                option.value = value
                option.textContent = name
                gameList.append(option)
            }
        }
    }

    if (funcRating.exampleURLListing) {
        document.getElementById('chooseListing').parentElement.removeAttribute('style')
        document.getElementById('chooseListing').name = 'chooseListing_' + rating
        if (
            funcRating.defaultListing &&
            !editingProject &&
            !funcRating.listingList().has(document.getElementById('chooseListing').value)
        ) {
            document.getElementById('chooseListing').value = funcRating.defaultListing()
        }
        document.getElementById('chooseListing').dispatchEvent(new Event('change'))
        document.getElementById('urlListingTooltip1').textContent = funcRating.exampleURLListing()[0]
        document.getElementById('urlListingTooltip2').textContent = funcRating.exampleURLListing()[1]
        document.getElementById('urlListingTooltip3').textContent = funcRating.exampleURLListing()[2]
        if (funcRating.listingList) {
            const listingList = document.getElementById('listingList')
            for (const [value, name] of funcRating.listingList()) {
                const option = document.createElement('option')
                option.value = value
                option.textContent = name
                listingList.append(option)
            }
        }
    }

    if (funcRating.langList) {
        document.getElementById('chooseLang').parentElement.removeAttribute('style')
        document.getElementById('chooseLang').name = 'chooseLang_' + rating
        if (
            funcRating.defaultLand &&
            !editingProject &&
            !funcRating.langList().has(document.getElementById('chooseLang').value)
        ) {
            document.getElementById('chooseLang').value = funcRating.defaultLand()
        }
        const langList = document.getElementById('langList')
        for (const [value, name] of funcRating.langList()) {
            const option = document.createElement('option')
            option.value = value
            option.textContent = name
            langList.append(option)
        }
    }

    if (funcRating.limitedCountVote?.()) {
        document.getElementById('countVote').parentElement.removeAttribute('style')
        document.getElementById('countVote').required = true
    }

    if (funcRating.ordinalWorld?.()) {
        document.getElementById('ordinalWorld').parentElement.removeAttribute('style')
        document.getElementById('ordinalWorld').required = true
    }

    if (funcRating.silentVote?.()) {
        document.getElementById('voteMode').disabled = false
    }

    if (funcRating.banAttention?.()) {
        document.getElementById('banAttention').removeAttribute('style')
        if (!document.getElementById('randomize').checked) {
            document.getElementById('randomize').click()
            document.getElementById('randomizeMin').value = '0'
            document.getElementById('randomizeMax').value = '14400000'
        }
    }

    // noinspection JSUnresolvedVariable
    if (
        !settings.operaAttention &&
        navigator?.userAgentData?.brands?.[0]?.brand === 'Opera' &&
        !(funcRating.notRequiredCaptcha?.() || funcRating.alertManualCaptcha?.())
    ) {
        document.getElementById('operaAttention').removeAttribute('style')
    }

    if (funcRating.additionExampleURL) {
        document.getElementById('additionURL').parentElement.removeAttribute('style')
        document.getElementById('additionURL').name = 'additionURL_' + rating
        document.getElementById('additionURLTooltip1').textContent = funcRating.additionExampleURL()[0]
        document.getElementById('additionURLTooltip2').textContent = funcRating.additionExampleURL()[1]
        document.getElementById('additionURLTooltip3').textContent = funcRating.additionExampleURL()[2]
    }
}

//Слушатель на выбор типа timeout для Custom
document.getElementById('selectTime').addEventListener('change', function () {
    document.getElementById('hour').parentElement.style.display = 'none'
    document.getElementById('hour').required = false
    document.getElementById('time').parentElement.style.display = 'none'
    document.getElementById('time').required = false
    document.getElementById('week').parentElement.style.display = 'none'
    document.getElementById('week').required = false
    document.getElementById('month').parentElement.style.display = 'none'
    document.getElementById('month').required = false
    if (this.value === 'ms') {
        document.getElementById('time').parentElement.removeAttribute('style')
        document.getElementById('time').required = true
    } else {
        if (this.value === 'week') {
            document.getElementById('week').parentElement.removeAttribute('style')
            document.getElementById('week').required = true
        } else if (this.value === 'month') {
            document.getElementById('month').parentElement.removeAttribute('style')
            document.getElementById('month').required = true
        }
        document.getElementById('hour').parentElement.removeAttribute('style')
        document.getElementById('hour').required = true
    }
})

document.getElementById('chooseListing').addEventListener('change', function () {
    if (this.name === 'chooseListing_minecraftrating.ru') {
        if (this.value === 'servers') {
            document.getElementById('nick').required = false
            document.getElementById('nick').parentElement.style.display = 'none'
            document.getElementById('rewardAttention').removeAttribute('style')
        } else {
            document.getElementById('nick').required = true
            document.getElementById('nick').parentElement.removeAttribute('style')
            document.getElementById('rewardAttention').style.display = 'none'
        }
    }
})

function generateDataList() {
    const datalist = document.getElementById('ratingList')
    for (const rating of Object.keys(allProjects)) {
        const option = document.createElement('option')
        option.setAttribute('name', rating)
        option.value = rating
        if (rating === 'Custom') {
            option.disabled = !settings.enableCustom
            option.textContent = chrome.i18n.getMessage('Custom')
        }
        datalist.append(option)
    }
}

//Подсказка под полем ссылки: распознан ли сайт и проект ещё до нажатия «Добавить»
function updateLinkStatus() {
    const status = document.getElementById('linkStatus')
    const value = document.getElementById('link').value.trim()
    status.className = 'field-status'
    status.textContent = ''
    if (!value) return

    let url
    try {
        url = new URL(value)
    } catch {
        status.classList.add('error')
        status.textContent = chrome.i18n.getMessage('linkInvalid')
        return
    }
    const domain = getDomainWithoutSubdomain(value)
    const funcRating = allProjects[domain]
    if (!funcRating || domain === 'Custom') {
        status.classList.add('error')
        status.textContent = chrome.i18n.getMessage('linkUnsupported', domain)
        return
    }
    let project
    try {
        project = funcRating.parseURL(url)
    } catch {
        project = {}
    }
    if (!funcRating.notRequiredId?.() && !project?.id) {
        status.classList.add('warn')
        status.textContent = chrome.i18n.getMessage('linkNoProject', domain)
        return
    }
    status.classList.add('ok')
    status.textContent = project?.id
        ? chrome.i18n.getMessage('linkRecognized', [domain, String(project.id)])
        : chrome.i18n.getMessage('linkRecognizedSite', domain)
}

document.getElementById('link').addEventListener('input', updateLinkStatus)

//Список поддерживаемых сайтов с поиском
function renderSupportedSites() {
    const sites = Object.keys(allProjects)
        .filter(site => site !== 'Custom')
        .sort()
    document.getElementById('sitesCount').textContent = String(sites.length)
    const list = document.getElementById('sitesList')
    list.replaceChildren(
        ...sites.map(site => {
            const link = document.createElement('a')
            link.className = 'site-chip'
            link.href = 'https://' + site + '/'
            link.target = '_blank'
            link.rel = 'noopener'
            link.textContent = site
            return link
        }),
    )
}

renderSupportedSites()

document.getElementById('sitesFilter').addEventListener('input', function () {
    const query = this.value.trim().toLowerCase()
    for (const chip of document.querySelectorAll('#sitesList .site-chip')) {
        chip.hidden = query !== '' && !chip.textContent.includes(query)
    }
})

document.getElementById('emptyAddButton').addEventListener('click', () => {
    document.getElementById('addTab').click()
    document.getElementById('link').focus()
})
