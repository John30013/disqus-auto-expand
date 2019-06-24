let _config = { ...defaultConfig };

// Initialize some text in the UI.
initUiText();

// Initialize configuration controls with values from storage
// and listen for updates.
getCurrentConfig();
listenForUpdates();

/* ========== End of main code. ==========
   ===== Helper functions follow. ===== */

function initUiText() {
  const manifest = chrome.runtime.getManifest();
  document.querySelectorAll(".version").forEach(elt => {
    elt.innerHTML = manifest.version;
  });
  document.querySelectorAll("a.extensionStore").forEach(link => {
    link.href =
      "https://chrome.google.com/webstore/detail/disqus-auto-expander/fpbfgpbppogiblppnplbkkcdmnklnbao?hl=en&gl=US";
    link.innerText = "Chrome Web Store";
  });
}

function getCurrentConfig() {
  chrome.storage.sync.get(defaultConfig, config => {
    if (chrome.runtime.lastError) {
      console.info(
        "Couldn't initialize config from storage: %s",
        chrome.runtime.lastError.message
      );
      return;
    }
    // removeIf(!allowDebug)
    logDebug("config.js loaded.");
    logDebug("Setting config from storage: %o", config);
    // endRemoveIf(!allowDebug)
    for (let key in config) {
      let input = document.getElementById(key);
      if (!input) {
        // removeIf(!allowDebug)
        logDebug('--> Skipped config option "%s" with no control.', key);
        // endRemoveIf(!allowDebug)
        continue;
      }
      if (input.type === "checkbox") {
        input.checked = config[key];
        if (key === "useDarkTheme") {
          document.body.classList.toggle("theme-dark", input.checked);
          // removeIf(!allowDebug)
          logDebug("--> document.body class: %s", document.body.className);
          // endRemoveIf(!allowDebug)
        }
        // removeIf(!allowDebug)
        logDebug(
          "--> %s checkbox %s.",
          input.checked ? "Checked" : "Unchecked",
          key
        );
        // endRemoveIf(!allowDebug)
      } else if (key === "checkInterval") {
        input.value = "" + config[key];
        setIcon(!!config[key]);
        // removeIf(!allowDebug)
        logDebug("--> %s set to %s.", key, input.value);
        // endRemoveIf(!allowDebug)
      } else if (key === "loadAllContent") {
        // true =  operation is in progress, so the button should be diabled.
        // false = operation is not in progress, so the button should be enanbled.
        input.toggleAttribute("disabled", !!value);
        input.disabled = !!value;
      }
    }
  });
} // end of getCurrentConfig().

// Handle changes in the configuration values.
function listenForUpdates() {
  document.body.addEventListener("input", event => {
    // removeIf(!allowDebug)
    logDebug("Handling change event on %s", event.target.id, event);
    // endRemoveIf(!allowDebug)
    let target = event.target,
      value = null,
      typingDebounceTimer = null,
      debounceDelay = 3000;
    if (target.id === "checkInterval") {
      if (typingDebounceTimer) {
        clearTimeout(typingDebounceTimer);
      }
      typingDebounceTimer = setTimeout(
        target => {
          if (target.validity.valid) {
            updateConfigValue(target.id, +target.value);
          } else {
            // Restore the previous value after debounceDelay (msecs).
            chrome.storage.sync.get(target.id, value => {
              if (chrome.runtime.lastError) {
                console.info(
                  "Couldn't get config value %s from storage: %s",
                  target.id,
                  chrome.runtime.lastError.message
                );
                return;
              }
              target.value = value[target.id];
            });
            return;
          }
        },
        debounceDelay,
        target
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
    chrome.storage.sync.set({ [key]: value }, () => {
      if (chrome.runtime.lastError) {
        console.info(
          `Couldn't store config option ${key} with value ${value}: ${
            chrome.runtime.lastError.message
          }.`
        );
      }
      // removeIf(!allowDebug)
      logDebug(
        '--> Updated config option "%s" to (%s) "%s"',
        key,
        typeof value,
        value
      );
      // endRemoveIf(!allowDebug)
    });
    if (key !== "useDarkTheme") {
      chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        if (chrome.runtime.lastError) {
          console.info(
            `updateConfigValue(): couldn't get active tab to send a message to: ${
              chrome.runtime.lastError.message
            }.`
          );
          return;
        }
        chrome.tabs.sendMessage(tabs[0].id, { action: "refreshConfig" });
        if (key === "checkInterval") {
          setIcon(!!value);
        }
      });
    } // end of dark theme handling.
  } // end of updateConfigValue().
} // end of listenForUpdates().

function setIcon(isRunning) {
  // removeIf(!allowDebug)
  logDebug(`[proxy] setIcon(${isRunning}): entering.`);
  // endRemoveIf(!allowDebug)
  chrome.runtime.sendMessage({
    action: "setIcon",
    caller: "config",
    data: isRunning,
  });
} // end of setIcon().

function sendContentCommand(commandData, responseCallback) {
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    if (chrome.runtime.lastError) {
      console.info(
        `sendContentCommand(): couldn't get active tab for sendMessage: ${
          chrome.runtime.lastError.message
        }.`
      );
      return;
    }
    chrome.tabs.sendMessage(tabs[0].id, commandData, response => {
      if (chrome.runtime.lastError) {
        console.info(
          `sendContentCommand(): couldn't send command: ${
            chrome.runtime.lastError.message
          }.`
        );
      }
      if (responseCallback) {
        responseCallback(response);
      }
    });
  });
} // end of sendContentCommand().

// removeIf(!allowDebug)
function logDebug(message, ...params) {
  console.debug(message, ...params);
  sendContentCommand({
    action: "logDebug",
    caller: "config",
    message: message,
    data: params,
  });
}
// endRemoveIf(!allowDebug)
