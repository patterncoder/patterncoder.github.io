import { CustomObject } from './customObject.js'
import { FieldFactory } from './fieldFactory.js'
import { Subject } from './observable.js';

export class Fieldset extends CustomObject {
	constructor(options) {
		super(options);
		this._saveable = new Subject();
		this.render();
	}

	static get properties() {
		return [
			'disabled',
			'element',
			'fields',
			'isSearch',
			'record',
			'labelLinks'
		];
	}

	get fields() {
		return this._fields || [];
	}
	set fields(fields) {
		this._fields = fields;
	}
	get modified() {
		return this.fields.find(field => field.fieldObject && field.fieldObject.modified === true) ? true : false;
	}

	get saveable() {
		return this._saveable;
	}

	get recordValue() {
		return this.fields.reduce((values, field) => {
			let value = field.fieldObject.value;
			if (value && (typeof(value) === 'object')) {
				value = value.value;
			}
			values[field.name] = value;
			return values;
		}, {});
	}
	get valid() {
		return this.fields.reduce((valid, field) => {
			// console.log(field.name, field.fieldObject.valid);
			return valid && (!field.fieldObject || field.fieldObject.valid)
		}, true);
	}
	get value() {
		return this.fields.reduce((values, field) => {
			values[field.name] = { field: field, value: field.fieldObject ? field.fieldObject.value : this.record[field.name] };
			return values;
		}, {});
	}
	get valueForSave() {
		let val = (v, t) => {
			let value = (v && v.value) || v;
			if (value && (t === 'datetime')) {
				return new Date(value.replace('+0000', 'Z')).toISOString();
			}
			return value;
		}
		let value = this.value;
		['ActivityDate', 'ActivityDateTime', 'DurationInMinutes'].forEach(key => delete this.record[key]);
		return this.fields.reduce((record, field) => {
			if (!field.readOnly) {
				let v = value[field.name];
				record[field.name] = Array.isArray(v.value) ? v.value.map(v => val(v, field.type)).join(';') : val(v.value, field.type);
			}
			return record;
		}, {});
	}

	get where() {
		let result = [];
		Object.entries(this.value).forEach(([key, filter]) => {
			let value = filter.value;
			if (value) {
				let values = (Array.isArray(value) ? value : [value]).map((value) => (value && value.value) || value);
				value = values[0];
				switch(filter.field.type) {
					case 'currency':
					case 'double':
					case 'integer':
					case 'number':
					case 'single':
						result.push(`${key} = ${value}`);
					case 'date':
						if (values[0]) {
							let lower = this.dateToUTC(values[0]);
							result.push(`${key} >= ${lower.toISOString().split('T')[0]}`);
						}
						if (values[1]) {
							let upper = this.dateToUTC(values[1]);
							let oneDay = (24 * 60 * 60 * 1000);
							upper = new Date(upper.getTime() + oneDay);
							result.push(`${key} < ${upper.toISOString().split('T')[0]}`);
						}
						break;
					case 'datetime':
						if (values[0]) {
							let lower = new Date(values[0].replace('+0000', 'Z'));
							result.push(`${key} >= ${lower.toISOString()}`);
						}
						if (values[1]) {
							let upper = new Date(values[1].replace('+0000', 'Z'));
							result.push(`${key} <= ${upper.toISOString()}`);
						}
						break;
					case 'picklist':
					case 'multipicklist':
					case 'reference':
						if (values.length > 0) {
							result.push(`${key} IN (${values.map((value) => `'${value.replace(/'/g, '\\\'')}'`).join(',')})`);
						}
						break;
					case 'string':
					case 'textarea':
						result.push(`${key} LIKE '%${value.replace(/'/g, '\\\'')}%'`);
						break;
				}
			}
		});
		return result;
	}

	async fieldHandler(event, field) {
		switch(event) {
			case 'valueChange':
				this.fields.map(f => f.fieldObject)
					.filter(f => f && f.dependentFieldChangeHandler)
					.forEach(f => f.dependentFieldChangeHandler(field));
				// if (field.name === 'IsAllDayEvent') {
				// 	const type = field.value ? 'date' : 'datetime';
				// 	['StartDateTime', 'EndDateTime'].forEach(fieldName => {
				// 		let field = this.fields.find(field => field.name === fieldName);
				// 		if (field && (field.type !== type)) {
				// 			field.type = type;
				// 			if (field.fieldObject && (field.fieldObject.type !== type)) {
				// 				field.fieldObject.type = type;
				// 				field.fieldObject.refresh();
				// 			}
				// 		}
				// 	});
				// }

				if (this.modified && this.valid) {
					this._saveable.notify(true);
					if (this.handler) {
						this.handler('fieldsetSavable');
					}
				}
				break;
			case 'labelClick':
				if (this.linkLabels) {
					this.linkLabels.handler(event, field);
				}
				break;
		}
	}

	render() {
		this.element.innerHTML = `
			<style>
				label.slds-truncate {
					display: block;
				}
				fieldset section:only-child header {
					display: none;
				}
				fieldset section > div {
					min-height: 60px;
					vertical-align: top;
				}
			</style>
			${this.label ? `<label class="slds-m-around_medium slds-truncate">${this.label}</label>` : ''}
			<fieldset ${this.disabled ? 'disabled' : ''} >
			</fieldset>
		`;
		let fieldset = this.element.querySelector('fieldset');
		let makeSection = section => {
			let sectionElement = document.createElement('section');
			sectionElement.id = `section-${section.id}`;
			return sectionElement;
		}
		let section = field => field.section ? (fieldset.querySelector(`section#section-${field.section.id}`) || fieldset.appendChild(makeSection(field.section))) : fieldset;
		const isLinkLabelField = field => field.type === 'reference' && this.linkLabels.fieldNames.includes(field.referenceTo[0]);
		const isNewButtonField = field => field.type === 'reference' && this.showNewButton.fieldNames.includes(field.name);
		this.fields.filter(field => !field.readOnly || ([undefined, null, ''].indexOf((this.record || {})[field.name]) < 0))
			.forEach(field => field.fieldObject = FieldFactory.create(Object.assign(
				field,
				{
					element: section(field).appendChild(document.createElement('div')),
					disabled: this.disabled,
					handler: this.fieldHandler.bind(this),
					isSearch: this.isSearch,
					nav: this.nav,
					objectName: this.objectName,
					value: (this.record || {})[field.name],
					linkLabel: this.linkLabels ? isLinkLabelField(field) : false,
					showNewButton: this.showNewButton && isNewButtonField(field) ? this.showNewButton : null,
					parentFieldset: this
				}
			)));
		
		return this.element;
	}
}
