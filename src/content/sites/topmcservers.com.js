async function vote(first) {
    if (document.querySelector('#server-metadata').nextElementSibling.innerText.includes('already voted')) {
        chrome.runtime.sendMessage({later: true})
        return
    }

    if (first) return

    // Поля для ника на сайте нет — голос отправляется без него
    document.querySelector('#server-metadata').nextElementSibling.querySelector('button').click()
}

const timer = setInterval(() => {
    try {
        if (document.querySelector('#server-metadata').nextElementSibling.innerText.includes('Vote added')) {
            clearInterval(timer)
            chrome.runtime.sendMessage({successfully: true})
        } else if (document.querySelector('.toastify')) {
            clearInterval(timer)
            const request = {}
            request.message = document.querySelector('.toastify').innerText
            chrome.runtime.sendMessage(request)
        }
    } catch (error) {
        clearInterval(timer)
        throwError(error)
    }
}, 1000)
