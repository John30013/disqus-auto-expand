// "Global" variables and flags.
let _config = { ...defaultConfig },
  _timer = null,
  _observer = null,
  _observedLinks = {},
  _linkCounter = 0,
  _loadAllInitialized = false,
  _warnedAboutLoadAll = false;

// Start the extension.
refreshConfig(true);
// removeIf(!allowDebug)
_config.doDebug &&
  console.debug(`content.js is running in iframe ${window.name}.`);
// endRemoveIf(!allowDebug)
// Listen for option updates and debug messages from config page.
listenForMessages();
// Set up the IntersectionObserver to watch for auto-expand links entering the
// viewport.
createObserver();
// Start processing.
processNewLinks();
/* ===== End of main code. ===== */

/* ===== Helper functions. ===== */
/**
 * Listens for messages from other scripts in the extension.
 */
function listenForMessages() {
  chrome.runtime.onMessage.addListener(msg => {
    if (msg.action === "refreshConfig") {
      refreshConfig(false);
    } else if (msg.action === "logDebug" && msg.message) {
      // removeIf(!allowDebug)
      _config.doDebug &&
        console.debug(`[${msg.caller}] ${msg.message}`, ...msg.data);
      // endRemoveIf(!allowDebug)
    }
  });
} // end of listenForMessages().

/**
 * Creates the IntersectionObserver that handles collapes replies and new
 * comments links that enter the viewport.
 */
function createObserver() {
  _observer = new IntersectionObserver(processObservedEntries, {
    threshold: 1.0,
  });

  /**
   * Activates (clicks) observed links when they enter the viewport, and
   * removes them from observation.
   * @param {IntersectionObserverEntry[]} entries - array of observed links that
   * have either been initially put under observation or have entered the
   * viewport.
   */
  function processObservedEntries(entries) {
    if (!_config.checkInterval) {
      return;
    }
    let foundIntersects = false;
    entries.forEach(entry => {
      const link = entry.target,
        luid = link.dataset.luid;
      // removeIf(!allowDebug)
      _config.doDebug &&
        console.debug(
          'Checking intersection of "%s" link %s',
          link.className,
          luid
        );
      // endRemoveIf(!allowDebug)
      if (entry.isIntersecting) {
        foundIntersects = true;
        // removeIf(!allowDebug)
        _config.doDebug &&
          console.debug(
            '--> link.classList: %o; link.innerText: "%s"',
            link.classList,
            link.innerText
          );
        // endRemoveIf(!allowDebug)
        activateLink(link);
        unobserveLink(link);
        // removeIf(!allowDebug)
        _config.doDebug &&
          console.debug(
            "--> Clicked %s (now %d observed)",
            luid,
            Object.keys(_observedLinks).length,
            _observedLinks
          );
        // endRemoveIf(!allowDebug)
      }
    });
    if (foundIntersects) {
      /* Clean up old observed links. Disqus seems to output some (mostly "
      see more") links that become hidden before they are clicked (a/k/a, 
      "zombie" links). This block unobserves all observed links that haven't 
      been clicked after five minutes. If some non-zombie links get unobserved,
      they will be observed again the next time the processNewLinks() timer 
      fires. */
      // removeIf(!allowDebug)
      _config.doDebug && console.debug("--> Checking for old links");
      // endRemoveIf(!allowDebug)
      const now = Date.now(),
        maxAge = 5 * 60 * 1000;
      Object.keys(_observedLinks)
        .filter(luid => now - luid.substr(0, luid.indexOf("-")) >= maxAge)
        .forEach(oldLuid => unobserveLink(_observedLinks[oldLuid], true));
    } // end of link cleanup block.
  } // end of processObservedEntries().
} // end of createObserver().

/**
 * Finds and registers new links to observe for intersection with the viewport.
 * This function also executes the main logic loop, depending on the value of
 * the checkInterval configuration option.
 */
