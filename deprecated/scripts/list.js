class List extends CustomElement {
	constructor(mode) {
		super();
		this._rootElement.innerHTML = `
			<style type="text/css">
				@import url('../style/salesforce-lightning-design-system.min.css')
			</style>
			<style type="text/css">
				a {
					color: blue;
					text-decoration: none;
				}

				article {
					align-items: flex-start;
					cursor: pointer;
					display: flex;
					flex: none;
					flex-direction: row;
					line-height: 1em;
					width: 100%;
				}

				header {
					font-weight: bold;
				}
				header, footer {
					background-color: #DDDDDD;
					flex: none;
				}

				article figure, article nav {
					flex: none;
					min-width: 1.5em;
					text-align: center;
				}
				article > section {
					display: block !important;
					overflow: hidden;
					text-overflow: ellipsis;
					white-space: nowrap;
				}

				nav > input {
					max-width: 10em;
				}

				figure, nav {
					display: inline-block;
					margin: 0;
				}

				figure {
					padding: .25em 0;
				}

				figure img {
					cursor: pointer;
					max-width: 100%;
					object-fit: contain;
					object-position: left;
				}

				figCaption {
					display: none;
				}

				section {
					box-sizing: border-box;
					flex: 1;
					height: 100%;
					overflow: auto;
				}
				section:not([inline]) {
					display: flex;
					flex-direction: column;
					margin: 0 .25em;
					padding: .25em 0;
				}
				section[inline] a-list {
					display: inline-block;
					max-width: 25%;
					vertical-align: middle;
				}

				input, textarea {
					box-sizing: border-box;
					font-size: inherit;
				}
				section > input, textarea {
					width: 100%;
				}
			</style>
			<section class="slds-scope"></section>
		`;
		this._element = this._rootElement.querySelector('section');
	}

	static get element() {
		return 'a-list';
	}

	static get observedAttributes() {
		return [
			'action',
			'data',
			'icon',
			'image',
			'inline',
			'input',
			'items',
			'label',
			'link',
			'multiline',
			'type',
			'value'
		];
	}

	renderAction() {
		return this.action ? `
			<nav title="${this.action || ''}">
				${this.action === 'search' ? `<input placeholder="search" type="search" value="${this.value || ''}" />` : ''}
				<figure>${List.getIcon(this.action)}</figure>
			</nav>
		` : '';
	}

	renderIcon() {
		return this.icon ? `<figure>${List.getIcon(this.icon)}</figure>` : '';
	}

	renderImage() {
		return `
			<figure>
				<img src="${this.image || ''}" title="${this.label || ''}" />
				<figCaption>${this.label}</figCaption>
			</figure>
		`;
	}

	renderInput() {
		let inputTag = this.multiline ? 'textarea' : 'input';
		return `
			<article>
				${this.renderIcon()}
				<section>
					<${inputTag} placeholder="${this.label || ''}"
						value="${this.value || ''}"
						type="${this.input || 'text'}"
					></${inputTag}>
				</section>
				${this.renderAction()}
			</article>
		`;
	}

	renderItem() {
		if (this.image) {
			return this.renderImage();
		} else if (this.input) {
			return this.renderInput();
		} else {
			return `
				<article>
					${this.renderIcon()}
					${this.renderLabel()}
					${this.renderAction()}
				</article>
			`;
		}
	}

	renderLabel() {
		return `<section style="${this.multiline ? 'white-space: normal' : ''}">
			${this.link ?
				`<a href="${this.link}" target="${this.target || 'blank'}">
					${this.label}
				</a>` : this.label
			}
		</section>`;
	}

	renderList() {
		if (this.items && (this.items.length > 0)) {
			this._element.innerHTML = `
				<header></header>
				<section ${this.inline ? 'inline' : ''}></section>
			`
			this._element.querySelector('header').innerHTML = this.renderItem();
			this._listElement = this._element.querySelector(':scope > section');
			this.items.map(this.constructor.create.bind(this.constructor)).forEach((item) => this._listElement.appendChild(item));
		} else {
			this._element.innerHTML = this.renderItem();
		}
	}

	render() {
		this.renderList();
		this.bind('header > article, section > article, section > figure', 'click', this.raiseEvent.bind(this, 'action', { action: 'select', item: this }));
		this.bind('article > figure', 'click', this.raiseEvent.bind(this, 'action', { action: this.icon, item: this }));
		this.bind('article > nav > figure', 'mousedown', (event) => {
			if (event.button !== 0) {
				return;
			}
			if (this.action === 'search') {
				this.value = event.srcElement.parentNode.querySelector('input').value;
			}
			this.raiseEvent('action', { action: this.action, item: this }, event);
		});
		let _inputChange = (event) => {
			this._value = event.srcElement.value;
			this.raiseEvent('action', { action: (event.code || event.type || 'change').toLowerCase(), item: this }, event);
		};
		let _inputChangeTimer;
		let inputChange = (event) => {
			clearTimeout(_inputChangeTimer);
			event.stopPropagation();
			_inputChangeTimer = setTimeout(() => _inputChange(event), 700);
		}
		this.bind('input, textarea', ['change', 'keyup'], inputChange);
		this.bind('input, textarea', 'keydown', (event) => {
			switch (event.code) {
				case 'Enter':
					event.srcElement.blur();
					inputChange(event);
					break;
			}
		});
		this.bind('article > nav, input', 'click', (event) => event.stopPropagation());
		Array.from(this._element.querySelectorAll(List.element)).forEach((item, index) => {
			this.bind(item, 'attributeChanged', (event) => List.observedAttributes.forEach((a) => this.items[index][a] = event.detail.item[a]));
			this.bind(item, 'action', (event) => this.raiseEvent('action', event.detail));
		});
	}
}

customElements.define(List.element, List);
