import { App } from './app.js'
import { CustomObject } from './customObject.js'

export class Path extends CustomObject {
	constructor(options) {
		super(options);
	}

	get activeItem() {
		return this.items.find(item => item.active);
	}
	get activeItemIndex() {
		return Math.max(this.items.indexOf(this.activeItem), 0);
	}
	get disableNext() {
		return (this.activeItemIndex+1) >= this.items.length;
	}
	get disablePrevious() {
		return this.activeItemIndex <= 0;
	}
	get items() {
		return this._items = this._items || [];
	}
	set items(items) {
		this._items = items;
		this.render();
	}

	bindEvents() {
		this.bind('.slds-path ul li', 'click', (event, index) => this.handler('selectItem', this.items[index]));
		this.bind('.path-buttons button', 'click', (event, index) => this.handler('selectItem', this.items[this.activeItemIndex + (index || -1)]));
	}

	render() {
		(this.element = this.element || document.createElement('div')).innerHTML = this.items.length > 0 ? `
			<style>
				.path-container {
					display: flex;
					overflow-y: auto;
					width: 100%;
				}
				.slds-path {
					flex: 1;
					margin-top: -21px;
					overflow-x: auto;
					overflow-y: hidden;
					width: ${this.items.length * 10}em;
				}
				.slds-path ul {
					margin-top: 1.6em;
					width: auto;
				}
				.slds-path ul li {
					flex: none;
					padding: 0 10px;
				}
				.slds-path ul li.slds-is-active {
					padding: 0 20px;
				}
				.slds-path ul li a {
					text-decoration: none;
				}
				.slds-path .slds-path__nav .slds-is-complete .slds-path__title {
					-webkit-transform: none;
					transform: none;
				}
				.slds-path .slds-path__item.slds-is-complete .slds-path__title {
					color: #fff;
				}
				.slds-path .slds-path__nav .slds-is-current,
				.slds-path .slds-path__nav .slds-is-current:before,
				.slds-path .slds-path__nav .slds-is-current:after {
					background: ${typeof(App) !== 'undefined' ? App.primaryColor : 'initial'};
				}
				.slds-path .slds-path__nav .slds-is-current .slds-path__title {
					color: #fff;
					font-weight: bold;
				}
				.slds-path .slds-path__nav .slds-path__item .path-item-required {
					color: red;
					font-size: 2em;
				}
				.path-buttons {
					flex: none;
					margin: .9em;
				}
			</style>
			<div class="path-container">
				<div class="slds-path">
					<div class="slds-grid slds-path__track">
						<div class="slds-grid slds-path__scroller-container">
							<div class="slds-path__scroller" role="application">
								<div class="slds-path__scroller_inner">
									<ul class="slds-path__nav" role="listbox" aria-orientation="horizontal">
										${this.items.map(item => `
											<li class="slds-path__item ${item.active ? 'slds-is-active' : ''} ${item.current ? 'slds-is-current' : `slds-is-${item.complete ? 'complete' : 'incomplete'}`}" role="presentation">
												<a aria-selected="${item.active}" class="slds-path__link" href="javascript:void(0);" role="option" tabindex="-1">
													<span class="slds-path__stage">
														<span class="slds-assistive-text">${item.complete ? 'Complete' : item.current ? 'Current' : 'Incomplete'}</span>
													</span>
													<span class="slds-path__title">${item.title}</span>
													<span class="path-item-required">${(item.required || item.gvp__Required__c) ? '*' : ''}</span>
												</a>
											</li>
										`).join('\n')}
									</ul>
								</div>
							</div>
						</div>
					</div>
				</div>
				<div class="path-buttons" role="group">
					<button aria-controls="path-navigation-previous"
						class="slds-button slds-button_icon slds-button_icon-border-filled slds-path__trigger"
						${this.disablePrevious ? 'disabled' : ''}
						title="${this.getLabel('Previous')}"
					>
						<svg class="slds-button__icon" aria-hidden="true">
							<use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="${App.getSymbols('utility')}#chevronleft" />
						</svg>
						<span class="slds-assistive-text">${this.getLabel('Previous')}</span>
					</button>
					<button aria-controls="path-navigation-next"
						class="slds-button slds-button_icon slds-button_icon-border-filled slds-path__trigger"
						${this.disableNext ? 'disabled' : ''}
						title="${this.getLabel('Next')}"
					>
						<svg class="slds-button__icon" aria-hidden="true">
							<use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="${App.getSymbols('utility')}#chevronright" />
						</svg>
						<span class="slds-assistive-text">${this.getLabel('Next')}</span>
					</button>
				</div>
			</div>
		` : '';
		if (this.activeItem) {
			let activeElement = this.element.querySelector('.slds-path ul li.slds-is-active');
			(activeElement.nextElementSibling || activeElement).scrollIntoView();
		}
		this.bindEvents();
	}
}
