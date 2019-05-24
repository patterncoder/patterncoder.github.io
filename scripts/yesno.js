import { CustomElement } from './customElement.js'

export class YesNo extends CustomElement {
	bindEvents() {
		this.bind('.slds-radio_button', 'click', (event) => {
			if (!event.currentTarget.querySelector('input[type="radio"][readonly]')) {
				this.modified = true;
				this.value = event.currentTarget.querySelector('input[type="radio"]').value;
			}
		});
	}

	render() {
		this.element.classList.add('slds-scope');
		this.element.innerHTML = `
			<style>
				.slds-radio_button-group.invalid {
					border: 1px solid red;
				}
				.slds-radio_button-group .slds-form-element__label {
					font-size: .9rem !important;
				}
			</style>
			<div class="slds-form-element slds-m-around_small">
				<label class="slds-form-element__label ${!this.label ? 'slds-hidden' : ''}">${this.getLabel(this.label)}</label>
				<div class="slds-form-element__control">
					<div class="slds-radio_button-group ${(this.required && !this.value) ? 'invalid' : ''}">
						<span class="slds-button slds-radio_button">
							<input type="radio" name="yesno-${this.id}" value="yes" ${this.value === 'yes' ? 'checked' : ''} ${this.readOnly ? `readonly ${this.value !== 'yes' ? 'disabled' : ''}` : ''} ${this.required ? 'required' : ''} />
							<label class="slds-radio_button__label" for="monday">
								<span class="slds-radio_faux">${this.getLabel('Yes')}</span>
							</label>
      					</span>
						<span class="slds-button slds-radio_button">
							<input type="radio" name="yesno-${this.id}" value="no" ${this.value === 'no' ? 'checked' : ''} ${this.readOnly ? `readonly ${this.value !== 'no' ? 'disabled' : ''}` : ''} ${this.required ? 'required' : ''} />
							<label class="slds-radio_button__label" for="monday">
								<span class="slds-radio_faux">${this.getLabel('No')}</span>
							</label>
      					</span>
      				</div>
      			</div>
      		</div>
		`;
		this.bindEvents();
		return this.element;
	}
}
