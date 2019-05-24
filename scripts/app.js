import { AccountsNearby } from './map.js'
import { Api } from './api.js'
import { Auth } from './auth.js'
import { Content } from './content.js'
import { CustomObject } from './customObject.js'
import { Dashboard } from './dashboard.js'
import { Db } from './db.js'
import { Editor } from './editor.js'
import { Header } from './header.js'
import { Home } from './home.js'
import { Icons } from './icons.js'
import { ListViews } from './listViews.js'
import { Log } from './log.js'
import { Modal } from './modal.js'
import { Nav } from './nav.js'
import { PhotoBrowser } from './media.js'
import { Search } from './search.js'

export class App extends CustomObject {
	static get blacklistedObjects() {
		return this._blacklistedObjects = this._blacklistedObjects || [
			'AccountTeamMember',
			'gvp__Depletion__c',
			'gvp__Media__c',
			'gvp__RAD__c',
			'gvp__Shipment__c',
			'RecordType',
			'Report'
		];
	}
	static set blacklistedObjects(blacklistedObjects) {
		this._blacklistedObjects = blacklistedObjects;
	}
	static get isiOS() {
		return /(iPad|iPhone|iPod)/g.test(navigator.userAgent);
	}
	static get isSmallScreen() {
		return window.matchMedia('(max-width: 62em)').matches;
	}
	static get labelLinkTargets() {
		return ['Account', 'gvp__Account_Team__c', 'gvp__Brand__c', 'gvp__Budget__c', 'gvp__Budget_Plan__c', 'Contact',
			'gvp__Item__c', 'gvp__Label__c', 'gvp__Product_Set__c', 'gvp__Program__c'];
	}
	static get numHeaderButtons() {
		return App.isSmallScreen ? 4 : 7;
	}
	static get primaryColor() {
		return (this.mobileSettings && this.mobileSettings.gvp__Serenity_Primary_Color__c) || '#2f4b76';
	}
	static get secondaryColor() {
		return (this.mobileSettings && this.mobileSettings.gvp__Serenity_Secondary_Color__c) || '#eef1f6';
	}
	static get version() {
		return `Serenity ${this.versionNo}`;
	}

	static get versionNo() {
		return '1.6';
	}

	static async error(options) {
		options = options || {};
		let error = (typeof(options) === 'string') ? options : options.message;
		return App.notify({ icon: Icons.iconUrl('utility', 'error'), label: error, record: options.record, type: 'error' });
	}

	static goHome() {
		while(this.home && this.nav.current && (this.nav.current !== this.home.element)) {
			this.nav.pop();
		}
		if (!this.home || (this.nav.current !== this.home.element)) {
			this.nav.push((this.home = new Home({
				element: document.createElement('div'),
				nav: this.nav
			})).element, { onPop: () => {
				if (!this.nav.views.find(view => view === this.home.element)) {
					this.goHome();
				}
			} });
		}
		document.body.classList.remove('menu-is-open');
		Array.from(this.globalNav.element.querySelectorAll('.menu-panel.slds-dropdown-trigger_click')).map(element => element.classList.remove('slds-is-open'));
	}

