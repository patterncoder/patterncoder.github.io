import { DatePicker } from './datepicker.js'
import { Field } from './field.js'

export class DateField extends Field {
	constructor(options) {
		super(options);
		this.datepicker = new DatePicker({
			element: this.element,
			handler: (event, v) => {
				switch(event) {
					case 'valueChange':
						this.value = v.value;
						break;
				}
			},
			label: this.label,
			enableTime: this.enableTime,
			required: this.required,
			initialValue: this.value,
			type: this.type,
			mode: this.mode
		});
	}
	get modified() {
		return this.datepicker.modified;
	}


	get valid() {
		return this.datepicker && this.datepicker.valid;
	}

	render() {
		return this.datepicker;
	}
}
