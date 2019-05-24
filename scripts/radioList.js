import { CustomList } from './customList.js'

export class RadioList extends CustomList {
	bindEvents() {
		this.bind('.slds-radio', 'click', (event) => {
			if (!event.currentTarget.querySelector('input[type="radio"][readonly]')) {
				this.value = event.currentTarget.querySelector('input[type="radio"]').value;
			}
		});
	}

	render() {
		this.element.classList.add('slds-scope');
		this.element.innerHTML = `
			<style>
				.radio-group {
					display: inline-block;
				}
				.radio-group.invalid {
					border: 1px solid red;
				}
			</style>
			<div class="slds-form-element slds-m-around_small">
				<label class="slds-form-element__label ${!this.label ? 'slds-hidden' : ''}">${this.label}</label>
				<div class="slds-form-element__control">
					<div class="radio-group ${(this.required && !this.value) ? 'invalid' : ''}">
						${(this.items || []).map(item => `
							<span class="slds-radio">
								<input type="radio" id="yesno-${this.id}-${item.value}" name="yesno-${this.id}" value="${item.value}" ${this.value === item.value ? 'checked' : ''} ${this.readOnly ? 'readonly disabled' : ''} ${this.required ? 'required' : ''} />
								<label class="slds-radio__label" for="yesno-${this.id}-${item.value}">
									<span class="slds-radio_faux"></span>
									<span class="slds-form-element__label">${this.getLabel(item.label)}</span>
								</label>
							</span>
						`).join('\n')}
					</div>
      			</div>
      		</div>
		`;
		this.bindEvents();
		return this.element;
	}
}
