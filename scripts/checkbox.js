import { CustomElement } from './customElement.js'

export class Checkbox extends CustomElement {
	bindEvents() {
		this.bind('.slds-checkbox', 'click', (event) => {
			if (!event.currentTarget.querySelector('input[type="checkbox"][readonly]')) {
				this.modified = true;
				this.value = !event.currentTarget.querySelector('input[type="checkbox"]:checked');
			}
		});
	}

	render() {
		this.element.classList.add('slds-scope');
		this.element.innerHTML = `
			<style>
				.slds-checkbox .slds-checkbox_faux {
					height: 1.8rem !important;
					width: 1.8rem !important;
					background-color: ${typeof(App) !== 'undefined' ? App.secondaryColor : '#eef1f6'} !important;
				}
				.slds-checkbox .slds-checkbox_faux:after {
					height: .5rem !important;
					width: 1rem !important;
					top: 45% !important;
					left: 55% !important;
					border-bottom: 3px solid ${typeof(App) !== 'undefined' ? App.primaryColor : '#2f4b76'} !important;
					border-left: 3px solid ${typeof(App) !== 'undefined' ? App.primaryColor : '#2f4b76'} !important;
				}
				.slds-checkbox .slds-form-element__label {
					font-size: .9rem !important;
					display: block !important;
					color: #3e3e3e !important;
				}
			</style>
			<div class="slds-form-element slds-m-around_small">
				<div class="slds-form-element__control">
					<span class="slds-checkbox">
						<input type="checkbox" name="${this.id}" id="${this.id}" value="on" ${this.value === true ? 'checked' : ''} ${this.readOnly ? 'readonly disabled' : ''} ${this.required ? 'required' : ''} />
						<label class="slds-checkbox__label" for="${this.id}">
							<span class="slds-form-element__label">${this.getLabel(this.constructor.getText(this.label))}</span>
							<span class="slds-checkbox_faux"></span>
						</label>
					</span>
				</div>
			</div>
		`;
		this.bindEvents();
		return this.element;
	}
}
