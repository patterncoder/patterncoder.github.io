import { App } from './app.js'
import { CustomElement } from './customElement.js'

export class Textarea extends CustomElement {
	static get properties() {
		return super.properties.concat([
			'placeholder',
			'readOnly',
			'required'
		]);
	}

	get displayValue() {
		return this.constructor.getText(this.value);
	}

	get input() {
		return this.element.querySelector('textarea');
	}

	get valid() {
		return this.input.checkValidity();
	}

	bindEvents() {
		this.bind('textarea', 'change', () => {
			if (this.value !== this.input.value) {
				this.modified = true;
				this.value = this.input.value;
			}
		});
	}

	render() {
		this.element.classList.add('slds-scope');
		this.element.innerHTML = `
			<style>
				.slds-textarea {
					background-color: ${App.secondaryColor} !important;
					min-height: 3.5rem;
					min-width: 15rem;
					padding-left: .75rem;
				}
				.slds-textarea .slds-form-element__label {
					font-size: .9rem !important;
				}
				textarea.slds-textarea::placeholder {
					color: #ddd;
				}
				textarea:invalid {
					border: 1px solid red;
				}
				textarea[readonly] {
					background-color: initial !important;
					border: none;
					padding-left: 0 !important;
					resize: none;
				}
			</style>
			<div class="slds-form-element slds-m-around_small">
				<label class="slds-form-element__label ${!this.label ? 'slds-hidden' : ''}" for="${this.id}">${this.label}</label>
				<div class="slds-form-element__control">
					<textarea class="slds-textarea" id="${this.id}" placeholder="${this.placeholder}" ${this.readOnly ? 'readonly' : ''} ${this.required ? 'required' : ''} rows="3">${this.displayValue || ''}</textarea>
				</div>
			</div>
		`;
		this.bindEvents();
		return this.element;
	}
}
