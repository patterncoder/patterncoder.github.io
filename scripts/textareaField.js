import { Field } from './field.js'
import { Textarea } from './textarea.js'

export class TextareaField extends Field {
	constructor(options) {
		super(options);
		this.textarea = new Textarea({
			element: this.element,
			handler: (event, v) => {
				switch(event) {
					case 'valueChange':
						this.value = v.value;
						break;
				}
			},
			label: this.label,
			placeholder: this.label,
			readOnly: this.readOnly,
			required: this.required,
			value: this.value
		});
	}

	get modified() {
		return this.textarea && this.textarea.modified;
	}

	get valid() {
		return this.textarea ? this.textarea.valid : true;
	}

	render() {
		return this.textarea && this.textarea.render();
	}
}
