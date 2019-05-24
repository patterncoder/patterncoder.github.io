import { Api } from './api.js'
import { App } from './app.js'
import { Auth } from './auth.js'
import { CustomObject } from './customObject.js'
import { Dashboard } from './dashboard.js'
import { Editor } from './editor.js'
import { ListView } from './listView.js'
import { GuidedTour } from './guidedTour.js'

export class Home extends CustomObject {
	constructor(options) {
		super(options);
		this.init();
	}

	bindEvents() {
		this.bind('.slds-button-group button', 'click', (event, index) =>
			this.buttonHandler(this.buttons.filter(button => !button.gvp__App_Menu__c)[index])
		);
		this.bind('.slds-section .slds-section__title .slds-section__title-action', 'click', event => {
			const expanded = event.currentTarget.closest('.slds-section')
				.classList.toggle('slds-is-open');
			event.currentTarget
				.setAttribute('aria-expanded', expanded.toString());
			event.currentTarget.closest('.slds-section')
				.querySelector('.slds-section__content')
				.setAttribute('aria-hidden', (!expanded).toString());
		});
		this.bind('.slds-section .slds-section__title .section-add-button', 'click', (event, index) =>
			new Editor({
				element: this.nav.push(document.createElement('div')),
				nav: this.nav,
				type: this.listViews[index].type,
				onPop: this.listViews[index].refresh.bind(this.listViews[index])
			})
		);
	}

	buttonHandler(button) {
		if (!button) {
			return;
		}
		let data = Object.assign({}, Auth.auth, {
			instanceUrl: (Auth.auth || {}).instance_url,
			sessionId: (Auth.auth || {}).access_token,
			instanceurl: (Auth.auth || {}).instance_url,
			sessionid: (Auth.auth || {}).access_token
		});
		App.navigateToUrl({
			external: button.gvp__External_URL__c,
			title: button.Name,
			url: eval('`' + button.gvp__Link_URL__c.replace(/(\{\{)([^\{\}]+)(\}\})/g, '${data.$2}') + '`')
		});
		if (button.gvp__App_Menu__c) {
			document.body.classList.remove('menu-is-open');
			Array.from(App.globalNav.element.querySelectorAll('.menu-panel.slds-dropdown-trigger_click')).map(element => element.classList.remove('slds-is-open'));
		}
	}

	async init() {
		await this.refresh();
		if (window.localStorage && window.localStorage.getItem('tour-main-navigation') !== 'shown') {
			GuidedTour.startTour({ tourName: 'tour-main-navigation'});
			window.localStorage.setItem('tour-main-navigation', 'shown');
		}
	}

	async refresh(options) {
		this.spinner();
		CustomObject.labels = await Api.labels();
		let user = await Api.user();
		this.buttons = (user && ((await Home.fetchSettings({
			all: true,
			criteria: [
				['gvp__Geography_Key_2__c', user.gvp__Geography_Key__c],
				['gvp__Profile_Id__c', user.ProfileId],
				['gvp__Target_Device__c', App.isSmallScreen ? 'phone' : 'tablet']
			],
			defaultSettings: null,
			type: 'gvp__Settings_Home_Buttons__c'
		}))) || []).sort((b1, b2) => (b1.gvp__Order_Number__c || 0) - (b2.gvp__Order_Number__c || 0));
		this.lists = (await Api.fetchAll('gvp__Home_List__mdt'))
			.filter(list => !App.blacklistedObjects.includes(list.gvp__API_Object_Name__c))
			.sort((l1, l2) => (l1.gvp__Order_Number__c || 0) - (l2.gvp__Order_Number__c || 0));
		for (let list of this.lists) {
			let response;
			try {
				response = await Api.request(`/sobjects/${list.gvp__API_Object_Name__c}/listviews`);
			} catch(error) {
				App.error(`${list.Label}: ${((error && error.errors) || []).map(error => error.message).join(',')}`);
			}
			list.type = response && response.sobjectType;
			list.description = list.type && (await Api.describe(list.type));
			const listviews = (response && response.listviews) || [];
			const listview = listviews.find(listview => [
				listview.developerName,
				listview.id,
				listview.label
			].includes(list.gvp__List_View_Name__c));
			list.id = listview && listview.id;
			list.label = (listview && listview.label) || list.Label;
		}
		this.lists = this.lists.filter(list => list.id && list.type);
		Home.trackPageview('/Home');
		this.render();
	}

