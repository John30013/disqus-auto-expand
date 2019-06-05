let _options = { ...defaultConfig };

// removeIf(!allowDebug)
function logDebug(message, ...params) {
  chrome.tabs.query({ active: true, currentWindow: true }, 
    function(tabs) {
      if (chrome.runtime.lastError) {
        console.error(`logDebug(): couldn't get active tab to send a message to: ${chrome.runtime.lastError}.`);
        return;
      }
      const messageData = {
        action: "logDebug",
        caller: "config",
        message: message,
        params: params,
      };
      chrome.tabs.sendMessage(tabs[0].id, messageData);
  });
}
// endRemoveIf(!allowDebug)

// Initialize some text in the config UI.
const manifest = chrome.runtime.getManifest();
document.querySelector("span#version").innerHTML = manifest.version;
document.querySelectorAll('a.extensionStore').forEach(link => {
  link.href = 'https://chrome.google.com/webstore/detail/disqus-auto-expander/fpbfgpbppogiblppnplbkkcdmnklnbao?hl=en&gl=US';
  link.innerText = 'Chrome Web Store';
});

// Initialize configuration controls from storage.
chrome.storage.sync.get(defaultConfig, 
  options => {
    if (chrome.runtime.lastError) {
      console.error(
        "Couldn't initialize options from storage: %s",
        chrome.runtime.lastError
      );
      return;
    }
    // removeIf(!allowDebug)
    logDebug("config.js loaded.");
    logDebug("Setting options from storage: %o", options);
    // endRemoveIf(!allowDebug)
    for (let key in options) {
      let input = document.getElementById(key);
      if (!input) {
        // removeIf(!allowDebug)
        logDebug('--> Skipped option "%s" with no control.', key);
        // endRemoveIf(!allowDebug)
        continue;
      }
      if (input.type === "checkbox") {
        input.checked = options[key];
        if (key === "useDarkTheme") {
          document.body.classList.toggle("theme-dark", input.checked);
          // removeIf(!allowDebug)
          logDebug(
            "--> document.body class: %s", 
            document.body.className);
          // endRemoveIf(!allowDebug)
        }
        // removeIf(!allowDebug)
        logDebug("--> %s checkbox %s.",
          input.checked ? "Checked" : "Unchecked", key);
        // endRemoveIf(!allowDebug)
      } else if (input.getAttribute("inputmode") === "numeric") {
        input.value = "" + options[key];
        // removeIf(!allowDebug)
        logDebug("--> %s set to %s.", key, input.value);
        // endRemoveIf(!allowDebug)
      }
    }
});

// Handle changes in the configuration controls.
document.body.addEventListener("input", event => {
  // removeIf(!allowDebug)
  logDebug("Handling change event on %s", event.target.id, event);
  // endRemoveIf(!allowDebug)
  let target = event.target,
    value = null,
    typingDebounceTimer = null;
  if (target.id === "checkInterval") {
    if (typingDebounceTimer) {
      clearTimeout(typingDebounceTimer);
    }
    typingDebounceTimer = setTimeout(
      target => {
        if (target.validity.valid) {
          updateConfigValue(target.id, +target.value);
        } else {
          // Restore the previous value after 1 second.
          chrome.storage.sync.get(target.id, 
            value => {
              if (chrome.runtime.lastError) {
                console.error("Couldn't get config value %s from storage: %s",
                  target.id, chrome.runtime.lastError);
                  return;
              }
              target.value = value[target.id];
           });
          return;
        }
      },
      1000, target
    );
  } else {
    value = target.checked;
    if (target.id === "useDarkTheme") {
      document.body.classList.toggle("theme-dark", target.checked);
      // removeIf(!allowDebug)
      logDebug("--> document.body className: %s", document.body.className);
      // endRemoveIf(!allowDebug)
    }
    updateConfigValue(target.id, value);
  }
});

function updateConfigValue(key, value) {
  chrome.storage.sync.set({[key]: value}, 
    () => {
      if (chrome.runtime.lastError) {
        console.error(
          `Couldn't store option ${key} with value ${value}: ${chrome.runtime.lastError}.`
        );
      }
      // removeIf(!allowDebug)
      logDebug('--> Updated config option "%s" to (%s) "%s"',
        key, typeof value, value);
      // endRemoveIf(!allowDebug)
    });
  if (key !== "useDarkTheme") {
    chrome.tabs.query({ active: true, currentWindow: true }, 
      tabs => {
        if (chrome.runtime.lastError) {
          console.error(`updateConfigValue(): couldn't get active tab to send a message to: ${chrome.runtime.lastError}.`);
          return;
        }
        chrome.tabs.sendMessage(tabs[0].id, 
          { action: "refreshOptions" });
      }
    );
  }
}
