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


