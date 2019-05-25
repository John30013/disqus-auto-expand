let _options = {...defaultConfig},
  _timer = null,
  _observer = null,
  _observedDuids = {};

// Listen for option updates.
chrome.extension.onMessage.addListener(function (msg, sender, sendResponse) {
  // _options.doDebug && console.debug('Got message: %o', msg);
  if (msg.action === 'refreshOptions') {
    refreshOptions();
  }
  else if (msg.action === 'logDebug' && msg.message) {
    _options.doDebug && console.debug(`[${msg.caller}] ${msg.message}`, ...msg.params);
  }
});

// Set up the IntersectionObserver to watch for auto-expand items coming into the viewport.
_observer = new IntersectionObserver(function(entries, me) {
  if (_options.checkInterval) {
    entries.forEach(entry => {
      const link = entry.target;
      _options.doDebug && console.debug('Checking intersection of "%s" link %s', link.className, link.dataset.duid);
      if (entry.isIntersecting) {
        setTimeout(() => {
          link.click();
          link.title += ' clicked!';
          me.unobserve(link);
          delete _observedDuids[link.dataset.duid];
          _options.doDebug && console.debug('--> Clicked %s (now %d observed)', link.dataset.duid, Object.keys(_observedDuids).length);
        }, 100);
      }
    });
  }
}, {threshold: 1.0});

// Start the extension.
refreshOptions();
_options.doDebug && console.debug(`content.js is running in iframe ${window.name}.`);
processNewShowLinks();

// End of main code.

/* ====== Helper functions ====== */
function processNewShowLinks() {
  // Since processNewShowLinks() can be called by refreshOptions() when checkInterval is 
  // set to zero, clear any pending timeout first. It's a no-op if this call is
  // the result of the timer timing out.
  if (_timer) {
    window.clearTimeout(_timer);
  }
  if (!_options.checkInterval) {
    _options.doDebug && console.debug('processNewShowLinks: stopping the timeout loop.');
    return;
  }

  // Find links to observe.
  // _options.doDebug && console.debug('processNewShowLinks: starting.');
  let repliesSelector = [];
  if (_options.moreReplies) {
    repliesSelector.push('div.show-children-wrapper:not(.hidden) > a.show-children:not(.busy):not([data-duid])');
  }
  if (_options.newReplies) {
    repliesSelector.push('a.realtime-button.reveal:not([style*="display: none;"]):not([data-duid])');
  }

  if (repliesSelector.length) {
    // Observe replies links that haven't already been observed.
    document.querySelectorAll(repliesSelector.join(',')).forEach(observeLink);
  }
  // Observe "see more" links that haven't already been observed.
  if (_options.longItems) {
    document.querySelectorAll('a.see-more:not(.hidden):not([data-duid]), a.curtain-truncate:not(.hidden):not([data-duid])').forEach(observeLink);
  }
  // Check again after the checkInterval.
  _timer = window.setTimeout(processNewShowLinks, _options.checkInterval * 1000);
  // _options.doDebug && console.debug('processNewShowLinks: exiting.');
}

function observeLink(link) {
  const duid = link.dataset.duid || 
    (link.dataset.duid = (String.fromCharCode(Math.floor(Math.random() * 26) + 97) + Date.now()), link.dataset.duid);
  if (!_observedDuids[duid]) {
    link.title = duid;
    _observer.observe(link);
    _observedDuids[duid] = true;
    _options.doDebug && console.debug('--> Start observing "%s" link %s (%d observed)', link.className, duid, Object.keys(_observedDuids).length);
  } else {
    _options.doDebug && console.warn('--> Already observing link %s!', link.className, duid)
  }
}

function refreshOptions() {
  chrome.storage.sync.get(defaultConfig, (options) => {
    const oldCheckInterval = +_options.checkInterval;
    _options = options;
    if (oldCheckInterval === 0 && _options.checkInterval !== oldCheckInterval) {
      processNewShowLinks();
    }
    _options.doDebug && console.debug("Got sync'd options: %o", _options);
  });
}
// - Load more posts:
// document.querySelector('a.load-more__button')
// - Show new comments (blue button at the top of the page):
// <button class="alert alert--realtime" data-role="realtime-notification" style="">Show 5 New Comments</button>
