// Автоголосование на сайте отключено: высокий риск блокировки аккаунта за автоматизацию.
// Прежняя реализация — в истории git
async function vote() {
    chrome.runtime.sendMessage({
        disabledSite: 'There is a high risk of being blocked for auto-voting, vote on this site manually',
        ignoreReport: true,
        retryCoolDown: 315576000000, // 10 лет — повторных попыток не будет
    })
}
