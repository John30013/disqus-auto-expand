# Disqus Auto Expand
Browser extensions for Chrome and FF to automatically expand “show more” and “see more” links in Disqus discussions. The latest version is 0.1 (beta). I have tested it myself on a couple of sites that use Disqus and it seems to work as designed.

Currently, only the Chrome version is available (it should work on most webkit-based browsers, though probably not Safari). The Firefox version is coming soon.

## Installation
In all cases below, you should first clone or download and unzip this repository to your local machine. In the instructions below, you can choose to install from either the `src/` or `dist/` directory. 
- `src/<platform>` contains all the uncompressed source files, including the Sass stylesheet and .css.map file.
- `dist/<platform>` contains compressed files and omits any files that aren't strictly needed by the extension.
- `dist/packed/<platform>` contains the “packed” extension (`.crx`) file, which is what would be installed from the Google Play Store. See below for details.

### Chrome desktop browser
1. Open your Chrome browser.
1. Either browse to [“chrome://extensions”](chrome://extensions) or open the “Customize and control Google Chrome” menu (three vertical dots) › “More tools” › “Extensions”:  
![A screen shot of the “Extensions” menu in Google Chrome](docs/chrome_menu.png)
1. Enable "Developer mode" using the toggle at the top right of the Extensions page:  
![Developer mode toggle](./docs/chrome_developer_mode_toggle.png).  
This will display three new buttons below the “Extensions” menu at the top left of the page:  
![Developer mode extensions buttons](docs/chrome_buttons.png).
1. Select the "Load unpacked" button, then browse to either the `src/Chrome` or `dist/Chrome` directory and choose the “Select folder” button. The “Disqus Auto Expand” extension will appear on the Extensions page:  
![A screen shot of the Disqus Auto Expand extension, installed in Chrome's Extensions page](docs/chrome_extension_tile.png)  
*__Note:__ although you can __install__ the packed extension (`.crx` file) in Developer mode, Chrome will not allow you to __enable__ it due to security restrictions. Only packed extensions installed from the Google Play Store can be enabled in the browser.*
1. Close the Extensions browser tab. The extension is now installed.  
*__Note:__ each time you restart Chrome, it will warn you about running extensions in Developer mode and prompt you to disable them. Click the “x” in the warning popup to close it; the extension will continue to operate.

### Chrome-based browsers for Android
Chrome for Android does not currently support installing extensions. However, other mobile browsers based on the Chromium browser engine, such as Kiwi and Yandex, do allow you to install extensions.

- [Read instructions for the Kiwi browser](https://www.howtogeek.com/415876/how-to-install-desktop-chrome-extensions-on-android/). Note that Kiwi has a Developer mode that allows you to install extensions from a local `.crx` or `.zip` file. To install this extension:
    1. Install the Kiwi browser on your Android device.
    1. In your copy of this repository, navigate to `dist/packed/Chrome`.
    1. Copy the `Disqus Auto Expand.crx` file to your Android device (using a USB cable or other file transfer method of your choice).
    1. On your Android device, launch the Kiwi browser.
    1. The rest of the installation instructions are similar to the Chrome Desktop instructions, except that the “Extensions” menu item is in the main menu (there is no “Tools” sub-menu). Also, the Kiwi browser does not warn about running Developer mode extensions every time you restart it.

- [Read instructions for the Yandex browser](https://www.gizbot.com/how-to/tips-tricks/how-you-can-install-chrome-extensions-on-android-050121.html). Note that Yandex currently only supports installing extensions from the Google Play Store. I plan to deploy this extension to the Google Play Store once it is out of beta test.

### Firefox desktop browser
Coming soon!

### Firefox for Android
Coming soon!

## Configuration and operation
Coming soon!