	static async init(options) {
		options = options || {};
		CustomObject.baseUrl = options.baseUrl;
		if (options.auth) {
			Auth.auth = options.auth;
		}
		await this.registerServiceWorker();
		CustomObject.labels = await Api.labels();
		this.auth = await Auth.auth;
		this.user = await Api.user();
		let trackingID = 'UA-848428-10';
		if (((window.location && window.location.host) || '').toLowerCase().includes('localhost') ||
			(this.auth && this.auth.sandbox) ||
			((this.user && this.user.Email) || '').toLowerCase().includes('@greatvines') ||
			((this.user && this.user.CompanyName) || '').toLowerCase().includes('greatvines')
		) {
			trackingID = 'UA-848428-11';
		}
		App.initializeTracking(trackingID);
		this.mobileSettings = await CustomObject.fetchSettings({
			type: 'gvp__Settings_Mobile__c',
			criteria: [
				['gvp__Geography_Key__c', this.user.gvp__Geography_Key__c]
			],
			defaultSettings: null,
			onlyOne: true
		});
		if (this.mobileSettings.gvp__Serenity_Logo__c) {
			this.logoResource = await Api.request(`/services/apexrest/gvp/mobile/staticresource/${this.mobileSettings.gvp__Serenity_Logo__c}`);
			this.logoUrl = `data:${
				this.logoResource.ContentType
			};base64,${
				await Api.request(`/services/apexrest/gvp/mobile/staticresourcedownload/${this.mobileSettings.gvp__Serenity_Logo__c}`)
			}`;
		} else {
			this.logoUrl = `${this.baseUrl}images/logo-new.png`;
		}
		App.render();
		const favs = ((await Api.request('/ui-api/favorites')).favorites || [])
			.filter(fav => fav.targetType === 'ListView' && !App.blacklistedObjects.includes(fav.objectType))
			.reduce((items, fav) => {
				const entry = items.find(item => item.name === fav.objectType);
				if (entry) {
					entry.favorites.push(fav);
				} else {
					items.push({ name: fav.objectType, favorites: [fav] });
				}
				return items;
			}, []);
		this.myLists = new ListViews({
			items: (favs.length > 0) ? favs : [
				{ name: 'Account' },
				{ name: 'gvp__Account_Call__c' },
				{ name: 'Contact' },
				{ name: 'gvp__Account_Objective__c' },
				{ name: 'gvp__Survey__c' }
			]
		});
		if (!this.user.gvp__Online_Only__c) {
			Db.scheduleSync(60);
		}
		Log.userLog({ gvp__GV_Mobile_Last_Initialized__c: (new Date()).toISOString() });
		App.install();
		window.addEventListener('offline', () => {
			let message = `${this.getLabel('Mobile_Display_Offline')}: ${new Date().toLocaleTimeString()}`;
			if (Db.isSyncing) {
				Db.syncSuccessful = false;
				return App.error(message);
			}
			return App.info(message);
		});
		window.addEventListener('online', () => {
			let message = `${this.getLabel('Mobile_Logs_App_Online')}: ${new Date().toLocaleTimeString()}`;
			if (Db.syncSuccessful === false) {
				setTimeout(Db.sync.bind(Db), 1000);
			}
			return App.info(message);
		});
	}

	static install() {
		window.addEventListener('beforeinstallprompt', event => {
			event.preventDefault();
			App.installPrompt = event;
			if (!this.globalNav.header.buttons.find(button => button.value === 'install')) {
				this.globalNav.header.buttons = [{
					icon: `${this.getSymbols('utility')}#download`,
					label: this.getLabel('Install'),
					value: 'install'
				}, ...this.globalNav.header.buttons];
			}
		});
	}

	// invoked for both Deep and Universal Links; url always in Deep Link format
	static handleOpenURL(url) {
		console.log('App.handleOpenUrl=' + url);
		return 'OK';
	}

	static async info(info) {
		return App.notify({ icon: Icons.iconUrl('utility', 'info_alt'), label: info, type: 'info' });
	}

	static async logout() {
		if (!(await Modal.confirm({ title: this.getLabel('Mobile_Logout') }))) {
			return;
		}
		App.spinner({ blockInput: true });
		await Log.userLog({ gvp__GV_Mobile_Last_Logout__c: (new Date()).toISOString() });
		await Db.destroy();
		for (let key of await window.caches.keys()) {
			try {
				await window.caches.delete(key);
			} catch(error) {
				console.log(error);
			}
		}
		Auth.logout();
	}

