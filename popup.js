chrome.storage.sync.get(['apiKey'], function(result) {
  //If Api key is null, ask for entry
  if (result.apiKey != null && result.apiKey != '') {
      document.getElementById('api-key-form').style.display = 'none';
      document.getElementById('chat-form').style.display = 'flex';
  }
  //Else, show chat box
  else {
        chrome.contextMenus.create({
          id: 'summarizeSelection',
          title: 'Summarize Selection',
          contexts: ['selection'],
        }, () => chrome.runtime.lastError);
      document.getElementById('api-key-form').addEventListener('submit', function(event) {
          event.preventDefault();
          var apiKey = document.getElementById('api-key-input').value;
          chrome.storage.sync.set({'apiKey': apiKey,'max_tokens':120, 'model':'text-davinci-003', 'temp':1, 'top_p':0}, function() {
          console.log('API key saved');
          document.getElementById('api-key-form').style.display = 'none';
          document.getElementById('chat-form').style.display = 'flex';
          });
      });
  }
});

document.getElementById("settings-link").addEventListener("click", function(event) {
  event.preventDefault();
  var settingsForm = document.getElementById("settings-form");
  var chatForm = document.getElementById("chat-form");
  var chatResponse = document.getElementById("chat-response");
  if (settingsForm.style.display === "none") {
    settingsForm.style.display = "block";
    chatForm.style.display = "none";
    chatResponse.style.display = "none";
  } else {
    settingsForm.style.display = "none";
    chatForm.style.display = "flex";
    chatResponse.style.display = "block";
  }
  // Get the stored values from chrome.storage.sync
  chrome.storage.sync.get(["apiKey", "max_tokens","model","temp","top_p"], function(items) {
  // Set the input field values to the stored values or the default values
  document.getElementById("setting1-input").value = items.apiKey;
  document.getElementById("setting2-input").value = items.max_tokens;
  document.getElementById("setting3-input").value = items.model;
  document.getElementById("setting4-input").value = items.temp;
  document.getElementById("setting5-input").value = items.top_p;
});
});

// Add an event listener to the submit button to store the input values in chrome.storage.sync
document.getElementById("settings-form").addEventListener("submit", function(event) {
  chrome.storage.sync.set({
    'apiKey': document.getElementById("setting1-input").value,
    'max_tokens': +document.getElementById("setting2-input").value,
    'model': document.getElementById("setting3-input").value,
    'temp': +document.getElementById("setting4-input").value,
    'top_p': +document.getElementById("setting5-input").value
  });
});
  
document.getElementById('chat-form').addEventListener('submit', function(event) {
    event.preventDefault();
    var apiKey = null;
    document.getElementById('chat-response').style.display = 'block';
    chrome.storage.sync.get(["apiKey", "max_tokens","model","temp","top_p"], function(result) {
    apiKey = result.apiKey;
    tokens = result.max_tokens;
    model = result.model;
    temp = result.temp;
    top_p = result.top_p;
    var message = document.getElementById('chat-input').value;
    chrome.runtime.sendMessage({
        type: 'sendMessage',
        apiKey: apiKey,
        tokens: tokens,
        model: model,
        temp: temp,
        top_p: top_p,
        message: message
        }, function(response) {
        // Handle the response from the background script
        console.log(response);
        var chatResponseElement = document.getElementById('chat-response');
        chatResponseElement.innerHTML += `
          <div class='conversation-row'>
              <div class='message-container user-message' style='display: flex; align-items: center;'>
                  <p class='message-text'>${message}</p>
              </div>
          </div>
          <div class='conversation-row'>
              <div class='message-container gpt-message' style='display: flex; align-items: center; justify-content: flex-end;'>
                  <img src='gpt-icon.png' class='message-icon' alt='GPT' style='margin-right: 10px;'>
                  <p class='message-text'>${response}</p>
              </div>
          </div>
        `;
        });
        document.getElementById("chat-input").value = '';
        document.getElementById("chat-input").placeholder = '';
    });
    });