# Disqus Auto Expand
Disqus Auto Expand is a browser extensions for Chrome and Firefox that automatically expands collapsed replies and long posts and media items in Disqus discussions. The latest version is 0.1 (beta).

Currently, only the Chrome version is available (it should work on most Chromium- and webkit-based browsers, although probably not Safari). The Firefox version is coming soon.

## Installation
_**NOTE:** The Chrome extension is now available on the Google Play Store. Since it is still in beta, the listing is private. Follow this link to [install the extension from the Play Store](https://chrome.google.com/webstore/detail/disqus-auto-expander/fpbfgpbppogiblppnplbkkcdmnklnbao?hl=en&gl=US)._

### Chrome desktop browser
[Install from the Google Play Store](https://chrome.google.com/webstore/detail/disqus-auto-expander/fpbfgpbppogiblppnplbkkcdmnklnbao?hl=en&gl=US).

### Chrome-based mobile browsers for Android
Chrome for Android does not currently support installing extensions. However, other mobile browsers based on the Chromium browser engine, such as Kiwi and Yandex, do support extensions.

- [Read instructions for the Kiwi browser](https://www.howtogeek.com/415876/how-to-install-desktop-chrome-extensions-on-android/)
- [Read instructions for the Yandex browser](https://www.gizbot.com/how-to/tips-tricks/how-you-can-install-chrome-extensions-on-android-050121.html).

After you install one of those browsers, follow this link to [install the extension from the Play Store](https://chrome.google.com/webstore/detail/disqus-auto-expander/fpbfgpbppogiblppnplbkkcdmnklnbao?hl=en&gl=US).

### Firefox desktop browser
_Coming soon!_

### Firefox for Android
_Coming soon!_

## Configuration and operation
The extension is designed to work automatically, and it is configured with the most useful options (i.e., expand all replies and long media items; and check for new links every 5 seconds).

You can change the configuration to choose (a) which links to automatically expand, and (b) how often to check for new links. There are three ways to access the configuration screen:
1. On a desktop browser, when you are on a web page that contains a Disqus discussion area, the extension’s icon turns blue: ![Disqus Auto Expand extension icon in the active state](docs/dax_icon_blue.png). You can click the icon to display the configuration page in a popup view:  
![Screen shot of configuration popup when the extension is active](docs/dax_config_page.png)  
_**Note:** you may need to scroll down to see all of the options in the popup view._

1. On a Desktop browser, when you are on a web page that _does not_ contain a Disqus discussion area, the extension’s icon turns gray: ![Disqus Auto Expand extension icon in the inactive state](docs/dax_icon_gray.png). You can click the icon to display the extension management popup and choose “Options”:  
![Screen shot of Chrome's standard extension management popup](docs/chrome_extension_management_popup.png)

1. On a Desktop or Mobile browser you can access the “Extension options” page by choosing the “Details” button on the extension’s tile in the browser’s “Extensions” page:  
![Screen shot of the Disqus Auto Expand extension, installed in the Chrome browser's Extensions page](docs/chrome_extension_tile.png)  
Then on the details page scroll down and select the section titled “Extension options”:  
![Screen shot of the "Extension options" section](docs/chrome_extension_options.png)

Either of the last two options will display a new browser tab or window containing the extension’s configuration page, which is identical to the popup shown in the first option above.

On the configuration popup or page you can change any of the options shown. Changes take effect immediately (there is no “Save” button) and—if you are signed in to your browser’s synchronization service—will be synchronized to your other browsers.
