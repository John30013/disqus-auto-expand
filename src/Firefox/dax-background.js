let _config = defaultConfig,
  _callers = {};

// Make sure the extension's options are stored when the extension starts up.
browser.runtime.onInstalled.addListener(async () => {
  // Make sure current configuration options are available in storage.
  try {
    _config = await browser.storage.sync.get(defaultConfig);
    if (!Object.keys(_config).length) {
      await browser.storage.sync.set(defaultConfig);
      console.debug("Stored default config: %o", defaultConfig);
    } else {
      _config.doDebug && console.debug('Found existing config: %o', _config);
      // Check for and remove obsolete config items.
      for (let key in _config) {
        if (!defaultConfig.hasOwnProperty(key)) {
          await browser.storage.sync.remove(key);
          _config.doDebug && console.debug('--> removed obsolete config value %s', key);
        }
      }
    }
  }
  catch(error) {
    console.error(`Storage operation failed: ${error}.`);
  }
});
