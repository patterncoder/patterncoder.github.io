import { CustomList } from './customList.js'

export class List extends CustomList {
	static get properties() {
		return CustomList.properties.concat([
			'clearable',
			'collapsed',
			'collapsible',
			'linkLabel',
			'multiselect',
			'placeholder',
			'searchable',
			'searchString',
			'selectionEnd',
			'selectionStart',
			'showEmpty',
			'fixedHeightDropList',
			'readOnly'
		]);
	}

	get input() {
		return this.element.querySelector('input');
	}
	get items() {
		return this._items || [];
	}
	set items(items) {
		this._items = items;
	}
	get placeholder() {
		return this._placeholder = this._placeholder || ((this.items.length > 0) ? this.getLabel((this.multiselect ? 'Choose_Generic' : 'Choose')) : '');
	}
	set placeholder(placeholder) {
		this._placeholder = placeholder;
	}
	get readOnly() {
		if (this._readOnly === false) return false;
		return this._readOnly || !this.searchable || (!this.multiselect && this.value);
	}
	set readOnly(readOnly) {
		this._readOnly = readOnly;
	}
	get value() {
		return this._value;
	}
	set value(value) {
		let values = (Array.isArray(value) ? value : (([undefined, null].indexOf(value) < 0) ? [value] : []))
			.map(value => ([undefined, null].indexOf(value.value) < 0) ? value : { label: value, value: value });
		value = Array.isArray(value) ? values : values[0];
		value = (Array.isArray(value) && !this.multiselect) ? value[0] : value;
		value = (value === undefined) ? null : value;
		let valueChanged = this.value !== value;
		this._value = value;
		if (valueChanged && this.handler) {
			this.handler('valueChange', this);
		}
	}
	get values() {
		return Array.isArray(this.value) ? this.value : (this.value ? [this.value] : []);
	}
	get valueDisplay() {
		if (this.values.length === 0) {
			return this.searchString || '';
		}
		if (!this.multiselect) {
			return ((this.values.length > 0) && this.constructor.getText(this.values[0].label)) || this.searchString || '';
		}
		if (!this.searchable) {
			return `${this.values.length} Option${this.values.length === 1 ? '' : 's'} Selected`;
		}
		return this.searchString || '';
	}

	bindEvents() {
		this.bind('.slds-combobox__form-element', 'click', () => {
			if (this.collapsible) {
				this.collapsed = !this.collapsed;
				return this.render();
			}
		});
		this.bind('.slds-input__icon', 'click', (event) => {
			if ((this.searchable || (this.clearable !== false)) && !this.multiselect && this.value && !this._readOnly) {
				event.preventDefault();
				event.stopPropagation();
				this.searchString = '';
				this.value = null;
				this.collapsed = false;
				if (this.input) {
					this.input.focus();
				}
				return this.render({ valueChanged: true });
			}
		});
		this.bind('ul li', 'click', (event) => {
			event.stopPropagation();
			let value = event.currentTarget.getAttribute('data-value');
			let item = this.items.find(item => String(item.value) === value);
			if (!item || this._readOnly) {
				return;
			}
			this.modified = true;
			if (this.multiselect) {
				let filteredValues = this.values.filter((value) => value.value !== item.value);
				if (filteredValues.length === this.values.length) {
					this.value = filteredValues.concat([item]);
				} else {
					this.value = filteredValues;
				}
			} else {
				this.value = item;
				if (this.collapsible && !this.multiselect) {
					this.collapsed = true;
				}
			}
			return this.render({ valueChanged: true });
		});
		this.bind('input', [ 'change', 'keyup' ], (() => {
			let lastSearch;
			let timer;
			return event => {
				event.stopPropagation();
				let input = event.currentTarget;
				if (!this.searchable) {
					if (this.handler) {
						this.handler('inputChange', input.value);
					}
					return;
				}
				this.searchString = input.value;
				this.collapsed = false;
				if (timer) {
					clearTimeout(timer);
				}
				timer = setTimeout(() => {
					if (this.handler && (input.value !== lastSearch)) {
						lastSearch = input.value;
						this.handler('inputChange', input.value);
					}
					this.render();
				}, 500);
			};
		})());
		this.bind('input', 'blur', event => {
			if ((this.collapsible && event.relatedTarget &&
				// 20 = Contained by (16) and following (4)
				(this.element.compareDocumentPosition(event.relatedTarget) !== 20)) || event.relatedTarget === null
			) {
				this.collapsed = true;
				return this.render();
			}
		});
		this.bind('.slds-link__label', 'click', (event) => {
			if (this.handler) {
				this.handler('labelClick');
			}
		});
	}

	isSelected(item) {
		return this.values.filter((v) => v.value && (v.value === (item && item.value))).length > 0;
	}

	renderFormElement() {
		return this.searchable || (this.showEmpty || (this.items.length > 0)) ? `
			<div class="slds-form-element__control">
				<div class="slds-combobox_container">
					<div class="slds-combobox slds-dropdown-trigger slds-dropdown-trigger_click slds-is-open" aria-expanded="true" aria-haspopup="listbox" role="combobox">
						<div class="slds-combobox__form-element slds-input-has-icon slds-input-has-icon_right" role="none">
							<input type="text" class="slds-input slds-combobox__input ${(this.required && (this.values.length < 1)) ? 'invalid' : ''}" id="combobox-${this.id}" aria-controls="listbox-${this.id}" autocomplete="off" role="textbox" placeholder="${this.placeholder}" ${this.readOnly ? 'readonly' : ''} value="${this.valueDisplay}" />
							${this.renderIcon()}
						</div>
						${this.renderItems()}
					</div>
				</div>
			</div>
		` : '';
	}

