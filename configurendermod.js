// This file is required by the config.html file and will
// be executed in the renderer process for that window.
// No Node.js APIs are available in this process because
// `nodeIntegration` is turned off. Use `preload.js` to
// selectively enable features needed in the rendering
// process.

const {ipcRenderer} = require('electron');
const remote = require('@electron/remote');
const querystring = require('querystring');
const normalizeUrl = require('normalize-url');

let id;

let idGenerator = Date.now();

let storeData, tabData;

const mainSection = document.querySelector('main');
const saveButton = document.querySelector('button#saveConfig');
const undoButton = document.querySelector('button#undoConfig');
const protoDiv = document.querySelector('div.proto.single-tab-cfg');
const tabCfgsDiv = document.querySelector('div.tab-cfgs');
const tabCfgDeetsDiv = document.querySelector('div.tab-cfg-deets');

const savedSettingsInput = tabCfgDeetsDiv.querySelector('input#savedSettings');
const srcInput = tabCfgDeetsDiv.querySelector('input#src');
const customFavIconURLInput = tabCfgDeetsDiv.querySelector('input#customFavIconURL');
const sessionPartitionInput = tabCfgDeetsDiv.querySelector('input#sessionPartition');
const hostnameWhitelistInput = tabCfgDeetsDiv.querySelector('input#hostnameWhitelist');
const customUserAgentInput = tabCfgDeetsDiv.querySelector('input#customUserAgent');
const customCSSTextarea = tabCfgDeetsDiv.querySelector('textarea#customCSS');

document.querySelector('button#saveConfig').addEventListener('click', () => {
	if (savedSettingsInput.value) {
		const savedSettings = JSON.parse(savedSettingsInput.value);

		let inputTabData = {...savedSettings};

		if (customFavIconURLInput.value !== savedSettings.customFavIconURL) {
			let customFavIconURL = customFavIconURLInput.value;

			if (customFavIconURL && !customFavIconURL.match(/^https?\:\/\//)) {
				customFavIconURL = 'https://' + customFavIconURL;
			}

			inputTabData['customFavIconURL'] = customFavIconURL ? normalizeUrl(customFavIconURL) : '';
		}

		if (srcInput.value !== savedSettings.src) {
			let src = srcInput.value;

			if (src && !src.match(/^https?\:\/\//)) {
				src = 'https://' + src;
			}

			inputTabData['src'] = src ? normalizeUrl(src) : '';
		}

		if (sessionPartitionInput.value !== savedSettings.sessionPartition) {
			inputTabData['sessionPartition'] = sessionPartitionInput.value;
		}

		if (hostnameWhitelistInput.value !== savedSettings.hostnameWhitelist) {
			inputTabData['hostnameWhitelist'] = hostnameWhitelistInput.value;
		}

		if (customUserAgentInput.value !== savedSettings.customUserAgent) {
			inputTabData['customUserAgent'] = customUserAgentInput.value;
		}

		if (customCSSTextarea.value !== savedSettings.customCSS) {
			inputTabData['customCSS'] = customCSSTextarea.value;
		}

		if (tabCfgsDiv.hasChildNodes() && inputTabData.id) {
			for (let cfgDiv of tabCfgsDiv.children) {
				if (cfgDiv.id == inputTabData.id) {
					tabCfgsDiv.replaceChild(createTabCfgDiv(inputTabData), cfgDiv);
					break;
				}
			}

		}

		ipcRenderer.send('save-config', inputTabData);
	}
});

document.querySelector('button#undoConfig').addEventListener('click', () => {
	const savedSettings = JSON.parse(savedSettingsInput.value);

	loadTabSettings(savedSettings);
});

function loadTabSettings(savedSettings) {
	tabCfgDeetsDiv.classList.remove('dim');

	if (tabCfgsDiv.hasChildNodes()) {
		for (let cfgDiv of tabCfgsDiv.children) {
			if (cfgDiv.id == savedSettings.id) {
				cfgDiv.classList.add('active');
			} else {
				cfgDiv.classList.remove('active');
			}
		}
	}

	saveButton.disabled = false;
	undoButton.disabled = false;

	srcInput.value = savedSettings.src || '';
	customFavIconURLInput.value = savedSettings.customFavIconURL || '';
	sessionPartitionInput.value = savedSettings.sessionPartition || '';
	hostnameWhitelistInput.value = savedSettings.hostnameWhitelist || '';
	customUserAgentInput.value = savedSettings.customUserAgent || '';
	customCSSTextarea.value = savedSettings.customCSS || '';

	savedSettings.originalSrc = savedSettings.src;

	savedSettingsInput.value = JSON.stringify(savedSettings);
}

const configDevMenu = remote.Menu.buildFromTemplate([
	{
		accelerator: 'Ctrl+Alt+F12',
		label: 'Show Config Dev Console',
		click() { ipcRenderer.send('open-config-dev-tools') }
	}
]);

document.querySelector('button#closeConfig').addEventListener('contextmenu', () => {
	configDevMenu.popup();
});

document.querySelector('button#closeConfig').addEventListener('click', () => {
	ipcRenderer.send('close-config');
});

function addTabConfig(tabDatum) {
	if (!tabDatum || !tabDatum.id) {
		tabDatum = {...tabDatum};

		tabDatum.id = idGenerator++;
	}

	tabCfgsDiv.appendChild(createTabCfgDiv(tabDatum));

	return tabDatum;
}

function createTabCfgDiv(tabDatum) {

	const copySingleTabCfg = protoDiv.cloneNode(true);

	copySingleTabCfg.classList.remove('proto');

	copySingleTabCfg.id = tabDatum.id;

	copySingleTabCfg.querySelector('input#tabSettings').value = JSON.stringify(tabDatum);

	const nameSpan = copySingleTabCfg.querySelector('span.name');

	if (tabDatum && (tabDatum.customName || tabDatum.autoName)) {
		nameSpan.innerHTML = tabDatum.customName || tabDatum.autoName;
	}
	else if (tabDatum && (tabDatum.src)) {
		nameSpan.innerHTML = tabDatum.src;
	}
	else {
		nameSpan.innerHTML = "*New";
	}

	const delButton = copySingleTabCfg.querySelector('button#deleteTab');

	delButton.addEventListener('click', () => {
		tabCfgsDiv.removeChild(copySingleTabCfg);

		if (tabDatum && tabDatum.id) {
			ipcRenderer.send('delete-config', tabDatum.id);
		}
	});

	copySingleTabCfg.addEventListener('click', () => {
		loadTabSettings(tabDatum);
	});

	return copySingleTabCfg;
}

document.querySelector('button#addTab').addEventListener('click', () => {
	const tabDatum = addTabConfig({});

	loadTabSettings(tabDatum);
});

ipcRenderer.send('request-store-instance');

ipcRenderer.on('update-local-store-instance', (e, storeDataInstance) => {
	storeData = storeDataInstance

	tabData = storeData['tabData'];
});

ipcRenderer.on('receive-store-instance', (e, storeDataInstance) => {
	storeData = storeDataInstance;

	const query = querystring.parse(global.location.search);

	tabData = storeData['tabData'];

	if (tabData && tabData.length > 0)
		for (let tabDatum of tabData) {
			addTabConfig(tabDatum);
		}

});
