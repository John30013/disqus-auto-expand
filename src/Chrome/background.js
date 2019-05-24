chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set(defaultConfig, () => {
    console.debug("Default settings stored: %o", defaultConfig);
  });
  chrome.declarativeContent.onPageChanged.removeRules(undefined, function () {
    chrome.declarativeContent.onPageChanged.addRules([{
      conditions: [new chrome.declarativeContent.PageStateMatcher({
          css: ["#disqus_thread"]
        })
      ],
      actions: [new chrome.declarativeContent.ShowPageAction()]
    }]);
  });
});
