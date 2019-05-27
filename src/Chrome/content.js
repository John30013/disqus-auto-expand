let _options = {...defaultConfig},
  _timer = null,
  _observer = null,
  _observedLinks = {};

// Listen for option updates and debug messages from config page.
listenForMessages();
// Set up the IntersectionObserver to watch for auto-expand links coming into view.
createObserver();
// Start the extension.
refreshOptions();
_options.doDebug && console.debug(`content.js is running in iframe ${window.name}.`);
processNewLinks();

/* ===== End of main code. ===== */

/* ===== Helper functions. ===== */
function listenForMessages() {
  chrome.extension.onMessage.addListener(function (msg, sender, sendResponse) {
    // _options.doDebug && console.debug('Got message: %o', msg);
    if (msg.action === 'refreshOptions') {
      refreshOptions();
    }
    else if (msg.action === 'logDebug' && msg.message) {
      _options.doDebug && console.debug(`[${msg.caller}] ${msg.message}`, ...msg.params);
    }
  });
}

function createObserver() {
  _obserer = new IntersectionObserver(function (entries) {
    if (_options.checkInterval) {
      let foundIntersects = false;
      entries.forEach(entry => {
        const link = entry.target;
        _options.doDebug && console.debug('Checking intersection of "%s" link %s', link.className, link.dataset.duid);
        if (entry.isIntersecting) {
          foundIntersects = true;
          setTimeout(() => {
            link.click();
            link.title += ' clicked!';
            _options.doDebug && console.debug('--> Clicked %s (now %d observed)', link.dataset.duid, Object.keys(_observedLinks).length, _observedLinks);
            unobserveLink(link)
          }, 100);
        }
      });
      // Clean up old observed links. Disqus seems to output some (mostly "see more") 
      // links that become hidden before they are clicked (e.g., zombie links). 
      // This block unobserves all observed links that haven't been clicked after 
      // five minutes. If some non-zombie links get unobserved, they will be  
      // observed again the next time the processNewLinks timer fires.
      if (foundIntersects) {
        _options.doDebug && console.debug('--> Checking for old links');
        const now = Date.now(),
          maxAge = 5 * 60 * 1000,
          oldLinkData = Object.keys(_observedLinks)
            .filter(duid => now - duid >= maxAge)
            .map(oldDuid => unobserveLink(_observedLinks[oldDuid]))
          ;
        _options.doDebug && console.debug('--> unobserved %s old links', oldLinkData.length, oldLinkData);
      }
    }
    
    /* ===== Helper function ===== */
    // Removes a link from observation and all our record-keeping. (Reverses observeLink().)
    // Returns an object with data about the unobserved link (currently used for debug output only).
    function unobserveLink(link) {
      const duid = link.dataset.duid;
      _options.doDebug && console.debug('Unobserving "%s" link %s', link.className, duid);
      _observer.unobserve(link);
      delete _observedLinks[duid];
      delete link.dataset.duid;
      // link.title = link.title.replace(/(~\d+)+/, '');
      return { 'link': link, 'duid': duid };
    }
  }, { threshold: 1.0 });

}
function processNewLinks() {
  // Since processNewLinks() can be called by refreshOptions() when checkInterval is 
  // set to zero, clear any pending timeout first. It's a no-op if this call is
  // the result of the timer timing out.
  if (_timer) {
    window.clearTimeout(_timer);
  }
  if (!_options.checkInterval) {
    _options.doDebug && console.debug('processNewLinks: stopping the timeout loop.');
    return;
  }

  // Find links to observe.
  let repliesSelector = [];
  if (_options.moreReplies) {
    repliesSelector.push('div.show-children-wrapper:not(.hidden) > a.show-children:not(.busy):not([data-duid])');
  }
  if (_options.newReplies) {
    repliesSelector.push('a.realtime-button.reveal:not([style*="display: none;"]):not([data-duid])');
  }
  // Observe replies links that haven't already been observed.
  if (repliesSelector.length) {
    document.querySelectorAll(repliesSelector.join(',')).forEach(observeLink);
  }
  // Observe "see more" links that haven't already been observed.
  const longItemsSelector = 'div.post-message-container:not([style*="max-height: none;"]) + a.see-more:not(.hidden):not([data-duid]), a.curtain-truncate:not(.hidden):not([data-duid])';
  if (_options.longItems) {
    document.querySelectorAll(longItemsSelector).forEach(observeLink);
  }
  // Reprocess after the checkInterval.
  _timer = window.setTimeout(processNewLinks, _options.checkInterval * 1000);

  /* ===== Helper function ===== */
  // Observe a link. Instructs the IntersectionOserver to start observing the 
  // link and does some record keeping.
  function observeLink(link) {
    let duid = link.dataset.duid;
    if (!duid) {
      link.dataset.duid = duid = Date.now();
      // link.title += `~${duid}`;
      _observer.observe(link);
      _observedLinks[duid] = link;
      _options.doDebug && console.debug('--> Start observing "%s" link %s (%d observed)', link.className, duid, Object.keys(_observedLinks).length, _observedLinks);
    } else {
      _options.doDebug && console.info('--> Already observing link %s!', link.className, duid)
    }
  }
}

function refreshOptions() {
  chrome.storage.sync.get(defaultConfig, (options) => {
    const oldCheckInterval = +_options.checkInterval;
    _options = options;
    if (oldCheckInterval === 0 && _options.checkInterval !== oldCheckInterval) {
      processNewLinks();
    }
    _options.doDebug && console.debug("Got sync'd options: %o", _options);
  });
}
// - Load more posts:
// document.querySelector('a.load-more__button')
// - Show new comments (blue button at the top of the page):
// <button class="alert alert--realtime" data-role="realtime-notification" style="">Show 5 New Comments</button>