function processNewLinks() {
  /* Since processNewLinks() is called by refreshConfig() when checkInterval is
  zero, clear any pending timeout first. It's a no-op if this call is due to 
  the timer timing out.
    Note: if _loadAllInitialized is `false`, we keep the loop going until the
  content loads, so we can install the "Load all content" button at the top of
  the posts. (Also see the setTimout() call at the end of this method.) */
  _timer && clearTimeout(_timer);
  if (!_config.checkInterval && _loadAllInitialized) {
    // removeIf(!allowDebug)
    _config.doDebug && console.debug("Stopping the timeout loop.");
    // endRemoveIf(!allowDebug)
    return;
  }

  // Observe new links.
  // removeIf(!allowDebug)
  _config.doDebug && console.debug("Finding new links to observe.");
  // endRemoveIf(!allowDebug)
  const newLinks = findNewLinks(_config);
  if (newLinks.length) {
    if (!_loadAllInitialized) {
      initLoadAllContent();
    }
    if (_config.checkInterval) {
      newLinks.forEach(observeLink);
    }
  }

  // Force external URLs open in a new browser tab/window.
  if (_config.openInNewWindow) {
    const extLinkSelector =
      "a[href*='disq.us/url?'][rel*='noopener']:not([target])";
    document.querySelectorAll(extLinkSelector).forEach(link => {
      link.target = "_blank";
      link.title = "[new window] " + link.title;
      // removeIf(!allowDebug)
      _config.doDebug &&
        console.debug('Added target="_blank" to external link:', link);
      // endRemoveIf(!allowDebug)
    });
  }

  // Reprocess after the checkInterval (or after 5 seconds if the "Load
  // all content" button hasn't yet been initialized).
  _timer = setTimeout(
    processNewLinks,
    (!_loadAllInitialized ? 5 : _config.checkInterval) * 1000
  );

  /* ===== Helper functions ===== */
  /**
   * Instructs the IntersectionOserver to start observing the link, and does
   * some record keeping.
   * @param {HTMLAnchorElement} link - the link to observe for intersection with
   * the viewport.
   */
  function observeLink(link) {
    let luid = link.dataset.luid;
    if (luid) {
      // Already being observed.
      return;
    }
    luid = tagLink(link);
    _observer.observe(link);
    _observedLinks[luid] = link;
    // removeIf(!allowDebug)
    _config.doDebug &&
      console.debug(
        '--> Observing "%s" link %s (now %d observed)',
        link.className,
        luid,
        Object.keys(_observedLinks).length,
        _observedLinks
      );
    // endRemoveIf(!allowDebug)
  } // end of observeLink().
} // end of processNewLinks().

/**
 * Gets the latest configuration values from storage, and optionally asks the
 * background script to update the extension's icon based on the value of
 * checkInterval.
 * @param {Boolean} setIcon - whether to change the extension's icon based on
 * the value of the checkInterval config value (0 -> paused; 1–30 -> active).
 */
