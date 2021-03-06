// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// No Node.js APIs are available in this process because
// `nodeIntegration` is turned off. Use `preload.js` to
// selectively enable features needed in the rendering
// process.

const {ipcRenderer} = require('electron');
const remote = require('@electron/remote');
const TabGroup = require("electron-tabs");
const dragula = require('dragula');
const Store = require('./store.js');

// Get the stored infos
const store = Store.accessStore();

const tabData = store.get('tabData');
const activeTab = store.get('activeTab');

// window.onerror = function(e) {
// 	ipcRenderer.send('crash', e.message, e);
// }

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

ipcRenderer.on('back-or-forward', function(event, backOrForward) {
	if (backOrForward == 'browser-backward') {
		doGoBack();
	}
	else if (backOrForward == 'browser-forward') {
		doGoFwd();
	}
});

function doGoBack() {
	if (tabGroup) {
		const currentActiveTab = tabGroup.getActiveTab();

		if (currentActiveTab) {
			const currentActiveWebView = currentActiveTab.webview;

			if (currentActiveWebView.canGoBack()) {
				currentActiveWebView.goBack();
			}
		}
	}
}

function doGoFwd() {
	if (tabGroup) {
		const currentActiveTab = tabGroup.getActiveTab();

		if (currentActiveTab) {
			const currentActiveWebView = currentActiveTab.webview;

			if (currentActiveWebView.canGoForward()) {
				currentActiveWebView.goForward();
			}
		}
	}
}

const devMenu = remote.Menu.buildFromTemplate([
	{
		accelerator: 'Ctrl+F12',
		label: 'Show Main Dev Console',
		click() { ipcRenderer.send('open-main-dev-tools') }
	}
]);

document.querySelector('button.back').addEventListener('click', () => {
	doGoBack();
})

document.querySelector('button.forward').addEventListener('click', () => {
	doGoFwd();
})

document.querySelector('button.config').addEventListener('click', () => {
	ipcRenderer.send('open-config');
})
document.querySelector('button.config').addEventListener('contextmenu', () => {
	devMenu.popup();
})

document.querySelector('button.minimize').addEventListener('click', () => {
	ipcRenderer.send('minimize');
})

document.querySelector('button.maximize').addEventListener('click', () => {
	ipcRenderer.send('maximize');
})

document.querySelector('button.close').addEventListener('click', () => {
	ipcRenderer.send('close');
})

const hiddenAcceleratorOnlyContextMenu = remote.Menu.buildFromTemplate([
	{
		accelerator: 'F5',
		label: 'Reload Current Tab',
		click() {
			let tgActiveTab = tabGroup.getActiveTab();

			if (tgActiveTab) {
				tgActiveTab.webview.reload();
			}
		}
	},
	{
		accelerator: 'CommandOrControl+R',
		label: 'No Really, Reload Current Tab (same bat MenuItem, different bat shortcut)',
		click() {
			let tgActiveTab = tabGroup.getActiveTab();

			if (tgActiveTab) {
				tgActiveTab.webview.reload();
			}
		}
	},
	{
		accelerator: 'CommandOrControl+Shift+R',
		label: 'Reload All Tabs',
		click() {
			tabGroup.eachTab((currentTab) => {
				currentTab.webview.reload();
			});
		}
	},
	{
		accelerator: 'Alt+Left',
		label: 'History: Back',
		click() {
			doGoBack();
		}
	},
	{
		accelerator: 'Alt+Right',
		label: 'History: Forward',
		click() {
			doGoFwd();
		}
	}
]);

remote.Menu.setApplicationMenu(hiddenAcceleratorOnlyContextMenu);

if (tabData) {
	tabGroup.on('tab-active', (tab) => {
		store.set('activeTab', tab.webviewAttributes.src);
	});

	for (let tabIndex in tabData) {
		const tabDatum = tabData[tabIndex];

		let src = tabDatum.src;

		if (!src.match(/^https?:\/\//)) {
			src = "https://" + src;
		}

		let tab = tabGroup.addTab({
			active: (tabDatum.src == activeTab),
			iconURL: tabDatum.customFavIconURL || tabDatum.autoFavIconURL,
			src: tabDatum.src,
			title: tabDatum.src,
			visible: true,
			webviewAttributes: {
				partition: (tabDatum.sessionPartition ? 'persist:' + tabDatum.sessionPartition : ''),
				userAgent:
					tabDatum.customUserAgent || 
					"Mozilla/5.0 (Linux x86_64) Chrome/90.0.4430.212"
			}
		});

		tab.webview.addEventListener('crashed', (e) => {
			ipcRenderer.send('crash', "oshi-, " + tabDatum.src + " crashed.", e);
		})

		tab.webview.addEventListener('plugin-crashed', (e) => {
			ipcRenderer.send('crash', "oshi-, " + tabDatum.src + " plugin-crashed?", e);
		})

		tab.webview.addEventListener('destroyed', (e) => {
			ipcRenderer.send('crash', "oshi-, " + tabDatum.src + " destroyed?", e);
		})

		tab.webview.addEventListener('close', (e) => {
			webview.src = "about:blank";
			ipcRenderer.send('crash', "oshi-, " + tabDatum.src + " closed itself?", e);
		})

		tab.webview.addEventListener('did-fail-load', (code, msg, url) => {
			webview.src = "about:blank";
			ipcRenderer.send('crash', "oshi-, " + tabDatum.src + " closed itself?", code, msg, url);
		})

		tab.webview.addEventListener('did-start-loading', () => {
			tab.setBadge('<img src="loading.gif" />');
		})

		tab.webview.addEventListener('did-stop-loading', () => {
			tab.setBadge();
		})

		tab.webview.addEventListener('new-window', (e) => {
			const url = require('url').parse(e.url);

			if (url.protocol === 'http:' || url.protocol === 'https:') {
				if (tabDatum.hostnameWhitelist && tabDatum.hostnameWhitelist.indexOf(url.hostname) != -1) {
					tab.webview.loadURL(e.url);
				}
				else {
					remote.shell.openExternal(e.url);
				}
			}
		});

		const menu = remote.Menu.buildFromTemplate([
			{
				label: 'Show Dev Console',
				click() { tab.webview.openDevTools() }
			},
			{
				label: 'Reload Tab',
				click() { tab.webview.reload() }
			},
			{
				label: 'Forget Tab Sessions/Cookies',
				click() {
					remote.session.defaultSession.clearStorageData({origin: tabDatum.src});

					if (tabDatum.sessionPartition) {
						remote.session.fromPartition("persist:" + tabDatum.sessionPartition).clearStorageData();
					}
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