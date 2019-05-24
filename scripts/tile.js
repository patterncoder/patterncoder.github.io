import { App } from './app.js'
import { CustomObject } from './customObject.js'

export class Tile extends CustomObject {
	constructor(options) {
		super(options);
		this.init();
	}

	static get properties() {
		return [
			'element',
			'description',
			'id',
			'type',
			'icon',
			'columns', // field values on a per-column basis
			'columnInfo', // column information for each field
			'menus', // { label, action, menuitemClass }
			'handler'
		];
	}

	static displayValue(item, columnInfo, description, record) {
		const parts = columnInfo.fieldApiName.split('.');
		const value = parts.reduce((value, part) => {
			return value === null || value !== '' ? (((value || item || {}).fields || {})[part] || {}).value || '' : value;
		}, null);
		const type = (description.fields.find(field => field.name === columnInfo.fieldApiName || field.name === parts[0]) || {}).type || 'string';
		return super.displayValue(value, type, !(
			record &&
			record.fields &&
			record.fields.IsAllDayEvent &&
			record.fields.IsAllDayEvent.value &&
			['StartDateTime', 'EndDateTime'].includes(columnInfo.fieldApiName)
		));
	}

	bindEvents() {
		this.bind('.slds-tile__title', 'click', () => {
			this.handler('select', { Id: this.id, type: this.type })
		});
		this.bind('.slds-tile__link', 'click', (event) => {
			const columnNum = Number(event.currentTarget.getAttribute('data-column'));
			const fieldNum = Number(event.currentTarget.getAttribute('data-field'));
			const columnInfo = this.columnInfo[columnNum][fieldNum];
			const field = this.columns[columnNum][columnInfo.fieldApiName.split('.')[0]];
			this.handler('select', { Id: field.value.id, type: field.value.apiName });
		});
		this.bind('.slds-dropdown-trigger_click', 'click', event => {
			event.preventDefault();
			event.stopPropagation();
			event.currentTarget.classList.toggle('slds-is-open');
		});
		for (const menu of (this.menus || [])) {
			this.bind(`.${menu.className}[role=menuitem]`, 'click', event => {
				this.handler(menu.action, { id: this.id, type: this.type });
			});
		}
	}

	init() {
		this.tileFormat = this.icon ? 'listTile' : 'activityTile';
		if (this.columns) {
			this.render();
		}
	}

	renderMenuDropdown() {
		return this.menus && this.menus.length > 0 ? `
		<div class="slds-shrink-none slds-dropdown-trigger slds-dropdown-trigger_click">
			<button class="slds-button slds-button_icon slds-button_icon-border-filled slds-button_icon-x-small" aria-haspopup="true" title="More options">
				<svg class="slds-button__icon slds-button__icon_hint" aria-hidden="true">
					<use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="${Tile.symbols}#down" />
				</svg>
				<span class="slds-assistive-text">More options</span>
			</button>
			<div class="slds-dropdown slds-dropdown_right">
				<ul class="slds-dropdown__list" role="menu">
					<li class="slds-dropdown__item" role="presentation">
						${(this.menus || []).map(menu => `
						<a class="${menu.className}" href="javascript:void(0);" role="menuitem" tabindex="0">
							<span class="slds-truncate" title="${menu.label}">${menu.label}</span>
						</a>
						`).join('\n')}
					</li>
				</ul>
			</div>
		</div>
		` : ``;
	}

