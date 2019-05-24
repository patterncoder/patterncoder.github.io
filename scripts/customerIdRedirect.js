import { Api } from './api.js'
import { Auth } from './auth.js'
import { CustomObject } from './customObject.js'

// Handles external system ID mapping
// unused as of now
export class CustomerIdRedirect {
	static async redirect() {
		let args = CustomObject.parseArgs();
		let customerId = args.customerId;
		let type = args.type || 'Account';
		let user = await Api.user();
		let mobileSettings = await CustomObject.fetchSettings({
			type: 'gvp__Settings_Mobile__c',
			criteria: [
				['gvp__Geography_Key__c', user.gvp__Geography_Key__c]
			],
			defaultSettings: null,
			onlyOne: true
		});
		let field = mobileSettings && mobileSettings[`gvp__${type}_CustomerId_Field__c`];
		if (customerId && type && field) {
			let response = await Api.query(`
				Select Id From ${type} Where ${field} = '${customerId}'
			`);
			let id = response && response.records && response.records[0] && response.records[0].Id;
			let auth = await Auth.auth;
			window.location.href = `${auth.instance_url}/${id || ''}`;
		}
	}
}
