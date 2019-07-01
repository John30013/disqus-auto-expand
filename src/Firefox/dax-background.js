let _config = defaultConfig,
  _manifest = chrome.runtime.getManifest();

browser.runtime.onInstalled.addListener(async () => {
  // Make sure the extension's options are stored when the extension starts up.
  // Pass `null` so we get everything in storage. This allows us to clean up
  // obsolete config values (see else block below).
  try {
    _config = await browser.storage.sync.get(null /*defaultConfig*/);
    if (!Object.keys(_config).length) {
      // removeIf(!allowDebug)
      console.debug("Config not found in storage; storing default config.");
      // endRemoveIf(!allowDebug)
      browser.storage.sync.set(defaultConfig);
    } else {
      // removeIf(!allowDebug)
      console.debug("Got config from storage: %o", config);
      // endRemoveIf(!allowDebug)

      // Check for and remove obsolete config items.
      let obsoleteKeys = [];
      for (let key in _config) {
        if (!defaultConfig.hasOwnProperty(key)) {
          obsoleteKeys.push(key);
        }
      }
      if (obsoleteKeys.length) {
        await browser.storage.sync.remove(obsoleteKeys);
        // removeIf(!allowDebug)
        _config.doDebug &&
          console.debug("--> removed obsolete config value(s)", obsoleteKeys);
        // endRemoveIf(!allowDebug)
      }
    } // end of block to process config values from storage.
  } catch (error) {
    console.info(`Storage operation failed: ${error}.`);
  } // browser.storage.sync.get() try/catch block.
  setIcon(!!_config.isEnabled);
}); // browser.runtime.onInstalled.addListener().

// Listen for messages from other DAX scripts.
browser.runtime.onMessage.addListener(msg => {
  // removeIf(!allowDebug)
  _config.doDebug && console.debug("Got message: %o", msg);
  // endRemoveIf(!allowDebug)
  if (msg.action === "setIcon" && typeof msg.data !== "undefined") {
    setIcon(!!msg.data);
  } else if (msg.action === "updateConfig" && typeof msg.data === "object") {
    updateConfig(msg.data);
  }
});

/* ===== Helper functions.===== */
/**
 * Sets the extension icon based on the value of the parameter.
 * @param {Boolean} isEnabled - Whether the extension is actively processing
 * new links.
 */
async function setIcon(isEnabled) {
  // removeIf(!allowDebug)
  _config.doDebug && console.debug(`setIcon(${isEnabled}): entering.`);
  // endRemoveIf(!allowDebug)
  try {
    const tabs = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tabs[0]) {
      // removeIf(!allowDebug)
      _config.doDebug && console.debug(`--> Setting icon.`);
      // endRemoveIf(!allowDebug)
      browser.pageAction.setIcon({
        tabId: tabs[0].id,
        path: isEnabled
          ? "images/disqus_eye_16.png"
          : "images/disqus_eye_16_paused.png",
      });
      browser.pageAction.setTitle({
        tabId: tabs[0].id,
        title: `${_manifest.page_action.default_title}${
          isEnabled ? "" : " (paused)"
        }`,
      });
    } else {
      console.info("No active tab; aborting.");
    }
  } catch (error) {
    console.info(
      `updateConfigValue(): couldn't get active tab to set icon: ${error}.`
    );
  } // end chrome.tabls.query() try/catch block.
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
