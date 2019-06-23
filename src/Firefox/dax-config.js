let _config = { ...defaultConfig };

// Initialize some text in the UI.
initUiText();

// Initialize configuration controls with values from storage
// and listen for updates.
getCurrentConfig();
listenForUpdates();

// Initialize the "Load all content" button and confirmation dialog.
initLoadAllContent();

/* ========== End of main code. ==========
  ===== Helper functions follow. ===== */

function initUiText() {
  const manifest = browser.runtime.getManifest();
  document.querySelectorAll(".version").forEach(elt => {
    elt.innerHTML = manifest.version;
  });
  document.querySelectorAll("a.extensionStore").forEach(link => {
    link.href =
      "https://addons.mozilla.org/firefox/addon/disqus-auto-expander/";
    link.innerText = "Firefox Add-ons site";
  });
}

async function getCurrentConfig() {
  let config;
  try {
    config = await browser.storage.sync.get(defaultConfig);
    // removeIf(!allowDebug)
    logDebug("config.js loaded.");
    logDebug("Setting config from storage: %o", config);
    // endRemoveIf(!allowDebug)
    for (let key in config) {
      let input = document.getElementById(key);
      if (!input) {
        // removeIf(!allowDebug)
        logDebug('--> Skipped option "%s" with no control.', key);
        // endRemoveIf(!allowDebug)
        continue;
      }
      if (input.type === "checkbox") {
        input.checked = config[key];
        if (key === "useDarkTheme") {
          document.body.classList.toggle("theme-dark", input.checked);
          // removeIf(!allowDebug)
          logDebug("--> document.body classes: %s", document.body.className);
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
  } catch (error) {
    console.info("Couldn't initialize config from storage: %s", error);
  }
} // end of getCurrentConfig().

// Handle changes in the configuration controls.
function listenForUpdates() {
  document.body.addEventListener("input", event => {
    // removeIf(!allowDebug)
    logDebug("Handling change event on %s", event.target.id);
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
            browser.storage.sync
              .get(target.id)
              .then(value => {
                target.value = value[target.id];
              })
              .catch(error => {
                console.info(
                  "Couldn't get config value %s from storage: %s",
                  target.id,
                  error
                );
              });
            return;
          }
        },
        1000,
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

  async function updateConfigValue(key, value) {
    try {
      await browser.storage.sync.set({ [key]: value });
      // removeIf(!allowDebug)
      logDebug(
        '--> Updated config option "%s" to (%s) "%s"',
        key,
        typeof value,
        value
      );
      // endRemoveIf(!allowDebug)
    } catch (error) {
      console.info(
        `Couldn't store option ${key} with value ${value}: ${error}.`
      );
    }
    if (key !== "useDarkTheme") {
      try {
        const tabs = await browser.tabs.query({
          active: true,
          currentWindow: true,
        });
        browser.tabs.sendMessage(tabs[0].id, { action: "refreshConfig" });
      } catch (error) {
        console.info(
          `updateConfigValue(): couldn't get active tab to send a message to: ${error}.`
        );
      }
      if (key === "checkInterval") {
        setIcon(!!value);
      }
    } // end of dark theme handling.
  } // end of updateConfigValue().
} // end of listenForUpdates().

// Initailize the "Load all content" button and confirmation dialog.
function initLoadAllContent() {
  // Initialize the confirmation dialog.
  const dialog = document.getElementById("confirmLoadAllContent"),
    dialogClickablesSelector = "a:link, button",
    openClass = "dialog-open",
    focusableClass = "dialog-focusable";

  dialog.querySelectorAll(dialogClickablesSelector).forEach(elt => {
    elt.classList.add(focusableClass);
  });
  closeDialog(dialog);

  // Initialize the "Load all content" button. The button is disabled
  // by default, and only an affirmative ping from the content script
  // will enable it.
  const button = document.getElementById("loadAllContent");
  button.addEventListener("click", event => {
    openDialog(dialog, event.target);
  });
  sendContentCommand({ action: "ping", caller: "config" }, reply => {
    if (reply && reply.value === "pong") {
      logDebug(
        "Got reply from 'ping' request: %o; enabling Load all content button.",
        reply
      );
      button.disabled = false;
    }
  });

  /* ========== Helpers ========== */
  function closeDialog(dialog) {
    // removeIf(!allowDebug)
    logDebug("closeDialog: %o", dialog);
    // endRmoveIf(!allowDebug)
    getNonDialogFocusables().forEach(elt => {
      if (elt.dataset.tabindex) {
        elt.tabIndex = elt.dataset.tabindex;
      } else {
        elt.tabIndex = 0;
      }
    });
    dialog.classList.remove(openClass);
    dialog.setAttribute("aria-hidden", "true");
    dialog.querySelectorAll(dialogClickablesSelector).forEach(elt => {
      elt.tabIndex = -1;
    });
  } // end of closeDialog().

  function openDialog(dialog, opener) {
    // removeIf(!allowDebug)
    logDebug("openDialog: %o", dialog);
    // endRemoveIf(!allowDebug)
    // Disable focus on focusable elements outside the dialog.
    getNonDialogFocusables().forEach(elt => {
      if (elt.tabIndex) {
        elt.dataset.tabindex = elt.tabIndex;
      }
      elt.tabIndex = -1;
    });
    // Show the dialog.
    dialog.querySelectorAll(dialogClickablesSelector).forEach(elt => {
      elt.tabIndex = 0;
    });
    dialog.tabIndex = -1;
    dialog.focus();
    dialog.classList.add(openClass);
    dialog.setAttribute("aria-hidden", "false");
    dialog.addEventListener("click", event => {
      const source = event.target;
      if (source.tagName === "BUTTON") {
        event.preventDefault();
        if (source.value === "yes") {
          sendContentCommand({
            action: "loadAllContent",
            caller: "config",
          });
          window.close();
        } else {
          closeDialog(dialog);
          opener.focus();
        }
      }
    });
  } // end of openDialog().

  function getNonDialogFocusables() {
    return Array.from(
      document.querySelectorAll("a:link, button, input")
    ).filter(elt => !elt.classList.contains(focusableClass));
  } // end of getNonDialogClickables().
} // end of initLoadAllContent().

async function sendContentCommand(commandData, responseCallback) {
  try {
    const tabs = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    const responseCallback = await browser.tabs.sendMessage(
      tabs[0].id,
      commandData
    );
    if (responseCallback) {
      responseCallback(response);
    }
  } catch (error) {
    console.info(`sendContentCommand(): couldn't send command: ${error}.`);
  }
} // end of sendContentCommand().

// removeIf(!allowDebug)
function logDebug(message, ...params) {
  console.debug(message, ...params);
  sendContentCommand({
    action: "logDebug",
    caller: "config",
    message: message,
    params: params,
  });
}
// endRemoveIf(!allowDebug)
