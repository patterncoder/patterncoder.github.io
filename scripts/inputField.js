import { Field } from './field.js'
import { Input } from './input.js'

export class InputField extends Field {
	constructor(options) {
		super(options);
		this.init();
	}

	get modified() {
		return this.input ? this.input.modified : this.startInput.modified || this.endInput.modified;
	}

	get valid() {
		return this.input ? this.input.valid : ((this.startInput && this.endInput) ? (this.startInput.valid && this.endInput.valid) : true);
	}

	createInput(element, label, value) {
		return new Input({
			element: element,
			handler: (event, v) => {
				switch(event) {
					case 'valueChange':
						this.value = (this.isSearch && (['date', 'datetime', 'time'].includes(this.type))) ? [
							(this.startInput && this.startInput.value), (this.endInput && this.endInput.value)
						] : v.value;
						break;
				}
			},
			label: label,
			placeholder: this.label,
			readOnly: this.readOnly,
			required: this.required,
			type: (type => {
				switch(type) {
					case 'currency':
					case 'double':
					case 'integer':
						return 'number';
					case 'date':
						return 'date';
					case 'datetime':
						return 'datetime-local';
					case 'phone':
						return 'tel';
					case 'time':
						return 'time';
					default:
						return 'text';
				}
			})((this.isSearch && (this.type === 'datetime')) ? 'date' : this.type),
			value: value
		});
	}

	init() {
		this.refresh();
	}

	refresh() {
		this.element.innerHTML = '';
		if (this.isSearch && (['date', 'datetime', 'time'].indexOf(this.type) >= 0)) {
			this.startInput = this.createInput(this.element.appendChild(document.createElement('div')), this.label, this.value && this.value[0]);
			this.endInput = this.createInput(this.element.appendChild(document.createElement('div')), 'to', this.value && this.value[1]);
		} else {
			this.input = this.createInput(this.element, this.label, this.value);
		}
	}

	render() {
		return (this.input && this.input.render()) || [
			(this.startInput && this.startInput.render()),
			(this.endInput && this.endInput.render())
		];
	}
}
