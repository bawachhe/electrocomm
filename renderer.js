// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// No Node.js APIs are available in this process because
// `nodeIntegration` is turned off. Use `preload.js` to
// selectively enable features needed in the rendering
// process.

const {ipcRenderer, remote} = require('electron');
const TabGroup = require("electron-tabs");
const dragula = require('dragula');
const Store = require('./store.js');

// Get the stored infos
const store = Store.accessStore();

const tabData = store.get('tabData');
const activeTab = store.get('activeTab');

let tabGroup = new TabGroup({
	ready: (tabGroup) => {
		let drake = dragula([tabGroup.tabContainer], {direction: "horizontal"});

		drake.on('drop', (el, target, source, sibling) => {
			let tabSrc = el.querySelector('.etabs-tab-title').innerHTML;
			let siblingSrc;

			if (sibling) {
				siblingSrc = sibling.querySelector('.etabs-tab-title').innerHTML;
			}

			let tabIndex, siblingIndex;

			for (let i = 0; i < tabData.length; i++) {
				if (tabData[i].src == tabSrc) {
					tabIndex = i;
				}
				if (tabData[i].src == siblingSrc) {
					siblingIndex = i;
				}
			}

			tabData.splice(((siblingIndex === undefined) ? (tabData.length - 1) : siblingIndex), 0, tabData.splice(tabIndex, 1)[0]);

			store.set('tabData', tabData);
		});
	}
});

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

remote.globalShortcut.register('CommandOrControl+Shift+R', () => {
	tabGroup.eachTab((currentTab) => {
		currentTab.webview.reload();
	});
});

remote.globalShortcut.register('F5', () => {
	let tgActiveTab = tabGroup.getActiveTab();

	if (tgActiveTab) {
		tgActiveTab.webview.reload();
	}
});

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
			title: tabDatum.src,
			visible: true,
			webviewAttributes: {
				partition: (tabDatum.sessionPartition ? 'persist:' + tabDatum.sessionPartition : ''),
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

		tab.webview.addEventListener('new-window', (e) => {
			const protocol = require('url').parse(e.url).protocol;

			if (protocol === 'http:' || protocol === 'https:') {
				remote.shell.openExternal(e.url)
			}
		});

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