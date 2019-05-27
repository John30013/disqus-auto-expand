let _options = { ...defaultConfig },
  _timer = null,
  _observer = null,
  _observedLinks = {};

// Listen for option updates and debug messages from config page.
listenForMessages();
// Set up the IntersectionObserver to watch for auto-expand links coming into view.
createObserver();

// Start the extension.
refreshOptions();
_options.doDebug &&
  console.debug(`content.js is running in iframe ${window.name}.`);
processNewLinks();
/* ===== End of main code. ===== */

/* ===== Helper functions. ===== */
function listenForMessages() {
  chrome.extension.onMessage.addListener(function(msg) {
    // _options.doDebug && console.debug('Got message: %o', msg);
    if (msg.action === "refreshOptions") {
      refreshOptions();
    } else if (msg.action === "logDebug" && msg.message) {
      _options.doDebug &&
        console.debug(`[${msg.caller}] ${msg.message}`, ...msg.params);
    }
  });
}

function createObserver() {
  _observer = new IntersectionObserver(processObservedEntries, {
    threshold: 1.0,
  });

  function processObservedEntries(entries) {
    if (_options.checkInterval) {
      let foundIntersects = false;
      entries.forEach(entry => {
        const link = entry.target;
        _options.doDebug &&
          console.debug(
            'Checking intersection of "%s" link %s',
            link.className,
            link.dataset.luid
          );
        if (entry.isIntersecting) {
          foundIntersects = true;
          link.click();
          _options.doDebug &&
            console.debug(
              "--> Clicked %s (now %d observed)",
              link.dataset.luid,
              Object.keys(_observedLinks).length,
              _observedLinks
            );
          unobserveLink(link);
        }
      });
      // Clean up old observed links. Disqus seems to output some (mostly "see more")
      // links that become hidden before they are clicked (i.e., "zombie" links).
      // This block unobserves all observed links that haven't been clicked after
      // five minutes. If some non-zombie links get unobserved, they will be
      // observed again the next time the processNewLinks timer fires.
      if (foundIntersects) {
        _options.doDebug && console.debug("--> Checking for old links");
        const now = Date.now(),
          maxAge = 5 * 60 * 1000;
        Object.keys(_observedLinks)
          .filter(luid => now - luid >= maxAge)
          .forEach(oldLuid => unobserveLink(_observedLinks[oldLuid]));
      }
    }

    // Remove a link from observation and record-keeping. (Reverses proecessNewLinks()#observeLink().)
    // Returns an object with data about the unobserved link (currently used for debug output only).
    function unobserveLink(link) {
      const luid = link.dataset.luid;
      _observer.unobserve(link);
      delete _observedLinks[luid];
      delete link.dataset.luid;
      _options.doDebug && console.debug('--> unobserved "%s" link %s', link.className, luid);
    }
  }
}

function processNewLinks() {
  // Since processNewLinks() can be called by refreshOptions() when checkInterval is
  // set to zero, clear any pending timeout first. It's a no-op if this call is
  // the result of the timer timing out.
  if (_timer) {
    window.clearTimeout(_timer);
  }
  if (!_options.checkInterval) {
    _options.doDebug && console.debug("Stopping the timeout loop.");
    return;
  }

  // Find new links to observe.
  _options.doDebug && console.debug("Finding new links to observe.");
  let repliesSelector = [];
  if (_options.moreReplies) {
    repliesSelector.push(
      "div.show-children-wrapper:not(.hidden) > a.show-children:not(.busy):not([data-luid])"
    );
  }
  if (_options.newReplies) {
    repliesSelector.push(
      'a.realtime-button.reveal:not([style*="display: none;"]):not([data-luid])'
    );
  }
  // Observe replies links that haven't already been observed.
  if (repliesSelector.length) {
    document.querySelectorAll(repliesSelector.join(",")).forEach(observeLink);
  }
  // Observe "see more" links that haven't already been observed.
  const longItemsSelector =
    'div.post-message-container:not([style*="max-height: none;"]) + a.see-more:not(.hidden):not([data-luid]), a.curtain-truncate:not(.hidden):not([data-luid])';
  if (_options.longItems) {
    document.querySelectorAll(longItemsSelector).forEach(observeLink);
  }

  // Reprocess after the checkInterval.
  _timer = window.setTimeout(processNewLinks, _options.checkInterval * 1000);

  // Observe a link. Instructs the IntersectionOserver to start observing the
  // link and does some record keeping.
  function observeLink(link) {
    let luid = link.dataset.luid;
    if (!luid) {
      link.dataset.luid = luid = Date.now();
      _observer.observe(link);
      _observedLinks[luid] = link;
      _options.doDebug &&
        console.debug(
          '--> Observing "%s" link %s (now %d observed)',
          link.className,
          luid,
          Object.keys(_observedLinks).length,
          _observedLinks
        );
    }
  }
}

function refreshOptions() {
  chrome.storage.sync.get(defaultConfig, options => {
    const oldCheckInterval = +_options.checkInterval;
    _options = options;
    _options.doDebug && console.debug("Got sync'd options: %o", _options);

    if (oldCheckInterval === 0 && _options.checkInterval !== oldCheckInterval) {
      processNewLinks();
    }
  });
}
