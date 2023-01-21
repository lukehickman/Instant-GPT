// ################## Summarize functionality ##################
chrome.contextMenus.create({
    id: 'summarizeSelection',
    title: 'Summarize',
    contexts: ['selection'],
  }, () => chrome.runtime.lastError);
// Listen for context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === 'summarizeSelection') {
        var prompt = "Summarize this text:"
    }
    const apiKey = await new Promise((resolve) => {
        chrome.storage.sync.get("apiKey", (items) => {
            resolve(items.apiKey);
        });
    });
    // Send the selected text to the summarize function
    const summary = await summarize(info.selectionText, apiKey, prompt);
    // Create a new tab with the summary and styling
    chrome.windows.create({url: "data:text/html;charset=utf-8,<html><head><style>body {font-size: 14pt; font-family: 'Corbel', sans-serif; background-color:rgb(52, 52, 59); color:white;}</style></head><body><h3>InstantGPT Summary:</h3><hr>" + summary + "</body></html>", type: "popup", height:500,width:800});
});

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.type == "sendMessage") {
    var tokens = request.tokens;
    var model = request.model;
    var temp = request.temp;
    var top_p = request.top_p;
    var apiKey = request.apiKey;
    var message = request.message;
    var url = `https://api.openai.com/v1/completions`;
    fetch(url, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
        'model': model,
        'prompt': message,
        'max_tokens': tokens,
        'temperature': temp,
        'top_p': top_p
    })
    })
    .then(response => response.json())
    .then((data) => {
        try {
            let text = data.choices[0].text;
            sendResponse(text)
        } catch (error) {
            let message = data.error.message;
            sendResponse(message)
        }
    })
    return true;
    }
});

async function summarize(selectedText, apiKey, prompt) {
    if(!selectedText){
        const tab = await getCurrentTab();
        selectedText = tab.url;
    }
    const response = await fetch(`https://api.openai.com/v1/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            'prompt': `${prompt} ${selectedText}`,
            'temperature': 0.5,
            'max_tokens': 120,
            'model':'text-davinci-003'
        })
    });
    const json = await response.json();
    return json.choices[0].text;
}
