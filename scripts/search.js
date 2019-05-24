import { Api } from './api.js'
import { App } from './app.js'
import { CustomObject } from './customObject.js'
import { Db } from './db.js'
import { Editor } from './editor.js'
import { Header } from './header.js'
import { Icons } from './icons.js'
import { Input } from './input.js'
import { Nav } from './nav.js'
import { RecordView } from './recordView.js'

export class Search extends CustomObject {
	constructor(options) {
		super(options);
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
				cssClass: 'slds-icon-standard-search',
				url: `${Search.getSymbols('standard')}#search`
			},
			menu: [],
			title: this.title || ''
		});
		this.nav = this.nav || new Nav(this.element, { header: this.header });
		this.element = document.createElement('div');
		Api.labels().then(labels => {
			CustomObject.labels = labels;
			this.nav.replace(this.render(), Object.assign(this.header, {
				buttons: (this.nav.views.length > 1) ? [{ label: 'Back', value: 'back' }] : [],
				title: this.title || this.getLabel('Search')
			}));
			this.search(this.searchString);
		});
		Search.trackPageview('/Search');
	}

	static escapeForSOSL(string) {
		return ['?', '&', '|', '!', '{', '}', '[', ']', '(', ')', '^', '~', '*', ':', '"', '\'', '+', '-']
			.reduce((result, token) => result.split(token).join(`\\${token}`), string);
	}

	bindEvents() {
		this.bind('.slds-section .slds-section__title .slds-section__title-action', 'click', event => {
			event.currentTarget.closest('.slds-section')
				.classList.toggle('slds-is-open');
			const expanded = event.currentTarget.classList.contains('slds-is-open');
			event.currentTarget
				.setAttribute('aria-expanded', expanded.toString());
			event.currentTarget.closest('.slds-section')
				.querySelector('.slds-section__content')
				.setAttribute('aria-hidden', (!expanded).toString());
		});
	}

	async fetchSearches() {
		return {
			Account: {
				description: await Api.describe('Account'),
				fields: [
					'Name',
					'RecordType.Name',
					'BillingStreet',
					'BillingCity',
					'gvp__Territory__r.Name',
					'gvp__Open_Objectives__c',
					'gvp__Last_Activity_Date__c',
					'gvp__Account_Key__c'
				]
			},
			Contact: {
				description: await Api.describe('Contact'),
				fields: [
					'Name',
					'RecordType.Name',
					'Title',
					'Account.Name',
					'Email',
					'Phone'
				]
			},
			Event: {
				description: await Api.describe('Event'),
				fields: [
					'Subject',
					'What.Name',
					'StartDateTime',
					'Location'
				]
			},
			gvp__Account_Objective__c: {
				description: await Api.describe('gvp__Account_Objective__c'),
				fields: [
					'Name',
					'gvp__Description__c',
					'gvp__Type__c',
					'gvp__Account__r.Name',
					'gvp__Accomplish_by__c',
					'gvp__Status__c'
				]
			},
			Task: {
				description: await Api.describe('Task'),
				fields: [
					'Subject',
					'What.Name',
					'Owner.Name',
					'ActivityDate'
				]
			}
		}
	}

	icon(type) {
		return Icons.icon(type);
	}

	prepareColumns(searches, key) {
		const preparedColumns = (searches[key].fields || []).reduce((columns, field) => {
			let description = searches[key].description.fields.filter(f => {
				let fieldSplit = field.split('.');
				if (fieldSplit.length > 1) {
					if (fieldSplit[0].endsWith('__r')) {
						return f.name === fieldSplit[0].replace('__r', '__c');
					}
					return f.name === fieldSplit[0] + 'Id';
				}
				return f.name === field;
			})[0];
			if (description) {
				columns.push({ fieldApiName: description.name, label: description.label, sort: 'ascending', sortable: false });
			}
			return columns;
		}, []);
		const description = searches[key].description;
		return Search.normalizeColumns(preparedColumns, description);
	}

	prepareItems(searches, key, originalItems) {
		return originalItems.map(originalItem => {
			const item = {
				_changedLocally: originalItem._changedLocally,
				apiName: key,
				fields: {},
				Id: originalItem.Id
			};
			item.fields = (searches[key].fields || []).reduce((fields, field) => {
				let description = searches[key].description.fields.filter(f => {
					let fieldSplit = field.split('.');
					if (fieldSplit.length > 1) {
						if (fieldSplit[0].endsWith('__r')) {
							return f.name === fieldSplit[0].replace('__r', '__c');
						}
						return f.name === fieldSplit[0] + 'Id';
					}
					return f.name === field;
				})[0];
				if (description) {
					const value = field.split('.').reduce((value, part) => (value || {})[part] || '', originalItem);
					fields[description.name] = { value: value, displayValue: null };
				}
				return fields;
			}, item.fields);
			return item;
		});
	}

	renderResults(searches, results) {
		if (!(searches && results && results.length)) {
			return this.element.querySelector('.search .results').innerHTML = results ? this.getLabel('No_Records') : '';
		}
		let items = type => results.filter(result => result.attributes && result.attributes.type === type);
		this.element.querySelector('.search .results').innerHTML = `
			${Object.keys(searches).map((key, index, array) => `
				<div class="slds-section slds-is-open" style="z-index:${array.length-index}">
					<h3 class="slds-section__title">
						<button aria-controls="section-content-${key}" aria-expanded="false" class="slds-button slds-section__title-action">
							<svg class="slds-section__title-action-icon slds-button__icon slds-button__icon_left" aria-hidden="true">
								<use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="${Search.getSymbols('utility')}#switch" />
							</svg>
							<span class="slds-truncate" title="${searches[key].description.labelPlural} (${items(key).length})">${searches[key].description.labelPlural} (${items(key).length})</span>
						</button>
					</h3>
					<div aria-hidden="true" class="slds-section__content" id="section-content-${key}">
						<div class="recordView-${key}"></div>
					</div>
				</div>
			`).join('\n')}
		`;
		for (const key of Object.keys(searches)) {
			const records = this.prepareItems(searches, key, items(key));
			const description = searches[key].description;
			if (records && records.length > 0) {
				this.recordView = new RecordView({
					element: this.element.querySelector(`.recordView-${key}`),
					displayFormat: this.displayFormat || App.isSmallScreen ? 'tiles' : 'table',
					description: description,
					icon: this.icon(key),
					columns: this.prepareColumns(searches, key),
					items: records,
					menus: [{ label: `${this.getLabel('New')} ${(description && description.label)}`, action: 'new', className: 'menuitem-new' }],
					handler: (event, detail) => {
						switch (event) {
							case 'new':
								new Editor({
									element: this.nav.push(document.createElement('div')),
									nav: this.nav,
									type: key
								});
								break;
							case 'select':
								new Editor({
									element: this.nav.push(document.createElement('div')),
									nav: this.nav,
									record: detail,
									type: key
								});
								break;
						}
					}
				});
			}
		}
		this.bindEvents();
	}

	render() {
		this.element.innerHTML = `
			<style>
				.search .slds-section .slds-section__title .slds-section__title-action {
					text-decoration: none;
				}
				.search .slds-section {
					clear: both;
					position: relative;
				}
				.search .slds-section .slds-section__content {
					/* Force iOS Safari to hide final section when collapsed */
					-webkit-transform: translate3d(0, 0, 0);
				}
				.search article.slds-tile {
					cursor: pointer;
					background-color: ${App.secondaryColor};
					float: left;
					padding: 1em;
					width: 32%;
				}
				@media (max-width: 64em) {
					.search article.slds-tile {
						width: 48%;
					}
				}
				@media (max-width: 48em) {
					.search article.slds-tile {
						width: 96%;
					}
				}
			</style>
			<div class="search slds-scope slds-m-around_medium">
				<div class="input"></div>
				<div class="results"></div>
			</div>
		`;
		this.searchInput = new Input({
			element: this.element.querySelector('.search .input'),
			handler: (event, input) => {
				switch(event) {
					case 'iconSelect':
					case 'pressEnter':
						this.search(input.value);
						break;
				}
			},
			placeholder: this.placeholder || this.getLabel('Search_Placeholder'),
			type: 'search',
			value: this.searchString || ''
		});
		this.renderResults();
		setTimeout(() => this.searchInput.input.focus(), 500);
		return this.element;
	}

	async search(searchString) {
		if (!searchString) {
			return;
		}
		let offline = this.offline || !navigator.onLine;
		this.searchString = searchString || '';
		this.element.querySelector('.search .results').innerHTML = this.getLabel(`Search_${offline ? 'Local' : 'Online_Results'}`);
		let searches = await this.fetchSearches();
		let results = (await this.searchOffline(searches, searchString)).filter(record => !navigator.onLine || record._changedLocally);
		results = results.concat((await this.searchOnline(searches, searchString)).filter(result => !results.find(record => record.Id === result.Id)));
		this.renderResults(searches, this.results = results);
		this.updateRecentSearches(this.searchString);
	}

	async searchOffline(searches, searchString) {
		let queries = Object.keys(searches).reduce((queries, table) =>
			queries.concat(Db[table].schema.indexes.map(index => index.keyPath)
				.reduce((query, index) => (query ? query.or.bind(query) : Db[table].where.bind(Db[table]))(index)
					.startsWithIgnoreCase(searchString), null
				)
			), []
		);
		let results = [];
		for (let query of queries) {
			results = results.concat(await query.toArray());
		}
		return results;
	}

	async searchOnline(searches, searchString) {
		if (!navigator.onLine) {
			return [];
		}
		let queryString = `
			FIND { ${Search.escapeForSOSL(searchString)}* } IN ALL FIELDS
			RETURNING
				${Object.keys(searches).map(key => `
					${key}(${['Id'].concat(searches[key].fields).join(',')})
				`).join(',\n')}
		`;
		let response = await Api.request({
			path: `/search/?q=${encodeURIComponent(queryString)}`,
			syncInterval: 0
		});
		return (response && response.searchRecords) || [];
	}

	async updateRecentSearches(searchString) {
		if (!searchString || (typeof(Db) === 'undefined')) {
			return;
		}
		let recentListsAndSearches = [{
			label: `Search for ${searchString}`,
			searchString: searchString,
			type: 'search'
		}].concat(
			((await Db._meta.get('_recentListsAndSearches') || {}).recentListsAndSearches || [])
				.filter(recent => recent.searchString !== searchString)
		).slice(0, 10);
		await Db.update(Db._meta, { key: '_recentListsAndSearches', recentListsAndSearches: recentListsAndSearches });
		if ((typeof(App) !== 'undefined') && App.globalNav && App.globalNav.header) {
			App.globalNav.header.updateRecentLists();
		}
	}
}