	renderIcon() {
		let title = '';
		let type = '';
		if (this.icon && this.iconTitle) {
			title = this.iconTitle;
			type = this.icon;
		} else if (!this.readOnly && this.searchable) {
			title = 'Search choices';
			type = 'search';
		} else if ((this.clearable !== false) && !this.multiselect && this.value) {
			title = 'Remove choice';
			type = 'clear';
		} else if (this.readOnly && (this.items.length > 0)) {
			title = 'List choices';
			type = 'down';
		}  
		switch(type) {
			case '':
				return '';
			case 'clear':
				return `
					<button class="slds-input__icon slds-input__icon_right slds-button slds-button_icon">
						<svg class="slds-button__icon slds-icon-text-light" aria-hidden="true">
							<use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="${List.symbols}#${type}" />
						</svg>
						<span class="slds-assistive-text">${title}</span>
					</button>
				`;
			default:
				return `
					<span class="slds-icon_container slds-icon-utility-down slds-input__icon slds-input__icon_right" title="${title}">
						<svg class="slds-icon slds-icon_x-small slds-icon-text-default" aria-hidden="true">
							<use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="${List.symbols}#${type}" />
						</svg>
						<span class="slds-assistive-text">${title}</span>
					</span>
				`;
		}
	}

	renderChosenItem(item) {
		return `
			<li role="presentation" class="slds-listbox__item" data-value="${item.value}" tabindex="0">
				<span class="slds-pill" role="option" tabindex="0" aria-selected="true">
					<span class="slds-pill__label" title="${this.constructor.getText(item.label)}">${this.constructor.getText(item.label)}</span>
					<span class="slds-icon_container slds-pill__remove" title="Remove">
						<svg class="slds-icon slds-icon_x-small slds-icon-text-default" aria-hidden="true">
							<use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="${List.symbols}#close" />
						</svg>
						<span class="slds-assistive-text">Press delete or backspace to remove</span>
					</span>
				</span>
			</li>
		`;
	}

	renderItem(item, index) {
		return `
			<li role="presentation" class="slds-listbox__item" data-value="${item.value}" tabindex="0">
				<span id="${item.value}" class="slds-media slds-listbox__option slds-listbox__option_plain slds-media_small slds-media_center ${this.isSelected(item) ? 'slds-is-selected' : ''}" role="option">
					${this.itemRenderer ? this.itemRenderer(item, index) : `
						<span class="slds-media__figure">
							<svg class="slds-icon slds-icon slds-icon_x-small slds-listbox__icon-selected" aria-hidden="true">
								<use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="${List.symbols}#check" />
							</svg>
						</span>
						<span class="slds-media__body">
							<span class="slds-truncate" title="${this.constructor.getText(item.label)}">
								<span class="slds-assistive-text"></span>
								${this.constructor.getText(item.label)}
							</span>
						</span>
					`}
				</span>
			</li>
		`;
	}

	renderItems() {
		return `
			${this.multiselect && this.searchable && (this.values.length > 0) ? `
				<div id="listbox-selections-${this.id}" role="listbox" aria-orientation="horizontal" ">
					<ul class="slds-listbox slds-listbox_inline slds-p-top_xxx-small" role="group" aria-label="Selected Options:">
						${(this.values || []).map(this.renderChosenItem.bind(this)).join('\n')}
					</ul>
				</div>
			` : ''}
			${this.items.length > 0 ? `
				<div id="listbox-${this.id}" role="listbox" class="${this.collapsed ? 'slds-hide' : ''}">
					<ul class="slds-listbox slds-listbox_vertical slds-dropdown slds-dropdown_fluid slds-is-relative" role="presentation">
						${(this.items || []).map(this.renderItem.bind(this)).join('\n')}
					</ul>
				</div>
			` : ''}
		`;
	}

	render(options) {
		options = options || {};
		let hasFocus = this.input === document.activeElement;
		if (this.input && (['search', 'text'].indexOf(this.input.type) >= 0)) {
			this.selectionStart = this.input.selectionStart;
			this.selectionEnd = this.input.selectionEnd;
		}
		this.element.classList.add('slds-scope');
		this.element.innerHTML = `
			<style>
				.slds-input[type=text] {
					min-width: 15rem;
				}
				.slds-form-element__label {
					font-size: .9rem !important;
				}
				input.invalid {
					border: 1px solid red !important;
				}
				ul {
					text-align: initial;
				}
				${this.fixedHeightDropList ? `#listbox-${this.id} > ul { max-height: 150px; overflow: auto; }` : ''}
				
			</style>
			<div class="slds-form-element slds-m-around_small">
				${this.linkLabel && this.value ? `
					<label class="slds-link__label slds-form-element__label ${!this.label ? 'slds-hidden' : ''}" for="${this.id}"><a href="javascript:void(0);">${this.constructor.getText(this.label)}</a></label>
				` : `
					<label class="slds-form-element__label ${!this.label ? 'slds-hidden' : ''}" for="${this.id}">${this.constructor.getText(this.label)}</label>
				`}
				${this.renderFormElement()}
			</div>
		`;
		this.bindEvents();
		if (this.input && hasFocus && (['search', 'text'].indexOf(this.input.type) >= 0)) {
			this.input.focus();
			this.input.setSelectionRange(this.selectionStart || 0, this.selectionEnd || 0);
		}
		if (this.handler && options.valueChanged) {
			this.handler('valueChanged', this);
		}
		return this.element;
	}
}
