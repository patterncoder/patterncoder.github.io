import { ButtonGroup } from './buttonGroup.js'
import { CustomElement } from './customElement.js'

// requires array of "tab" objects containing properties name, label, and icon
export class Tabs extends CustomElement {
	constructor(options) {
		super(options);
		this.init();
	}

	get selectedOverflowTab() {
		return this.tabs.filter((tab, index) => (index >= this.visibleTabs) && tab.selected)[0];
	}

	bindEvents() {
		this.bind('.tabs > ul[role="tablist"] > li:not([disabled]):not(.slds-tabs__item_overflow), .tabs > ul[role="tablist"] > li.slds-tabs__item_overflow ul > li:not([disabled])', 'click', async (event, index) => {
			event.stopPropagation();
			let tab = this.tabs[index];
			if (!this.handler || (await this.handler('action', tab, index) !== false)) {
				this.select(tab);
			}
		});
		this.bind('.slds-dropdown-trigger_click.slds-tabs__item_overflow', 'click', event => {
			event.stopPropagation();
			event.currentTarget.classList.toggle('slds-is-open');
		});
	}

	init() {
		window.addEventListener('resize', () => {
			clearTimeout(this.resizeTimer);
			this.resizeTimer = this.element.parentNode ? setTimeout(this.refresh.bind(this), 1000) : 0;
		});
		this.refresh();
	}

	refresh() {
		// extra small devices (portrait phones)
		let numTabs = 2;
		// small devices (landscape phones)
		if (window.matchMedia('(min-width: 480px)').matches) {
			numTabs = 2;
		}
		if (window.matchMedia('(min-width: 640px)').matches) {
			numTabs = 3;
		}
		// medium devices (tablets)
		if (window.matchMedia('(min-width: 800px)').matches) {
			numTabs = 4;
		}
		if (window.matchMedia('(min-width: 960px)').matches) {
			numTabs = 4;
		}
		// large devices (laptops, desktops)
		if (window.matchMedia('(min-width: 1120px)').matches) {
			numTabs = 5;
		}
		if (window.matchMedia('(min-width: 1280px)').matches) {
			numTabs = 5;
		}
		// extra large devices (large desktops)
		if (window.matchMedia('(min-width: 1440px)').matches) {
			numTabs = 6;
		}
		if (window.matchMedia('(min-width: 1600px)').matches) {
			numTabs = 8;
		}
		if (this.overflow === false) {
			this.numTabs = this.tabs.length;
		} else {
			this.overflow = (this.tabs.length > numTabs) ? numTabs : 0;
		}
		this.visibleTabs = numTabs;
		this.render();
	}

