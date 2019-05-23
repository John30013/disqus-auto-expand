let _options = {...defaultConfig};

// Listen for option updates.
chrome.extension.onMessage.addListener(function (msg, sender, sendResponse) {
  if (msg.action === 'refreshOptions') {
    refreshOptions();
  }
});

// Start the extension.
refreshOptions();
_options.doDebug && console.debug(`content.js is running in iframe ${window.name}.`);
showItems();

// End of main code.

/* ====== Helper functions ====== */
function showItems() {
  _options.doDebug && console.debug('showItems: starting.');
  let repliesSelector = [];
  if (_options.moreReplies) {
    repliesSelector.push('div.show-children-wrapper:not(.hidden) > a.show-children:not(.busy)');
  }
  if (_options.newReplies) {
    repliesSelector.push('a.realtime-button.reveal:not([style*="display: none;"])');
  }
  if (repliesSelector.length) {
    // Expand all replies:
    document.querySelectorAll(repliesSelector.join(',')).forEach(link => {
      _options.doDebug && console.debug('--> Clicking replies link: %o', link);
      link.click();
    });
  }
  // Expand media items (do this after expanding all replies, in case replies have truncated media items.)
  if (_options.longItems) {
    //  
    document.querySelectorAll('a.see-more:not(.hidden), a.curtain-truncate:not(.hidden)').forEach(link => {
      _options.doDebug && console.debug('--> Clicking "see more" link: %o', link);
      link.click();
    });
  }
  // Check again after the checkInterval.
  window.setTimeout(showItems, _options.checkInterval * 1000);
  _options.doDebug && console.debug('showItems: exiting.');
}

function refreshOptions() {
  chrome.storage.sync.get(defaultConfig, (options) => {
    _options = options;
    _options.doDebug && console.debug("Got sync'd options: %o", _options);
  });
}
// - Load more posts:
// document.querySelector('a.load-more__button')
// - Show new comments (blue button at the top of the page):
// <button class="alert alert--realtime" data-role="realtime-notification" style="">Show 5 New Comments</button>
