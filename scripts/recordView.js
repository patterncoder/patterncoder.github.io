import { App } from './app.js'
import { CustomObject } from './customObject.js'
import { Tile } from './tile.js'

export class RecordView extends CustomObject {
	constructor(options) {
		super(options);
		this.render();
	}

	static get properties() {
		return [
			'element',
			'displayFormat', // 'tiles' or 'table'
			'description',
			'icon',
			'columns',
			'items',
			'menus', // { label, action, menuitemClass }
			'handler',
		];
	}

	bindEvents() {
		if (this.displayFormat === 'tiles') {
			return;
		}
		this.bind('.slds-is-sortable', 'click', event => {
			let column = this.columns[Number(event.currentTarget.getAttribute('data-index'))];
			column.sort = (column.sort === 'ascending') ? 'descending' : 'ascending';
			this.sortBy = {
				fieldApiName: column.fieldApiName,
				isAscending: column.sort === 'ascending',
				label: column.label,
				name: column.name
			};
			this.handler('sort', this.sortBy);
		});
		this.bind('.slds-tile__title', 'click', (event, index) =>
			this.handler('select', { Id: this.items[index].Id || this.items[index].id, type: this.items[index].type }));
		this.bind('.slds-tile__link', 'click', (event) => {
			const column = this.columns[Number(event.currentTarget.getAttribute('data-column'))];
			const item = this.items[Number(event.currentTarget.getAttribute('data-index'))];
			const field = item.fields[column.fieldApiName.split('.')[0]];
			this.handler('select', { Id: field.value.id, type: field.value.apiName });
		});
		this.bind('.slds-dropdown-trigger_click', 'click', event => {
			event.preventDefault();
			event.stopPropagation();
			event.currentTarget.classList.toggle('slds-is-open');
		});
		for (const menu of (this.menus || [])) {
			this.bind(`.${menu.className}[role=menuitem]`, 'click', event => {
				const record = this.items[Number(event.currentTarget.getAttribute('data-index'))];
				this.handler(menu.action, { id: record.Id || record.id, type: record.apiName });
			});
		}
	}

	static displayValue(item, column, description) {
		const value = column.fieldApiName.split('.').reduce((value, part) =>
			value === null || value !== '' ? (((value || item || {}).fields || {})[part] || {}).value || '' : value, null
		);
		const type = (description.fields.find(field => field.name === column.fieldApiName) || {}).type || 'string';
		return super.displayValue(value, type, !(
			item.fields &&
			item.fields.IsAllDayEvent &&
			item.fields.IsAllDayEvent.value &&
			['StartDateTime', 'EndDateTime'].includes(column.fieldApiName)
		));
	}

	renderAsTable() {
		let nameField = ((this.description && this.description.fields) || []).find(field => field.nameField) || {};
		this.element.classList.add('slds-scope');
		this.element.innerHTML = `
			<style>
				table th .slds-is-sortable__icon {
					display: inline-block;
				}
				table tbody tr td {
					vertical-align: top;
				}
			</style>
			<div class="message slds-hidden"></div>
			<table class="slds-table slds-table_bordered slds-table_cell-buffer">
				<thead>
					<tr class="slds-text-title_caps">
					${(this.columns || []).map((column, index) => `
						<th class="slds-cell-wrap" scope="col">
							<div data-index=${index} class="slds-truncate ${column.sortable === true ? 'slds-is-sortable' : ''}" title="${column.label}">
								<span>${column.label}</span>
								${(this.sortBy && (this.sortBy.fieldApiName === column.fieldApiName)) ? `
									<span class="slds-icon_container slds-icon-utility-arrow${(column.sort === 'ascending') ? 'up' : 'down'}">
										<svg class="slds-icon slds-icon-text-default slds-is-sortable__icon" aria-hidden="true">
											<use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="${RecordView.symbols}#arrow${(column.sort === 'ascending') ? 'up' : 'down'}" />
										</svg>
									</span>
								` : ''}
							</div>
						</th>
					`).join('\n')}
					<th class="slds-cell-wrap" scope="col"></th>
					</tr>
				</thead>
				<tbody>
					${(this.items || []).map((item, rowNum) => `
						<tr>
							${(this.columns || []).map((column, index) => {
								let value = RecordView.displayValue(item, column, this.description);
								const name = column.fieldApiName.split('.')[0];
								const isLink = column.fieldApiName.indexOf('.') > 0 && item.fields[name].value && item.fields[name].value.id && !App.blacklistedObjects.includes(item.fields[name].value.apiName);
								return (index === 0 && ['Name', nameField.name].includes(column.fieldApiName)) ? `
									<td class="slds-cell-wrap" data-label="${column.label}">
										<h3 class="slds-tile__title slds-truncate" title="${value}">
											${item._changedLocally ? '*' : ''}
											<a href="javascript:void(0);">${value}</a>
										</h3>
									</td>
								` : `
									<td class="${(value && (value.length > 1)) ? 'slds-cell-wrap' : ''}" data-label="${column.label}">
									${isLink ? `
										<div class="slds-tile__link"  data-index="${rowNum}" data-column="${index}" title="${value}"><a href="javascript:void(0);">${value}</a></div>
										` : `
										<div title="${value}">${value}</div>`
									}</td>
							`}).join('\n')}
							<td>
								<div class="slds-shrink-none slds-dropdown-trigger slds-dropdown-trigger_click">
									<button class="slds-button slds-button_icon slds-button_icon-border-filled slds-button_icon-x-small" aria-haspopup="true" title="More options">
										<svg class="slds-button__icon slds-button__icon_hint" aria-hidden="true">
											<use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="${RecordView.symbols}#down" />
										</svg>
										<span class="slds-assistive-text">More options</span>
									</button>
									<div class="slds-dropdown slds-dropdown_right">
										<ul class="slds-dropdown__list" role="menu">
											<li class="slds-dropdown__item" role="presentation">
												${(this.menus || []).map(menu => `
												<a data-index=${rowNum} class="${menu.className}" href="javascript:void(0);" role="menuitem" tabindex="0">
													<span class="slds-truncate" title="${menu.label}">${menu.label}</span>
												</a>
												`).join('\n')}
											</li>
										</ul>
									</div>
								</div>
							</td>
						</tr>
						`).join('\n')}
				</tbody>
			</table>`;
	}

	renderAsTiles() {
		this.element.classList.add('slds-scope');
		this.element.innerHTML = `
			<style>
				.slds-hidden {
					display: none !important;
				}
				div.listview-container {
					clear: both;
				}
			</style>
			<div class="message slds-hidden"></div>
			<div class="slds-m-around_medium listview-container">
				${(this.items || []).map(record => `
					<div class="tile_${record.id || record.Id}"></div>
					`).join('\n')}
			</div>
		`;
		for (const record of this.items) {
			new Tile({
				columnInfo: [this.columns],
				columns: [record.fields],
				description: this.description,
				element: this.element.querySelector(`.tile_${record.id || record.Id}`),
				handler: this.handler,
				icon: this.icon,
				id: record.id || record.Id,
				menus: this.menus,
				record: record,
				showNull: this.showNull,
				type: record.apiName
			});
		}
	}

	render() {
		if (this.items) {
			this.displayFormat === 'tiles' ? this.renderAsTiles() : this.renderAsTable();
			this.bindEvents();
		} else {
			this.element.innerHTML = '';
		}
		return this.element;
	}
}
