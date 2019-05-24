import { Api } from './api.js'
import { App } from './app.js'
import { Auth } from './auth.js'
import { CustomObject } from './customObject.js'
import { Header } from './header.js'
import { Nav } from './nav.js'

// handles good data dashboard
export class Dashboard extends CustomObject {
	constructor(options) {
		super(options);
		if (options.inline) {
			return this.refresh(options);
		}
		this.header = new Header({
			buttons: [],
			breadcrumbs: [],
			element: document.createElement('header'),
			handler: (event, detail) => {
				switch(event) {
					case 'action':
						switch(detail.value) {
							case 'back':
								this.nav.pop();
								break;
						}
					break;
				}
			},
			icon: {
				cssClass: 'slds-icon-standard-account',
				url: `${Dashboard.getSymbols('standard')}#dashboard`
			},
			menu: [],
			title: 'Dashboard'
		});
		this.nav = this.nav || new Nav(this.element, { header: this.header });
		this.element = document.createElement('div');
		Api.labels().then(labels => {
			CustomObject.labels = labels;
			this.nav.replace(this.render(), Object.assign(this.header, {
				buttons: (this.nav.views.length > 1) ? [{ label: 'Back', value: 'back' }] : [],
				title: this.getLabel('Dashboard'),
				breadcrumbs: options.record? [options.record.Name] : []
			}));
			this.refresh(options);
		});
	}

	static isNativeDashboard(url) {
		return (url.indexOf('gooddata') === -1) &&
			(url.indexOf('analytics.greatvines.com') === -1) &&
			(url.indexOf('analytics.eu.greatvines.com') === -1);
	}

	static async settings(options) {
		options = options || {};
		let user = await Api.user();
		let analyticsSettings = await Dashboard.fetchSettings({
			type: 'gvp__Analytics_Settings__c',
			criteria: [
				['gvp__Active__c', true],
				['gvp__Geography_Key__c', user.gvp__Geography_Key__c],
				['gvp__Profile_Id__c', user.ProfileId]
			],
			defaultSettings: null,
			minimumScore: 4,
			onlyOne: true
		});
		if (!(analyticsSettings && analyticsSettings.Id)) {
			return;
		}
		options.location = options.location || (options.record && options.record.attributes && options.record.attributes.type) || 'Mobile_Dashboard_Tab';
		let response = await Api.query(`
			Select
				Id,
				LastModifiedDate,
				gvp__Dashboard__c,
				gvp__Dashboard_Location__c,
				gvp__Dimension__c,
				gvp__Iframe_Height__c,
				gvp__Number_Of_Children__c,
				gvp__Target_Device__c
			From gvp__Dashboard_Settings__c
			Where gvp__Analytics_Settings__c = '${analyticsSettings.Id}'
		`);
		let currentDevice = App.isSmallScreen ? 'phone' : 'tablet';
		let dashboardSettings = ((response && response.records) || []).filter(settings =>
			(!settings.gvp__Dashboard_Location__c || (settings.gvp__Dashboard_Location__c.toLowerCase() === options.location.toLowerCase())) &&
			(!settings.gvp__Target_Device__c || (settings.gvp__Target_Device__c.toLowerCase() === currentDevice))
		).sort((a, b) => b.gvp__Number_Of_Children__c - a.gvp__Number_Of_Children__c);
		if (options.record) {
			for (const settings of dashboardSettings) {
				const filters = await Api.query(`
					Select
						gvp__Field_Name__c,
						gvp__Field_Value__c
					From gvp__Dashboard_Filters_Settings__c
					Where gvp__Dashboard_Settings__c = '${settings.Id}'
				`);
				let match = ((filters && filters.records) || []).reduce(
					(match, filter) => {
						let filterField = filter.gvp__Field_Name__c;
						let filterValue = filter.gvp__Field_Value__c;
						if ([undefined, null, ''].includes(filterField) || [undefined, null, ''].includes(filterValue)) {
							return false;
						}
						let fieldValue = options.record[filterField];
						if ([undefined, null, ''].includes(fieldValue)) {
							return false;
						}
						if ((fieldValue.length === 18) && (filterValue.length === 15)) {
							return match && (fieldValue.substr(0, 15).toLowerCase() === filterValue.toLowerCase());
						}
						return match && (fieldValue.toLowerCase() === filterValue.toLowerCase());
					}, true
				);
				if (match) {
					return { analyticsSettings: analyticsSettings, dashboardSettings: settings };
				}
			}
		} else {
			return { analyticsSettings: analyticsSettings, dashboardSettings: dashboardSettings[0] };
		}
	}

	static async url(options) {
		options = options || {};
		let settings = options.settings || await Dashboard.settings(options);
		if (!(settings && settings.analyticsSettings && settings.dashboardSettings)) {
			return;
		}
		let auth = await Auth.auth;
		let url = [
			['SESSION_ID', auth.access_token],
			['PARTNER_SERVER_URL', settings.analyticsSettings.gvp__Partner_Server_Url__c.startsWith('https://') ?
				settings.analyticsSettings.gvp__Partner_Server_Url__c :
				`${auth.instance_url}${settings.analyticsSettings.gvp__Partner_Server_Url__c}`
			],
			['DASHBOARD_ID', settings.dashboardSettings.gvp__Dashboard__c],
			['PROJECT_ID', settings.analyticsSettings.gvp__Project_Id__c],
			['DIMENSION', settings.dashboardSettings.gvp__Dimension__c],
			['RECORD_ID', options.record && options.record.Id],
			['DIMENSION=RECORD_ID', ''],
		].reduce(
			(url, [key, value]) => url.replace(new RegExp(key, 'gi'), encodeURIComponent([undefined, null].includes(value) ? key : value)),
			settings.analyticsSettings.gvp__BI_Url__c
		);
		if (Dashboard.isNativeDashboard(url)) {
			url = await App.secureUrl(url);
		}
		return url;
	}

	bindEvents() {
	}

	async refresh(options) {
		if (navigator.onLine) {
			this.settings = await Dashboard.settings(options);
			this.height = (this.settings && this.settings.dashboardSettings && this.settings.dashboardSettings.gvp__Iframe_Height__c) || this.height;
			this.url = await Dashboard.url({ settings: this.settings, record: options.record });
		}
		Dashboard.trackPageview('/Dashboard');
		this.render({ refreshed: true });
	}

	render(options) {
		options = options || {};
		this.element.innerHTML = `
			<style>
				.dashboard-message {
					display: block;
					background-color: #eee;
					color: #999;
					padding: 15px;
					text-align: center;
					margin: 80px auto;
					width: 300px;
					max-width: 90%;
				}
				object {
					padding-left: 10px;
				}
			</style>
			${this.url ? `
				<object
					type="text/html"
					data="${this.url || ''}"
					style="width:${ this.width ? `${this.width}px` : '100%'};height:${ this.height ? `${this.height}px` : '100%'}"
				/>
			` : `
				<div class="dashboard-message">
					<span>
						<strong>${this.getLabel(
							navigator.onLine ? (options.refreshed ? 'Dashboard_Not_Configured' : 'Loading') : 'Mobile_Display_Offline'
						)}</strong>
						<br />
						${this.getLabel(
							navigator.onLine ? (options.refreshed ? 'Contact_Your_Administrator' : '') : 'Mobile_Dashboard_Maps'
						)}
					</span>
				</div>
			`}
		`;
		this.bindEvents();
		return this.element;
	}
}
