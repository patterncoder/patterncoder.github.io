class CustomElement extends HTMLElement {
	constructor(mode) {
		super();
		this._rootElement = this.attachShadow({ mode: 'open' });
		this.constructor.observedAttributes.forEach((a) => {
			Object.defineProperty(this, a, {
				configurable: false,
				enumerable: true,
				get: () => this.hasOwnProperty(`_${a}`) ? this[`_${a}`] : this.getAttribute(a),
				set: (newValue) => this.setAttribute(a, this[`_${a}`] = newValue),
				writeable: true
			})
		});
	}

	attributeChangedCallback(name, oldValue, newValue, namespaceURI) {
		let value = this.constructor.getText(newValue);
		if (newValue !== value) {
			this.setAttribute(name, value);
		} else {
			this.render();
		}
		this.raiseEvent('attributeChanged', { args: arguments, item: this });
	}
	connectedCallback() {
		this.render();
	}

	static get observedAttributes() {
		return [];
	}

	static create(data) {
		data = data|| {};
		let element = document.createElement(this.element);
		Object.assign(element, data);
		return element;
	}

	static getIcon(icon) {
		return {
			back: '&#xab;',
			calendar: '&#x1f4c5',
			check: '&#x2714;',
			close: '&#x2718;',
			cut: '&#x2702;',
			downArrow: '&#x25BC;',
			edit: '&#x270e;',
			fav: '&#x2605;',
			message: '&#x2709;',
			music: '&#x266b;',
			refresh: '&#x21bb;',
			search: `&#128270;`,
			select: '&#xbb;',
			smile: '&#x263a;',
			remove: '&#x2718;',
			unfav: '&#x2606;',
			upArrow: '&#x25B2;',
		}[icon] || icon || '';
	}

	static getText(value) {
		if ([null, undefined].indexOf(value) >= 0) {
			return value;
		}
		let el = document.createElement('div');
		el.innerHTML = value;
		return el.textContent;
	}

	bind(elements, events, handler) {
		elements = (typeof(elements) === 'string') ? Array.from(this._rootElement.querySelectorAll(elements)) : elements;
		if (elements && events && handler) {
			elements = Array.isArray(elements) ? elements : [ elements ];
			events = Array.isArray(events) ? events : [ events ];
			events.forEach((event) => elements.forEach((element) => element.addEventListener(event, handler)));
		}
	}

	getAttribute(attribute) {
		return this.constructor.getText(super.getAttribute(attribute));
	}

	raiseEvent(event, detail, rawEvent) {
		if (rawEvent) {
			rawEvent.stopPropagation();
		}
		this.dispatchEvent(new CustomEvent(event, { detail: detail }));
	}

	render() {}

	setAttribute(attribute, value) {
		if ([null, undefined].indexOf(value) >= 0) {
			super.removeAttribute(attribute);
		} else {
			super.setAttribute(attribute, this.constructor.getText(value).substr(0, 255));
		}
	}

	toObject() {
		return Object.getOwnPropertyNames(this)
			.filter((prop) => typeof(this[prop]) !== 'function')
			.reduce(
				(o, prop) => {
					o[prop] = this[prop];
					return o;
				}, {}
			);
	}
}
