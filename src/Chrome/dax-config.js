import { defaultConfig } from "./dax-defaultConfig.js";
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
  _config.doDebug && console.debug("Manifest: %o", manifest);
  document.querySelectorAll(".version").forEach((elt) => {
    elt.innerHTML = manifest.version;
  });
  document.querySelectorAll("a.extensionStore").forEach((link) => {
    link.href =
      "https://chrome.google.com/webstore/detail/disqus-auto-expander/fpbfgpbppogiblppnplbkkcdmnklnbao?hl=en&gl=US";
    link.innerText = "Chrome Web Store";
  });
} // end of initUiText().

/**
 * Retrieves the current configuration values from storage.
 */
function getCurrentConfig() {
  chrome.storage.sync.get(defaultConfig, (config) => {
    if (!chrome.runtime.lastError) {
      // removeIf(!allowDebug)
      console.debug("config.js loaded.");
      console.debug("Setting config from storage: %o", config);
      // endRemoveIf(!allowDebug)
      for (let key in config) {
        _config[key] = config[key];
        let input = document.getElementById(key);
        if (!input) {
          // removeIf(!allowDebug)
          _config.doDebug &&
            console.debug(
              '--> Skipped config option "%s" with no control.',
              key
            );
          // endRemoveIf(!allowDebug)
          continue;
        }
        if (input.type === "checkbox") {
          input.checked = config[key];
          if (key === "useDarkTheme") {
            document.body.classList.toggle("theme-dark", input.checked);
            // removeIf(!allowDebug)
            _config.doDebug &&
              console.debug(
                "--> document.body class: %s",
                document.body.className
              );
            // endRemoveIf(!allowDebug)
          } else if (key === "isEnabled") {
            setEnabledStateUi(input.checked);
          }
          // removeIf(!allowDebug)
          _config.doDebug &&
            console.debug(
              "--> %s checkbox %s.",
              input.checked ? "Checked" : "Unchecked",
              key
            );
          // endRemoveIf(!allowDebug)
        } else if (key === "checkInterval") {
          input.value = "" + config[key];
          // removeIf(!allowDebug)
          _config.doDebug &&
            console.debug("--> %s set to %s.", key, input.value);
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
  document.body.addEventListener("input", (event) => {
    // removeIf(!allowDebug)
    _config.doDebug &&
      console.debug("Handling change event on %s", event.target.id, event);
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
        (target) => {
          if (target.validity.valid) {
            updateConfigValue(target.id, +target.value);
          } else {
            // Restore the previous value after debounceDelay (msecs).
            chrome.storage.sync.get(target.id, (value) => {
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
        _config.doDebug &&
          console.debug(
            "--> document.body className: %s",
            document.body.className
          );
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
    _config[key] = value;
    // Notify background script about the new config value. (Background script manages updating storage.)
    const updateConfigCommand = {
      action: "updateConfig",
      data: { key, value },
      sender: "config",
    };
    chrome.runtime.sendMessage(updateConfigCommand);
    if (key === "isEnabled") {
      setEnabledStateUi(value);
    }
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
    .forEach((elt) => (elt.disabled = !isEnabled));
} // end of setEnabledStateUi().
