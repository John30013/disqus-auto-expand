let _config = { ...defaultConfig },
  _timer = null,
  _observer = null,
  _observedLinks = {},
  _linkCounter = 0;

// Start the extension.
refreshConfig(true);
_config.doDebug &&
  console.debug(`content.js is running in iframe ${window.name}.`);
// Listen for option updates and debug messages from config page.
listenForMessages();
// Set up the IntersectionObserver to watch for auto-expand links coming into view.
createObserver();
// Start processing.
processNewLinks();
/* ===== End of main code. ===== */

/* ===== Helper functions. ===== */
function listenForMessages() {
  chrome.runtime.onMessage.addListener((msg, sender, sendReply) => {
    if (msg.action === "refreshConfig") {
      refreshConfig(false);
    } else if (msg.action === "logDebug" && msg.message) {
      _config.doDebug &&
        console.debug(`[${msg.caller}] ${msg.message}`, ...msg.data);
    } else if (msg.action === "ping") {
      _config.doDebug &&
        console.debug("Got 'ping' message; replying with 'pong'.");
      sendReply({ value: "pong" });
    } else if (msg.action === "loadAllContent") {
      loadAllContent();
    }
  });
}

function createObserver() {
  _observer = new IntersectionObserver(processObservedEntries, {
    threshold: 1.0,
  });

  function processObservedEntries(entries) {
    if (_config.checkInterval) {
      let foundIntersects = false;
      entries.forEach(entry => {
        const link = entry.target,
          luid = link.dataset.luid;
        _config.doDebug &&
          console.debug(
            'Checking intersection of "%s" link %s',
            link.className,
            luid
          );
        if (entry.isIntersecting) {
          foundIntersects = true;
          _config.doDebug &&
            console.debug(
              '--> link.classList: %o; link.innerText: "%s"',
              link.classList,
              link.innerText
            );
          activateLink(link);
          unobserveLink(link);
          _config.doDebug &&
            console.debug(
              "--> Clicked %s (now %d observed)",
              luid,
              Object.keys(_observedLinks).length,
              _observedLinks
            );
        }
      });
      // Clean up old observed links. Disqus seems to output some (mostly "see more")
      // links that become hidden before they are clicked (i.e., "zombie" links).
      // This block unobserves all observed links that haven't been clicked after
      // five minutes. If some non-zombie links get unobserved, they will be
      // observed again the next time the processNewLinks timer fires.
      if (foundIntersects) {
        _config.doDebug && console.debug("--> Checking for old links");
        const now = Date.now(),
          maxAge = 5 * 60 * 1000;
        Object.keys(_observedLinks)
          .filter(luid => now - luid.substr(0, luid.indexOf("-")) >= maxAge)
          .forEach(oldLuid => unobserveLink(_observedLinks[oldLuid], true));
      }
    }
  } // end of processObservedEntries().
} // end of createObserver().

function processNewLinks() {
  // Since processNewLinks() can be called by refreshConfig() when checkInterval is
  // set to zero, clear any pending timeout first. It's a no-op if this call is
  // the result of the timer timing out.
  _timer && clearTimeout(_timer);
  if (!_config.checkInterval) {
    _config.doDebug && console.debug("Stopping the timeout loop.");
    return;
  }

  // Observe new links.
  _config.doDebug && console.debug("Finding new links to observe.");
  findNewLinks(_config).forEach(observeLink);

  // Make external links open in a new browser tab/window.
  if (_config.openInNewWindow) {
    const extLinkSelector =
      "a[href*='disq.us/url?'][rel*='noopener']:not([target])";
    document.querySelectorAll(extLinkSelector).forEach(link => {
      link.target = "_blank";
      link.title = "[new window] " + link.title;
      _config.doDebug &&
        console.debug('Added target="_blank" to external link:', link);
    });
  }

  // Reprocess after the checkInterval.
  _timer = setTimeout(processNewLinks, _config.checkInterval * 1000);

  // Observe a link. Instructs the IntersectionOserver to start observing the
  // link and does some record keeping.
  function observeLink(link) {
    let luid = link.dataset.luid;
    if (luid) {
      // Already being observed.
      return;
    }
    luid = tagLink(link);
    _observer.observe(link);
    _observedLinks[luid] = link;
    _config.doDebug &&
      console.debug(
        '--> Observing "%s" link %s (now %d observed)',
        link.className,
        luid,
        Object.keys(_observedLinks).length,
        _observedLinks
      );
  }
}

