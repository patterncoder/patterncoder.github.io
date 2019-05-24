import { CustomObject } from './customObject.js'

export class Modal extends CustomObject {
	constructor(options) {
		super(options);
		this.element = (this.element || document.body).appendChild(document.createElement('div'));
	}

	static async confirm(options) {
		options = options || {};
		return (await new Modal(Object.assign({
			description: CustomObject.getLabel('Are_You_Sure'),
			texture: 'alert',
			theme: 'warning'
		}, options || {}, {
			buttons: [
				{ label: CustomObject.getLabel(options.no || 'No'), value: 'no' },
				{ label: CustomObject.getLabel(options.yes || 'Yes'), value: 'yes' }
			]
		})).open()) === 'yes';
	}

	static async promptToContinue(options) {
		options = options || {};
		return (options.fieldset && options.fieldset.modified) || options.modified ? await this.confirm({
			title: CustomObject.getLabel('Mobile_Continue'),
			description: CustomObject.getLabel('Mobile_Leave_Page')
		}) : true;
	}

	bindEvents() {
		this.bind('footer button', 'click', (event, index) => {
			event.preventDefault();
			event.stopPropagation();
			this.resolve(this.buttons && this.buttons[index] && this.buttons[index].value);
			this.close();
		});
	}

	close() {
		this.element.remove();
	}

	open() {
		this.element.innerHTML = `
			<style>
				.slds-backdrop_open {
					z-index: 100001;
				}
				.slds-modal {
					z-index: 100002;
				}
			</style>
			<section role="alertdialog" tabindex="-1" class="slds-modal slds-fade-in-open" aria-modal="true">
				<div class="slds-modal__container">
					<header class="slds-modal__header slds-theme_${this.theme || 'default'} slds-theme_${this.texture || 'default'}-texture">
						<h2 class="slds-text-heading_medium">${this.title || ''}</h2>
					</header>
					<div class="slds-modal__content slds-p-around_medium">
						<p>${this.description || ''}</p>
					</div>
					<footer class="slds-modal__footer slds-theme_default">
						${(this.buttons || [{ label: 'Ok', value: 'ok' }]).map((button, index, buttons) => `
							<button class="slds-button slds-button_${(index === (buttons.length - 1)) ? 'brand' : 'neutral'}" data-value="${button.value}">${button.label}</button>
						`).join('\n')}
					</footer>
				</div>
			</section>
			<div class="slds-backdrop slds-backdrop_open"></div>
		`;
		this.bindEvents();
		return new Promise(resolve => this.resolve = resolve);
	}
}
