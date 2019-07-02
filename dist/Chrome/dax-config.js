let _config = { ...defaultConfig };

// Initialize some text in the UI.
initUiText();

// Initialize configuration controls with values from storage
// and listen for updates.
getCurrentConfig();
listenForUpdates();

/* ===== End of main code. ===== */
/* ===== Helper functions. ===== */

/**
 * Inserts the current version number and link to the Chrome Web Store in the
 * configuration page.
 */
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
} // end of initUiText().

/**
 * Retrieves the current configuration values from storage.
 */
function getCurrentConfig() {
  chrome.storage.sync.get(defaultConfig, config => {
    if (!chrome.runtime.lastError) {
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
          } else if (key === "isEnabled") {
            setEnabledStateUi(input.checked);
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
          // removeIf(!allowDebug)
          logDebug("--> %s set to %s.", key, input.value);
          // endRemoveIf(!allowDebug)
        }
      } // end for (let key in config).
    } else {
      console.info(
        "Couldn't initialize config from storage: %s",
        chrome.runtime.lastError.message
      );
    } // end chrome.storage.sync.get() error handler.
  });
} // end of getCurrentConfig().

/**
 * Handles changes in the configuration values.
 */
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
              if (!chrome.runtime.lastError) {
                target.value = value[target.id];
              } else {
                console.info(
                  "Couldn't get config value %s from storage: %s",
                  target.id,
                  chrome.runtime.lastError.message
                );
              }
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

  /* ===== Helper functions. ===== */
  /**
   * Updates the new value for the specified configuration key in storage.
   * @param {String} key - the configuration key to update.
   * @param {Boolean|Number} value - the nw value of the key.
   */
  function updateConfigValue(key, value) {
    chrome.storage.sync.set(
      {
        [key]: value,
      },
      () => {
        if (!chrome.runtime.lastError) {
          // removeIf(!allowDebug)
          logDebug(
            '--> Updated config option "%s" to (%s) "%s"',
            key,
            typeof value,
            value
          );
          // endRemoveIf(!allowDebug)
        } else {
          console.info(
            `Couldn't store config option ${key} with value ${value}: ${
              chrome.runtime.lastError.message
            }.`
          );
          return;
        }
      }
    ); // storage.sync.set() callback.

    // Notify content and background scripts about the new config value.
    if (key !== "useDarkTheme") {
      const updateConfigCommand = {
        action: "updateConfig",
        data: { key, value },
        sender: "config",
      };
      sendContentCommand(updateConfigCommand);
      chrome.runtime.sendMessage(updateConfigCommand);
      if (key === "isEnabled") {
        setEnabledStateUi(value);
      }
    } // end of changed value handling (excluding "useDarkTheme").
  } // end of updateConfigValue().
} // end of listenForUpdates().

/**
 * Enables or disables the "Content options" toggles.
 * @param {Boolean} isEnabled - whether the toggles should be enabled or
 * disabled.
 */
function setEnabledStateUi(isEnabled) {
  document
    .querySelectorAll("section:first-of-type > div input")
    .forEach(elt => (elt.disabled = !isEnabled));
} // end of setEnabledStateUi().

/**
 * Sends a command (message) to the content script in the active tab.
 * @param {Object} commandData - an object describing the command to send,
 * including any parameters.
 * @param {Function} responseCallback - an optional callback function that will
 * be called if the content script replies to this message.
 */
function sendContentCommand(commandData, responseCallback) {
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    if (!chrome.runtime.lastError) {
      chrome.tabs.sendMessage(tabs[0].id, commandData, response => {
        if (!chrome.runtime.lastError) {
          if (responseCallback) {
            responseCallback(response);
          }
        } else {
          console.info(
            `sendContentCommand(): couldn't send command: ${
              chrome.runtime.lastError.message
            }.`
          );
        } // tabs.sendMessage() error handler.
      }); // tabs.sendMessage() callback.
    } else {
      console.info(
        `sendContentCommand(): couldn't get active tab for sendMessage: ${
          chrome.runtime.lastError.message
        }.`
      );
    } // chrome.tabs.query() error handler.
  }); // chrome.tabs.query() callback.
} // end of sendContentCommand().

// removeIf(!allowDebug)
/**
 * Asks the content script to output a debug message to the console. Also
 * logs the message to the config script's console (which is not generally
 * visible).
 * @param {String} message - The debug message (can include console logging
 * placeholders).
 * @param  {...any} params - Parameters that will replace the placeholders.
 */
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
