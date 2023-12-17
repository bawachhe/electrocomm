// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// No Node.js APIs are available in this process because
// `nodeIntegration` is turned off. Use `preload.js` to
// selectively enable features needed in the rendering
// process.

const {ipcRenderer} = require('electron');
const Sortable = require('sortablejs');
const remote = require('@electron/remote');
const electronRemoteMain = require('@electron/remote/main');
//const TabGroup = require("electron-tabs");
const dragula = require('dragula');
const normalizeUrl = require('normalize-url');

let storeData, tabData, activeTab;

const tabGroup = document.querySelector("tab-group");

const loadingBadge = {
	text: '<svg viewBox="0 0 100 100" style="background-color: transparent;"><circle cx="50" cy="50" r="26" stroke="#34a2fc" stroke-width="11" fill="none">  <animateTransform attributeName="transform" type="rotate" repeatCount="indefinite" dur="2.4390243902439024s" values="0 50 50;180 50 50;720 50 50" keyTimes="0;0.5;1"></animateTransform>  <animate attributeName="stroke-dasharray" repeatCount="indefinite" dur="2.4390243902439024s" values="22.8707945181337 140.49202346853556;163.36281798666926 0;22.8707945181337 140.49202346853556" keyTimes="0;0.5;1"></animate></circle></svg>',
	classname: 'loading'
};

ipcRenderer.send('request-store-instance');

ipcRenderer.on('update-local-store-instance', (e, storeDataInstance) => storeData = storeDataInstance);

ipcRenderer.on('receive-store-instance', (e, storeDataInstance) => {
	storeData = storeDataInstance;

	tabData = storeData['tabData'];
	activeTab = storeData['activeTab'];

	const createNewSortable = () => {
		const options = Object.assign({
			direction: "horizontal",
			animation: 150,
			swapThreshold: 0.20,
			onEnd: function(evt) {
				tabIndex = evt.newDraggableIndex;

				oldTabDataIndex = evt.oldDraggableIndex;

				tabData.splice(tabIndex, 0, tabData.splice(oldTabDataIndex, 1)[0]);

				ipcRenderer.send('update-store-tab-data', tabData);
			}
		}, tabGroup.options.sortableOptions);

		new Sortable(tabGroup.tabContainer, options);
	};

	if (Sortable) {
		createNewSortable();
	} else {
		document.addEventListener("DOMContentLoaded", createNewSortable);
	}

	if (tabData) {
		tabGroup.on('tab-active', (tab) => {
			if (tab.element.id) ipcRenderer.send('update-store-active-tab', tab.element.id);
		});

		tabData.forEach((tabDatum) => doAddTab(tabDatum));
	}
});

// window.onerror = function(e) {
// 	ipcRenderer.send('crash', e.message, e);
// }

const DEFAULT_USERAGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

ipcRenderer.on('back-or-forward', (e, backOrForward) => {
	if (backOrForward == 'browser-backward') {
		doGoBack();
	}
	else if (backOrForward == 'browser-forward') {
		doGoFwd();
	}
});

ipcRenderer.on('add-tab', (e, tabDatum) => doAddTab(tabDatum));

ipcRenderer.on('refresh-tab', (e, tabDatum) => {
	if (tabGroup && tabDatum.id) {
		for (let tab of tabGroup.getTabs()) {
			if (tab && tab.element && tab.element.id && tab.element.id == tabDatum.id) {
				if (normalizeUrl(tab.webview.src) != normalizeUrl(tabDatum.src)) {
					tab.webview.loadURL(tabDatum.src).then(() => setTabData(tab, tabDatum));
				}
				else {
					setTabData(tab, tabDatum)
				}

				break;
			}
		}
	}
});

function setTabData(tab, tabDatum) {
	tab.setTitle(tabDatum.src);

	tab.setIcon(tabDatum.customFavIconURL ? normalizeUrl(tabDatum.customFavIconURL) : tabDatum.autoFavIconURL);

	// if (tab.webview.partition != tabDatum.sessionPartition) {
	// 	tab.webview.partition = tabDatum.sessionPartition ? 'persist:' + tabDatum.sessionPartition : '';
	// }

	if (tabDatum.customUserAgent && (tab.webview.useragent != tabDatum.customUserAgent)) {
		tab.webview.useragent =  tabDatum.customUserAgent || DEFAULT_USERAGENT
	}

	if (tab.cssKey) {
		tab.webview.removeInsertedCSS(tab.cssKey).then(() => {
			if (tabDatum.customCSS) {
				tab.webview.insertCSS(tabDatum.customCSS).then((cssKey) => tab.cssKey = cssKey);
			}
		});
	}
	else {
		if (tabDatum.customCSS) {
			tab.webview.insertCSS(tabDatum.customCSS).then((cssKey) => tab.cssKey = cssKey);
		}
	}

	if (tab.newWindowEventListener) {
		tab.webview.removeEventListener('new-window', tab.newWindowEventListener);
	}

	doAddNewWindowListener(tab, tabDatum);
}

