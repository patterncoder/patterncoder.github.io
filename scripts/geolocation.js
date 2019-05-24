import { Api } from './api.js'
import { CustomObject } from './customObject.js'

export class Geolocation {
	static async current() {
		let result = { latitude: null, longitude: null };
		if (navigator.geolocation) {
			const fallback = async () => {
				if (navigator.onLine) {
					console.log('Falling back to freegeoip');
					try {
						return new Promise(resolve => {
							Api.jsonp('https://freegeoip.app/json?callback={callback}', resolve);
							// always resolve after 5 seconds if the jsonp call dies silently
							setTimeout(() => resolve(result), 5000);
						});
					} catch(error) {
						console.log(error);
					}
				}
				return result;
			};
			let fallen = false;
			return new Promise(resolve => navigator.geolocation.getCurrentPosition(
				result => resolve(result && result.coords),
				error => {
					// Sometimes this error handler gets called more than once.
					// We want the fallback to be called at most one time.
					if (!fallen) {
						fallen = true;
						if (error.code !== error.PERMISSION_DENIED) {
							resolve(fallback());
						}
						resolve(result);
					}
				},
				{ maximumAge: 30000, timeout: 5000 }
			));
		}
		return result;
	};

	static async geocodingEnabled() {
		let user = await Api.user();
		let mobileSettings = await CustomObject.fetchSettings({
			type: 'gvp__Settings_Mobile__c',
			criteria: [
				['gvp__Geography_Key__c', user.gvp__Geography_Key__c]
			],
			defaultSettings: null,
			onlyOne: true
		});
		return !(mobileSettings && (mobileSettings.gvp__Account_Geocoding__c === false));
	}

	static async search(options) {
		options = Object.assign({
			limit: 50,
			location: null,
			locationField: (!options.objectName || (options.objectName === 'Account')) ? 'BillingAddress' : 'gvp__Geolocation__c',
			maxDistance: 500,
			objectName: 'Account',
			returnFields: null,
			units: 'mi'
		}, options || {});
		let location = options.location || await this.current();
		if (!this.valid(location)) {
			return Promise.reject('Invalid Location');
		}
		let description = await Api.describe(options.objectName);
		let fields = options.returnFields ||
			description.fields.filter(field => field.type !== 'base64')
				.map(field => field.name);
		const distance = `Distance(${options.locationField}, Geolocation(${location.latitude}, ${location.longitude}), '${options.units}')`;
		let result;
		try {
			result = await Api.query(`
				Select ${[`${distance} Distance`].concat(fields).join(',')}
				From ${options.objectName}
				Where ${distance} < ${options.maxDistance}
				Order By ${distance}
				Limit ${options.limit}
			`);
		} catch(error) {
			console.log(error);
		}
		return result && result.records;
	};

	static async update(record) {
		if (!(await this.geocodingEnabled())) {
			return;
		}
		if (record && record.attributes && record.attributes.type) {
			let description = await Api.describe(record.attributes.type);
			if (description.fields.filter(f => f.name.match(/gvp__Geolocation__(Latitude|Longitude)__s/)).length !== 2) {
				return;
			}
		}
		let location = await this.current();
		record.gvp__Geolocation__Latitude__s = location.latitude;
		record.gvp__Geolocation__Longitude__s = location.longitude;
		return record;
	}

	static valid(location) {
		return location && location.latitude && location.longitude;
	};
}
