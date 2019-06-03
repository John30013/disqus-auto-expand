chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(null, 
    config => {
      if (chrome.runtime.lastError) {
        console.error(`Couldn't get configuration options from sync'd storage: ${error}`);
        return;
      }
      if (!Object.keys(config).length) {
        chrome.storage.sync.set(defaultConfig, 
          () => {
            console.debug("Default config stored: %o", defaultConfig);
          });
      } else {
        console.debug('Found existing config: %o', config);
      }
    }
  );
  chrome.declarativeContent.onPageChanged.removeRules(undefined, function () {
    // TODO: allow any page to match so config can be updated any time.
    chrome.declarativeContent.onPageChanged.addRules([{
      conditions: [new chrome.declarativeContent.PageStateMatcher({
          css: ["#disqus_thread"]
        })
      ],
      actions: [new chrome.declarativeContent.ShowPageAction()]
    }]);
  });
});
