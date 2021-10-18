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

document.querySelector('button#saveConfig').addEventListener('click', () => {
	let tabSrcInputs = tabCfgsDiv.querySelectorAll('input#src');
	let tabAutoFavIconURLInputs = tabCfgsDiv.querySelectorAll('input#autoFavIconURL');
	let tabCustomFavIconURLInputs = tabCfgsDiv.querySelectorAll('input#customFavIconURL');
	let tabSessionPartitionInputs = tabCfgsDiv.querySelectorAll('input#sessionPartition');
	let tabHostnameWhitelistInputs = tabCfgsDiv.querySelectorAll('input#hostnameWhitelist');
	let tabCustomUserAgentInputs = tabCfgsDiv.querySelectorAll('input#customUserAgent');

	let inputTabData = new Array(tabSrcInputs.length);

	for (let inputIndex = 0; inputIndex < tabSrcInputs.length; inputIndex++) {
		inputTabData[inputIndex] = {
			autoFavIconURL: tabAutoFavIconURLInputs[inputIndex].value,
			customFavIconURL: tabCustomFavIconURLInputs[inputIndex].value,
			src: tabSrcInputs[inputIndex].value,
			sessionPartition: tabSessionPartitionInputs[inputIndex].value,
			hostnameWhitelist: tabHostnameWhitelistInputs[inputIndex].value,
			customUserAgent: tabCustomUserAgentInputs[inputIndex].value
		};
	}

	ipcRenderer.send('save-config', inputTabData);
});

document.querySelector('button#cancelConfig').addEventListener('click', () => {
	ipcRenderer.send('close-config');
});

function addTabConfig(tabDatum) {
	const copySingleTabCfg = protoDiv.cloneNode(true);

	copySingleTabCfg.classList.remove('proto');

	const srcInput = copySingleTabCfg.querySelector('input#src');

	srcInput.value = tabDatum && tabDatum.src ? tabDatum.src : '';

	const autoFavIconURLInput = copySingleTabCfg.querySelector('input#autoFavIconURL');

	autoFavIconURLInput.value = tabDatum && tabDatum.autoFavIconURL ? tabDatum.autoFavIconURL : '';

	const customFavIconURLInput = copySingleTabCfg.querySelector('input#customFavIconURL');

	customFavIconURLInput.value = tabDatum && tabDatum.customFavIconURL ? tabDatum.customFavIconURL : '';

	const sessionPartitionInput = copySingleTabCfg.querySelector('input#sessionPartition');

	sessionPartitionInput.value = tabDatum && tabDatum.sessionPartition ? tabDatum.sessionPartition : '';

	const hostnameWhitelistInput = copySingleTabCfg.querySelector('input#hostnameWhitelist');

	hostnameWhitelistInput.value = tabDatum && tabDatum.hostnameWhitelist ? tabDatum.hostnameWhitelist : '';

	const customUserAgentInput = copySingleTabCfg.querySelector('input#customUserAgent');

	customUserAgentInput.value = tabDatum && tabDatum.customUserAgent ? tabDatum.customUserAgent : '';

	const delButton = copySingleTabCfg.querySelector('button#deleteTab');

	delButton.addEventListener('click', () => {
		tabCfgsDiv.removeChild(copySingleTabCfg);
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