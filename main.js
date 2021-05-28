// Modules to control application life and create native browser window
const main = require('@electron/remote/main');
const {app, BrowserWindow, ipcMain} = require('electron');
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
			enableRemoteModule: true,
			nodeIntegration: true,
			preload: path.join(__dirname, 'preload.js'),
			webviewTag: true
		}
	})

	let configWindow;

	ipcMain.on('open-config', () => {
		const mainWindowBounds = mainWindow.getBounds();

		const x = mainWindowBounds['x'] + ((mainWindowBounds['width'] / 2) - 400);
		const y = mainWindowBounds['y'] + ((mainWindowBounds['height'] / 2) - 250);

		configWindow = new BrowserWindow({
			parent: mainWindow,
			modal: true,
			frame: false,
			height: 600,
			width: 1200,
			x,
			y,
			webPreferences: {
				enableRemoteModule: true,
				nodeIntegration: true,
				preload: path.join(__dirname, 'preload.js'),
				webviewTag: true
			}
		});

		configWindow.loadFile('config.html');

		// configWindow.webContents.openDevTools()
	});

	ipcMain.on('save-config', (e, tabData) => {
		let oldTabData = store.get('tabData');

		store.set('tabData', tabData);

		if (JSON.stringify(tabData) != JSON.stringify(oldTabData)) {
			mainWindow.reload();
		}

		configWindow.close();
		configWindow = null;
	});

	ipcMain.on('cancel-config', (e, tabData) => {
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

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

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
