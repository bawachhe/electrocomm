// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// No Node.js APIs are available in this process because
// `nodeIntegration` is turned off. Use `preload.js` to
// selectively enable features needed in the rendering
// process.

const {ipcRenderer, remote} = require('electron');
const TabGroup = require("electron-tabs");
const Store = require('./store.js');

let tabGroup = new TabGroup();

// Get the stored infos
const store = Store.accessStore();

document.querySelector('button.config').addEventListener('click', () => {
	ipcRenderer.send('open-config');
})

document.querySelector('button.close').addEventListener('click', () => {
	ipcRenderer.send('close');
})

remote.globalShortcut.register('CommandOrControl+R', () => {
	let tgActiveTab = tabGroup.getActiveTab();
	if (tgActiveTab) {
		tgActiveTab.webview.reload();
	}
});

remote.globalShortcut.register('F5', () => {
	let tgActiveTab = tabGroup.getActiveTab();

	if (tgActiveTab) {
		tgActiveTab.webview.reload();
	}
});

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
			visible: true,
			webviewAttributes: {
				useragent:
					"Mozilla/5.0 (X11; Fedora; Linux x86_64) " +
					"AppleWebKit/537.36 (KHTML, like Gecko) " +
					"Chrome/80.0.3987.163 Safari/537.36"
			}
		});

		tab.webview.addEventListener('did-start-loading', () => {
			tab.setBadge('<img src="loading.gif" />');
		})

		tab.webview.addEventListener('did-stop-loading', () => {
			tab.setBadge();
		})

		const menu = remote.Menu.buildFromTemplate([
			{
				label: 'Reload Tab',
				click() { tab.webview.reload() }
			},
			{
				label: 'Forget Tab Sessions/Cookies',
				click() {
					remote.session.defaultSession.clearStorageData({origin: tabDatum.src});
				}
			}
		]);

		tab.tab.addEventListener('contextmenu', () => {
			menu.popup()
		}, false)

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