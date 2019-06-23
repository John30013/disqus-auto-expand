chrome.runtime.onInstalled.addListener(() => {
  let _config = defaultConfig;
  // Make sure the extension's options are stored when the extension starts up.
  // Pass `null` so we get everything in storage. This allows us to clean up
  // obsolete config values (see else block below).
  chrome.storage.sync.get(null, config => {
    if (chrome.runtime.lastError) {
      console.info(
        `Couldn't get configuration options from storage: ${
          chrome.runtime.lastError.message
        }`
      );
      return;
    }
    if (!Object.keys(config).length) {
      chrome.storage.sync.set(defaultConfig);
    } else {
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
            // removeIf(!allowDebug)
          } else {
            config.doDebug &&
              console.debug(
                "--> removed obsolete config values,",
                obsoleteKeys
              );
            // endRemoveIf(!allowDebug)
          }
        });
      }
      _config = config;
    } // end of else block (got config items from storage).
    setIcon(!!_config.checkInterval);
  }); // end of chrome.storage.sync.get() callback.

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
    ]);
  });

  // Listen for messages from content and config scripts.
  chrome.runtime.onMessage.addListener(msg => {
    // removeIf(!allowDebug)
    _config.doDebug && console.debug("Got message: %o", msg);
    // endRemoveIf(!allowDebug)
    if (msg.action === "setIcon" && typeof msg.data !== "undefined") {
      setIcon(!!msg.data);
    }
  });

  // Set the extension's icon.
  function setIcon(isRunning) {
    // removeIf(!allowDebug)
    _config.doDebug && console.debug(`setIcon(${isRunning}): entering.`);
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
        // removeIf(!allowDebug)
        _config.doDebug && console.debug(`--> Setting icon.`);
        // endRemoveIf(!allowDebug)
        chrome.pageAction.setIcon({
          tabId: tabs[0].id,
          path: isRunning
            ? "images/disqus_eye_16.png"
            : "images/disqus_eye_16_paused.png",
        });
      }
    );
  } // end of setIcon().
}); // end of onInstalled listener.
