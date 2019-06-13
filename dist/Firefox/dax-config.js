let _options = { ...defaultConfig };

// removeIf(!allowDebug)
function logDebug(message, ...params) {
  browser.tabs
    .query({ active: true, currentWindow: true })
    .then(function(tabs) {
      const messageData = {
        action: "logDebug",
        caller: "config",
        message: message,
        params: params,
      };
      browser.tabs.sendMessage(tabs[0].id, messageData);
    })
    .catch(error => {
      console.error(
        `logDebug(): couldn't get active tab to send a message to: ${error}.`
      );
    });
}
// endRemoveIf(!allowDebug)

// Initialize some text in the config UI.
const manifest = browser.runtime.getManifest();
document.querySelector("span#version").innerHTML = manifest.version;
document.querySelectorAll("a.extensionStore").forEach(link => {
  link.href = "https://addons.mozilla.org/firefox/addon/disqus-auto-expander/";
  link.innerText = "Firefox Add-ons site";
});

// Initialize configuration controls from storage.
browser.storage.sync
  .get(defaultConfig)
  .then(options => {
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
      } else if (input.getAttribute("inputmode") === "numeric") {
        input.value = "" + options[key];
        // removeIf(!allowDebug)
        logDebug("--> %s set to %s.", key, input.value);
        // endRemoveIf(!allowDebug)
      }
    }
  })
  .catch(error => {
    console.error("Couldn't initialize options from storage: %s", error);
  });

// Handle changes in the configuration controls.
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
              console.error(
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

function updateConfigValue(key, value) {
  browser.storage.sync
    .set({ [key]: value })
    .then(() => {
      // removeIf(!allowDebug)
      logDebug(
        '--> Updated config option "%s" to (%s) "%s"',
        key,
        typeof value,
        value
      );
      // endRemoveIf(!allowDebug)
    })
    .catch(error => {
      console.error(
        `Couldn't store option ${key} with value ${value}: ${error}.`
      );
    });
  if (key !== "useDarkTheme") {
    browser.tabs
      .query({ active: true, currentWindow: true })
      .then(tabs =>
        browser.tabs.sendMessage(tabs[0].id, { action: "refreshOptions" })
      )
      .catch(error => {
        console.error(
          `updateConfigValue(): couldn't get active tab to send a message to: ${error}.`
        );
      });
  }
}
