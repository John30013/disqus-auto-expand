console && console.debug('background.js: started.');
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(null, (config) => {
    if (!Object.keys(config).length) {
      chrome.storage.sync.set(defaultConfig, () => {
        console.debug("Default config stored: %o", defaultConfig);
      });
    } else {
      console.debug('Found existing config: %o', config);
    }
  });
  // TODO: find another way of doing this in Firefox since declarativeContent is not supported.
/*   chrome.declarativeContent.onPageChanged.removeRules(undefined, function () {
    // TODO: allow any page to match so config can be updated any time.
    chrome.declarativeContent.onPageChanged.addRules([{
      conditions: [new chrome.declarativeContent.PageStateMatcher({
          css: ["#disqus_thread"]
        })
      ],
      actions: [new chrome.declarativeContent.ShowPageAction()]
    }]);
  });
 */
});
