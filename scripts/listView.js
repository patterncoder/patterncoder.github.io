import { Api } from './api.js'
import { App } from './app.js'
import { CustomList } from './customList.js'
import { Editor } from './editor.js'
import { Icons } from './icons.js'
import { RecordView } from './recordView.js'

export class ListView extends CustomList {
	constructor(options) {
		super(options);
		this.describe().then(this.refresh.bind(this));
	}

	static get properties() {
		return CustomList.properties.concat([
			'id',
			'limit',
			'type'
		]);
	}

	get icon() {
		return Icons.icon(this.type);
	}

	async describe() {
		if (this.description) {
			return this.description;
		}
		let result;
		try {
			result = await Api.request(`/sobjects/${this.type}/listviews/${this.id}/describe`);
			result.description = await Api.describe(this.type);
			result.fields = result.fields || result.description.fields;
			result.label = result.label || result.description.label;
			result.name = result.name || result.description.name;
		} catch(error) {
			console.log(error);
		}
		return this.description = result;
	}

	// fetch the first 2000 records in a listView (unless limited by the caller)
	static async fetch(options) {
		options = options || {};
		let limit = options.limit || 2000;
		limit = limit > 2000 ? 2000 : limit;
		if (options.result) {
			options.records = (options.records || []).concat((options.result && options.result.records && options.result.records.records) || []);
			if (options.result.records && options.result.records && options.result.records.nextPageUrl && (options.records.length < limit)) {
				let result = await Api.request(options.result.records.nextPageUrl);
				options.result.records.records = result.records;
				return this.fetch(options);
			}
			return Object.assign(options.result, { records: options.records.slice(0, limit) });
		} else {
			let qs = {};
			if (options.sortBy && options.sortBy.fieldApiName) {
				qs.sortBy = `${!options.sortBy.isAscending ? '-' : ''}${options.sortBy.fieldApiName}`;
			}
			let args = Object.keys(qs).map(k => `${k}=${encodeURIComponent(qs[k])}`).join('&');
			try {
				const url = options.mru ? '/ui-api/mru-list-ui' : '/ui-api/list-ui';
				return this.fetch({ result: await Api.request(`${url}/${options.id}${args ? `?${args}` : ''}`), limit: limit });
			} catch(error) {
				if (error) {
					console.log(error);
				}
			}
		}
	}

	// cache the listView using the default sort order
	static async preCache(options) {
		options = options || {};
		try {
			await this.fetch({ id: options.listView.id, mru: options.listView.mru, limit: 2000 });
		} catch (error) {
			console.log(error);
		}
	}

	async refresh() {
		this.spinner();
		let result = await ListView.fetch({ id: this.id, mru: this.mru, sortBy: this.sortBy, limit: this.limit || 100 });
		this.label = result && result.info && result.info.label;
		this.sortBy = this.sortBy || (result && result.info && result.info.orderedByInfo && result.info.orderedByInfo[0]) || {};
		this.columns = ((result && result.info && result.info.displayColumns) || []).map(
			column => Object.assign({
				sort: (this.sortBy.fieldApiName === column.fieldApiName) ? (this.sortBy.isAscending ? 'ascending' : 'descending') : 'none'
			}, column)
		);
		this.columns = ListView.normalizeColumns(this.columns, this.description);
		this.items = result && result.records;
		ListView.trackPageview(`/ListView/${this.description.name}`);
		this.render();
	}

	render() {
		this.recordView = new RecordView({
			element: this.element,
			displayFormat: this.displayFormat || App.isSmallScreen ? 'tiles' : 'table',
			description: this.description,
			icon: this.icon,
			columns: this.columns,
			items: this.items,
			menus: this.menus || [{label: `${this.getLabel('New')} ${(this.description && this.description.label)}`, action: 'new', className: 'menuitem-new'}],
			handler: (event, detail) => {
				switch(event) {
					case 'new':
						new Editor({
							element: this.nav.push(document.createElement('div')),
							nav: this.nav,
							type: this.type,
							onPop: this.refresh.bind(this)
						});
						break;
					case 'select':
						new Editor({
							element: this.nav.push(document.createElement('div')),
							nav: this.nav,
							record: detail,
							type: detail.type || this.type,
							onPop: this.refresh.bind(this)
						});
						break;
					case 'sort':
						this.sortBy = detail;
						this.refresh();
						break;
				}
			},
			showNull: this.showNull,
			sortBy: this.sortBy
		});
		return this.element;
	}
}
