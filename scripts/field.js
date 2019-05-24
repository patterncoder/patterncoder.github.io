import { Api } from './api.js'
import { CustomObject } from './customObject.js'

export class Field extends CustomObject {
	constructor(options) {
		super(options);
	}

	static get properties() {
		return [
			'handler',
			'label',
			'name',
			'required',
			'type',
			'value'
		];
	}

	get valid() {
		return this.readOnly || (!this.required || ([undefined, null, ''].indexOf(this.value) < 0));
	}



	get value() {
		return this._value;
	}
	set value(value) {
		let valueChanged = this.value !== value;
		this._value = value;
		if (valueChanged && this.handler) {
			this.handler('valueChange', this);
		}
	}

	static getText(field, record) {
		let value;
		let fieldSplit = field.name.split('.');
		if (fieldSplit.length === 2) {
			value = record && record[fieldSplit[0]] && record[fieldSplit[0]][fieldSplit[1]] || '';
		} else {
			value = record && record[field.name];
		}
		if ([undefined, null].indexOf(value) >= 0) {
			return Promise.resolve(this.nullString);
		}
		let text = value.toLocaleString();
		let locale = undefined;
		switch(field.type.toLowerCase()) {
			case 'currency':
				locale = { name: 'en-US',  options: { style: 'currency', currency: 'USD' } };
				return Promise.resolve(value.toLocaleString(locale.name, locale.options || {}));
			case 'date':
				if (value && (value !== this.nullString)) {
					value = this.dateToUTC(value);
				}
				locale = { name: 'en-US', options: { year: 'numeric', month: '2-digit', day: '2-digit' } };
				return Promise.resolve(value.toLocaleDateString(locale.name, locale.options || {}));
			case 'datetime':
				if (value && (value !== this.nullString)) {
					value = new Date(value.replace('+0000', 'Z'));
				}
				locale = { name: 'en-US', options: { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' } };
				return Promise.resolve(value.toLocaleDateString(locale.name, locale.options || {}));
			case 'time':
				if (value && (value !== this.nullString)) {
					value = this.dateToUTC(value);
				}
				locale = { name: 'en-US', options: { hour: '2-digit', minute: '2-digit', second: '2-digit' } };
				return Promise.resolve(value.toLocaleDateString(locale.name, locale.options || {}));
			case 'reference':
				if (value === this.nullString) {
					return Promise.resolve(value);
				}
				return this.referenceTo({ field: field, value: value })
					.then(referenceTo => {
						let cacheKey = `${referenceTo}_${value}`;
						if (this.textCache && this.textCache[cacheKey]) {
							return this.textCache[cacheKey];
						}
						return Api.query(`Select Name From ${referenceTo} Where Id = '${value}'`)
							.then((result) => {
								let text = result && result.records && result.records[0] && result.records[0].Name;
								this.textCache = this.textCache || {};
								this.textCache[cacheKey] = text;
								return text;
							});
					});
			default:
				return Promise.resolve(text);
		}
	}
}