	static async navigateToUrl(options) {
		options = options || {};
		let url = await this.secureUrl(options.url);
		let nav = options.nav || this.nav;
		if (!nav || (options.external !== false)) {
			return window.open(url, '_blank')
		}
		let element = document.createElement('div');
		switch(options.type) {
			case 'image':
				element.innerHTML = `<img src="${url || ''}" style="height:100%;object-fit:contain;width:100%" />`;
				break;
			default:
				element.innerHTML = `<iframe frameborder="0" src="${url || ''}" style="height:100%;width:100%" />`;
				break;
		}
		nav.push(element, {
			breadcrumbs: [],
			buttons: [{ icon: Icons.icon('Back'), label: this.getLabel('Back'), value: 'back' }],
			handler: (event, detail) => (event === 'action') && detail && (detail.value === 'back') && nav.pop(),
			icon: Icons.icon(options.icon),
			menu: [],
			title: options.title
		});
	}

	static async notify(notification) {
		if (typeof(notification) === 'string') {
			notification = { label: notification };
		}
		if (!(notification && notification.label)) {
			return;
		}
		this.notifications = [notification].concat(this.notifications || []).slice(0, 10);
		console.log(notification.label);
		Log.log(Object.assign({ severity: notification.type }, notification));
		this.notificationsBadge((this.globalNav && this.globalNav.element && this.globalNav.element.querySelector('.menu.slds-is-open')) ? 0 : 1);
		this.renderNotifications();
	}

	static notificationsBadge(count) {
		count = Number(count);
		this.notificationsBadgeCount = (isNaN(count) ? this.notificationsBadgeCount : (count ? (this.notificationsBadgeCount || 0) + count : 0));
		let notificationsButton = this.globalNav && this.globalNav.element.querySelector('button[data-value="notifications"]');
		let notificationsBadge = notificationsButton && notificationsButton.querySelector('.slds-badge');
		if (notificationsButton && !notificationsBadge && (this.notificationsBadgeCount || !Db.syncSuccessful)) {
			notificationsBadge = document.createElement('span');
			notificationsBadge.classList.add('slds-badge');
			Object.assign(notificationsBadge.style, {
				'margin-left': '-5px',
				'margin-right': '-8px',
				'position': 'relative',
				'vertical-align': 'top'
			});
			notificationsButton.appendChild(notificationsBadge);
		}
		if (notificationsBadge) {
			Object.assign(notificationsBadge.style, {
				'background-color': Db.syncSuccessful ? '#ecebea' : '#c3272f',
				'color': Db.syncSuccessful ? '#080707' : 'white'
			});
			if (!Db.syncSuccessful) {
				notificationsBadge.innerHTML = this.notificationsBadgeCount || '!';
			} else {
				notificationsButton.removeChild(notificationsBadge);
			}
		}
	}

	static async registerServiceWorker() {
		if (navigator.serviceWorker) {
			let registrations;
			try {
				registrations = await navigator.serviceWorker.getRegistrations();
			} catch(error) {
				console.log(error);
			}
			let registrationsToUnregister = (registrations || []).filter(
				registration => registration && registration.active
			);
			for (let registration of registrationsToUnregister) {
				try {
					await registration.unregister();
				} catch(error) {
					console.log(error);
				}
			}
			try {
				await navigator.serviceWorker.register(`${this.baseUrl}worker.js`);
			} catch(error) {
				console.log(error);
			}
		}
	}

	static renderBackButton() {
		let backButton = document.createElement('div');
		backButton.innerHTML = `
			<style>
				body.nav > div > button[data-value="back"] {
					color: white;
					margin-left: 3em;
					margin-top: 1.1rem;
					position: absolute;
					z-index: 100000;
				}
				button[data-value="back"]:hover {
					color: white;
				}
				body.nav > section button[data-value="back"],
				body.nav > section button[data-value="cancel"],
				body.nav > section button[data-value="mediaCancel"]  {
					display: none;
				}
			</style>
			<button class="slds-button slds-button_icon slds-m-right_small slds-button_icon slds-m-top_small" data-value="back" title="${this.getLabel('Back')}">
				<svg class="slds-button__icon slds-button__icon_large" aria-hidden="true">
					<use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="${App.getSymbols('utility')}#left" />
				</svg>
				<span class="slds-assistive-text">${this.getLabel('Back')}</span>
			</button>
		`;
		backButton.querySelector('button').addEventListener('click', () => {
			let button = this.nav.header.buttons.find(button => ['back', 'cancel', 'mediaCancel'].includes(button.value));
			if (button) {
				this.nav.header.handler('action', button);
			}
		});
		this.globalNav.element.prepend(backButton);
	}