ipcRenderer.on('remove-tab', (e, id) => {
	if (tabGroup) {
		for (let tab of tabGroup.getTabs()) {
			if (tab && tab.element && tab.element.id && tab.element.id == id) {
				tab.close();

				break;
			}
		}
	}
});

function getWebContentsVar(tab) {
	const webContentsId = tab.webview.getWebContentsId();

	if (webContentsId && !isNaN(webContentsId)) {
		const tabWebContents = remote.webContents.fromId(webContentsId);

		if (tabWebContents) {
			tab.webContents = tabWebContents;

			return tabWebContents;
		}
	}

	return null;
}

function doAddNewWindowListener(tab, tabDatum) {
	if (tab.webContents || getWebContentsVar(tab)) {
		tab.newWindowEventListener = tab.webContents.setWindowOpenHandler(({url}) => {
			const parsedURL = require('url').parse(url);

			if (parsedURL.protocol === 'http:' || parsedURL.protocol === 'https:') {
				if (tabDatum.hostnameWhitelist && tabDatum.hostnameWhitelist.indexOf(parsedURL.hostname) != -1) {
					tab.webview.loadURL(url);
				}
				else {
					remote.shell.openExternal(url);
				}
			}

			return { action: 'deny' };
		});
	}
}

function doAddTab(tabDatum) {
	let src = tabDatum.src;

	if (src && !src.match(/^https?:\/\//)) {
		src = "https://" + src;
	}

	let tab = tabGroup.addTab({
		active: (tabDatum.id == activeTab),
		iconURL: tabDatum.customFavIconURL ? normalizeUrl(tabDatum.customFavIconURL) : tabDatum.autoFavIconURL,
		src: normalizeUrl(tabDatum.src),
		title: normalizeUrl(tabDatum.src),
		visible: true,
		webviewAttributes: {
			allowpopups: true,
			partition: (tabDatum.sessionPartition ? 'persist:' + tabDatum.sessionPartition : ''),
			userAgent: tabDatum.customUserAgent || DEFAULT_USERAGENT
		}
	});

	if (tabDatum.customCSS) {
		tab.webview.addEventListener('dom-ready', () => {
			tab.webview.insertCSS(tabDatum.customCSS).then((cssKey) => tab.cssKey = cssKey);
		});
	}

	tab.element.id = tabDatum.id;

	tab.on('webview-ready', (tab) => {
		if (getWebContentsVar(tab)) {
			doAddNewWindowListener(tab, tabDatum);

			// @electron/remote is disabled for this WebContents. Call require("@electron/remote/main").enable(webContents) to enable it.
			electronRemoteMain.enable(tab.webContents);
		}
	});

	tab.webview.addEventListener('crashed', (e) => {
		console.log("oshi-, " + tabDatum.src + " crashed.", e);
		ipcRenderer.send('crash', "oshi-, " + tabDatum.src + " crashed.", e);
	})

	tab.webview.addEventListener('plugin-crashed', (e) => {
		console.log("oshi-, " + tabDatum.src + " plugin-crashed?", e);
		ipcRenderer.send('crash', "oshi-, " + tabDatum.src + " plugin-crashed?", e);
	})

	tab.webview.addEventListener('destroyed', (e) => {
		console.log("oshi-, " + tabDatum.src + " destroyed?", e);
		ipcRenderer.send('crash', "oshi-, " + tabDatum.src + " destroyed?", e);
	})

	tab.webview.addEventListener('close', (e) => {
		console.log("oshi-, " + tabDatum.src + " closed itself?", e);
		tab.webview.src = "about:blank";
		ipcRenderer.send('crash', "oshi-, " + tabDatum.src + " closed itself?", e);
	})

	// tab.webview.addEventListener('did-fail-load', (code, msg, url) => {
	// 	console.log("oshi-, " + tabDatum.src + " failed to load?", JSON.stringify({code, msg, url}));
	// 	ipcRenderer.send('crash', "oshi-, " + tabDatum.src + " failed to load?", JSON.stringify({code, msg, url}));
	// })

	tab.webview.addEventListener('did-start-loading', () => {
		tab.setBadge(loadingBadge);
	})

	tab.webview.addEventListener('did-stop-loading', () => {
		tab.setBadge();
	})

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

	tab.element.addEventListener('contextmenu', () => {
		menu.popup()
	}, false)

	if (!tabDatum.customFavIconURL) {
		tab.webview.addEventListener(
			'page-favicon-updated',
			(e) => {
				if (tabDatum.autoFavIconURL != e.favicons[0]) {
					tab.setIcon(e.favicons[0]);

					tabDatum.autoFavIconURL = e.favicons[0];

					ipcRenderer.send('update-store-auto-tab-icon', tabDatum.id, e.favicons[0]);
				}
			}
		);
	}
}

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
