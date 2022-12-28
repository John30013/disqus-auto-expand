import { defaultConfig } from "./dax-defaultConfig.js";
// const defaultConfig = {
//   isEnabled: true,
//   moreReplies: true,
//   newReplies: true,
//   longItems: true,
//   moreComments: true,
//   newComments: true,
//   checkInterval: 5,
//   stopAutoplay: true,
//   openInNewWindow: true,
//   useDarkTheme: false,
//   doDebug: false,
// };

let _config = defaultConfig,
  _manifest = chrome.runtime.getManifest();

chrome.runtime.onInstalled.addListener(() => {
  /* Make sure the extension's options are stored when the extension starts up.
  Pass `null` so we get everything in storage. This allows us to clean up
  obsolete config values (see the `else` block below). */
  chrome.storage.sync.get(null, (config) => {
    if (!chrome.runtime.lastError) {
      if (!Object.keys(config).length) {
        // removeIf(!allowDebug)
        console.debug("Config not found in storage; storing default config.");
        // endRemoveIf(!allowDebug)
        chrome.storage.sync.set(defaultConfig);
      } else {
        _config = config;
        // removeIf(!allowDebug)
        console.debug("Got config from storage: %o", _config);
        // endRemoveIf(!allowDebug)

        // Check for and remove obsolete config items.
        let obsoleteKeys = [];
        for (let key in _config) {
          if (!defaultConfig.hasOwnProperty(key)) {
            obsoleteKeys.push(key);
          }
        }
        if (obsoleteKeys.length) {
          chrome.storage.sync.remove(obsoleteKeys, () => {
            if (!chrome.runtime.lastError) {
              // removeIf(!allowDebug)
              _config.doDebug &&
                console.debug(
                  "--> removed obsolete config value(s),",
                  obsoleteKeys
                );
              // endRemoveIf(!allowDebug)
            } else {
              console.info(
                `Couldn't remove obsolete keys from storage: ${chrome.runtime.lastError.message}.`
              );
            }
          }); // end chrome.storage.sync.remove() callback.
          for (let key of obsoleteKeys) {
            delete _config[key];
          }
        } // if (obsoleteKeys.length)

        // See if we need to add any new keys to config.
        if (Object.keys(_config).length < Object.keys(defaultConfig).length) {
          _config = { ...defaultConfig, ..._config };
          updateSyncedConfig(_config);
        } // if ([fewer _config keys than defaultConfig keys]).
      } // end of else block (got config items from storage).
    } else {
      console.info(
        `Couldn't get configuration options from storage: ${chrome.runtime.lastError.message}`
      );
      return;
    } // else (chrome.runtime.lastError)
    setIcon(!!_config.isEnabled);
  }); // end of chrome.storage.sync.get() callback.

  // Reset & reinstall PageStateMatcher.
  chrome.declarativeContent.onPageChanged.removeRules(undefined, function () {
    chrome.declarativeContent.onPageChanged.addRules([
      {
        conditions: [
          new chrome.declarativeContent.PageStateMatcher({
            css: ["#disqus_thread"],
          }),
        ],
        actions: [new chrome.declarativeContent.ShowAction()],
      },
    ]); // chrome.declarativeContent.onPageChanged.addRules()
  }); // chrome.declarativeContent.onPageChanged.removeRules()
}); // chrome.runtime.onInstalled.addListener()

// Listen for messages from other DAX scripts.
chrome.runtime.onMessage.addListener((msg) => {
  // removeIf(!allowDebug)
  _config.doDebug && console.debug("Got message: %o", msg);
  // endRemoveIf(!allowDebug)
  if (msg.action === "setIcon" && typeof msg.data !== "undefined") {
    setIcon(msg.data);
  } else if (msg.action === "updateConfig" && typeof msg.data === "object") {
    updateConfigValue(msg.data);
    if (msg.data.key === "isEnabled") {
      // removeIf(!allowDebug)
      _config.doDebug &&
        console.debug(
          "--> config value `isEnabled` updated to %o; calling setIcon().",
          msg.data.value
        );
      // endRemoveIf(!allowDebug)
      setIcon(msg.data.value);
    }
  }
});

/* ===== Helper functions.===== */
/**
 * Sets the extension icon based on the value of the parameter.
 * @param {Boolean} isEnabled - Whether the extension is actively processing
 * new links.
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
    ([tab]) => {
      if (chrome.runtime.lastError) {
        console.info(
          `--> Couldn't get active tab to send message: ${chrome.runtime.lastError.message}.`
        );
        return;
      }

      if (!tab) {
        console.info("--> No active tab; aborting.");
        return;
      }

      // removeIf(!allowDebug)
      _config.doDebug && console.debug(`--> Setting icon.`);
      // endRemoveIf(!allowDebug)
      chrome.action.setIcon({
        tabId: tab.id,
        path: isEnabled
          ? "images/disqus_eye_16.png"
          : "images/disqus_eye_16_paused.png",
      });
      chrome.action.setTitle({
        tabId: tab.id,
        title: `${_manifest.page_action.default_title}${
          isEnabled ? "" : " (paused)"
        }`,
      });
    }
  ); // end of chrome.tabs.query().
} // end of setIcon().

/**
 * Updates the local copy of the config with the key and value identified in
 * the parameter. If the key is "isEnabled", also sets the extension icon.
 * @param {Object} newConfigData - an object containing the configuration key
 * and value to update.
 */
function updateConfigValue(newConfigData) {
  const { key, value } = newConfigData;
  chrome.storage.sync.get(null, (config) => {
    config[key] = value;
    updateSyncedConfig(config);
  });
} // end of updateConfigValue().

function updateSyncedConfig(config) {
  chrome.storage.sync.set(config, () => {
    if (chrome.runtime.lastError) {
      console.error(
        `Couldn't update config in storage: ${chrome.runtime.lastError.message}`
      );
      return;
    }
    // removeIf(!allowDebug)
    config.doDebug &&
      console.debug("--> added updated config values to storage: %o", config);
    // endRemoveIf(!allowDebug)
  }); // chrome.storage.sync.set() callback.
}
