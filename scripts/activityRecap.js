import { Api } from './api.js'
import { CustomObject } from './customObject.js'
import { Field } from './field.js'
import { Fieldset } from './fieldset.js'
import { Header } from './header.js'
import { List } from './list.js'
import { Nav } from './nav.js'

export class ActivityRecap extends CustomObject {
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
				cssClass: 'slds-icon-standard-avatar',
				url: `${ActivityRecap.getSymbols('standard')}#call_history`
			},
			menu: [],
			title: ''
		});
		this.nav = this.nav || new Nav(this.element, {
			header: this.header,
			split: 960
		});
		this.startingNav = this.nav.views.length;
		this.nav.replace(this.renderContainer(), Object.assign(this.header, {
			buttons: (this.nav.views.length > 0) ? [{ label: 'Back', value: 'back' }] : []
		}));
		this.spinner({ element: this.nav.current });
		Api.labels().then(labels => {
			CustomObject.labels = labels;
			this.nav.replace(this.renderContainer(), Object.assign(this.header, { title: this.getLabel('Activity_Reports') }));
			this.spinner({ element: this.nav.current });
		});
	}

	static get properties() {
		return [
			'types'
		];
	}

	get types() {
		return this._types;
	}
	set types(types) {
		this._types = types;
		this.fetchTypeInfo().then(this.render.bind(this));
	}

	async fetchTypeInfo() {
		for (let type of this.types) {
			type.description = await Api.describe(type.name);
			type.filterFields = (((await Api.fieldset(type.name, 'search_filters')) || {}).fields || []).map(field => field.name);
			type.resultFields = (((await Api.fieldset(type.name, 'search_results')) || {}).fields || []).map(field => field.name);
			await this.fetchChildInfo(type.description);
		}
	}

	renderContainer(element) {
		element = element || document.createElement('div');
		element.innerHTML = `
			<style>
				.hidden {
					display: none !important;
				}

				.search {
					display: flex;
					flex-direction: column;
				}

				#searchParameters {
					flex:1;
					overflow-y: auto;
				}
				.search .slds-button-group {
					flex: none;
				}

				#results-header {
					display: flex;
				}

				#results-header #results-pages {
					flex: none;
					max-width: 80%;
					overflow-x: auto;
				}

				#results-header #results-count {
					flex: 1;
					margin: 1em;
					text-align: right;
					white-space: nowrap;
				}

				#results > div:first-child {
					display: none;
				}

				.slds-spinner {
					left: 50%;
					position: fixed;
					top: 50%;
				}

				@media (max-width: 48em) {
					#results table, #results table tbody {
						display: block;
					}
				}
			</style>
			<div class="slds-scope"></div>
		`;
		return element;
	}

	renderFilters() {
		this.filterFieldset = new Fieldset({
			element: this.filtersElement,
			fields: this.type.filterFields.map(
				(fieldName) => this.type.description.fields.filter(
					(field) => field.name === fieldName
				)[0]
			),
			objectName: this.type.name,
			isSearch: true,
			label: 'Filter Fields'
		});
		this.childFilter = new List({
			collapsed: true,
			collapsible: true,
			element: this.childFilterElement,
			items: this.type.description.childRelationships.map(
				cr => Object.assign({
					label: cr.description.label,
					value: `${cr.relationshipName}_${cr.childSObject}`
				})
			),
			label: 'Child Filter',
			multiselect: true
		});
		this.searchElement.querySelector('.slds-button-group').classList.remove('slds-hidden');
	}

	renderRecords(records, element, fields, description) {
		element.classList.add('slds-m-around_medium');
		element.innerHTML = `
			<div role="status" class="slds-spinner slds-spinner_medium">
				<span class="slds-assistive-text">Loading, please wait.</span>
				<div class="slds-spinner__dot-a"></div>
				<div class="slds-spinner__dot-b"></div>
			</div>
		`;
		return Promise.all(fields.map(
			(fieldName) => {
				let relationshipField = description.fields.filter(field => fieldName.startsWith(field.name.replace('__c', '__r')))[0];
				if (relationshipField) {
					return this.referenceTo({ field: relationshipField })
						.then(Api.describe.bind(Api))
						.then(description => description.fields.filter(
							field => fieldName.endsWith(field.name)
						).map(field => Object.assign(field, { name: fieldName }))[0]);
				}
				return Promise.resolve(description.fields.filter(field => field.name === fieldName)[0]);
			}
		)).then(fields => Promise.all(records.map((record) => Promise.all(fields.map((field) => Field.getText(field, record)))))
			.then((recordText) => {
				if (!records || (records.length === 0)) {
					element.innerHTML = '<div>No records found</div>';
				} else {
					element.innerHTML = `
						<div>${records.length} ${(records.length > 1) ? description.labelPlural: description.label} found</div>
						<table class="slds-table slds-table_bordered slds-max-medium-table_stacked-horizontal">
							<thead>
								<tr class="slds-text-title_caps">
									${fields.map((field) => `
										<th scope="col">
											<div class="slds-truncate" title="${field.label}">${field.label}</div>
										</th>
									`).join('\n')}
								</tr>
							</thead>
							<tbody>
								${records.map((record, recordIndex) => `
									<tr class="slds-hint-parent">
										${fields.map((field, fieldIndex) => `
											<td data-label="${field.label}">
												<div class="slds-truncate" title="${recordText[recordIndex][fieldIndex]}">${recordText[recordIndex][fieldIndex]}</div>
											</td>
										`).join('\n')}
									</tr>
								`).join('\n')}
							</tbody>
						</table>
					`;
				}
			})
		);
	}

	renderResults(records, pageNumber) {
		let pageSize = Math.max(20, Math.floor(records.length/15));
		let pages = Math.ceil(records.length/pageSize);
		pageNumber = Math.min(pages, Math.max(1, pageNumber || 0));
		let page = records.slice(((pageNumber-1) * pageSize), (pageNumber * pageSize));
		this.resultsContainer = this.nav[(this.nav.views.length > (this.startingNav || 1)) ? 'replace' : 'push'](this.renderContainer(), { buttons: [{ label: 'Back', value: 'back' }] }).querySelector('div');
		this.resultsContainer.innerHTML = `
			<div id="results-header" class="slds-m-around_medium">
				<div id="results-pages" class="slds-button-group ${(pages <= 1) ? 'hidden' : ''}" role="group">
					${
						records.reduce(
							(pages, record, index) => ((index % pageSize) === 0) ? pages.concat(pages.length+1) : pages,
						[]).map((page) => {
							return `<button class="slds-button ${(page === pageNumber) ? 'slds-button_brand' : 'slds-button_neutral'}" data-page="${page}">${page}</button>`;
						}).join('\n')
					}
				</div>
				<div id="results-count" class="${(records.length < 1) ? 'hidden' : ''}">
					${Math.max(0, ((pageNumber-1) * pageSize) + 1)} - ${Math.min(records.length, pageNumber * pageSize)} of ${records.length}
				</div>
			</div>
			<div id="results"></div>
		`;
		Array.from(this.resultsContainer.querySelectorAll('button[data-page]')).forEach((button) =>
			button.addEventListener('click', () =>
				this.renderResults(records, Number(button.getAttribute('data-page')))
			)
		);
		this.resultsElement = this.resultsContainer.querySelector('#results');
		this.resultsElement.id = 'results';
		this.renderRecords(page, this.resultsElement, this.type.resultFields, this.type.description)
			.then(() => {
				let rows = Array.from(this.resultsElement.querySelectorAll('tbody tr'));
				page.forEach((record, index) => {
					let row = rows[index];
					this.type.description.childRelationships.filter(
						cr => record[cr.relationshipName] && record[cr.relationshipName].records
					).map(cr => {
						let element = document.createElement('tr');
						element.innerHTML = `<td colspan="${this.type.resultFields.length}"></td>`;
						row.parentNode.insertBefore(element, row.nextSibling);
						let childFields = this.type.childFields && this.type.childFields[cr.childSObject] || [cr.field];
						this.renderRecords(
							record[cr.relationshipName].records,
							element.querySelector('td'),
							childFields,
							cr.description
						);
					})
				});
			});
	}

	render() {
		this.searchElement = this.nav.replace(this.renderContainer(), this.header).querySelector('div');
		this.searchElement.classList.add('search');
		this.searchElement.innerHTML = `
			<div id="searchParameters">
				<div id="recapType"></div>
				<div id="filters"></div>
				<div id="childFilter"></div>
			</div>
			<div class="slds-button-group slds-float_right slds-m-around_medium slds-hidden" role="group">
				<button id="search-button" class="slds-button slds-button_brand">Search</button>
			</div>
		`;
		this.filtersElement = this.searchElement.querySelector('#filters');
		this.childFilterElement = this.searchElement.querySelector('#childFilter');
		this.searchButton = this.searchElement.querySelector('#search-button');
		this.typeList = new List({
			collapsible: true,
			element: this.searchElement.querySelector('#recapType'),
			handler: (event) => {
				switch(event) {
					case 'valueChange':
						this.type = this.types.filter((type) => type.name === this.typeList.value.value)[0];
						ActivityRecap.trackPageview(`/Activity Recap/${this.type.name}`);
						if (this.nav.views.length > (this.startingNav + 1)) {
							this.nav.pop();
						}
						this.renderFilters();
						break;
				}
			},
			items: this.types.map((type) => Object.assign({
				label: type.description.label,
				value: type.description.name
			})),
			label: 'Recap Type'
		});
		this.searchButton.addEventListener('click', this.search.bind(this));
	}

	async search() {
		this.spinner({ element: this.nav.current });
		let where = this.filterFieldset.where;
		let queryString = `
			Select ${[
				'Id',
				'Name',
				'LastModifiedDate'
			].concat(this.type.resultFields)
				.filter((fieldName, index, array) => array.indexOf(fieldName) === index)
				.concat(this.type.description.childRelationships.filter((cr, index) =>
					this.type.description.childRelationships.map(cr => cr.relationshipName).indexOf(cr.relationshipName) === index
				)
					.map(
						cr => {
							let childFields = this.type.childFields && this.type.childFields[cr.childSObject] || [cr.field];
							return `
								(Select ${childFields.join(',')} From ${cr.relationshipName})
							`
						}
					))
					.map((fieldName) => fieldName).join(',')
			}
			From ${this.type.description.name}
			${(where.length > 0) ? `WHERE ${where.map((w) => `(${w})`).join(' AND ')}` : ''}
			Order By LastModifiedDate Desc
			Limit 500
		`;
		let result = await Api.query(queryString);
		let records = (result && result.records) || [];
		let results = [];
		for (let value of this.childFilter.values) {
			let cr = this.type.description.childRelationships.filter(
				cr => `${cr.relationshipName}_${cr.childSObject}` === value.value
			)[0];
			let queryResult = await Api.query(`
				Select ${cr.field} From ${cr.childSObject}
				Where ${cr.field} <> NULL
			`);
			results = results.concat(((queryResult && queryResult.records) || []).map(record => record[cr.field]));
		}
		records = (this.childFilter.values.length > 0) ? records.filter(record => results.indexOf(record.Id) >= 0) : records;
		this.spinner({ element: this.nav.current });
		this.renderResults(records);
	}
}