	render(options) {
		options = options || {};
		this.element.innerHTML = `
			<style>
				body {
					background-color: white;
				}
				.home .left {
					padding: 0 10px;
				}
				.home .buttons {
					padding: 1em 1em 0 1em;
					text-align: center;
				}
				.home .buttons .slds-button-group {
					display: block;
				}
				.home .buttons .slds-button-group button {
					margin: .2em;
				}
				.home .dashboard {
					background-color: white;
					overflow: auto;
					width: 100%;
				}
				.home .listviews {
					padding-top: .2rem;
				}
				.home .listviews .slds-section .slds-section__title {
					background-color: #f3f2f2;
					font-size: 1em;
					padding: .5em;
				}
				.home .listviews .slds-section .slds-section__title .slds-section__title-action {
					flex: 1;
					overflow: hidden;
					text-decoration: none;
				}
				.home .listviews .slds-section .slds-section__title .section-add-button {
					color: #666;
					height: 17px;
					margin-right: .5em;
					text-decoration: none;
				}
				.home .listviews .slds-section .slds-section__title .section-add-button svg {
					margin-top: -17px;
				}
				.home .listviews .listview-container article.slds-tile {
					background-color: ${App.secondaryColor};
					float: none;
					width: 100%;
				}
				.home .listviews .slds-section.slds-is-open .slds-section__content {
					padding-top: 0;
				}
				.home .listviews .slds-section.slds-is-open .slds-section__content .listview-container {
					margin: 0;
					overflow: auto;
				}
				.home .listviews .slds-section.slds-is-open .slds-section__content .listview-container > div {
					display: inline-block;
					margin: 1em 1em 0 0;
					width: 100%;
				}
				@media(min-width: 720px) {
					.home .listviews .slds-section.slds-is-open .slds-section__content .listview-container > div {
						width: 46%;
					}
				}
				@media(min-width: 62em) {
					.home {
						display: flex;
						flex-direction: row;
						height: 100%;
						overflow: hidden;
					}
					.home .left {
						display: flex;
						flex: 1;
						flex-direction: column;
						margin-right: 20px;
						min-width: 375px;
					}
					.home .buttons {
						flex: none;
					}
					.home .listviews {
						flex: 1;
						overflow: auto;
					}
					.home .dashboard {
						flex: none;
						margin-top: -50px;
						min-width: 470px;
						width: 40%;
					}
				}
				/* style tweaks unique to the subheader and should not apply to the blue logo bar! */
				div.nav .slds-page-header__title, div.nav .slds-container--right button.slds-m-around_small {
					margin-top: .4rem
				}
			</style>
			<div class="home">
				<div class="left">
					<div class="buttons">
						<div class="slds-button-group" role="group">
							${(this.buttons || []).filter(button => !button.gvp__App_Menu__c)
								.map(button => `
									<button class="slds-button slds-button_neutral">${button.Name}</button>
								`).join('\n')
							}
						</div>
					</div>
					<div class="listviews">
						${this.lists.map((list, index, lists) => `
							<div class="slds-section">
								<h3 class="slds-section__title">
									<button aria-controls="section-content-${list.id}" aria-expanded="${index === (lists.length-1)}" class="slds-button slds-section__title-action">
										<svg class="slds-section__title-action-icon slds-button__icon slds-button__icon_left" aria-hidden="true">
											<use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="${Home.getSymbols('utility')}#down" />
										</svg>
										<span class="slds-current-color slds-text-title_caps slds-truncate" title="${list.label}">${list.label}</span>
									</button>
									<button class="slds-button section-add-button ${!list.description.createable ? 'slds-hidden' : ''}">
										<svg class="slds-button__icon">
											<use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="${Home.getSymbols('utility')}#add" />
										</svg>
									</button>
								</h3>
								<div aria-hidden="${index !== (lists.length-1)}" class="slds-section__content" id="section-content-${list.id}"></div>
							</div>
						`).join('\n')}
						</ul>
					</div>
				</div>
				<div class="dashboard"></div>
			</div>
		`;
		this.listViews = (this.lists || []).map(list =>
			new ListView({
				element: this.element.querySelector(`#section-content-${list.id}`),
				id: list.id,
				label: list.label,
				limit: list.gvp__Number_Of_Items_To_Show__c,
				menus: [],
				nav: this.nav,
				type: list.type,
				displayFormat: 'tiles',
				showNull: true,
			})
		);
		this.dashboard = new Dashboard({
			element: document.querySelector('.dashboard'),
			inline: true,
			location: 'Mobile_Home'
		});
		this.bindEvents();
		this.updateAppMenu();
		return this.element;
	}

	async updateAppMenu() {
		let menu = App.globalNav.header.menu;
		let startIndex = menu.indexOf(menu.filter(menuItem => (menuItem.type === 'recent') && (menuItem.role === 'separator'))[0]) - 1;
		if (startIndex < 0) {
			startIndex = menu.indexOf(menu.filter(menuItem => menuItem.value === 'logout')[0]) - 1;
		}
		if (startIndex < 0) {
			startIndex = 0;
		}
		App.globalNav.header.menu = menu.slice(0, startIndex+1).concat(
			this.buttons.filter(button => button.gvp__App_Menu__c)
				.map(button => Object.assign({
					icon: `${Home.getSymbols('custom')}#custom9`,
					label: button.Name,
					role: 'menuitem',
					type: 'button',
					value: button
				}))
		).concat(menu.slice(startIndex+1));
	}
}
