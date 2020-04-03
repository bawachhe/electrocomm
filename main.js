// Modules to control application life and create native browser window
const {app, BrowserWindow, ipcMain} = require('electron')
const path = require('path')
const Store = require('./store.js');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

// Get the stored infos
const store = Store.accessStore();

function createWindow () {
	let {width, height} = store.get('windowBounds');
	
	// Create the browser window.
	mainWindow = new BrowserWindow({
		width,
		height,
		webPreferences: {
			nodeIntegration: true,
			preload: path.join(__dirname, 'preload.js'),
			webviewTag: true
		}
	})

	let configWindow;

	ipcMain.on('open-config', () => {
		configWindow = new BrowserWindow({
			parent: mainWindow,
			modal: true,
			webPreferences: {
				nodeIntegration: true,
				preload: path.join(__dirname, 'preload.js'),
				webviewTag: true
			}
		});

		configWindow.loadFile('config.html');
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

	mainWindow.on('resize', () => {
		// The event doesn't pass us the window size, so we call the `getBounds` method which returns an object with
		// the height, width, and x and y coordinates.
		let { width, height } = mainWindow.getBounds();
		store.set('windowBounds', { width, height });
	});

	// Load the index.html of the app.
	mainWindow.loadFile('index.html')

	// Open the DevTools.
	mainWindow.webContents.openDevTools()

	// Emitted when the window is closed.
	mainWindow.on('closed', function () {
		// Dereference the window object, usually you would store windows
		// in an array if your app supports multi windows, this is the time
		// when you should delete the corresponding element.
		mainWindow = null
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
	if (process.platform !== 'darwin') app.quit()
})

app.on('activate', function () {
	// On macOS it's common to re-create a window in the app when the
	// dock icon is clicked and there are no other windows open.
	if (mainWindow === null) createWindow()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
