// "Global" variables and flags.
// import { defaultConfig } from "./dax-defaultConfig.js";

// export function main() {
let _config = {},
  _timer = null,
  _observer = null,
  _observedLinks = {},
  _activeTextareasInView = {},
  _linkCounter = 0,
  _loadAllInitialized = false,
  _warnedAboutLoadAll = false;

(async () => {
  try {
    _config = await getCurrentConfig();
  } catch (error) {
    console.warn("getCurrentConfig failed; using defaultConfig.", error);
  }
  // removeIf(!allowDebug)
  _config.doDebug &&
    console.debug(`content.js is running in iframe ${window.name}.`);
  // endRemoveIf(!allowDebug)

  // Listen for debug messages from config page.
  listenForMessages();
  // Listen for storage (config data) updates.
  listenForStorageChanges();
  // Set up the IntersectionObserver to watch for auto-expand links entering the
  // viewport.
  createObserver();
  // Start processing.
  processNewLinks();
})();
// }
/* ===== End of main code. ===== */

/* ===== Helper functions. ===== */
/**
 * Listens for messages from other scripts in the extension.
 */
function listenForMessages() {
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === "logDebug" && msg.message) {
      // removeIf(!allowDebug)
      _config.doDebug &&
        console.debug(`[${msg.caller}] ${msg.message}`, ...msg.data);
      // endRemoveIf(!allowDebug)
    }
  });
} // end of listenForMessages().

function listenForStorageChanges() {
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace !== "sync") {
      return;
    }

    for (let [key, { oldValue, newValue }] of Object.entries(changes)) {
      _config[key] = newValue;
      // removeIf(!allowDebug)
      _config.doDebug &&
        console.debug(`Updated _config.${key} to %o`, newValue);
      // endRemoveIf(!allowDebug)

      if (key === "isEnabled") {
        // Check if we need to resume processing content links.
        if (!oldValue && newValue) {
          // removeIf(!allowDebug)
          _config.doDebug &&
            console.debug(`--> Restarting content processing.`);
          // endRemoveIf(!allowDebug)
          processNewLinks(true);
        }
      }
    }
  });
}

/**
 * Creates the IntersectionObserver that handles collasped replies and new
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
    if (!_config.isEnabled) {
      return;
    }
    let foundIntersects = false;

    // Bring all edit/reply 'LI' entries to the front of the list.
    entries.sort((a, b) =>
      a.tagName === "LI" ? -1 : b.tagName === "LI" ? 1 : 0
    );

    // Handle edit/reply 'LI' entries.
    while (entries.length) {
      const entry = entries[0],
        liElt = entry.target;
      if (liElt.tagName !== "LI") {
        break; // We've run out of 'LI' entries.
      }

      const tid = liElt.firstElementChild.dataset.tid;
      if (entry.isIntersecting) {
        foundIntersects = true;
        if (liElt.classList.contains("active")) {
          // removeIf(!allowDebug)
          _config.doDebug &&
            console.debug("Tracking active reply/edit LI in view: %o", liElt);
          // endRemoveIf(!allowDebug)
          _activeTextareasInView[tid] = liElt;
        } else {
          // The cleanup code in processNewLinks() would do this, but we need to
          // know now (for the next block of code), so we do it here (too).
          // removeIf(!allowDebug)
          _config.doDebug &&
            console.debug(
              "Untracking & unobserving inactive reply/edit LI in view: %o",
              liElt
            );
          // endRemoveIf(!allowDebug)
          delete _activeTextareasInView[tid];
          unobserveLink(liElt, true);
        }
      } else {
        // Not in view, but might still be active. So we just remove it from
        // the tracking list, but we don't unobserve it (in case it comes back
        // into view).
        // removeIf(!allowDebug)
        _config.doDebug &&
          console.debug("Untracking reply/edit LI not in view: %o", liElt);
        // endRemoveIf(!allowDebug)
        delete _activeTextareasInView[tid];
      }
      entries.shift();
    } // end of while loop to process edit/reply 'LI' entries.

    // Handle comment/reply loading/expanding links.
    entries.forEach((entry) => {
      if (Object.keys(_activeTextareasInView).length) {
        // There is an active reply/edit link in view, so we unobserve this
        // content link (since it only lands here when its intersection status
        // changes, and we want it to be clicked once the reply/edit link is
        // no longer active, without having to scroll it out and back in to
        // view). So by unobserving it, the main processing loop will keep
        // re-observing it until the reply/edit link is inactive or goes out of
        // view.
        // removeIf(!allowDebug)
        _config.doDebug &&
          console.debug(
            "An active textarea is visible; unobserving content link in view: %o",
            entry.target
          );
        // endRemoveIf(!allowDebug)
        unobserveLink(entry.target);
      } else {
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
      }
    });

    if (foundIntersects) {
      /* Clean up old observed links. Disqus seems to output some (mostly 
      "see more") links that become hidden before they are clicked (a/k/a, 
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
        .filter((luid) => now - luid.substring(0, luid.indexOf("-")) >= maxAge)
        .forEach((oldLuid) => unobserveLink(_observedLinks[oldLuid], true));
    } // end of link cleanup block.
  } // end of processObservedEntries().
} // end of createObserver().

/**
 * Finds and registers new links to observe for intersection with the viewport.
 * This function also executes the main logic loop, depending on the value of
 * the checkInterval configuration option.
 */