function refreshConfig(setIcon) {
  chrome.storage.sync.get(defaultConfig, config => {
    if (chrome.runtime.lastError) {
      console.warn(
        `Couldn't get configuration from storage: ${
          chrome.runtime.lastError.message
        }`
      );
      return;
    }
    const oldCheckInterval = +_config.checkInterval;
    _config = config;
    // removeIf(!allowDebug)
    _config.doDebug && console.debug("Got sync'd config: %o", _config);
    // endRemoveIf(!allowDebug)
    if (setIcon) {
      chrome.runtime.sendMessage({
        action: "setIcon",
        caller: "content",
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
 * Remove a link from observation and record-keeping.
 * (Reverses processNewLinks()#observeLink().)
 * @param {HTMLAnchorElement} link - a link currently under observation.
 * @param {Boolean} removeDaxTags - whether to remove "bookkeeping" classes set
 * on the link by tagLink() and activateLink().
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
  // removeIf(!allowDebug)
  _config.doDebug &&
    console.debug(
      '--> unobserved "%s" link %s; removeDaxTags: %s',
      link.className,
      luid,
      removeDaxTags,
      link
    );
  // endRemoveIf(!allowDebug)
} // end of unobserveLink().

/**
 * Finds new links to observe, based on the configuration options. This
 * function is called by both processNewLinks() and loadAllContent().
 * @param {Object} config
 */
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
} // end of findNewLinks().

/**
 * Marks the link as being under observation for intersection with the
 * viewport.
 * @param {HTMLAnchorElement} link - the link under observation.
 */
function tagLink(link) {
  luid = `${Date.now()}-${_linkCounter++}`;
  link.setAttribute("data-luid", luid);
  link.classList.add("dax-tagged");
  if (!/^\[(tagged|clicked)\] /.test(link.title)) {
    link.title = `[tagged] ${link.title}`;
  }
  return luid;
} // end of tagLink().

/**
 * Marks the link as having been activated (clicked).
 * @param {HTMLAnchorElement} link - the link that has been clicked.
 */
function activateLink(link) {
  link.click();
  link.classList.add("dax-clicked");
  link.title = link.title.replace("[tagged] ", "[clicked] ");
} // end of activateLink().

/**
 * Installs and enables the "Load all content" button.
 */
function initLoadAllContent() {
  const button = document.createElement("button");
  button.innerText = "Load entire discussion";
  button.id = "dax-loadAll";
  button.addEventListener("click", () => {
    loadAllContent(0);
  });
  document.getElementById("posts").prepend(button);
  _loadAllInitialized = true;
} // end of initLoadAllContent().

/**
 * Recursively loads all of the available content in the discussion.
 * @param {Number} iteration - the count of how many times this method has been
 * called. Used to vary the status message shown to the user while the content
 * is being loaded.
 */
function loadAllContent(iteration) {
  // removeIf(!allowDebug)
  _config.doDebug && console.debug("loadAllContent(): entering.");
  // endRemoveIf(!allowDebug)
  // Stop the processNewLinks() timeout loop.
  _timer && clearTimeout(_timer);

  iteration = iteration || 0;
  if (iteration === 0) {
    /* Try to get the number of comments. When Disqus is embedded on a page, the
    comment count is in a div.comment-count element within the iframe; when on
    the Disqus site itself, we have to get it from the disqus-threadData JSON
    object, which is more expensive because the object is potentially large. */
    let commentCount = -1;
    let commentCountElt = document.querySelector(".comment-count");
    if (commentCountElt) {
      commentCount = parseInt(commentCountElt.innerText, 10);
    } else {
      commentCountElt = document.getElementById("disqus-threadData");
      try {
        commentCount = JSON.parse(commentCountElt.innerText).cursor.total;
      } catch (error) {
        console.info("Couldn't get comment count from JSON: %s", error);
      }
    }
    if (commentCount > 500 && !_warnedAboutLoadAll) {
      _warnedAboutLoadAll = true;
      if (
        !confirm(
          `Loading this entire discussion will take some time and
  could consume a lot of memory and data. Your browser 
  might become very slow, or stop responding at all.

Do you want to proceed?`
        )
      ) {
        return;
      }
    }
  } // end of block to handle first iteration.
  const button = document.getElementById("dax-loadAll"),
    newLinks = findNewLinks(),
    animDelaySecs = 1,
    animDurationSecs = 3,
    opacDelaySecs = 3,
    opacDurationSecs = 1;

  // removeIf(!allowDebug)
  _config.doDebug && console.debug(`--> found ${newLinks.length} new links.`);
  // endRemoveIf(!allowDebug)
  if (newLinks.length) {
    button.classList.add("processing");
    // Note: opacity delay + duration must equal animation delay + duration.
    button.style.setProperty("--anim-delay", `${animDelaySecs}s`);
    button.style.setProperty("--anim-duration", `${animDurationSecs}s`);
    button.style.setProperty("--opac-delay", `${opacDelaySecs}s`);
    button.style.setProperty("--opac-duration", `${opacDurationSecs}s`);
    // During processing the button acts as a progress indicator. We change the
    // text occasionally to keep it interesting.
    if (iteration < 5) {
      button.innerText = "Please wait while the content loads…";
    } else if (iteration < 10) {
      button.innerText = "Still working on it…";
    } else if (iteration < 20) {
      button.innerText = "Wow, this is a really long discussion…";
    } else if (iteration < 30) {
      button.innerText = "Looks like the end is in sight…";
    }
    newLinks.forEach(link => {
      unobserveLink(link);
      tagLink(link);
      activateLink(link);
    });
    // Map checkInterval range (0-30 sec.) to delay range (5-10 sec.).
    const delay = Math.floor(1000 * (5 + (_config.checkInterval * 5) / 30));
    _timer = setTimeout(loadAllContent, delay, iteration + 1);
  } else {
    button.classList.add("complete");
    button.innerText = "The entire discussion is now loaded.";
    setTimeout(
      button => {
        button.classList.remove("processing", "complete");
        button.innerText = "Load entire discussion";
        button.blur();
        processNewLinks();
      },
      1000 * (animDelaySecs + animDurationSecs),
      button
    );
  }
}