function refreshConfig(setIcon) {
  chrome.storage.sync.get(defaultConfig, config => {
    if (chrome.runtime.lastError) {
      console.warn(
        `Couldn't get configuration form sync'd storage: ${
          chrome.runtime.lastError.message
        }`
      );
      return;
    }
    const oldCheckInterval = +_config.checkInterval;
    _config = config;
    _config.doDebug && console.debug("Got sync'd config: %o", _config);
    if (setIcon) {
      chrome.runtime.sendMessage({
        action: "setIcon",
        data: !!_config.checkInterval,
      });
    }
    // Check if we need to resume processing links.
    if (oldCheckInterval === 0 && _config.checkInterval !== oldCheckInterval) {
      processNewLinks();
    }
  });
}

/**
 * Remove a link from observation and record-keeping. (Reverses proecessNewLinks()#observeLink().)
 */
function unobserveLink(link, removeDaxTags) {
  const luid = link.dataset.luid;
  if (!luid) {
    // Link isn't being observed.
    return;
  }
  _observer.unobserve(link);
  delete _observedLinks[luid];
  delete link.dataset.luid;
  link.removeAttribute("data-luid");
  if (removeDaxTags) {
    link.classList.remove("dax-tagged", "dax-clicked");
    link.title = link.title.replace(/^\[\w+\]\s/, "");
  }
  _config.doDebug &&
    console.debug(
      '--> unobserved "%s" link %s; removeDaxTags: %s',
      link.className,
      luid,
      removeDaxTags,
      link
    );
} // end of unobserveLink().

function findNewLinks(config) {
  const newLinks = [];
  // Find new "See more replies" links.
  if (!config || config.moreReplies) {
    document
      .querySelectorAll(
        "div.show-children-wrapper:not(.hidden) > a.show-children:not(.busy):not([data-luid])"
      )
      .forEach(elt => newLinks.push(elt));
  }
  // Find new "See ### new replies" links.
  if (!config || config.newReplies) {
    document
      .querySelectorAll(
        'a.realtime-button.reveal:not([style*="display: none;"]):not([data-luid])'
      )
      .forEach(elt => newLinks.push(elt));
  }
  // Find new "see more" links.
  if (!config || config.longItems) {
    document
      .querySelectorAll(
        'div.post-message-container:not([style*="max-height: none;"]) + a.see-more:not(.hidden):not([data-luid]), a.curtain-truncate:not(.hidden):not([data-luid])'
      )
      .forEach(elt => newLinks.push(elt));
  }
  // Find the active "Load more comments" "button" at the bottom of the comments.
  if (!config || config.moreComments) {
    document
      .querySelectorAll(
        'div.load-more:not([style*="none"]) > a.load-more__button'
      )
      .forEach(elt => newLinks.push(elt));
  }
  // Find the active "Show # New Comments" button at the top of the comments.
  if (!config || config.newComments) {
    document
      .querySelectorAll('button.alert--realtime:not([style*="none"])')
      .forEach(elt => newLinks.push(elt));
  }
  return newLinks;
}

function tagLink(link) {
  luid = `${Date.now()}-${_linkCounter++}`;
  link.setAttribute("data-luid", luid);
  link.classList.add("dax-tagged");
  if (!/^\[(tagged|clicked)\] /.test(link.title)) {
    link.title = `[tagged] ${link.title}`;
  }
  return luid;
}

function activateLink(link) {
  link.click();
  link.classList.add("dax-clicked");
  link.title = link.title.replace("[tagged] ", "[clicked] ");
}

function loadAllContent() {
  _config.doDebug && console.debug("loadAllContent(): entering.");
  // Stop the processNewLinks() timeout loop.
  _timer && clearTimeout(_timer);

  const newLinks = findNewLinks();
  _config.doDebug && console.debug(`--> found ${newLinks.length} new links.`);
  if (newLinks.length) {
    showToast("Please wait while content loads&hellip;");
    newLinks.forEach(link => {
      unobserveLink(link);
      tagLink(link);
      activateLink(link);
    });
    // Map checkInterval range (0-30 sec.) to delay range (5-10 sec.).
    const delay = Math.floor(1000 * (5 + (_config.checkInterval * 5) / 30));
    _timer = setTimeout(loadAllContent, delay);
  } else {
    hideToast("All content has been loaded.", 5000);
    processNewLinks();
  }

  function showToast(message) {
    let toast = document.getElementById("dax-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "dax-toast";
      toast.innerText = message;
      toast.setAttribute("role", "alert");
      document.body.prepend(toast);
      toast.classList.add("toast toast-open");
    }
  }

  function hideToast(message, delay) {
    const toast = document.getElementById("dax-toast");
    if (toast) {
      toast.innerText = message;
      toast.style.setProperty("--delay", delay);
      toast.classList.add("toast-closed");
      toast.classList.remove("toast-open");
      setTimeout(() => {
        document.body.removeChild(toast);
      }, delay + 500);
    }
  }
}