	render() {
		this.element.classList.add('slds-scope');
		this.element.innerHTML = `
			<style>
				.slds-tabs_default__nav {
					border-bottom: 2px solid #2f4b76;
				}
				.slds-tabs_default__item {
					padding: 0 .65rem;
					letter-spacing: .025rem;
				}
				.tabs ul li a div {
					display: inline-block;
				}
				.tabs a[aria-selected=false] .tab-label {
					max-width: 250px;
				}
				.tabs a[aria-selected=false] .tab-badge {
					max-width: 50px;
				}
				.tabs .tabs-button-group {
					margin: auto;
					margin-right: .5em;
				}
				.tabs li[disabled] a {
					color: lightgray;
				}
				.tabs li[disabled]:after {
					background-color: initial;
				}
				@media (max-width: 560px) {
					.tabs .slds-dropdown {
						max-width: 230px;
					}
				}
				@media (max-width: 1600px) {
					.tabs a[aria-selected=false] .tab-label {
						max-width: 136px;
					}
				}
				@media (max-width: 1440px) {
					.tabs a[aria-selected=false] .tab-label {
						max-width: 172px;
					}
				}
				@media (max-width: 1280px) {
					.tabs a[aria-selected=false] .tab-label {
						max-width: 186px;
					}
				}
				@media (max-width: 1120px) {
					.tabs a[aria-selected=false] .tab-label {
						max-width: 154px;
					}
				}
				@media (max-width: 960px) {
					.tabs a[aria-selected=false] .tab-label {
						max-width: 160px;
					}
				}
				@media (max-width: 800px) {
					.tabs a[aria-selected=false] .tab-label {
						max-width: 120px;
					}
				}
				@media (max-width: 640px) {
					.tabs a[aria-selected=false] .tab-label {
						max-width: 110px;
					}
				}
				@media (max-width: 480px) {
					.tabs a[aria-selected=false] .tab-label {
						max-width: 100px;
					}
				}
			</style>
			<div class="tabs slds-tabs_${this.type || 'default'}">
				<ul class="slds-tabs_${this.type || 'default'}__nav slds-wrap" role="tablist">
					${(this.tabs || []).slice(0, (this.overflow || this.numTabs)).map((tab, index) => `
						<li class="slds-tabs_${this.type || 'default'}__item ${tab.selected ? 'slds-active' : ''} ${(tab.valid !== false) ? '' : 'invalid'}"
							data-tab="${tab.name}"
							${(tab.disabled === true) ? 'disabled' : ''}
							role="presentation"
							title="${tab.label || ''} ${tab.badge || ''}"
						>
							<a class="slds-tabs_${this.type || 'default'}__link"
								role="tab"
								tabindex="${tab.selected ? 0 : -1}"
								aria-selected="${tab.selected ? true : false}"
								aria-controls="tab-default-${index}"
								data-tab="${tab.name}"
							>
								<div class="slds-truncate tab-label">${tab.label || ''}</div>
								<div class="slds-truncate tab-badge">${tab.badge || ''}</div>
							</a>
						</li>
					`).join('\n')}
					${this.overflow > 0 ? `
						<li class="slds-dropdown-trigger slds-dropdown-trigger_click slds-tabs_${this.type || 'default'}__item slds-tabs__item_overflow ${this.selectedOverflowTab ? 'slds-active' : ''}"
							title="More tabs" role="presentation"
						>
							<a class="slds-button slds-tabs_${this.type || 'default'}__link" href="javascript:void(0);" aria-haspopup="true">
								<span class="slds-truncate" title="More tabs">
									${(this.selectedOverflowTab && `${this.selectedOverflowTab.label || ''} ${this.selectedOverflowTab.badge || ''}`) || this.getLabel('More')}
									<span class="slds-assistive-text">tabs</span>
								</span>
								<svg class="slds-button__icon slds-button__icon_x-small" aria-hidden="true">
									<use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="${Tabs.symbols}#down" />
								</svg>
							</a>
							<div class="slds-dropdown slds-dropdown_${(this.visibleTabs > 1) ? 'right' : 'middle'}">
								<ul class="slds-dropdown__list slds-dropdown_length-with-icon-10" role="menu">
									${(this.tabs || []).slice(this.overflow).map(tab => `
										<li class="slds-dropdown__item" ${(tab.disabled === true) ? 'disabled' : ''} role="presentation">
											<a href="javascript:void(0);" id="${tab.name}" role="menuitem" tabindex="-1">
												<span class="slds-truncate" title="${tab.label || ''} ${tab.badge || ''}">
													${tab.icon ? `
														<svg class="slds-icon slds-icon_small ${tab.icon.cssClass} slds-m-right_small" aria-hidden="true">
															<use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="${tab.icon.url}" />
														</svg>
													` : ''}
													${tab.label || ''} ${tab.badge || ''}
												</span>
											</a>
										</li>
									`).join('\n')}
								</ul>
						   </div>
						</li>
					`: ''}
					<div class="tabs-button-group"></div>
				</ul>
			</div>
		`;
		if (this.buttons) {
			this.buttonGroup = new ButtonGroup({
				buttons: this.buttons,
				element: this.element.querySelector('.tabs-button-group'),
				handler: async (event, detail) => {
					switch(event) {
						case 'button':
						case 'menu':
							if (this.handler) {
								this.handler('button', detail);
							}
							break;
					}
				},
				margin: 'x-small',
				overflow: this.buttonsOverflow
			});
		}
		this.bindEvents();
		return this.element;
	}

	select(tab) {
		if (!tab) {
			return;
		}
		this.tabs.forEach(tab => tab.selected = false);
		let selectedTab = this.element.querySelector('ul[role="tablist"] li.slds-active');
		if (selectedTab) {
			selectedTab.classList.remove('slds-active');
		}
		if (this.selection !== false) {
			tab.selected = true;
			selectedTab = this.element.querySelector(`ul[role="tablist"] li[data-tab="${tab.name}"]`);
			if (selectedTab) {
				selectedTab.classList.add('slds-active');
				selectedTab.querySelector('a').blur();
			}
		}
		this.refresh();
	}
}
