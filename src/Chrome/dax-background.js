let _config = defaultConfig;

// Make sure the extension's options are stored when the extension starts up.
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(null, config => {
    if (chrome.runtime.lastError) {
      console.error(
        `Couldn't get configuration options from storage: ${
          chrome.runtime.lastError
        }`
      );
      return;
    }
    if (!Object.keys(config).length) {
      chrome.storage.sync.set(defaultConfig, () => {
        // console.debug("Stored default config: %o", defaultConfig);
      });
    } else {
      _config.doDebug && console.debug("Found existing config: %o", config);
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
            console.error(
              `Couldn't remove obsolete keys from storage: ${
                chrome.runtime.lastError
              }.`
            );
          } else {
            config.doDebug &&
              console.debug(
                "--> removed obsolete config values,",
                obsoleteKeys
              );
          }
        });
      }
    }
  });

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
});
