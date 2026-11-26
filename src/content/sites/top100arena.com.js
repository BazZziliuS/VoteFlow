async function vote(first) {
    if (document.querySelector('div.text-danger')) {
        const message = document.querySelector('div.text-danger').innerText
        if (message.includes('can only vote once per day')) {
            chrome.runtime.sendMessage({later: true})
        } else {
            chrome.runtime.sendMessage({message})
        }
        return
    }
    if (document.querySelector('div.text-success')) {
        chrome.runtime.sendMessage({successfully: true})
        return
    }

    if (first) return

    document.querySelector('form button[type="submit"]').click()
}
