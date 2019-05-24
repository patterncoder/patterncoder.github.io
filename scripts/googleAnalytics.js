// Based on https://github.com/react-ga/react-ga, implementing only the APIs needed by GreatVines
// which are GoogleAnalytics.initialize, GoogleAnalytics.pageView, and GoogleAnalytic.event
export class GoogleAnalytics {

	/**
	 * @param args.category {String} required
	 * @param args.action {String} required
	 * @param args.label {String} optional
	 * @param args.value {Int} optional
	 * @param args.nonInteraction {boolean} optional
	 * @param args.transport {string} optional ()`beacon`, `xhr` or `image`)
	 * @param {Array} trackerNames - (optional) a list of extra trackers to run the command on
	 */
	static event({ category, action, label, value, nonInteraction, transport, ...args } = {}, trackerNames) {
		const fieldObject = {
			hitType: 'event',
			eventCategory: category,
			eventAction: action
		};
		if (label) {
			fieldObject.eventLabel = label;
		}
		if (typeof value !== 'undefined') {
			fieldObject.eventValue = value;
		}
		if (typeof nonInteraction !== 'undefined') {
			fieldObject.nonInteraction = nonInteraction;
		}
		if (typeof transport !== 'undefined') {
			fieldObject.transport = transport;
		}

		Object.keys(args)
			.filter(key => key.substr(0, 'dimension'.length) === 'dimension')
			.forEach((key) => {
				fieldObject[key] = args[key];
			});

		Object.keys(args)
			.filter(key => key.substr(0, 'metric'.length) === 'metric')
			.forEach((key) => {
				fieldObject[key] = args[key];
			});

		this.send(fieldObject, trackerNames);
	}

	static ga(...args) {
		if (args.length > 0) {
			this.internalGa(...args);
		}
		return window.ga;
	}

	static gaCommand(trackerNames, ...args) {
		const command = args[0];
		if (this._alwaysSendToDefaultTracker || !Array.isArray(trackerNames)) {
			this.internalGa(...args);
		}
		if (Array.isArray(trackerNames)) {
			trackerNames.forEach((name) => {
				this.internalGa(...[`${name}.${command}`].concat(args.slice(1)));
			});
		}
	}

	static _initialize(gaTrackingID, options) {
		options = options || {};
		if (options.gaOptions) {
			this.internalGa('create', gaTrackingID, options.gaOptions);
		} else {
			this.internalGa('create', gaTrackingID, 'auto');
		}
	}

	/**
	* @param configsOrTrackingId { String} required -GA Tracking ID like UA-000000-01, or configurations
	* @param options.gaOptions {Object} optional - GA configurable create only fields
	* @param options.gaAddress {String} optional - if you are self-hosting your analytics.js, you can specify the URL for it here
	* @param options.alwaysSendToDefaultTracker {Boolean} optional - defaults to true; if set to false and using multiple trackers,
	*		 the event wll not be send to the default tracker
	*/
	static initialize(configsOrTrackingId, options) {
		options = options || {};
		this._alwaysSendToDefaultTracker = typeof options.alwaysSendToDefaultTracker === 'boolean' ? options.alwaysSendToDefaultTracker : true;

		this.loadGA(options);

		if (Array.isArray(configsOrTrackingId)) {
			configsOrTrackingId.forEach(config => {
				this._initialize(config.trackingId, config);
			});
		} else {
			this._initialize(configsOrTrackingId, options);
		}
		return true;
	}

	static internalGa(...args) {
		return window.ga(...args);
	}

	static loadGA(options) {
		(function (i, s, o, g, r, a, m) {
			i['GoogleAnalyticsObject'] = r;
			i[r] = i[r] || function () {
				(i[r].q = i[r].q || []).push(arguments);
			}, i[r].l = 1 * new Date();
			a = s.createElement(o),
				m = s.getElementsByTagName(o)[0];
			a.async = 1;
			a.src = g;
			m.parentNode.insertBefore(a, m);
		})(window, document, 'script', options && options.gaAddress ? options.gaAddress : 'https://www.google-analytics.com/analytics.js', 'ga');
	}

	/**
	* @param path {String} required - the current page page e.g. '/about'
	* @param trackerNames {Array} optional - a list of extra trackers to run the command on
	* @param title {String} optional - the page title e. g. 'My Website'
	*/
	static pageview(rawPath, trackerNames, title) {
		const path = rawPath.trim();
		const extraFields = {};
		if (title) {
			extraFields.title = title;
		}
		this.gaCommand(trackerNames, 'send', {
			hitType: 'pageview',
			page: path,
			...extraFields
		});
	}

	static send(fieldObject, trackerNames) {
		this.gaCommand(trackerNames, 'send', fieldObject);
	}
}