import { Header } from './header.js'

export class Nav {
	constructor(element, options) {
		options = options || [];
		this.element = element || document.body.appendChild(document.createElement('div'));
		this.element.classList.add('nav');
		this.header = options.header || this.element.querySelector('header');
		this.element.innerHTML = `
			<style>
				.nav {
					display: flex;
					flex-direction: column;
					height: 100%;
				}
				.nav > header, .nav footer {
					flex:none;
				}
				.nav > section {
					display: flex;
					flex: 1;
					flex-direction: row;
					overflow: auto;
				}
				.nav > section > * {
					flex: 2;
					max-height: 100%;
					overflow: auto;
					width: 100%;
				}
				.nav > section > *:first-child {
					flex: 1;
				}
				.nav > section > *:not(:first-child):not(:last-child) {
					display: none;
				}
				.nav > section > *:only-child {
					max-width: 33%;
				}
				@media (max-width: ${options.split || 100000}px) {
					.nav > section > *:not(:last-child) {
						display: none;
					}
					.nav > section > *:only-child {
						max-width: initial;
					}
				}
			</style>
			<header></header>
			<section></section>
			<footer></footer>
		`;
		if (this.header) {
			this.element.replaceChild((this.header.element || this.header), this.element.querySelector('header'));
		}
		this.navElement = this.element.querySelector('section');
	}

	get current() {
		return this.navElement.lastChild;
	}
	get empty() {
		return this.views.length  === 0;
	}
	get footer() {
		return this.element.querySelector('footer').innerHTML;
	}
	set footer(footer) {
		this.element.querySelector('footer').innerHTML = footer;
	}
	get views() {
		return Array.from(this.navElement.childNodes);
	}
	// used to inspect the current state of the header
	getHeader() {
		return this.header;
	}

	pop() {
		const poppedOptions = this.options ? this.options.pop() : {};
		this.updateHeader();
		const element = this.navElement.lastChild && this.navElement.lastChild.remove();
		if (poppedOptions && poppedOptions.onPop) {
			poppedOptions.onPop();
		}
		return element;
	}

	push(view, options) {
		options = options || {};
		const viewIndex = this.views.indexOf(view);
		if (this.options && (viewIndex >= 0)) {
			this.options.splice(viewIndex, 1);
		}
		this.options = (this.options || []).concat([this.updateOptions(options)]);
		this.updateHeader();
		return this.navElement.appendChild(view);
	}

	updateHeader() {
		if (!(this.header instanceof Header)) {
			return;
		}
		let options = (this.options && this.options.slice(-1)[0]) || {};
		Object.assign(this.header, this.updateOptions(options));
		this.header.updateRecentLists();
	}

	updateOptions(options) {
		return [
			'backgroundColor',
			'breadcrumbs',
			'buttons',
			'color',
			'handler',
			'icon',
			'menu',
			'path',
			'title',
			'onPop'
		].reduce((result, option) => {
			result[option] = (options[option] !== undefined) ? options[option] : (this.header && this.header[option]);
			return result;
		}, {});
	}

	replace(view, options) {
		this.pop();
		return this.push(view, options);
	}
}
