import { CustomObject } from './customObject.js'

export class ButtonGroup extends CustomObject {
	constructor(options) {
		super(options);
		this.init();
	}

	get buttons() {
		return (this._buttons = this._buttons || [])
			.filter(button => button.selectable || !this.smallScreen || (this.overflow === false));
	}
	set buttons(buttons) {
		this._buttons = buttons;
		this.render();
	}
	get element() {
		return this._element = this._element || document.createElement('div');
	}
	set element(element) {
		this._element = element;
		this.render();
	}
	get label() {
		return this._label = this._label || '';
	}
	set label(label) {
		this._label = label;
		this.render();
	}
	get menu() {
		return ((this.smallScreen && (this.overflow !== false)) ? this._buttons.filter(button => !button.selectable) : [])
			.concat(this._menu = this._menu || []);
	}
	set menu(menu) {
		this._menu = menu;
		this.render();
	}
	get smallScreen() {
		return this._smallScreen;
	}
	set smallScreen(smallScreen) {
		this._smallScreen = smallScreen;
		this.render();
	}

	bindEvents() {
		this.bind('.slds-button-group > button', 'click', (event, index) => {
			this.buttons[index].selected = this.buttons[index].selectable && !this.buttons[index].selected;
			if (this.handler) {
				this.handler('button', this.buttons[index]);
			}
			this.render();
		});
		this.bind('.slds-dropdown-trigger_click', 'click', event => {
			event.preventDefault();
			event.stopPropagation();
			event.currentTarget.classList.toggle('slds-is-open');
		});
		this.bind('.slds-dropdown__item a', 'click', (event, index) => {
			if (this.menu[index].disabled) {
				event.preventDefault();
				event.stopPropagation();
			} else if (this.handler) {
				this.handler('menu', this.menu[index]);
				this.render();
			}
		});
	}

	button(value) {
		return this.buttons.find(button => button.value === value);
	}

	disabled(value, disabled) {
		let button = this.button(value);
		let menuItem = this.menuItem(value);
		(button || menuItem || {}).disabled = disabled;
		this.render();
	}

	init() {
		let matchMedia = window.matchMedia('(max-width: 62em)');
		this.smallScreen = matchMedia.matches;
		matchMedia.addListener(event => this.smallScreen = event.matches);
	}

	menuItem(value) {
		return this.menu.find(menuItem => menuItem.value === value);
	}

	render() {
		this.element.innerHTML = `
			<style>
				.button-group {
					align-items: baseline;
					display: flex;
					justify-content: flex-end;
					margin: 0 0 0 .75em;
					white-space: nowrap;
				}
				.button-group > label {
					flex: none;
					margin-right: .75em;
					vertical-align: text-bottom;
				}
				.button-group .slds-button-group {
					flex: 0 1 auto;
					overflow-x: ${(this.menu.length > 0) ? 'inherit' : 'auto'};
				}
				.button-group .slds-button-group > button {
					white-space: nowrap;
				}
				.button-group .slds-button-group > button.slds-button_icon,
				.button-group .slds-button-group > button.slds-icon_container {
					border: 0;
				}
				.button-group .slds-button-group > button.slds-icon_container[disabled] {
					background-color: #dddbda;
				}
				.button-group .slds-dropdown__item[disabled] a {
					color: #dddbda;
				}
			</style>
			<div class="button-group">
				<label>${this.label}</label>
				<div class="slds-button-group" role="group">
					${this.buttons.map(button => `
						<button class="${button.icon ? (button.icon.cssClass ? `
							slds-icon_container slds-icon_container_circle slds-m-around_xx-small ${button.icon.cssClass}
						` : 'slds-button slds-button_icon slds-m-around_small') : `slds-button ${this.margin ? `slds-m-horizontal_${this.margin}` : ''} slds-button_${(button.selected || button.brand) ? 'brand' : 'neutral'}`}"
							data-value="${button.value || ''}"
							${button.disabled ? 'disabled' : ''}
							title="${button.label || ''}"
						>
							${button.icon ? `
								<svg class="slds-icon slds-icon--${button.icon.size || 'small'}" aria-hidden="true">
									<use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="${button.icon.url || button.icon}" />
								</svg>
								<span class="slds-assistive-text">${button.label || ''}</span>
							` : (button.label || '')}
						</button>
					`).join('\n')}
					${(this.menu.length > 0) ? `
						<div class="button-group-dropdown slds-dropdown-trigger slds-dropdown-trigger_click slds-button_last">
							<button class="slds-button slds-button_icon slds-button_icon-border-filled" aria-haspopup="true" title="Show More">
								<svg class="slds-button__icon" aria-hidden="true">
									<use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="${ButtonGroup.getSymbols('utility')}#down" />
								</svg>
								<span class="slds-assistive-text">Show More</span>
							</button>
							<div class="slds-dropdown slds-dropdown_right slds-dropdown_actions">
								<ul class="slds-dropdown__list" role="menu">
									${this.menu.map(menuItem => `
										<li class="slds-dropdown__item" role="presentation" ${menuItem.disabled ? 'disabled' : ''}>
											<a href="javascript:void(0);" role="menuitem" tabindex="0">
												<span class="slds-truncate" title="${menuItem.label}">${menuItem.label}</span>
											</a>
										</li>
									`).join('\n')}
								</ul>
							</div>
						</div>
					` : ''}
				</div>
			</div>
		`;
		this.bindEvents();
		return this.element;
	}
}
