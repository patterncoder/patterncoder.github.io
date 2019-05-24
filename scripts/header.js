import { App } from './app.js'
import { CustomObject } from './customObject.js'
import { Db } from './db.js'
import { Path } from './path.js'

export class Header extends CustomObject {
	constructor(options) {
		super(options);
		this.render();
	}

	static get numButtons() {
		return App.numHeaderButtons || (App.isSmallScreen ? 2 : 5);
	}

	static get properties() {
		return [
			'backgroundColor',
			'buttons',
			'color',
			'element',
			'handler',
			'icon',
			'menu',
			'path',
			'title'
		];
	}

	get backgroundColor() {
		return this._backgroundColor = this._backgroundColor || '';
	}
	set backgroundColor(backgroundColor) {
		this._backgroundColor = backgroundColor;
		this.render();
	}
	get buttons() {
		return this._buttons = this._buttons || [];
	}
	set buttons(buttons) {
		this._buttons = buttons;
		this.render();
	}
	get breadcrumbs() {
		return this._breadcrumbs = this._breadcrumbs || [];
	}
	set breadcrumbs(breadcrumbs) {
		this._breadcrumbs = Array.isArray(breadcrumbs) ? breadcrumbs : [breadcrumbs];
		this.render();
	}
	get color() {
		return this._color = this._color || '';
	}
	set color(color) {
		this._color = color;
		this.render();
	}
	get menu() {
		return this._menu = this._menu;
	}
	set menu(menu) {
		this._menu = menu;
		this.render();
	}
	get icon() {
		return this._icon = this._icon || null;
	}
	set icon(icon) {
		this._icon = icon;
		this.render();
	}
	get numButtons() {
		return this.constructor.numButtons
	}
	get path() {
		return this._path = this._path || [];
	}
	set path(path) {
		this._path = path;
		this.render();
	}
	get title() {
		return this._title = this._title || '';
	}
	set title(title) {
		this._title = title;
		this.render();
	}

	bindEvents() {
		if (!this.handler) {
			return;
		}
		this.bind('.slds-breadcrumb__item', 'click', (event, index) => this.handler('breadcrumb', this.breadcrumbs[index]));
		this.bind('.slds-container--right > .slds-button-group > button', 'click', (event, index) => {
			this.handler('action', this.buttons[index])
		});
		this.bind('.slds-dropdown-trigger_click', 'click', event => {
			event.stopPropagation();
			event.currentTarget.classList.toggle('slds-is-open');
		});
		this.bind('body', 'click', event => {
			document.body.classList.remove('menu-is-open');
			Array.from(this.element.querySelectorAll('.slds-dropdown-trigger_click')).map(element => element.classList.remove('slds-is-open'));
		}, document);
		this.bind('.menu-panel.slds-dropdown-trigger_click', 'click', () => document.body.classList.toggle('menu-is-open'));
		this.bind('.menu.slds-dropdown-trigger_click ul li', 'click', (event, index) => this.handler('menu', this.menu[index], event));
		this.bind('.slds-button_last.slds-dropdown-trigger_click ul li', 'click', (event, index) => this.handler('action', this.buttons[index + this.numButtons]));
		this.bind('.slds-media__figure .slds-icon__container > *, .slds-page-header__title', 'click', () => this.handler('title', this));
	}

