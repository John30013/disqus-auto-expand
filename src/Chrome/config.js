let _options = {...defaultConfig};

function logDebug(message, ...params) {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.tabs.sendMessage(tabs[0].id, 
      { "action": "logDebug", "message": message, "params": params });
  });

}
// Initialize configuration controls from storage.
chrome.storage.sync.get(defaultConfig, options => {
  logDebug('config.js loaded.');
  logDebug('Setting options from storage: %o', options);
  for (let key in options) {
    let input = document.getElementById(key);
    if (!input) {
      logDebug('--> Skipped option "%s" with no control.', key);
      continue;
    }
    if (input.type === 'checkbox') {
      input.checked = options[key];
      if (key === 'useDarkTheme') {
        document.body.classList.toggle('theme-dark', input.checked);
        logDebug('--> document.body classNames: %s', document.body.classNames);
      }
      logDebug('--> %s checkbox %s.', (input.checked ? 'Checked' : 'Unchecked'), key);
    }
    else if (input.getAttribute('inputmode') === 'numeric') {
      input.value = '' + options[key];
      logDebug('--> %s set to %s.', key, input.value, input);
    }
  }
});

// Handle changes in the configuration controls.
document.body.addEventListener('input', event => {
  logDebug('Handling change event on %s', event.target.id, event);
  let target = event.target,
    value = null,
    typingDebounceTimer = null;
  if (target.id === 'checkInterval') {
    if (typingDebounceTimer) {
      clearTimeout(typingDebounceTimer);
    }
    typingDebounceTimer = setTimeout(target => {
      if (target.validity.valid) {
        updateConfigValue(target.id, +target.value);
      }
      else {
        // Restore the previous value.
        chrome.storage.sync.get(target.id, (value) => {
          target.value = value[target.id];
        });
        return;
      }
    }, 350, target);
  }
  else {
    value = target.checked;
    if (target.id === 'useDarkTheme') {
      document.body.classList.toggle('theme-dark', target.checked);
      logDebug('--> document.body className: %s', document.body.className);
    }
    updateConfigValue(target.id, value);
  }
});

function updateConfigValue(key, value) {
  chrome.storage.sync.set({[key]: value}, () => {
    logDebug('--> Updated config option "%s" to (%s) "%s"', key, (typeof value), value);
  });
  if (key !== 'useDarkTheme') {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.tabs.sendMessage(tabs[0].id, { action: "refreshOptions" });
    });
  }
}
