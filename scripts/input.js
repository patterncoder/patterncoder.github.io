import { App } from './app.js'
import { CustomElement } from './customElement.js'

export class Input extends CustomElement {
	static get properties() {
		return super.properties.concat([
			'placeholder',
			'readOnly',
			'required',
			'selectionEnd',
			'selectionStart',
			'type'
		]);
	}

	get displayValue() {
		switch(this.type) {
			case 'date':
				if (this.value) {
					const dateValue = new Date(this.value.replace('+0000', 'Z'));
					const localDateISOString = dateValue.toISOString().substr(0, 10);
					return localDateISOString;
				}
			case 'datetime-local':
				if (this.value && (this.value.includes('Z') || this.value.includes('+')) && this.input && (this.input.type === 'datetime-local')) {
					const dateValue = new Date(this.value.replace('+0000', 'Z'));
					const timezoneOffset = dateValue.getTimezoneOffset() * 60 * 1000;
					const localDate = new Date(dateValue.getTime() - timezoneOffset);
					return localDate.toISOString().substr(0, 16);
				}
				return (this.value && this.value.substr(0, 16)) || '';
			default:
				return this.constructor.getText(this.value);
		}
	}

	get input() {
		return this.element.querySelector('input');
	}

	get valid() {
		return this.input.checkValidity();
	}

	bindEvents() {
		this.bind('input', [ 'change', 'keyup' ], (() => {
			let timer;
			return (event) => {
				let input = event.currentTarget;
				if (timer) {
					clearTimeout(timer);
				}
				timer = setTimeout(() => {
					let newValue = input.value;
					if (newValue && !(newValue.includes('Z') || newValue.includes('+')) && this.input && (this.input.type === 'datetime-local')) {
						const timezoneOffset = new Date().getTimezoneOffset();
						const dateValue = new Date(`${newValue}${(timezoneOffset >= 0) ? '-' : '+'}${Math.floor(timezoneOffset/60).toString().padStart(2, '0')}:${(timezoneOffset % 60).toString().padStart(2, '0')}`);
						newValue = dateValue.toISOString();
					}
					if (this.value !== newValue) {
						this.modified = true;
						this.value = newValue;
					}
					if (this.handler && (event.which === 13)) {
						this.handler('pressEnter', this);
					}
				}, 500);
			};
		})());
		this.bind('input[type=number]', 'keydown', event => {
			switch (event.key) {
				case '+':
				case 'E':
				case 'e':
					event.preventDefault();
					break;
				case '-':
					if (this.min && (Number(this.min) >= 0)) {
						event.preventDefault();
					}
					break;
				case '.':
					if (this.step && (Math.floor(Number(this.step)) === this.step)) {
						event.preventDefault();
					}
					break;
			}
		});
		this.bind('.slds-icon_container', 'click', () => this.handler && this.handler('iconSelect', this));
	}

	isSelected(item) {
		return this.values.filter((v) => v.value && (v.value === (item && item.value))).length > 0;
	}

	renderFormElement() {
		return `
			<div class="slds-form-element__control">
				<div class="slds-combobox__form-element slds-input-has-icon slds-input-has-icon_right" role="none">
					<input type="${this.type || 'text'}" class="slds-input slds-combobox__input" id="combobox-${this.id}" aria-controls="input-${this.id}" autocomplete="off" role="textbox" ${![undefined, null].includes(this.max) ? `max="${this.max}"` : ''} ${![undefined, null].includes(this.min) ? `min="${this.min}"` : ''} placeholder="${this.placeholder || ''}" ${this.readOnly ? 'readonly' : ''} ${this.required ? 'required' : ''} ${(this.type === 'number') ? `step=${this.step || 'any'}` : ''} value="${this.displayValue || ''}" />
					${this.renderIcon()}
				</div>
			</div>
		`;
	}

	renderIcon() {
		let iconType = '';
		switch(this.type) {
			case 'search':
				iconType = 'search';
				break;
		}
		return iconType ? `
			<span class="slds-icon_container slds-icon-utility-down slds-input__icon slds-input__icon_right" title="${this.placeholder}">
				<svg class="slds-icon slds-icon_x-small slds-icon-text-default" aria-hidden="true">
					<use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="${Input.symbols}#${iconType}" />
				</svg>
				<span class="slds-assistive-text">${this.placeholder}</span>
			</span>
		` : '';
	}

	render() {
		let hasFocus = this.input === document.activeElement;
		if (this.input && (['search', 'tel', 'text'].indexOf(this.type) >= 0)) {
			this.selectionStart = this.input.selectionStart;
			this.selectionEnd = this.input.selectionEnd;
		}
		this.element.classList.add('slds-scope');
		if (hasFocus && !this.valid) {
			(this.element.querySelector('.form-element-message') || {}).innerHTML = this.message || '';
			return;
		}
		this.element.innerHTML = `
			<style>
				.slds-input {
					background-color: ${App.secondaryColor} !important;
				}
				.slds-input .slds-form-element__label {
					font-size: .9rem !important;
				}
				.slds-input[type=text] {
					min-width: 15rem;
					padding-left: .75rem;
				}
				.slds-input[type=number] {
					min-width: 10rem;
					padding-right: .75rem;
				}
				input.slds-input::placeholder {
					color: #ddd;
				}
				input:invalid {
					border: 1px solid red;
				}
				input[readonly] {
					background-color: initial !important;
					padding-left: 0 !important;
				}
				.slds-combobox_container input[readonly] {
					padding-left: .75em !important;
				}
				.slds-form-element > .form-element-message {
					color: red;
				}
			</style>
			<div class="slds-form-element slds-m-around_small">
				<label class="slds-form-element__label ${!this.label ? 'slds-hidden' : ''}" for="${this.id}">${this.label}</label>
				${this.renderFormElement()}
				<div class="form-element-message">${this.message || ''}</div>
			</div>
		`;
		this.bindEvents();
		
		if (this.input && hasFocus && (['number', 'search', 'tel', 'text'].indexOf(this.type) >= 0)) {
			this.input.focus();
			if (this.type === 'number') {
				this.input.type = 'text';
				this.selectionStart = this.selectionEnd = this.input.value.length;
			}
			this.input.setSelectionRange(this.selectionStart || 0, this.selectionEnd || 0);
			if (this.type === 'number') {
				this.input.type = 'number'
			}
		}
		return this.element;
	}
}
