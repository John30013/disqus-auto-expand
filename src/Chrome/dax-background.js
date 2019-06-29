let _config = defaultConfig,
  _manifest = chrome.runtime.getManifest();

chrome.runtime.onInstalled.addListener(() => {
  /* Make sure the extension's options are stored when the extension starts up.
  Pass `null` so we get everything in storage. This allows us to clean up
  obsolete config values (see the `else` block below). */
  chrome.storage.sync.get(null, config => {
    if (chrome.runtime.lastError) {
      console.info(
        `Couldn't get configuration options from storage: ${
          chrome.runtime.lastError.message
        }`
      );
      return;
    } // if (chrome.runtime.lastError)
    if (!Object.keys(config).length) {
      // removeIf(!allowDebug)
      console.debug("Config not found in storage; storing default config.");
      // endRemoveIf(!allowDebug)
      chrome.storage.sync.set(defaultConfig);
    } else {
      // removeIf(!allowDebug)
      console.debug("Got config from storage: %o", config);
      // endRemoveIf(!allowDebug)

      // Check for and remove obsolete config items.
      let obsoleteKeys = [];
      for (let key in config) {
        if (!defaultConfig.hasOwnProperty(key)) {
          obsoleteKeys.push(key);
        }
      }
      if (obsoleteKeys.length) {
        chrome.storage.sync.remove(obsoleteKeys, () => {
          if (chrome.runtime.lastError) {
            console.info(
              `Couldn't remove obsolete keys from storage: ${
                chrome.runtime.lastError.message
              }.`
            );
          }
          // removeIf(!allowDebug)
          else {
            config.doDebug &&
              console.debug(
                "--> removed obsolete config values,",
                obsoleteKeys
              );
          }
          // endRemoveIf(!allowDebug)
        }); // end chrome.storage.sync.remove() callback.
      } // if (obsoleteKeys.length)
      _config = config;
    } // end of else block (got config items from storage).
    setIcon(!!_config.isEnabled);
  }); // end of chrome.storage.sync.get() callback.

  // Reset & reinstall PageStateMatcher.
  chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
    chrome.declarativeContent.onPageChanged.addRules([
      {
        conditions: [
          new chrome.declarativeContent.PageStateMatcher({
            css: ["#disqus_thread"],
          }),
        ],
        actions: [new chrome.declarativeContent.ShowPageAction()],
      },
    ]); // chrome.declarativeContent.onPageChanged.addRules()
  }); // chrome.declarativeContent.onPageChanged.removeRules()
}); // chrome.runtime.onInstalled.addListener()

// Listen for messages from other DAX scripts.
chrome.runtime.onMessage.addListener(msg => {
  // removeIf(!allowDebug)
  _config.doDebug && console.debug("Got message: %o", msg);
  // endRemoveIf(!allowDebug)
  if (msg.action === "setIcon" && typeof msg.data !== "undefined") {
    setIcon(msg.data);
  } else if (msg.action === "updateConfig" && typeof msg.data === "object") {
    updateConfig(msg.data);
  }
});

/* ===== Helper functions.===== */
/**
 * Sets the extension icon based on the value of the parameter.
 * @param {Boolean} isEnabled - Whether the extension is actively processing
 * new links (i.e., checkInterval is zero).
 */
function setIcon(isEnabled) {
  // removeIf(!allowDebug)
  _config.doDebug && console.debug(`setIcon(${isEnabled}): entering.`);
  // endRemoveIf(!allowDebug)
  chrome.tabs.query(
    {
      active: true,
      currentWindow: true,
    },
    tabs => {
      if (chrome.runtime.lastError) {
        console.info(
          `setIcon(): couldn't get active tab to send message: ${
            chrome.runtime.lastError.message
          }.`
        );
        return;
      }
      if (tabs[0]) {
        // removeIf(!allowDebug)
        _config.doDebug && console.debug(`--> Setting icon.`);
        // endRemoveIf(!allowDebug)
        chrome.pageAction.setIcon({
          tabId: tabs[0].id,
          path: isEnabled
            ? "images/disqus_eye_16.png"
            : "images/disqus_eye_16_paused.png",
        });
        chrome.pageAction.setTitle({
          tabId: tabs[0].id,
          title: `${_manifest.page_action.default_title}${
            isEnabled ? "" : " (paused)"
          }`,
        });
      } else {
        console.info("No active tab; aborting.");
      }
    } // end of chrome.tabs.query() callback.
  ); // end of chrome.tabs.query().
} // end of setIcon().

/**
 * Updates the local copy of the config with the key and value identified in
 * the parameter. If the key is "isEnabled", also sets the extension icon.
 * @param {Object} newConfigData - an object containing the configuration key
 * and value to update.
 */
function updateConfig(newConfigData) {
  const { key, value } = newConfigData;
  _config[key] = value;
  // removeIf(!allowDebug)
  _config.doDebug && console.debug("Updated _config.%s to %s", key, value);
  // endRemoveIf(!allowDebug)
  if (key === "isEnabled") {
    setIcon(value);
  }
} // end of updateConfig().
