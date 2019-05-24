import { CustomObject } from './customObject.js'

export class CustomElement extends CustomObject {
	constructor(options) {
		super(options);
		this.render();
	}

	static get mobile() {
		return /(iPad|iPhone|iPod|Android)/g.test(navigator.userAgent);
	}

	static get properties() {
		return [
			'element',
			'handler',
			'id',
			'label',
			'message',
			'value'
		];
	}

	get element() {
		return this._element || document.createElement('div');
	}
	set element(element) {
		this._element = element;
	}
	get id() {
		return this._id = this._id || `id${new Date().getTime()}${Math.random().toString().substr(2)}`;
	}
	set id(id) {
		this._id = id;
	}
	get message() {
		return this._message;
	}
	set message(message) {
		this._message = message;
		this.render();
	}
	get modified() {
		return this._modified ? this._modified : false;
	}
	set modified(value) {
		this._modified = value;
	}
	get value() {
		return this._value;
	}
	set value(value) {
		let valueChanged = this.value !== value;
		this._value = value;
		this.render();
		if (valueChanged && this.handler) {
			this.handler('valueChange', this);
		}
	}

	bindEvents() {}

	render() {
		this.element.classList.add('slds-scope');
		this.element.innerHTML = ``;
		this.bindEvents();
		return this.element;
	}
}
