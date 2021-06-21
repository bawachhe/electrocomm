# ![ElectroComm Icon](https://raw.githubusercontent.com/bawachhe/electrocomm/master/res/icons/64x64.png) ElectroComm

This is a minimal Electron application that I wrote to neatly compartmentalize my e-communications tabs into an independent window.

## Wait but why?  Aren't there like a million of these?

I've seen and used other Electron-based multi-tab e-communication apps, but they're all too bulky or lacking in some simple functionality I wish they had, or they want to make money off you.
I'm not going to ever charge money to use this, not from myself (obviously) and not from you either, should you choose to use :]

## Features

![ElectroComm Main Window](https://raw.githubusercontent.com/bawachhe/electrocomm/master/res/main_screenshot.png)

- Uses [electron-tabs](https://www.npmjs.com/package/electron-tabs) for tabbed view
- Uses a simplified data store that just saves info to a JSON file in your local user profile config

![ElectroComm Config Window](https://raw.githubusercontent.com/bawachhe/electrocomm/master/res/config_screenshot.png)

- Basic but very functional config window
- Uses [dragula](https://www.npmjs.com/package/dragula) to reorder tabs, saves tab order with aforementioned store mechanic
- Remembers your last-active tab/service and reloads that
- Auto-downloads (and caches url for) default favicon for whatever URL you specify; allows for custom favicon
- Loading indicator, just in case a service is behaving funny and you don't realize it's because something isn't done loading
- Per-tab reloadability; per-tab (actually per-url) session forgetting, on right-click of tab
- String-based session partitioning, in case you don't want Facebook to read your Gmail for ad keywords
- Open external links in default browser
- Highly simplified interface (no title bar, drag blank space next to tabs to move window)
- Neat homegrown app icon :]
- More stuff I'm too lazy to update on README or in screenshots at the moment; hover over things in the UI to get an explanation

## To Use

Just download the appropriate release binary from the [release builds](https://github.com/bawachhe/electrocomm/releases), or build your own (read below)

## To Build a Release

### Get the repository and `npm install`

To clone and run this repository you'll need [Git](https://git-scm.com) and [Node.js](https://nodejs.org/en/download/) (which comes with [npm](http://npmjs.com)) installed on your computer. From your command line:

```bash
# Clone this repository
git clone https://github.com/bawachhe/electrocomm
# Go into the repository
cd electrocomm
# Install dependencies
npm install
```
### Run a pre-defined build

- MacOS x64: `npm run build-mac`
- Linux x64: `npm run build-linux`
- Windows x64: `npm run build-windows`

(See what these commands do exactly in [this part of package.json](https://github.com/bawachhe/electrocomm/blob/master/package.json#L7))

### Or, define your own build
Depending on your OS, CPU architecure, etc. and based on [these electron-packager docs](https://github.com/electron/electron-packager/blob/master/usage.txt), run as follows:

```bash
electron-packager . --overwrite --platform=<darwin/linux/win32/etc.> --arch=<ia32/x64/armv*> --icon=res/icon.<png/icns> --prune=true --out=release-builds
```

### Or, if you want to run from source (or test source because you're developing more features etc.)
```bash
npm start
```

### Thank [electron-quick-start](https://github.com/electron/electron-quick-start) for this note here
Note: If you're using Linux Bash for Windows, [see this guide](https://www.howtogeek.com/261575/how-to-run-graphical-linux-desktop-applications-from-windows-10s-bash-shell/) or use `node` from the command prompt.

## License

[CC0 1.0 (Public Domain)](LICENSE.md)
