// Modules to control application life and create native browser window
const electronRemoteMain = require('@electron/remote/main');
const {app, BrowserWindow, ipcMain, Menu} = require('electron');
const path = require('path');
const Store = require('./store.js');

require('@electron/remote/main').initialize();

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

// enable native (OS-specific) stuff to work
app.allowRendererProcessReuse = false;

// Get the stored infos
const store = Store.accessStore();

const isSingleInstance = app.requestSingleInstanceLock();

if (!isSingleInstance) {
	app.quit();
}

function init() {
	updateStore();
	createWindow();
}

function updateStore() {
	const storeVersion = store.get('version');

	if (storeVersion && storeVersion >= 1)
		return;

	if (!storeVersion || storeVersion < 1) {
		const tabData = store.get('tabData');

		if (tabData) {
			let idGenerator = Date.now();

			tabData.map((tabDatum) => {
				if (tabDatum && !tabDatum.id) {
					tabDatum.id = idGenerator++;
				}

				return tabDatum;
			});

			store.set('tabData', tabData);
		}

		store.set('version', 1);
	}
}

function createWindow () {
	let {width, height, x, y} = store.get('windowBounds');

	// Create the browser window.
	mainWindow = new BrowserWindow({
		width,
		height,
		x,
		y,
		frame: false,
		icon: path.join(__dirname, 'res/icon.png'),
		webPreferences: {
			contextIsolation: false,
			enableRemoteModule: true,
			nodeIntegration: true,
			preload: path.join(__dirname, 'preload.js'),
			webviewTag: true
		}
	})

	// @electron/remote is disabled for this WebContents. Call require("@electron/remote/main").enable(webContents) to enable it.
	electronRemoteMain.enable(mainWindow.webContents);

	let configWindow;

	ipcMain.on('open-config', (e, id) => {
		const mainWindowBounds = mainWindow.getBounds();

		const x = Math.round(mainWindowBounds['x'] + ((mainWindowBounds['width'] / 2) - 600));
		const y = Math.round(mainWindowBounds['y'] + ((mainWindowBounds['height'] / 2) - 300));

		configWindow = new BrowserWindow({
			parent: mainWindow,
			modal: true,
			frame: false,
			height: 600,
			width: 1200,
			x,
			y,
			webPreferences: {
				contextIsolation: false,
				enableRemoteModule: true,
				nodeIntegration: true,
				preload: path.join(__dirname, 'preload.js'),
				webviewTag: true
			}
		});

		// @electron/remote is disabled for this WebContents. Call require("@electron/remote/main").enable(webContents) to enable it.
		electronRemoteMain.enable(configWindow.webContents);

		if (id && !isNaN(id))
			configWindow.loadFile('configmod.html', {query: {"id": id }});
		else
			configWindow.loadFile('configmod.html', {query: {"id": 1, "moredata":"hello" }});

		// configWindow.webContents.openDevTools()
	});

	ipcMain.on('save-config', (e, tabDataToSave) => {
		let oldTabData = store.get('tabData');

		let newTabData = [];

		if (oldTabData && oldTabData.length > 0)
			newTabData = JSON.parse(JSON.stringify(oldTabData));

		let dataPreviouslyExists = false;

		newTabData = newTabData.map((tabDatum) => {
			if (tabDatum.id == tabDataToSave.id) {
				dataPreviouslyExists = true;

				return tabDataToSave;
			}
			else
				return tabDatum;
		});

		if (!dataPreviouslyExists) {
			newTabData.push(tabDataToSave);
		}

		store.set('tabData', newTabData);

		if (dataPreviouslyExists) {
			mainWindow.webContents.send('refresh-tab', tabDataToSave);
		}
		else {
			mainWindow.webContents.send('add-tab', tabDataToSave);
		}

		e.sender.send('update-local-store-instance', store.data);
	});

	ipcMain.on('delete-config', (e, id) => {
		let tabData = store.get('tabData');

		if (tabData) {
			tabData = tabData.filter((tabDatum) => tabDatum.id != id);

			store.set('tabData', tabData);

			mainWindow.webContents.send('remove-tab', id);
		}

	});

	ipcMain.on('close-config', () => {
		configWindow.close();
		configWindow = null;
	});

	ipcMain.on('minimize', () => {
		mainWindow.minimize();
	})

	ipcMain.on('maximize', () => {
		if (mainWindow.isMaximized())
			mainWindow.unmaximize();
		else
			mainWindow.maximize();
	})

	ipcMain.on('close', () => {
		mainWindow.close();
	})

	ipcMain.on('crash', (...etc) => {
		console.debug(etc);
	})

	ipcMain.on('open-main-dev-tools', () => {
		mainWindow.webContents.openDevTools();
	})

	const saveWindowBounds = () => {
		// The event doesn't pass us the window size, so we call the `getBounds` method which returns an object with
		// the height, width, and x and y coordinates.
		let { width, height, x, y } = mainWindow.getBounds();
		store.set('windowBounds', { width, height, x, y });
	};

	mainWindow.on('resize', saveWindowBounds);

	mainWindow.on('move', saveWindowBounds);

	mainWindow.on('app-command', (e, cmd) => {
		if (cmd === 'browser-backward' || cmd === 'browser-forward') {
			mainWindow.webContents.send('back-or-forward', cmd);
		}
	});

	// Load the index.html of the app.
	mainWindow.loadFile('index.html')

	// Open the DevTools.
	// mainWindow.webContents.openDevTools()

	// Emitted when the window is closed.
	mainWindow.on('closed', function () {
		// Dereference the window object, usually you would store windows
		// in an array if your app supports multi windows, this is the time
		// when you should delete the corresponding element.
		mainWindow = null

		app.quit();
	})
}

ipcMain.on('request-store-instance', (e) => {
	if (!store) store = Store.accessStore();

	e.sender.send('receive-store-instance', store.data);
});

ipcMain.on('update-store-auto-tab-icon', (e, tabId, iconURL) => {
	store.setAutoTabIcon(tabId, iconURL);
	e.sender.send('update-local-store-instance', store.data);
});

ipcMain.on('update-store-active-tab', (e, tabId) => {
	store.set('activeTab', tabId);
	e.sender.send('update-local-store-instance', store.data);
});

ipcMain.on('update-store-tab-data', (e, tabData) => {
	store.set('tabData', tabData);
	e.sender.send('update-local-store-instance', store.data);
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', init)

// Quit when all windows are closed.
app.on('window-all-closed', function () {
	// On macOS it is common for applications and their menu bar
	// to stay active until the user quits explicitly with Cmd + Q
	app.quit()
})

app.on('activate', function () {
	// On macOS it's common to re-create a window in the app when the
	// dock icon is clicked and there are no other windows open.
	if (mainWindow === null) createWindow()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
