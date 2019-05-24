import { BooleanField } from './booleanField.js'
import { InputField } from './inputField.js'
import { LookupField } from './lookupField.js'
import { PicklistField } from './picklistField.js'
import { TextareaField } from './textareaField.js'
import { DateField } from './dateField.js'

export class FieldFactory {
	static create(options) {
		options = options || {};
		switch(options.type) {
			case 'boolean':
				return new BooleanField(options);
			case 'lookup':
			case 'reference':
				return new LookupField(options);
				break;
			case 'multipicklist':
			case 'picklist':
				return new PicklistField(options);
			case 'textarea':
				return new TextareaField(options);
			case 'date':
				return new DateField(options);
			case 'datetime':
					options.enableTime = true;
					return new DateField(options);
			default:
				return new InputField(options);
		}
	}
}
