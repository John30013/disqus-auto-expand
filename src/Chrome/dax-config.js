let _options = { ...defaultConfig };

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
  chrome.storage.sync.get(defaultConfig, options => {
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
      } else if (input.getAttribute("inputmode") === "numeric") {
        input.value = "" + options[key];
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
            chrome.storage.sync.get(target.id, value => {
              if (chrome.runtime.lastError) {
                console.error(
                  "Couldn't get config value %s from storage: %s",
                  target.id,
                  chrome.runtime.lastError
                );
                return;
              }
              target.value = value[target.id];
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

  function updateConfigValue(key, value) {
    chrome.storage.sync.set({ [key]: value }, () => {
      if (chrome.runtime.lastError) {
        console.error(
          `Couldn't store option ${key} with value ${value}: ${
            chrome.runtime.lastError
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
          console.error(
            `updateConfigValue(): couldn't get active tab to send a message to: ${
              chrome.runtime.lastError
            }.`
          );
          return;
        }
        chrome.tabs.sendMessage(tabs[0].id, { action: "refreshOptions" });
      });
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

  // Initialize the "Load all content" button.
  document.getElementById("loadAllContent").addEventListener("click", event => {
    // removeIf(!allowDebug)
    logDebug("Load all content button clicked!");
    // endRemoveIf(!allowDebug)
    openDialog(dialog, event.target);
  });

  /* ========== Helpers ========== */
  function closeDialog(dialog) {
    // removeIf(!allowDebug)
    logDebug(`closeDialog: ${dialog}`);
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
    logDebug(`openDialog: ${dialog}`);
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

function sendContentCommand(commandData) {
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    if (chrome.runtime.lastError) {
      console.error(
        `sendContentCommand(): couldn't get active tab for sendMessage: ${
          chrome.runtime.lastError
        }.`
      );
      return;
    }
    chrome.tabs.sendMessage(tabs[0].id, commandData);
  });
}

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