	static render() {
		this.globalNav = new Nav(document.body, { header: this.header = new Header({
			backgroundColor: App.primaryColor,
			buttons: [
				...(this.user.gvp__Online_Only__c ? [] : [{
					icon: `${this.getSymbols('utility')}#sync`,
					label: this.getLabel('Sync'),
					value: 'notifications'
				}]),
				{
					icon: `${this.getSymbols('utility')}#search`,
					label: this.getLabel('Search'),
					value: 'search'
				}
			],
			color: 'white',
			element: document.createElement('header'),
			handler: (event, detail, evt) => {
				switch(event) {
					case 'action':
						switch(detail.value) {
							case 'install':
								if (App.installPrompt) {
									App.installPrompt.prompt();
									App.installPrompt.userChoice.then(result => {
										App.installPrompt = null;
										App.info(`User ${(result.outcome === 'accepted') ? 'accepted' : 'declined'} the install prompt`);
									});
								}
								this.globalNav.header.buttons = this.globalNav.header.buttons.filter(button => button.value !== 'install');
								break;
							case 'notifications':
								let notificationsButton = this.globalNav.element.querySelector('button[data-value="notifications"]');
								let notificationsMenu = notificationsButton.parentNode;
								if (!notificationsMenu.classList.contains('menu')) {
									notificationsMenu = document.createElement('div');
									notificationsMenu.classList.add('menu', 'slds-dropdown-trigger', 'slds-dropdown-trigger_click');
									notificationsMenu.innerHTML = `
										<style>
											.notifications.slds-dropdown {
												margin-right: -4em;
												margin-top: -.5em;
												min-width: 20rem !important;
											}
											.notifications .slds-dropdown__list {
												max-height: calc((1.5rem + 1rem) * 11);
											}
											.notifications .slds-dropdown__item[disabled] a {
												color: #dddbda;
											}
											li.slds-dropdown__item.notification span {
												font-size: 0.8rem;
												line-height: 1rem;
											}
											li.slds-dropdown__item.notification.error a span,
											li.slds-dropdown__item.sync-message.error {
												color: #c3272f !important;
											}
											li.slds-dropdown__item.notification.error svg,
											li.slds-dropdown__item.sync-message.error svg {
												fill: #c3272f !important;
											}
											li.slds-dropdown__item.notification.success a span,
											li.slds-dropdown__item.notification.sync a span,
											li.slds-dropdown__item.sync-message.success {
												color: green !important;
											}
											li.slds-dropdown__item.notification.success svg,
											li.slds-dropdown__item.notification.sync svg,
											li.slds-dropdown__item.sync-message.success svg {
												fill: green !important;
											}
											li.slds-dropdown__item.notification.warn a span {
												color: #ff9933 !important;
											}
											li.slds-dropdown__item.notification.warn svg {
												fill: #ff9933 !important;
											}
											li.slds-dropdown__item.sync-manual a {
												color: #006dcc;
												display: block;
												text-align: center;
											}
										</style>
										<div class="notifications slds-dropdown slds-dropdown_medium slds-dropdown_right">
											<ul class="slds-dropdown__list slds-dropdown_length-with-icon-10" role="menu"></ul>
										</div>
									`;
									notificationsButton.parentNode.prepend(notificationsMenu);
									notificationsMenu.prepend(notificationsButton);
									notificationsButton.style.marginRight = '-1px';
									notificationsMenu.addEventListener('click', event => {
										event.stopPropagation();
										event.currentTarget.classList.toggle('slds-is-open');
										this.notificationsBadge(0);
									});
									setTimeout(() => notificationsMenu.click(), 100);
								}
								this.renderNotifications();
								break;
							case 'search':
								this.search = new Search({
									element: this.nav.push(document.createElement('div')),
									nav: this.nav
								});
								break;
						}
					case 'menu':
						switch(detail.value) {
							case 'accountsNearby':
								this.accountsNearby = new AccountsNearby({
									element: this.nav.push(document.createElement('div')),
									nav: this.nav
								});
								break;
							case 'activityRecap':
								this.activityRecap = new ActivityRecap({
									element: this.nav.push(document.createElement('div')),
									nav: this.nav,
									types: [
										{ name: 'gvp__Account_Call__c' },
										{ name: 'gvp__Account_Objective__c' },
										{
											name: 'gvp__Survey__c',
											childFields: {
												gvp__Survey_Answer__c: [
													'gvp__Question__r.gvp__Product_Name__c',
													'gvp__Question__r.gvp__Question_Text__c',
													'gvp__Answer_Formula__c'
												]
											}
										},
									]
								});
								break;
							case 'content':
								this.content = new Content({
									element: this.nav.push(document.createElement('div')),
									nav: this.nav
								});
								break;
							case 'dashboard':
								this.dashboard = new Dashboard({
									element: this.nav.push(document.createElement('div')),
									nav: this.nav
								});
								break;
							case 'home':
								evt.preventDefault();
								evt.stopPropagation();
								this.goHome();
								break;
							case 'mylists':
								this.myLists.nav = this.nav;
								this.myLists.refreshActiveListView();
								this.nav.push(this.myLists.element, Object.assign(this.myLists.header, { buttons: [
									{ label: this.getLabel('Back'), value: 'back' }
								] }));
								break;
							case 'logout':
								this.logout();
								break;
							case 'photoBrowser':
								this.photoBrowser = new PhotoBrowser({
									element: this.nav.push(document.createElement('div')),
									nav: this.nav
								});
								break;
							case 'survey':
								this.survey = new Survey({
									element: this.nav.push(document.createElement('div')),
									nav: this.nav
								});
								break;
						}
						switch(detail.type) {
							case 'button':
								evt.preventDefault();
								evt.stopPropagation();
								this.home.buttonHandler(detail.value);
								break;
							case 'recent':
								switch(detail.role) {
									case 'menuitem':
										switch(detail.value.type) {
											case 'search':
												this.search = new Search({
													element: this.nav.push(document.createElement('div')),
													nav: this.nav,
													searchString: detail.value.searchString
												});
												break;
											default:
												this.myLists.nav = this.nav;
												this.nav.push(this.myLists.element, Object.assign(this.myLists.header, { buttons: [
													{ label: this.getLabel('Back'), value: 'back' }
												] }));
												let item = this.myLists.items.filter(
													item => item.listViews.filter(
														listView => listView.id === detail.value.id
													)[0]
												)[0];
												this.myLists.activate(item);
												item.listViewSelect.value = item.listViewSelect.items.filter(item => item.id === detail.value.id)[0];
												item.listViewSelect.render();
												break;
										}
										break;
								}
								break;
						}
						break;
					case 'title':
						this.goHome();
						break;
				}
			},
			icon: { url: App.logoUrl },
			menu: [
				{
					icon: `${this.getSymbols('utility')}#home`,
					label: this.getLabel('Home'),
					value: 'home'
				},
				{
					icon: `${this.getSymbols('utility')}#list`,
					label: this.getLabel('My_Lists'),
					value: 'mylists'
				},
				{
					icon: `${this.getSymbols('utility')}#location`,
					label: this.getLabel('Accounts_Nearby'),
					value: 'accountsNearby'
				},
				{
					icon: `${this.getSymbols('utility')}#file`,
					label: this.getLabel('Content'),
					value: 'content'
				},
				{
					icon: `${this.getSymbols('utility')}#graph`,
					label: this.getLabel('Dashboard'),
					value: 'dashboard'
				},
				/*{
					icon: `${this.getSymbols('utility')}#note`,
					label: this.getLabel('Activity_Reports'),
					value: 'activityRecap'
				},*/
				{
					icon: Icons.iconUrl('utility', 'image'),
					label: `${this.getLabel('Photo_Browser')}`,
					value: 'photoBrowser'
				},
				{
					label: this.getLabel('Recent_Lists'),
					role: 'separator',
					type: 'recent'
				},
				{
					icon: `${this.getSymbols('utility')}#logout`,
					label: this.getLabel('Mobile_Logout'),
					value: 'logout'
				}
			].filter(menuItem => {
				switch(menuItem.value) {
					case 'content':
						return !(this.mobileSettings && (this.mobileSettings.gvp__Content__c === false));
					default:
						return !(menuItem.value && this.mobileSettings && (this.mobileSettings.gvp__App_Menu_Excluded_Options__c || '').toLowerCase().split(',').includes(menuItem.value.toLowerCase()));
				}
			}),
			menuHeader: {
				icon: Icons.icon('User'),
				subtitle: this.auth && this.auth.instance_url && new URL(this.auth.instance_url).hostname,
				title: this.user.Name
			},
			title: ' '
		}) });
		this.nav = new Nav(this.globalNav.push(document.createElement('div')), { header: new Header({
			breadcrumbs: [],
			buttons: [],
			element: document.createElement('header'),
			icon: null,
			menu: [],
			title: null
		}) });
		App.renderBackButton();
		this.goHome();
	}

