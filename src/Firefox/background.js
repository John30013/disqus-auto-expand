browser.runtime.onInstalled.addListener(() => {
  browser.storage.sync.get(null)
    .then(config => {
      if (!Object.keys(config).length) {
        browser.storage.sync.set(defaultConfig)
          .then(() => {
            console.debug("Default config stored: %o", defaultConfig);
          });
      } else {
        console.debug('Found existing config: %o', config);
      }
    })
    .catch(error => {
      console.error(`Couldn't get configuration options from sync'd storage: ${error}`);
    });
});
