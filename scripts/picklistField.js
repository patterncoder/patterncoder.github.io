import { Field } from './field.js'
import { List } from './list.js'

export class PicklistField extends Field {
	constructor(options) {
		super(options);
		this.values = this.value ? this.value.split(';') : [];
		this.values.filter(value => !this.picklistValues.filter(pv => pv.value === value)[0])
			.forEach(value => this.picklistValues.push({ label: this.getLabel(value), value: value }))
		this.list = new List({
			collapsed: true,
			collapsible: !this.disabled,
			element: this.element,
			handler: (event, v) => {
				switch(event) {
					case 'inputChange':
						this.search(v);
						break;
					case 'valueChange':
						this.value = v.value;
						break;
				}
			},
			label: this.label,
			items: this.picklistValues,
			multiselect: ((this.type === 'multipicklist') || this.isSearch) || this.multiselect,
			placeholder: this.isSearch ? this.getLabel('All') : this.getLabel(this.multiselect ? 'Choose_Generic' : 'Choose'),
			required: this.required,
			searchable: this.restrictedPicklist === false,
			value: this.isSearch ? null : (this.values || pv.defaultValue)
		});
	}

	get modified() {
		return this.list.modified;
	}
	get value() {
		return this._value;
	}
	set value(value) {
		let valueChanged = JSON.stringify(this.value) !== JSON.stringify(value);
		if (valueChanged) {
			this._value = value;
			if (this.list) {
				this.list.value = this.value;
				this.search((this.value && this.value.label) || '');
			}
			if (this.handler) {
				this.handler('valueChange', this);
			}
		}
	}

	render() {
		return this.list && this.list.render();
	}

	async search(searchString) {
		searchString = (searchString || '').trim();
		if (searchString && this.list.searchable) {
			let lowerCaseSearchString = searchString.toLowerCase();
			let exactMatch = this.picklistValues.find(pv => pv.label.toLowerCase().trim() === lowerCaseSearchString);
			this.list.items = this.picklistValues.filter(pv => pv.label.toLowerCase().includes(lowerCaseSearchString));
			if (!exactMatch) {
				this.list.items = this.list.items.concat([{
					label: searchString,
					value: searchString
				}]);
			}
		} else {
			this.list.items = this.picklistValues;
		}
		this.list.render();
	}
}
