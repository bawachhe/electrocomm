// This file is required by the config.html file and will
// be executed in the renderer process for that window.
// No Node.js APIs are available in this process because
// `nodeIntegration` is turned off. Use `preload.js` to
// selectively enable features needed in the rendering
// process.

const {ipcRenderer} = require('electron');
const Store = require('./store.js');
const dragula = require('dragula');

// Get the stored infos
const store = Store.accessStore();

const tabData = store.get('tabData');

const protoDiv = document.querySelector('div.proto.single-tab-cfg');
const tabCfgsDiv = document.querySelector('div.tab-cfgs');
const tabCfgDeetsDiv = document.querySelector('div.tab-cfg-deets');

const srcInput = tabCfgDeetsDiv.querySelector('input#src');
const customFavIconURLInput = tabCfgDeetsDiv.querySelector('input#customFavIconURL');
const sessionPartitionInput = tabCfgDeetsDiv.querySelector('input#sessionPartition');
const hostnameWhitelistInput = tabCfgDeetsDiv.querySelector('input#hostnameWhitelist');
const customUserAgentInput = tabCfgDeetsDiv.querySelector('input#customUserAgent');
const customCSSTextarea = tabCfgDeetsDiv.querySelector('textarea#customCSS');

document.querySelector('button#saveConfig').addEventListener('click', () => {
	let inputTabData = {
		originalSrc: savedSettings.originalSrc
	};

	if (customFavIconURLInput.value !== savedSettings.customFavIconURL) {
		inputTabData['customFavIconURL'] = customFavIconURLInput.value;
	}

	if (srcInput.value !== savedSettings.src) {
		inputTabData['src'] = srcInput.value;
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

	ipcRenderer.send('save-config', inputTabData);
});

document.querySelector('button#undoConfig').addEventListener('click', () => {
	srcInput.value = savedSettings.src;
	customFavIconURLInput.value = savedSettings.customFavIconURL;
	sessionPartitionInput.value = savedSettings.sessionPartition;
	hostnameWhitelistInput.value = savedSettings.hostnameWhitelist;
	customUserAgentInput.value = savedSettings.customUserAgent;
	customCSSTextarea.value = savedSettings.customCSS;
});

document.querySelector('button#closeConfig').addEventListener('click', () => {
	ipcRenderer.send('close-config');
});

function addTabConfig(tabDatum) {
	const copySingleTabCfg = protoDiv.cloneNode(true);

	copySingleTabCfg.classList.remove('proto');

	const tabSettings = copySingleTabCfg.querySelector('input#tabSettings');

	tabSettings.value = JSON.stringify(tabDatum);

	const delButton = copySingleTabCfg.querySelector('button#deleteTab');

	delButton.addEventListener('click', () => {
		tabCfgsDiv.removeChild(copySingleTabCfg);

		if (tabDatum && tabDatum.src) {
			ipcRenderer.send('delete-config', tabDatum.src);
		}
	});

	tabCfgsDiv.appendChild(copySingleTabCfg);
}

document.querySelector('button#addTab').addEventListener('click', () => {
	addTabConfig();
});

if (tabData) {
	for (let tabDatum of tabData) {
		addTabConfig(tabDatum);
	}
}

dragula(
	[tabCfgsDiv],
	{
		direction: 'vertical',
		invalid: (el, handle) => {
			for (; handle && !handle.classList.contains('single-tab-cfg'); handle = handle.parentNode)
				if (handle.classList.contains('handle'))
					return false;

			return true;
		}
	}
);