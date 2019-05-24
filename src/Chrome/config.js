let _options = {...defaultConfig};

// Initialize configuration controls from storage.
chrome.storage.sync.get(defaultConfig, options => {
  _options.doDebug && console.debug('config.js loaded.');
  _options.doDebug && console.debug('Setting options from storage: %o', options);
  for (let key in options) {
    let input = document.getElementById(key);
    if (!input) {
      _options.doDebug && console.debug('--> Skipped option "%s" with no control.', key);
      continue;
    }
    if (input.type === 'checkbox') {
      input.checked = options[key];
      if (key === 'useDarkTheme') {
        document.body.classList.toggle('theme-dark', input.checked);
        _options.doDebug && console.debug('--> document.body classList: %o', document.body.classList);
      }
      _options.doDebug && console.debug('--> %s checkbox %s.', (input.checked ? 'Checked' : 'Unchecked'), key);
    }
    else if (input.type === 'number') {
      input.value = options[key];
      _options.doDebug && console.debug('--> %s set to %s.', key, input.value);
    }
  }
});

// Handle changes in the configuration controls.
document.body.addEventListener('change', event => {
  _options.doDebug && console.debug('Handling change event on %s', event.target.id, event);
  let target = event.target,
    value = null;
  if (target.id === 'checkInterval') {
    if (target.validity.valid) {  
      value = target.value;
    }
    else {
      // Restore the previous value.
      chrome.storage.sync.get(target.id, (value) => {
        target.value = value[target.id];
      });
      return;
    }
  }
  else {
    value = target.checked;
      if (target.id === 'useDarkTheme') {
        document.body.classList.toggle('theme-dark', target.checked);
        _options.doDebug && console.debug('--> document.body classList: %o', document.body.classList);
      }
  }
  chrome.storage.sync.set({[target.id]: value}, () => {
    console.debug('--> Updated config option "%s" to (%s) "%s"', target.id, (typeof value), value);
  });
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.tabs.sendMessage(tabs[0].id, { action: "refreshOptions" }, function (response) { });
  });
});
