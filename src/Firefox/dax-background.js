browser.runtime.onInstalled.addListener(async () => {
  // Make sure current configuration options are available in storage.
  try {
    let config = await browser.storage.sync.get(null);
    if (!Object.keys(config).length) {
      await browser.storage.sync.set(defaultConfig);
      console.debug("Stored default config: %o", defaultConfig);
    } else {
      config.doDebug && console.debug('Found existing config: %o', config);
      // Check for and remove obsolete config items.
      for (let key in config) {
        if (!defaultConfig.hasOwnProperty(key)) {
          await browser.storage.sync.remove(key);
          config.doDebug && console.debug('--> removed obsolete config value %s', key);
        }
      }
    }
  }
  catch(error) {
    console.error(`Storage operation failed: ${error}.`);
  }
});

if (document.getElementById('disqus_thread') === null) {
  browser.pageAction.hide();
}