	render() {
		this.element.innerHTML = `
			<style>
				div.slds-grid h3.slds-tile__title {
					font-size: 1.1rem;
				}
				article.slds-tile {
					background-color: ${App.secondaryColor};
					border: 1px solid #dddbda;
					border-radius: .25rem;
					cursor: pointer;
					float: left;
					margin: 0 .5rem .5rem 0 !important;
					padding: 1em;
					width: 32%;
				}
				article.slds-tile dt {
					color: #666;
					font-size: smaller;
				}
				article.slds-tile dd {
					color: #090909;
				}
				${this.tileFormat === 'activityTile' ? `
					article.slds-tile {
						display: flex;
						flex-wrap: wrap;
						width: 100%;
					}
					@media (max-width: 48em) {
						article.slds-tile {
							flex-direction: column;
						}
					}
					article ul {
						flex: 50%;
					}
					article .tile-images-list {
						flex: 100%;
					}
				` : `
					@media (max-width: 64em) {
						article.slds-tile {
							width: 48%;
						}
					}
					@media (max-width: 48em) {
						article.slds-tile {
							width: 96%;
						}
					}
				`}
			</style>
			<article class="slds-tile slds-media slds-card__tile slds-hint-parent">
			${(this.columns || []).map((fields, columnNum) => `
				${this.tileFormat === 'listTile' && this.icon ? `
					<div class="slds-media__figure">
						<span class="slds-icon_container ${this.icon.cssClass || ''}" title="Description of icon when needed">
							<svg class="slds-icon slds-icon_small" aria-hidden="true">
								<use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="${this.icon.url || this.icon}" />
							</svg>
							<span class="slds-assistive-text">${this.description.label}</span>
						</span>
					</div>
				<div class="slds-media__body">
					` : `
				<ul class="slds-list_horizontal slds-wrap">`
				}
				${(this.columnInfo[columnNum] || []).map((columnInfo, fieldNum) => {
					let value = Tile.displayValue({ fields: fields }, columnInfo, this.description, this.record);
					const name = columnInfo.fieldApiName.split('.')[0];
					const isLink = ((columnInfo.fieldApiName.indexOf('.') > 0) && fields[name].value && fields[name].value.id && !App.blacklistedObjects.includes(fields[name].value.apiName)) ? true : false;
					if (this.tileFormat === 'listTile') {
						return (fieldNum === 0) ? `
							<div class="slds-grid slds-grid_align-spread slds-has-flexi-truncate">
								<h3 class="slds-tile__title slds-truncate" title="${value}"><a href="javascript:void(0);">${value}</a></h3>
								${this.renderMenuDropdown()}
							</div>
						` : (this.showNull || (value !== Tile.nullString) ? `
							<div class="slds-tile__detail">
								<dl class="slds-wrap">
									<dt class="slds-item_label slds-truncate" title="${columnInfo.label}">${columnInfo.label}</dt>
									${isLink ? `
										<dd class="slds-tile__link slds-item_detail slds-truncate" data-column=${columnNum} data-field=${fieldNum} title="${value}"><a href="javascript:void(0);">${value}</a></dd>
										` : `
										<dd class="slds-item_detail slds-truncate" title="${value}">${value}</dd>`
									}
								</dl>
							</div>
						` : '');
				} else return (fieldNum === 0 && columnInfo.fieldApiName === 'Name') ? `
					<li class="slds-grid slds-grid--vertical slds-size_1-of-2 slds-p-bottom_small">
						<span class="slds-text-title slds-p-bottom_x-small">${columnInfo.label}</span>
						<span class="slds-text-body_medium slds-truncate" title="${value}">
							<a class="slds-tile__title" data-column=${columnNum} data-field=${fieldNum} href="javascript:void(0);">${value}</a>
						</span>
					</li>
					` : `
					<li class="slds-grid slds-grid--vertical slds-size_1-of-2 slds-p-bottom_small">
						<span class="slds-text-title slds-p-bottom_x-small">${columnInfo.label}</span>
						<span class="slds-text-body_medium slds-truncate" title="${value}">
							${isLink ? `
								<a class="slds-tile__link" data-column=${columnNum} data-field=${fieldNum} href="javascript:void(0);">${value}</a>
								` : `
								${value}`
							}
						</span>
					</li>
					`
				}).join('\n')}
				${this.tileFormat === 'listTile' ? `
				</div>
				` : `
				</ul>
				`}
				`).join('\n')}
				<div class="tile-images-list"></div>
			</article>
		`;
		this.bindEvents();
		return this.element;
	}
}
