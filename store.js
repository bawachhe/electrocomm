const electron = require('electron');
const path = require('path');
const fs = require('fs');

const _DEFAULTS = {
	// 800x600 is the default size of our window
	windowBounds: { width: 800, height: 600 }
};

class Store {
	static INITIALIZED_STORE;

	static accessStore() {
		if (!Store.INITIALIZED_STORE) {
			Store.INITIALIZED_STORE = new Store();
		}

		return Store.INITIALIZED_STORE;
	}

	constructor(opts) {
		// Renderer process has to get `app` module via `remote`, whereas the main process can get it directly
		// app.getPath('userData') will return a string of the user's app data directory path.
		const userDataPath = (electron.app || require('@electron/remote').app).getPath('userData');
		// We'll use the `configName` property to set the file name and path.join to bring it all together as a string
		this.path = path.join(userDataPath, 'user-preferences.json');
		
		this.data = parseDataFile(this.path, _DEFAULTS);
	}
	
	get(key) {
		return this.data[key];
	}
	
	set(key, val) {
		this.data[key] = val;
		fs.writeFileSync(this.path, JSON.stringify(this.data));
	}

	setAutoTabIcon(tabIndex, url) {
		let tabData = this.data['tabData'];

		if (tabData) {
			tabData[tabIndex].autoFavIconURL = url;
			fs.writeFileSync(this.path, JSON.stringify(this.data));
		}
	}
}

function parseDataFile(filePath, defaults) {
	try {
		return JSON.parse(fs.readFileSync(filePath));
	} catch(error) {
		console.log(error);
		return defaults;
	}
}

module.exports = Store;