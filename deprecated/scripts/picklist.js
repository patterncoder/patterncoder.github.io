class PickList extends CustomElement {
	constructor(mode) {
		super();
	}

	static get element() {
		return 'pick-list';
	}

	static get observedAttributes() {
		return [
			'choices',
			'collapsed',
			'data',
			'icon',
			'label',
			'lookup',
			'multiple',
			'value'
		];
	}

	get renderedLabel() {
		return this.label + (this.value ? `${this.multiple ? ((this.value.length > 0) ? ` - ${this.value.length} selected` : '') : ` - ${this.choices.filter((choice) => choice.value === this.value)[0].label}`}` : '');
	}

	render() {
		let list = List.create({
			action: this.collapsed ? 'select' : '',
			data: this.data,
			icon: this.icon,
			input: this.lookup,
			label: this.renderedLabel,
			items: ((!this.collapsed && this.choices) || []).map((choice) => Object.assign({}, choice, {
				icon: (this.value === choice.value || ((this.value || []).indexOf(choice.value) >= 0)) ? (this.multiple ? 'check' : 'check') : '&nbsp;'
			}))
		});
		this._rootElement.innerHTML = '';
		this._rootElement.appendChild(list);
		this.bind('a-list', 'action', (event) => {
			switch(event.detail.action) {
				case 'change':
				case 'enter':
				case 'key':
					this.raiseEvent('search', Object.assign({
						searchString: event.detail.item._element.querySelector('input, textarea').value
					}, event.detail), event);
					break;
				case 'select':
					let value = event.detail.item.value;
					if (value) {
						if (this.multiple) {
							this.value = this.value || [];
							let filteredValue = this.value.filter((v) => v !== value);
							this.value = (this.value.length === filteredValue.length) ? this.value.concat([value]) : filteredValue;
						} else {
							this.value = value;
						}
					}
				default:
					this.raiseEvent('action', event.detail, event);
			}
		});
	}
}

customElements.define(PickList.element, PickList);
