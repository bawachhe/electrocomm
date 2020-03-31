// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// No Node.js APIs are available in this process because
// `nodeIntegration` is turned off. Use `preload.js` to
// selectively enable features needed in the rendering
// process.

const TabGroup = require("electron-tabs");

let tabGroup = new TabGroup();

const tabData = //getTabDataFromAppConfig();
[
	{
		active: true,
		src: "https://google.com"
	}
];

for (tabDatum of tabData) {
	let tab = tabGroup.addTab({
		active: tabDatum.active,
		iconURL: tabDatum.customFavIconURL,
		src: tabDatum.src,
		title: tabDatum.customTitle,
		visible: true
	});

	if (!tabDatum.customTitle) {
		tab.webview.addEventListener(
			'page-title-updated',
			(e) => {
				tab.setTitle(e.title);
			}
		);
	}
	
	if (!tabDatum.customFavIconURL) {
		tab.webview.addEventListener(
			'page-favicon-updated',
			(e) => {
				tab.setIcon(e.favicons[0]);
			}
		);
	}
}