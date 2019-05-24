self.addEventListener('install', event => {
	console.log(
		'Handling install event:', event,
		'Resources to pre-fetch:', self.cache.urlsToPrefetch
	);
	event.waitUntil(self.cache.init());
});

self.addEventListener('fetch', event => event.respondWith(
	(async () => await self.cache.refresh(event.request) || self.cache.fetch(event.request))()
));

self.cache = {
	add: async request => {
		let response = await self.cache.fetch(request);
		if (response && response.status && (
			(response.headers.get('Content-Type') !== 'application/json') ||
			!response.json || ((await response.clone().json()) !== 'offline')
		)) {
			return await self.cache.put(request, response);
		}
		return await self.cache.match(request) || response;
	},
	addAll: async requests => {
		for (let request of requests) {
			await self.cache.add(request);
		}
	},
	all: async () => {
		let result = [];
		let cache = await self.cache.open();
		let keys = await cache.keys();
		for (let key of keys) {
			let value = await cache.match(key);
			result.push([key.url, key, value]);
		}
		return result;
	},
	fetch: async request => {
		let response;
		try {
			response = ((typeof(navigator) === 'undefined') || !navigator || navigator.onLine) ?
				await self.fetch(request) :
				new Response(JSON.stringify("offline"), {
					headers: {'Content-Type': 'application/json'}
				});
			if (request && ([
				'DELETE', 'PATCH','POST','PUT'
			].indexOf(request.method) >= 0) && response && response.ok) {
				self.cache.requestDates = {};
			}
			return response;
		} catch(error) {
			if ((typeof(response) !== 'undefined') && response && response.status) {
				return response;
			}
			if ((typeof(navigator) !== 'undefined') && navigator && navigator.onLine) {
				console.log('Failed to fetch:', request, error);
			}
		}
	},
	init: () => self.cache.addAll(self.cache.urlsToPrefetch.map(
		url => new Request(url, { mode: 'no-cors', redirect: 'follow' })
	)).then(() => console.log('Pre-fetch complete')),
	match: async request => (await self.cache.open()).match(request),
	name: 'GreatVines',
	open: () => caches.open(self.cache.name),
	put: async (request, response) => {
		const storageEstimate = navigator && navigator.storage && navigator.storage.estimate && (await navigator.storage.estimate());
		const canCache = storageEstimate && ![undefined, null].includes(storageEstimate.quota) && ![undefined, null].includes(storageEstimate.usage) && ((storageEstimate.usage/storageEstimate.quota) <= .5);
		if (!canCache) {
			return response;
		}
		let cache = await self.cache.open();
		try {
			self.cache.requestDates[request.url] = new Date().getTime();
			await cache.put(request, response);
		} catch(error) {
			console.log('Failed to cache:', request, response);
		}
		return await cache.match(request);
	},
	refresh: async request => self.cache[await self.cache.shouldRefresh(request) ? 'add' : 'match'](request),
	requestDates: {},
	shouldRefresh: async request => {
		if (!(request && (request.method === 'GET'))) {
			return false;
		}
		let syncInterval = request.headers.get('Sync-Interval');
		if (!syncInterval) {
			return true;
		}
		syncInterval = Number(syncInterval) || 0;
		if (syncInterval <= 0) {
			return false;
		}
		let response = await self.cache.match(request);
		if (!(response && response.ok)) {
			return true;
		}
		let lastSynced = new Date(response.headers.get('Date') || self.cache.requestDates[request.url] || 0).getTime();
		let now = new Date().getTime();
		return (now - lastSynced) >= (syncInterval * 60 * 1000);
	},
	urlsToPrefetch: [
		'index.html',

		//images
		'images/logo-new.png',
		'images/icon-80x80.png',
		'images/icon-144x144.png',
		'images/icon-192x192.png',
		'images/icon-512x512.png',
		'images/watermark-logo.png',

		//Pages
		'pages/',
		'pages/app.html',
		'pages/bootstrap.html',
		'pages/content.html',
		'pages/customerIdRedirect.html',
		'pages/dbAdmin.html',
		'pages/manifest.webmanifest',
		'pages/photoBrowser.html',
		'pages/salesSequenceEditor.html',
		'pages/survey.html',
		'pages/surveyPhotos.html',

		//Scripts
		'scripts/activityRecap.js',
		'scripts/api.js',
		'scripts/app.js',
		'scripts/auth.js',
		'scripts/booleanField.js',
		'scripts/buttonGroup.js',
		'scripts/checkbox.js',
		'scripts/customElement.js',
		'scripts/customerIdRedirect.js',
		'scripts/customList.js',
		'scripts/customObject.js',
		'scripts/content.js',
		'scripts/dashboard.js',
		'scripts/db.js',
		'scripts/dbAdmin.js',
		'scripts/draggableList.js',
		'scripts/editor.js',
		'scripts/field.js',
		'scripts/fieldFactory.js',
		'scripts/fieldset.js',
		'scripts/geolocation.js',
		'scripts/googleAnalytics.js',
		'scripts/guidedtour.js',
		'scripts/header.js',
		'scripts/home.js',
		'scripts/icons.js',
		'scripts/input.js',
		'scripts/inputField.js',
		'scripts/list.js',
		'scripts/log.js',
		'scripts/listView.js',
		'scripts/listViews.js',
		'scripts/lookupField.js',
		'scripts/map.js',
		'scripts/media.js',
		'scripts/modal.js',
		'scripts/nav.js',
		'scripts/observable.js',
		'scripts/path.js',
		'scripts/picklistField.js',
		'scripts/popupEditor.js',
		'scripts/radioList.js',
		'scripts/recordView.js',
		'scripts/relatedList.js',
		'scripts/salesOrder.js',
		'scripts/salesSequence.js',
		'scripts/search.js',
		'scripts/survey.js',
		'scripts/surveyPhotos.js',
		'scripts/surveySummary.js',
		'scripts/tabs.js',
		'scripts/textarea.js',
		'scripts/textareaField.js',
		'scripts/tile.js',
		'scripts/toast.js',
		'scripts/yesno.js',

		//Styles
		'style/shepherd/shepherd-theme-default.css',
		'style/slds/fonts/webfonts/SalesforceSans-Bold.woff',
		'style/slds/fonts/webfonts/SalesforceSans-Bold.woff2',
		'style/slds/fonts/webfonts/SalesforceSans-BoldItalic.woff',
		'style/slds/fonts/webfonts/SalesforceSans-BoldItalic.woff2',
		'style/slds/fonts/webfonts/SalesforceSans-Italic.woff',
		'style/slds/fonts/webfonts/SalesforceSans-Italic.woff2',
		'style/slds/fonts/webfonts/SalesforceSans-Light.woff',
		'style/slds/fonts/webfonts/SalesforceSans-Light.woff2',
		'style/slds/fonts/webfonts/SalesforceSans-LightItalic.woff',
		'style/slds/fonts/webfonts/SalesforceSans-LightItalic.woff2',
		'style/slds/fonts/webfonts/SalesforceSans-Regular.woff',
		'style/slds/fonts/webfonts/SalesforceSans-Regular.woff2',
		'style/slds/fonts/webfonts/SalesforceSans-Thin.woff',
		'style/slds/fonts/webfonts/SalesforceSans-Thin.woff2',
		'style/slds/fonts/webfonts/SalesforceSans-ThinItalic.woff',
		'style/slds/fonts/webfonts/SalesforceSans-ThinItalic.woff2',
		'style/slds/icons/action-sprite/svg/symbols.svg',
		'style/slds/icons/custom-sprite/svg/symbols.svg',
		'style/slds/icons/doctype-sprite/svg/symbols.svg',
		'style/slds/icons/standard-sprite/svg/symbols.svg',
		'style/slds/icons/utility-sprite/svg/symbols.svg',
		'style/slds/styles/salesforce-lightning-design-system.min.css'
	]
};
