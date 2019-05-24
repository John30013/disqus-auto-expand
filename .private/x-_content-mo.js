console.debug(`content-mo.js running in ${window.name} iframe.`);

const defaultOptions = { 'moreReplies': true, 'newReplies': true, 'longItems': true, 'doDebug': true };
let doDebug = false, 
    options = null,
    observer = null;

getOptions(opts => {
  options = opts;
  doDebug = options.doDebug;
  waitForPosts(postsContainer => {
    setUpObserver(obs => { 
      observer = obs;
      observer.observe(postsContainer, {
        'childList': true,
        'subtree': true,
      })
    });
  })
});
// End of main code.

/* ====== Helper functions ====== */
function getOptions(callback) {
  chrome.storage.sync.get(defaultOptions, (opts) => {
    opts.doDebug && console.debug("--> Got sync'd options: %o", opts);
    callback(opts);
  });
}

function waitForPosts(callback) {
  const interval = window.setInterval(() => {
    doDebug && console.debug('--> Waiting for posts...');
    const postsContainer = document.getElementById('posts');
    if (postsContainer) {
      doDebug && console.debug("----> Got posts container %o", postsContainer);
      window.clearInterval(interval);
      callback(postsContainer);
    }
  }, 1000);
}

function setUpObserver(callback) {
  doDebug && console.debug('--> Setting up the MutationObserver');
  callback(new MutationObserver(mutationHandler));
}

function mutationHandler(mutations) { 
  doDebug && console.group('Handling %d mutation(s):', mutations.length);
  for (let mut of mutations) {
    doDebug && console.group('Processing mutation %o with %d new node(s):', mut, mut.addedNodes.length);
    // const nodeList = Array.from(mut.addNodes);
    for (let node of mut.addedNodes) {
      if (node.nodeType === Node.ELEMENT_NODE && ['a', 'div'].contains(node.nodeName.toLowerCase())) {
        doDebug && console.group('Processing new node %o:', node);
        let elt = node.parentElement;
        if (options.moreReplies && elt.matches('div.show-children-wrapper:not(.hidden)')) {
          for (let child of elt.children) {
            if (child.matches('a.show-children:not(.busy)')) {
              console.debug('--> Clicking "show more replies" link %o', child);
              child.click();
            }
          }
        }
        else if (options.newReplies && elt.matches('a.realtime-button.reveal:not([style*="display: none;"])')) {
          console.debug('--> Clicking "show x new replies" link %o', elt);
          elt.click();
        }
        else if (options.longItems && elt.matches('a.see-more:not(.hidden)')) {
          console.debug('--> Clicking "show more" link %o', elt);
          elt.click();
        }
        doDebug && console.groupEnd(/* processing new node */);
      }
    }
    doDebug && console.groupEnd(/* processing mutation */);
  }
  doDebug && console.groupEnd(/* Handling x nutations */);
}
