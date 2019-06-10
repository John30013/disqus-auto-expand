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

// Listen for connections from the content script.
function handleContentMessage(msg) {
  _config.doDebug && console.debug("Got message:", msg);
  if ((msg.request === "installJumpStopper")) {
    (async () => {
      await browser.tabs.executeScript(_callers[msg.caller].tabId,
        {"code": `window.daxOptions = ${JSON.stringify(_config)};`});
      browser.tabs.executeScript(_callers[msg.caller].tabId, 
          {"file": "/dax-stopPageJumps.js"})
        .then(result => {
          _config.doDebug &&
            console.debug(
              'installJumpStopper request from "%s":',
              msg.caller,
              result
            );
        });
    })();
  }

  // Handle disconnect request. It can come as part of another message, or as its own message.
  if (msg.disconnect || msg.request === 'disconnect') {
    _callers[msg.caller].port.disconnect();
    delete _callers[msg.caller];
    _config.doDebug && console.debug('Closed port for "%s"', msg.caller);
  }
}

browser.runtime.onConnect.addListener(port => {
  _callers[port.sender.url] = {"port": port, "tabId": port.sender.tab.id};
  _config.doDebug && console.debug('Got connection from port', port);
  port.onMessage.addListener(handleContentMessage);
});