function processNewLinks(updateIconState) {
  // The content script has to set the icon because Chrome changes it to the
  // default (active) icon when a matched page comes into view.
  if (updateIconState) {
    chrome.runtime.sendMessage({ action: "setIcon", data: _config.isEnabled });
  }

  /* Since processNewLinks() is called by the storage listener when isEnabled becomes
  true, clear any pending timeout first. It's a no-op if this call is due to 
  the timer timing out.
    Note: if _loadAllInitialized is `false`, we keep the loop going until the
  content loads, so we can install the "Load all content" button at the top of
  the posts. (Also see the setTimout() call at the end of this method.) */
  _timer && clearTimeout(_timer);
  if (!_config.isEnabled && _loadAllInitialized) {
    // removeIf(!allowDebug)
    _config.doDebug && console.debug("Stopping the timeout loop.");
    chrome.runtime.sendMessage({ action: "setIcon", data: _config.isEnabled });
    // endRemoveIf(!allowDebug)
    return;
  }

  // Remove inactive reply/edit 'LI's from _activeTextAreasInView list.
  // processObservedEntries() removes 'LI's no longer in view (and also
  // inactive), but it only acts when the LI's intersection state changes--not
  // each time processObservedEntries() runs.
  // Since there's no event for the "active" state change, we have to detect
  // that by polling, and since this is the main logic loop it's the best place
  // to do it.
  if (_config.isEnabled) {
    Object.keys(_activeTextareasInView).forEach((tid) => {
      const liElt = _activeTextareasInView[tid];
      if (false === liElt.classList.contains("active")) {
        // removeIf(!allowDebug)
        _config.doDebug &&
          console.debug(
            "Untracking & unobserving inactive reply/edit LI: %o",
            liElt
          );
        // endRemoveIf(!allowDebug)
        delete _activeTextareasInView[tid];
        unobserveLink(liElt, true);
      }
    }); // forEach() callback to clean up inactive reply/edit LIs.
  } // if (_config.isEnabled)

  // Observe new links. This code runs even if _config.isEnabled is false, so we
  // can initialize the "Load all content" button.
  // removeIf(!allowDebug)
  if (_config.doDebug) {
    if (_config.isEnabled) {
      console.debug("Finding new links to observe.");
    } else {
      console.debug(
        'Waiting for content to initialize "Load entire discussion" button.'
      );
    }
  }
  // endRemoveIf(!allowDebug)
  const newLinks = findNewLinks(_config);
  if (newLinks.length) {
    if (!_loadAllInitialized) {
      initLoadAllContent();
    }
    if (_config.isEnabled) {
      newLinks.forEach(observeLink);
    }
  }

  // Force external URLs open in a new browser tab/window.
  if (_config.isEnabled && _config.openInNewWindow) {
    const extLinkSelector =
      "a[href*='disq.us/url?'][rel*='noopener']:not([target])";
    document.querySelectorAll(extLinkSelector).forEach((link) => {
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
 * Gets the curreent configuration values from storage.
 */
async function getCurrentConfig() {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(null, (config) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError.message);
      } else {
        resolve(config);
      }
    });
  });
} // end of getCurrentConfig().

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
 * @param {Object} config - the configuration object.
 */
function findNewLinks(config) {
  const newLinks = [];
  // Find any active (open) "reply/edit" textareas. When one of these is
  // visible, the operation pauses immediately.
  document
    .querySelectorAll("li.reply.active, li.edit.active")
    .forEach((elt) => {
      newLinks.push(elt);
    });

  // Find new "See more replies" links.
  if (!config || config.moreReplies) {
    document
      .querySelectorAll(
        "div.show-children-wrapper:not(.hidden) > a.show-children:not(.busy):not([data-luid])"
      )
      .forEach((elt) => newLinks.push(elt));
  }
  // Find new "See ### new replies" links.
  if (!config || config.newReplies) {
    document
      .querySelectorAll(
        'a.realtime-button.reveal:not([style*="display: none;"]):not([data-luid])'
      )
      .forEach((elt) => newLinks.push(elt));
  }
  // Find new "see more" links.
  if (!config || config.longItems) {
    document
      .querySelectorAll(
        'div.post-message-container:not([style*="max-height: none;"]) + a.see-more:not(.hidden):not([data-luid]), a.curtain-truncate:not(.hidden):not([data-luid])'
      )
      .forEach((elt) => newLinks.push(elt));
  }
  // Find the active "Load more comments" "button" at the bottom of the comments.
  if (!config || config.moreComments) {
    document
      .querySelectorAll(
        'div.load-more:not([style*="none"]) > a.load-more__button, div.load-more-refresh:not([style*="none"]) > a.load-more-refresh__button'
      )
      .forEach((elt) => newLinks.push(elt));
  }
  // Find the active "Show # New Comments" button at the top of the comments.
  if (!config || config.newComments) {
    document
      .querySelectorAll('button.alert--realtime:not([style*="none"])')
      .forEach((elt) => newLinks.push(elt));
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
  const button = document.getElementById("dax-loadAll");
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
      button.style.willChange = "background-position-x, width";
      if (
        !confirm(
          `Loading this entire discussion will take some time and
  could consume a lot of memory and data. Your browser 
  might become very slow, or stop responding at all.

Do you want to proceed?`
        )
      ) {
        button.style.willChange = "";
        return;
      }
    }
  } // end of block to handle first iteration.
  const newLinks = findNewLinks(),
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
    newLinks.forEach((link) => {
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
    button.style.willChange = "";
    setTimeout(
      (button) => {
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
