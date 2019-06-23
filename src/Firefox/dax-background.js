browser.runtime.onInstalled.addListener(async () => {
  let _config = defaultConfig;
  // Make sure the extension's options are stored when the extension starts up.
  // Pass `null` so we get everything in storage. This allows us to clean up
  // obsolete config values (see else block below).
  try {
    _config = await browser.storage.sync.get(defaultConfig);
    if (!Object.keys(_config).length) {
      await browser.storage.sync.set(defaultConfig);
    } else {
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
    }
    setIcon(!!_config.checkInterval);
  } catch (error) {
    console.info(`Storage operation failed: ${error}.`);
  }

  // Listen for messages from content and config scripts.
  browser.runtime.onMessage.addListener(msg => {
    // removeIf(!allowDebug)
    _config.doDebug && console.debug("Got message: %o", msg);
    // endRemoveIf(!allowDebug)
    if (msg.action === "setIcon" && typeof msg.data !== "undefined") {
      setIcon(!!msg.data);
    }
  });

  // Set the extension's icon.
  async function setIcon(isRunning) {
    try {
      const tabs = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      // removeIf(!allowDebug)
      _config.doDebug &&
        console.debug(`--> Setting icon.`);
      // endRemoveIf(!allowDebug)
      browser.pageAction.setIcon({
        tabId: tabs[0].id,
        path: isRunning
          ? "images/disqus_eye_16.png"
          : "images/disqus_eye_16_paused.png",
      });
    } catch (error) {
      console.info(
        `updateConfigValue(): couldn't get active tab to set icon: ${error}.`
      );
      return;
    }
  } // end of setIcon().
}); // end of onInstalled listener.
