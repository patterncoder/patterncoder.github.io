import { App } from './app.js'
import { CustomElement } from './customElement.js'

export class Toast extends CustomElement {
	constructor(options) {
		super(options);
		this.init();
	}

	static get autoCloseTimeout() {
		return 1000;
	}

	static displayMessage(options) {
		options = options || {};
		if (!(options.element && options.message)) {
			return;
		}
		options.element.classList.remove('slds-hidden');
		document.body.style.WebkitOverflowScrolling = 'initial';
		let toast = new Toast(Object.assign({
			autoClose: true,
			handler: event => {
				switch (event) {
					case 'valueChange':
						options.element.classList.add('slds-hidden');
						document.body.style.WebkitOverflowScrolling = 'touch';
						if (options.onClose) {
							options.onClose();
						}
						break;
				}
			},
			type: 'error'
		}, options, {
			message: Array.isArray(options.message) ? options.message.join('<br/>') : options.message
		}));
		return toast;
	}

	bindEvents() {
		this.bind('.slds-notify__close', 'click', (event) => {
			if (this.timer) {
				clearTimeout(this.timer);
			}
			this.value = 'Closed';
		});
	}

	init() {
		if (this.autoClose === true) {
			this.timer = setTimeout(() => {
				this.value = 'Closed';
			}, Toast.autoCloseTimeout);
		}
	}

	render() {
		this.type = this.type || 'error';		// error, info, success, warning (all lowercase)
		this.element.classList.add('slds-scope');
		this.element.innerHTML = `
			<style>
				div.slds-notify_container {
					z-index: 100000;
					top: 60px;
				}
				@media (max-width: 400px) {
					div.slds-notify_toast {
						width: 90% !important;
					}
					div.slds-notify__content h2.slds-text-heading_small {
						font-size: .9rem;
					}
				}
			</style>
			<div class="demo-only slds-grid">
				<div class="${App.isSmallScreen ? `slds-region_narrow` : ''}">
 					<div class="slds-notify_container">
						<div class="slds-notify slds-notify_toast slds-theme_${this.type}" role="alert" style="">
							<span class="slds-assistive-text">info</span>
							${!App.isSmallScreen ? `
							<span class="slds-icon_container slds-icon-utility-info slds-m-right_small slds-no-flex slds-align-top">
								<svg class="slds-icon slds-icon_small" aria-hidden="true">
									<use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="${Toast.getSymbols('utility')}#${this.type}" />
								</svg>
							</span>
							` : ''}
							<div class="slds-notify__content">
								<h2 class="slds-text-heading_small">${this.message}</h2>
							</div>
							<button class="slds-button slds-button_icon slds-notify__close slds-button_icon-inverse" title="Close">
								<svg class="slds-button__icon slds-button__icon_large" aria-hidden="true">
									<use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="${Toast.getSymbols('utility')}#close" />
								</svg>
								<span class="slds-assistive-text">Close</span>
							</button>
						</div>
					</div>
				</div>
			</div>
		`;
		this.bindEvents();
		return this.element;
	}
}
