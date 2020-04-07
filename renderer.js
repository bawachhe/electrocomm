// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// No Node.js APIs are available in this process because
// `nodeIntegration` is turned off. Use `preload.js` to
// selectively enable features needed in the rendering
// process.

const {ipcRenderer} = require('electron');
const TabGroup = require("electron-tabs");
const Store = require('./store.js');

let tabGroup = new TabGroup();

// Get the stored infos
const store = Store.accessStore();

document.querySelector('button.config').addEventListener('click', () => {
	ipcRenderer.send('open-config');
})

const tabData = store.get('tabData');
const activeTab = store.get('activeTab');

if (tabData) {
	tabGroup.on('tab-active', (tab) => {
		store.set('activeTab', tab.webviewAttributes.src);
	});

	for (let tabIndex in tabData) {
		const tabDatum = tabData[tabIndex];

		let tab = tabGroup.addTab({
			active: (tabDatum.src == activeTab),
			iconURL: tabDatum.customFavIconURL || tabDatum.autoFavIconURL,
			src: tabDatum.src,
			visible: true
		});


		if (!tabDatum.customFavIconURL) {
			tab.webview.addEventListener(
				'page-favicon-updated',
				(e) => {
					if (tabDatum.autoFavIconURL != e.favicons[0]) {
						tab.setIcon(e.favicons[0]);

						store.setAutoTabIcon(tabIndex, e.favicons[0]);
					}
				}
			);
		}
	}
}