	static async renderNotifications() {
		if (!this.globalNav) {
			return;
		}
		(this.globalNav.element.querySelector('.menu .notifications ul') || {}).innerHTML = `
			<li class="slds-dropdown__item sync-message ${Db.syncSuccessful ? 'success' : 'error'} role="presentation">
				<a href="javascript:void(0);" role="menuitem" tabindex="0">
					<span class="slds-truncate sync-message-title" title="${this._syncMessage || `${this.getLabel('Next_Sync')}: ${(await Db.nextSync).toLocaleTimeString()}`}">
						${Db.isSyncing ? `
							<div class="sync-progress slds-progress-ring"></div>
						` : `
							<svg class="slds-icon slds-icon_small slds-icon-text-default slds-m-right_x-small sync-message-icon" aria-hidden="true">
								<use xlink:href="${Icons.iconUrl('utility', Db.syncSuccessful ? 'success' : 'error')}"></use>
							</svg>
						`}
						<span class="sync-message-message">${this._syncMessage || `${this.getLabel('Next_Sync')}: ${(await Db.nextSync).toLocaleTimeString()}`}</span>
					</span>
				</a>
			</li>
			<li class="slds-has-divider_top-space" role="separator" style="margin:0"></li>
			${(this.notifications || []).map(menuItem => `
				<li class="slds-dropdown__item notification ${menuItem.type || ''}" role="${menuItem.role || 'presentation'}" data-value="${menuItem.value || ''}">
					<a href="javascript:void(0);" role="menuitem" tabindex="0">
						<span class="slds-truncate" title="${menuItem.label}">
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
			${(this.notifications && (this.notifications.length > 0)) ? `
				<li class="slds-has-divider_bottom-space" role="separator" style="margin:0"></li>
			` : ''}
			<li class="slds-dropdown__item slds-truncate sync-manual" ${(Db.isSyncing || !navigator.onLine) ? 'disabled' : ''} role="presentation">
				<a href="javascript:void(0);" role="menuitem" tabindex="0">${this.getLabel('Manual_Sync')}</a>
			</li>
		`;
		this.bind('.menu .notifications ul li.notification', 'click', (event, index) => {
			event.stopPropagation();
			if (event.currentTarget.disabled) {
				return;
			}
			let notification = (this.notifications || [])[index];
			if (notification && notification.record) {
				// this handles a bug where clicking on a notification would, ad infinitum, add new Editors to the nav stack
				// this assumes that the nav header title always uses the record.Name property
				// basically this crude logic says if the current header title equals the record name of the notificaiton
				// then we have already opened the editor and we don't need another one.
				if (this.nav.getHeader()["_title"] === notification.record.Name) {
					event.currentTarget.closest('.menu').classList.remove('slds-is-open');
					return;
				}
				new Editor({
					element: this.nav.push(document.createElement('div')),
					nav: this.nav,
					record: notification.record,
					type: notification.record.attributes.type
				});
				event.currentTarget.closest('.menu').classList.remove('slds-is-open');
			}
		}, this.globalNav.element);
		this.bind('.menu .notifications ul li.sync-manual', 'click', event => {
			event.stopPropagation();
			if (event.currentTarget.hasAttribute('disabled')) {
				return;
			}
			Db.sync();
		}, this.globalNav.element);
		this.renderSyncProgress();
	}

	static renderSyncProgress() {
		let syncProgress = this.globalNav.element.querySelector('.menu .notifications ul li .sync-progress');
		if (!syncProgress) {
			return;
		}
		syncProgress.classList[Db.syncSuccessful ? 'remove' : 'add']('slds-progress-ring_expired');
		const arcX = Math.cos(2 * Math.PI * Db.syncProgress);
		const arcY = Math.sin(2 * Math.PI * Db.syncProgress);
		const isLong = Db.syncProgress > .5 ? 1 : 0;
		syncProgress.innerHTML = `
			<div class="slds-progress-ring__progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Db.syncProgress * 100}">
				<svg viewBox="-1 -1 2 2">
					<path class="slds-progress-ring__path" id="slds-progress-ring-path-2" d="M 1 0 A 1 1 0 ${isLong} 1 ${arcX} ${arcY} L 0 0"></path>
				</svg>
			</div>
			<div class="slds-progress-ring__content"></div>
		`;
	}

	static async secureUrl(urlString) {
		let auth = await Auth.auth;
		let url;
		try { url = new window.URL(urlString); } catch(e) {}
		if (!url) {
			try { url = new window.URL(`${auth.instance_url}${urlString}`); } catch(e) {}
		}
		if (url && url.host && url.host.endsWith('force.com')) {
			return `${auth.instance_url}/secur/frontdoor.jsp?sid=${encodeURIComponent(auth.access_token)}&retURL=${encodeURIComponent(urlString)}`;
		}
		return urlString;
	}

	static async success(notification) {
		return App.notify({ icon: Icons.iconUrl('utility', 'success'), label: notification, type: 'success' });
	}

	static async syncMessage(message) {
		this._syncMessage = message;
		let syncMessage = this.globalNav && this.globalNav.element && this.globalNav.element.querySelector('.sync-message-message');
		if (syncMessage) {
			syncMessage.innerHTML = message;
		}
		let syncMessageIcon = this.globalNav && this.globalNav.element && this.globalNav.element.querySelector('.sync-message-message-icon use');
		if (syncMessageIcon) {
			syncMessageIcon.setAttributeNS('http://www.w3.org/1999/xlink', 'href', Icons.iconUrl('utility', Db.syncSuccessful ? 'success' : 'error'));
		}
		let syncTitle = this.globalNav && this.globalNav.element && this.globalNav.element.querySelector('.sync-message-title');
		if (syncTitle) {
			syncTitle.setAttribute('title', message);
		}
		let syncManual = this.globalNav && this.globalNav.element && this.globalNav.element.querySelector('.sync-manual');
		if (syncManual) {
			syncManual.disabled = Db.isSyncing || !navigator.onLine;
		}
		this.renderSyncProgress();
	}

	static async syncNotification(notification) {
		return App.notify({ icon: Icons.iconUrl('utility', Db.syncSuccessful ? 'clock' : 'error'), label: notification, type: Db.syncSuccessful ? 'sync' : 'error' });
	}

	static async warn(warning) {
		return App.notify({ icon: Icons.iconUrl('utility', 'warning'), label: warning, type: 'warn' });
	}
}
