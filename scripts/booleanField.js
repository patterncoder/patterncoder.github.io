import { Checkbox } from './checkbox.js'
import { Field } from './field.js'

export class BooleanField extends Field {
	constructor(options) {
		super(options);
		this.checkbox = new Checkbox({
			element: this.element,
			handler: (event, v) => {
				switch(event) {
					case 'valueChange':
						this.value = v.value;
						break;
				}
			},
			label: this.label,
			readOnly: this.readOnly,
			value: [true, false].includes(this.value) ? this.value : (this.defaultValue || false)
		});
	}
	get modified() {
		return this.checkbox.modified;
	}

	render() {
		return this.checkbox && this.checkbox.render();
	}
}