	render() {
		document.body.classList.remove('menu-is-open');
		if (!this.element) {
			return;
		}
		this.element.id = this.element.id || `id${new Date().getTime()}${Math.random()}`.replace('.', '');
		this.element.innerHTML = (this.title || this.icon) ? `
			<style>
				body > header {
					z-index: 10000;
				}
				#${this.element.id} .slds-page-header {
					${this.backgroundColor ? `background-color: ${this.backgroundColor};` : ''}
					border: 0;
					border-radius: 0;
					box-shadow: none;
					${this.color ? `color: ${this.color};` : ''}
					padding: .5em;
					height: 60px;
				}
				#${this.element.id} .slds-page-header *:not(.button-group) > *:not(.button-group-dropdown) > button,
				#${this.element.id} .slds-page-header *:not(.button-group) > *:not(.button-group-dropdown) > button:hover {
					border: 0;
					box-shadow: none;
					${this.color ? `color: ${this.color};` : ''}
					outline: none;
				}
				#${this.element.id} .slds-page-header button.slds-icon_container[disabled] {
					opacity: .2;
				}
				#${this.element.id} .slds-page-header .slds-media__figure {
					flex: ${this.title.trim() ? 'none' : 1};
					${this.title.trim() ? 'margin: auto .75em auto auto' : ''};
					text-align: center;
				}
				${(this.icon && !this.title.trim()) ? `
				#${this.element.id} .slds-page-header .menu {
					z-index: 1;
				}
				#${this.element.id} .slds-page-header .slds-media__figure .slds-icon__container {
					position: absolute;
					left: 0;
					right: 0;
				}
				body.menu-is-open #${this.element.id} .slds-page-header .slds-media__figure .slds-icon__container {
					margin-left: 20rem;
				}
				@media(max-width: 62em) {
					body.menu-is-open #${this.element.id} .slds-page-header .slds-media__figure,
					body.menu-is-open #${this.element.id} .slds-page-header .slds-media__body {
						display: none;
					}
				}
				` : ''}
				#${this.element.id} .slds-page-header .slds-media__figure img {
					cursor: pointer;
					height: 26px;
					margin-top: .75rem;
					max-width: 50%;
					object-fit: contain;
					object-position: 50% 50%;
					padding: 0 1rem 0 1rem;
				}
				#${this.element.id} .slds-page-header .slds-media__body {
					display: flex;
					flex: ${this.title.trim() ? 1 : 'none'};
					flex-direction: column;
					justify-content: center;
				}
				#${this.element.id} .slds-page-header .slds-grid {
					flex-wrap: nowrap;
				}
				#${this.element.id} .slds-page-header nav a {
					${this.color ? `color: ${this.color};` : ''}
					cursor: default;
					font-weight: 400;
					text-decoration: none;
				}
				#${this.element.id} .slds-page-header .slds-page-header__title {
					margin: auto;
					max-width: 100%;
					overflow: hidden;
					text-overflow: ellipsis;
					white-space: nowrap;
				}
				#${this.element.id} .slds-dropdown {
					min-width: 4rem;
				}
				#${this.element.id} *:not(.button-group) > *:not(.button-group-dropdown) > .slds-dropdown ul {
					font-size: 1.3em;
				}
				#${this.element.id} .slds-media > .menu .slds-text-title {
					font-size: 0.9em;
				}
				#${this.element.id} .slds-media > .menu .slds-dropdown ul li a {
					color: #2f4b76 !important;
				}
				#${this.element.id} .path {
					overflow: auto;
					width: ${(!App.isSmallScreen && (this.path.length > 0)) ? '640px' : 'auto'};
				}
				#${this.element.id} .slds-spinner {
					margin-top: -30px;
					left: initial;
					right: 0;
					top: initial;
				}
				body.menu-is-open {
					margin-left: 20rem;
				}
				#${this.element.id} .slds-page-header .menu-panel .slds-dropdown {
					height: 100%;
					left: 0;
					margin: 0;
					padding: 0;
					position: fixed;
					top: 0;
				}
				#${this.element.id} .slds-page-header .menu-panel .slds-panel {
					display: flex;
					flex-direction: column;
				}
				#${this.element.id} .slds-page-header .menu-panel .slds-panel .slds-panel__header {
					color: #2f4b76 !important;
					flex: none;
					padding: .75rem;
				}
				#${this.element.id} .slds-page-header .menu-panel .slds-panel .slds-panel__header .slds-icon__container {
					${this.backgroundColor ? `background-color: ${this.backgroundColor};` : ''}
					${this.color ? `color: ${this.color};` : ''}
					height: fit-content;
					margin: .25rem;
				}
				#${this.element.id} .slds-page-header .menu-panel .slds-panel .slds-panel__header h2 {
					margin: .25rem;
					text-align: left;
				}
				#${this.element.id} .slds-page-header .menu-panel .slds-panel .slds-panel__header h2 .subtitle {
					font-size: .8em;
				}
				#${this.element.id} .slds-page-header .menu-panel .slds-panel .slds-panel__body {
					flex: 1;
					overflow: auto;
					padding: 0 0 1rem 0;
				}
				#${this.element.id} .slds-page-header .menu-panel .slds-dropdown ul {
					height: 100%;
					max-height: none;
				}
				#${this.element.id} .slds-page-header .menu-panel .slds-dropdown ul li {
					border-bottom: 1px solid #dddbda;
				}
				#${this.element.id} .slds-page-header .menu-panel .slds-dropdown ul li[role=separator] {
					background-color: #f3f2f2;
				}
				#${this.element.id} .slds-page-header .menu-panel .slds-dropdown ul li .slds-icon {
					${this.backgroundColor ? `background-color: ${this.backgroundColor};` : ''}
					border-radius: 20%;
					${this.color ? `color: ${this.color};` : ''}
					height: 1.5rem;
					padding: .25rem;
					width: 1.5rem;
				}
				#${this.element.id} .version {
					color: #999;
					text-align: center;
					padding: .25rem;
				}
				.gvp-height-100-pct {
					height: 100%
				}
				.gvp-header-button {
					border: solid 1px #0070d2;
				}
			</style>
			<div class="slds-m-top-large slds-page-header slds-col slds-col--padded slds-large-size--1-of-1">
				<div class="slds-col slds-no-flex gvp-height-100-pct">
					<div class="slds-media slds-m-left_xx-small gvp-height-100-pct">
						${(this.menu && (this.menu.length > 0)) ? `
							<div class="menu menu-panel slds-dropdown-trigger slds-dropdown-trigger_click">
								<button class="slds-button slds-button_icon slds-m-right_small slds-button_icon slds-m-top_small" data-value="menu" aria-haspopup="true" title="Menu">
									<svg class="slds-button__icon slds-button__icon_large" aria-hidden="true">
										<use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="${Header.getSymbols('utility')}#apps" />
									</svg>
									<span class="slds-assistive-text">Menu</span>
								</button>
								<div class="slds-dropdown slds-dropdown_left slds-dropdown_medium slds-size_medium">
									<div class="slds-panel slds-size_medium slds-panel_docked slds-panel_docked-left slds-is-open" aria-hidden="false">
										${this.menuHeader ? `
											<div class="slds-panel__header">
												${this.menuHeader.icon ? `
													<span class="slds-icon__container ${this.menuHeader.icon.cssClass || ''}">
														<svg class="slds-icon slds-icon--${this.menuHeader.icon.size || 'small'}">
															<use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="${this.menuHeader.icon.url}" />
														</svg>
													</span>
												` : ''}
												<h2 class="slds-panel__header-title slds-text-heading_small slds-truncate" title="${this.menuHeader.title || ''}">
													${this.menuHeader.title || ''}
													<div class="subtitle">${this.menuHeader.subtitle || ''}</div>
												</h2>
											</div>
										` : ''}
										<div class="slds-panel__body">
											<ul class="slds-dropdown__list slds-dropdown_length-with-icon-10" role="menu">
												${(this.menu || []).map(menuItem => `
													<li class="slds-dropdown__item" role="${menuItem.role || 'presentation'}" data-value="${menuItem.value || ''}">
														<a href="javascript:void(0);" role="menuitem" tabindex="0">
															<span class="slds-truncate slds-current-color ${(menuItem.role === 'separator') ? 'slds-text-title_caps' : ((menuItem.type === 'recent') ? 'slds-text-title' : '')}" title="${menuItem.label}">
																${menuItem.icon ? `
																	<svg class="slds-icon slds-icon_x-small slds-icon-text-default slds-m-right_x-small" aria-hidden="true">
																		<use xlink:href="${menuItem.icon}"></use>
																	</svg>
																` : ''}
																${menuItem.label}
															</span>
														</a>
													</li>
												`).join('\n')}
											</ul>
										</div>
										<div class="version">${this.getLabel("Greatvines_Serenity_Mobile_App")} v${App.versionNo}</div>
									</div>
								</div>
							</div>
						` : ''}
						${this.icon ? `
							<div class="slds-media__figure">
								<span class="slds-icon__container ${this.icon.cssClass || ''}">
									${this.icon.url && this.icon.url.includes('.svg') ? `
										<svg class="slds-icon slds-icon--${this.icon.size || 'medium'}">
											<use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="${this.icon.url}" />
										</svg>
									` : `
										<img src="${this.icon.url}" />
									`}
								</span>
							</div>
						`: ''}
						<div class="slds-media__body gvp-height-100-pct">
							<div class="slds-grid slds-wrap">
								<div class="slds-page-header__title slds-align-left slds-m-right--large" title="${this.title || ''}">
									${this.title || ''}
									<nav class="slds-text-title_caps" role="navigation">
										<ol class="slds-breadcrumb ${App.isSmallScreen ? '' : 'slds-list_horizontal'} slds-line-height_reset slds-wrap">
											${this.breadcrumbs.slice(App.isSmallScreen ? -2 : -5).map(crumb => `
												<li class="slds-breadcrumb__item">
													<a href="javascript:void(0);" data-value="${(crumb && crumb.value) || crumb || ''}">
														<span>${(crumb && crumb.label) || crumb || ''}</span>
													</a>
												</li>
											`).join('\n')}
										</ol>
									</nav>
								</div>
								<div class="slds-col slds-container--right">
								<div class="slds-button-group slds-float--right" role="group">
										${this.buttons.slice(0, this.numButtons).map(button => `
											<button id="btn-${button.value}" class="${button.icon ? (button.icon.cssClass ? `
												slds-icon_container slds-icon_container_circle slds-m-around_xx-small ${button.icon.cssClass}
											` : 'slds-button slds-button_icon slds-m-around_small') : 'slds-button slds-button_outline-brand'}"
												data-value="${button.value || ''}"
												${button.disabled ? 'disabled' : ''}
												title="${button.label || ''}"
											>${button.icon ? `
												<svg class="slds-icon slds-icon--${button.icon.size || 'small'} ${button.icon.iconClass ? button.icon.iconClass : ''}" aria-hidden="true">
													<use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="${button.icon.url || button.icon}" />
												</svg>
												<span class="slds-assistive-text">${button.label || ''}</span>
											` : (button.label || '')}
											</button>
										`).join('\n')}
										${(this.buttons.length > this.numButtons) ? `
											<div class="slds-button_last slds-dropdown-trigger slds-dropdown-trigger_click">
												<button class="slds-icon_container slds-icon_container_circle slds-icon-action-more ${this.buttons.slice(0, this.numButtons).filter(b => b.icon).length ? 'slds-m-around_xx-small' : 'slds-button_icon-border-filled'}" data-value="menu" aria-haspopup="true" title="Menu">
													<svg class="slds-icon slds-icon--small" aria-hidden="true">
														<use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="${Header.getSymbols('action')}#more" />
													</svg>
													<span class="slds-assistive-text">More</span>
												</button>
												<div class="slds-dropdown slds-dropdown_right">
													<ul class="slds-dropdown__list" role="menu">
														${this.buttons.slice(this.numButtons).map(button => `
															<li class="slds-dropdown__item" role="presentation" data-value="${button.value || ''}">
																<a href="javascript:void(0);" role="menuitem" tabindex="0">
																	<button class="${button.icon ? (button.icon.cssClass ? `
																		slds-icon_container slds-icon_container_circle slds-m-around_xx-small ${button.icon.cssClass}
																	` : 'slds-button slds-button_icon slds-m-around_small') : 'slds-button slds-button_outline-brand'}"
																		data-value="${button.value || ''}"
																		${button.disabled ? 'disabled' : ''}
																		title="${button.label || ''}"
																	>${button.icon ? `
																		<svg class="slds-icon slds-icon--small" aria-hidden="true">
																			<use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="${button.icon.url || button.icon}" />
																		</svg>
																		<span class="slds-assistive-text">${button.label || ''}</span>
																	` : (button.label || '')}
																	</button>
																</a>
															</li>
														`).join('\n')}
													</ul>
												</div>
											</div>
										` : ''}
									</div>
									<div class="path slds-float--right"></div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		` : '';		
		this.pathElement = (this.path.length > 0) && new Path({
			element: this.element.querySelector('.path'),
			handler: (event, detail) => this.handler('path', detail),
			items: this.path
		});
		this.bindEvents();
		App.notificationsBadge();
	}

	async updateRecentLists() {
		let recentLists = ((typeof(Db) !== 'undefined') && (await Db._meta.get('_recentListsAndSearches') || {}).recentListsAndSearches) || [];
		this.menu = (this.menu || []).filter(menuItem => (menuItem.type !== 'recent') || (menuItem.role !== 'menuitem'));
		let startIndex = this.menu.indexOf(this.menu.filter(menuItem  => (menuItem.type === 'recent') && (menuItem.role === 'separator'))[0]);
		if (startIndex < 0) {
			return;
		}
		this.menu = this.menu.slice(0, startIndex+1).concat(recentLists.map(list => Object.assign({
			label: list.label,
			role: 'menuitem',
			type: 'recent',
			value: list
		}))).concat(this.menu.slice(startIndex+1));
	}
}
