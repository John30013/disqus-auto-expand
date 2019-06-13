# Disqus Auto Expander Changelog

## Version 0.3

New auto-expand options:
  - **Load more comments**: expands the “Load more comments” button when at the end of the discussion.
  - **See new comments**: expands the “See # new comments” button when at the top of the discussion.

Bug fixes:
  - Fixed the **Open links in a new tab/window** option.

## Version 0.2

New content management options:
  - **Stop autoplay media**: attemtps to stop autoplay embedded audio and video items (because the browser settings to do this do not always work). Does not affect GIFs.
  - **Open links in a new tab/window**: forces URLs included in a comment to open in a new browser window or tab (depending on your browser’s settings).

## Version 0.1

Initial release. Provides the following features to make reading Disqus forums more enjoyable.

Automatically expands the following collapsed items:
  - **See more replies**
  - **See # new replies**
  - **See more** (link that cuts off the bottom of long comments and embedded media items)

Click the extension’s icon in the browser's toolbar to control each option. You can also configure the following:
  - **Check for new content**: how often (in seconds) the extension checks for new links to expand.
  - **Use dark theme**: display the configuration page in a dark color theme.
  - **Log debug output**: logs messages about the extension’s operation to the browser’s developer console. You should not need to enable this option unless you are experiencing problems with the extension. (This option will be removed in a future release.)