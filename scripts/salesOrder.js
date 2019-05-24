import { Api } from './api.js'
import { App } from './app.js'
import { Auth } from './auth.js'
import { CustomObject } from './customObject.js'
import { Db } from './db.js'
import { Fieldset } from './fieldset.js'
import { Header } from './header.js'
import { Icons } from './icons.js'
import { Input } from './input.js'
import { List } from './list.js'
import { Modal } from './modal.js'
import { Media } from './media.js'
import { Nav } from './nav.js'
import { Signature } from './media.js'
import { Tabs } from './tabs.js'
import { Toast } from './toast.js'
import { Subject } from './observable.js';

export class SalesOrder extends CustomObject {
	constructor(options) {
		super(options);
		this._submittable = new Subject().setCurrentValue(false);
		this._signable = new Subject().setCurrentValue(false);
		this._saveable = new Subject().setCurrentValue(false);
		this.init();
	}

	get canSave() {
		return this.modified && this.record && (this.record.gvp__Status__c !== 'Submitted');
	}

	get canSubmit() {
		return this.record && (this.record.gvp__Status__c !== 'Submitted') &&
			this.items && (this.items.filter(item => item._changedLocally !== Db.DELETED).length > 0) &&
			(!this.settings.gvp__Signature_Required__c || (this.signature && this.signature.isEmpty && !this.signature.isEmpty()));
	}

	get hasOrderItems() {
		return this.items && (this.items.filter(item => item._changedLocally !== Db.DELETED).length > 0);
	}


	get submittable() {
		return this._submittable;
	}

	get signable() {
		return this._signable;
	}

	get saveable() {
		return this._saveable;
	}

	get currencyFormat() {
		return (this.settings && this.settings.gvp__Display_Long_Prices__c) ? 'currencyLong' : 'currency';
	}

	get deliveryAddress() {
		return this.account && (this.account.ShippingAddress || this.account.BillingAddress)
	}

	get locked() {
		const locked = !!(this.signature && (this.signature.isEmpty ? !this.signature.isEmpty() : this.signature.image));
		return locked
	}

	get modified() {
		return this.salesOrderItemEditor ? this.salesOrderItemEditor.modified() : ([null, undefined].includes(this._modified) ? (this.fieldset && this.fieldset.modified) : this._modified);
	}
	set modified(modified) {
		this._modified = modified;
		if (this.tabs) {
			(this.tabs.buttons.find(button => button.value === 'saveOrder') || {}).disabled = !this.canSave;
			(this.tabs.buttons.find(button => button.value === 'submitOrder') || {}).disabled = !this.canSubmit;
			this.tabs.render();
		}
	}

	get readOnly() {
		const readOnly = !!((this.record && this.record.gvp__Status__c && (this.record.gvp__Status__c === 'Submitted')) || this.locked);
		return readOnly;
	}


	isLocked() {
		const isLocked = this.locked && !this.lockedMessageShown &&
		!(this.record && this.record.gvp__Status__c === 'Submitted');
		return !!isLocked;
	}

	async init() {
		this.isNew = !this.record; 
		// this.displayFormat = this.displayFormat || App.isSmallScreen ? 'narrow' : 'wide';
		this.header = this.getInitialHeader();
		this.nav = this.nav || new Nav(this.element, { header: this.header });
		this.nav.replace(this.element = document.createElement('div'), this.header);
		this.spinner();
		await this.fetchSalesOrderSettings();
		this.descriptions = {
			ContentDocument: await Api.describe('ContentDocument'),
			gvp__Item__c: await Api.describe('gvp__Item__c'),
			gvp__Sales_Order__c: this.description = await Api.describe('gvp__Sales_Order__c'),
			gvp__Sales_Order_Item__c: await Api.describe('gvp__Sales_Order_Item__c')
		}
		CustomObject.labels = await Api.labels();
		this.layout = await Api.editLayout('gvp__Sales_Order__c');
		await this.getRecord();
		await this.fetchAccount((this.record && this.record.gvp__Account__c) || this.parentId || (this.fieldPresets && this.fieldPresets.gvp__Account__c) || SalesOrder.parseArgs().accountId);
		// if not record found then create a stub record
		this.record = this.record || Object.assign({
			attributes: { type: 'gvp__Sales_Order__c' },
			gvp__Account__c: (this.account && this.account.Id) || null,
			gvp__Order_Type__c: 'Sales Order',
			gvp__Status__c: 'Saved'
		}, (await this.setDefaults({ type: 'gvp__Sales_Order__c' })), this.fieldPresets);
		await this.fetchSalesOrderItems();
		await Signature.load({
			id: this.record && this.record.Id,
			signature: this.signature = this.signature || {}
		});
		this.spinner();
		let newViewState = await this.render();
		let newHeader = Object.assign(this.header, App.isSmallScreen ? this.getNarrowHeaderSettings() : this.getWideHeaderSettings());
		this.nav.replace(newViewState, newHeader);
		if (App.isSmallScreen) {
			this.tabs.select(this.tabs.tabs[0])
		};
		await this.render();
		if (App.isSmallScreen) {
			this.renderDetails();
		}
		this.showLockedMessage();		
		if (!App.isSmallScreen) {
			this.setupObservers();
			this.setupSignature();
			this.updateStateField();
			setTimeout(() => this.submittable.notify(this.canSubmit), 100);
		}
	}

	setupObservers() {
		// set up the save and submit button observers
		for (const btnDef of this.header.buttons) {
			switch (btnDef.value) {
				case "saveOrder":
					this.fieldset.saveable.addObserver({ update: (saveable) => {
						let btn = document.getElementById(`btn-${btnDef.value}`);
						btn.disabled = !saveable;
					}});
					break;
				case "submitOrder":
					this.submittable.addObserver({ update: (submittable) => {
						let btn = document.getElementById(`btn-${btnDef.value}`);
						btn.disabled = !submittable;
						btn = document.getElementById('btn-saveOrder');
						btn.disabled = !this.canSave;
						btn = document.getElementById('btn-addItem');
						btn.disabled = this.readOnly || this.locked === true;
						if (!(this.readOnly || this.locked === true)) {
							// let sigButton = this.element.querySelector(`.toggle-signature`);
							// sigButton.disabled = false;
						}
					}});
				case "addItem":
					break;
			}
		}
		// alert submittable Subject by observing the saveable Subject
		this.fieldset.saveable.addObserver({ update: saveable => {
			this.updateStateField();
			this.submittable.notify(saveable && this.canSubmit);
			let btn = this.element.querySelector(`.toggle-signature`);
			btn.disabled = !saveable;
		} });

		this.signable.setCurrentValue(this.hasOrderItems);
		this.saveable.setCurrentValue(this.canSave);
	}

	validate() {
		if (this.fieldset && !this.fieldset.valid) {
			Toast.displayMessage({
				element: this.element.querySelector('.message'),
				message: this.getLabel('Input_Validation_Error')
			});
			return false;
		}
		return true;
	}

	get Item() {
		return {
			all: async () => {
				return await (navigator.onLine ? Api.fetchAll('gvp__Item__c') : Db.gvp__Item__c.toArray());
			},
			allowed: async options => {
				options = options || {};
				let allItems = await this.Item.all();
				if (!options.wholesalerId) {
					return allItems;
				}
				let result;
				let wholesaler;
				if (navigator.onLine) {
					result = await Api.query(`
						Select gvp__Distributor_Product_Set__c
						From Account
						Where Id = '${wholesalerId}'
					`);
					wholesaler = result && result.records && result.records[0];
				} else {
					wholesaler = await Db.Account.get(wholesalerId);
				}
				const productSetId = wholesaler && wholesaler.gvp__Distributor_Product_Set__c;
				if (!productSetId) {
					return allItems;
				}
				let productSetMembers;
				if (navigator.onLine) {
					result = await Api.query(`
						Select gvp__Item__c
						From gvp__Product_Set_Member__c
						Where gvp__Product_Set__c = '${productSetId}'
					`);
					productSetMembers = (result && result.records) || [];
				} else {
					productSetMembers = await Db.gvp__Product_Set_Member__c.where('gvp__Product_Set__c')
						.equals(productSetId).toArray();
				}
				const itemIds = productSetMembers.map(psm => psm.gvp__Item__c);
				return allItems.filter(item => itemIds.includes(item.Id));
			},
			recent: async () => {
				let recentOrderItems;
				if (navigator.onLine) {
					let result = await Api.query(`
						Select
							gvp__Item__c,
							gvp__Order_Date__c,
							gvp__Price__c,
							gvp__Quantity__c
						From gvp__Sales_Order_Item__c
						Where gvp__Sales_order__r.gvp__Account__c = '${this.record.gvp__Account__c}'
						And gvp__Sales_Order__r.gvp__Order_Date__c = LAST_N_Days:${(this.settings.gvp__Item_Order_History_Days__c || 90) * 10}
						Order By gvp__Sales_Order__r.gvp__Order_Date__c Desc,
							LastModifiedDate Desc
					`);
					recentOrderItems = result && result.records || [];
				} else {
					let earliestDate = new Date();
					earliestDate.setDate(earliestDate.getDate() - (this.settings.gvp__Item_Order_History_Days__c || 90));
					const recentOrderIds = (await Db.gvp__Sales_Order__c.where('gvp__Account__c')
						.equals(this.record.gvp__Account__c)
						.toArray()
					).filter(order => order.gvp__Order_Date__c >= earliestDate).map(order => order.Id);
					recentOrderItems = await Db.gvp__Sales_Order_Item__c.where('gvp__Sales_Order__c')
						.anyOfIgnoreCase(recentOrderIds)
						.toArray();
				}
				let recentItemIds = recentOrderItems.map(orderItem => orderItem.gvp__Item__c);
				recentOrderItems = recentOrderItems.filter((orderItem, index) => recentItemIds.indexOf(orderItem.gvp__Item__c) === index);
				const allItems = await this.Item.all();
				return recentOrderItems.map(orderItem => Object.assign({ orderItem: orderItem }, allItems.find(item => item.Id === orderItem.gvp__Item__c) || {}))
					.filter(item => item.Id);
			},
			search: async options => {
				options = options || {};
				const searchString = (options.searchString || '').toLowerCase();
				if (!searchString) {
					return await this.Item.recent();
				}
				return (await this.Item.allowed()).filter(item =>
					['Name', 'gvp__Item_Number__c'].reduce((result, field) => result || (item[field] || '').toLowerCase().includes(searchString), false)
				);
			}
		}
	}

	static async fetchAccount(accountId) {
		if (!accountId) {
			return Promise.resolve();
		}
		let account;
		if (navigator.onLine) {
			let result = await Api.query(`
				Select
					Id,
					Name,
					RecordTypeId,
					RecordType.Name,
					RecordType.DeveloperName,
					BillingAddress,
					ShippingAddress,
					gvp__Account_Segment__c,
					gvp__Warehouse__c
				From Account
				Where Id = '${accountId}'
			`);
			account = result && result.records && result.records[0];
		} else if (typeof(Db) !== 'undefined') {
			if (account = await Db.Account.get(accountId)) {
				account.RecordType = await Db.RecordType.get(account.RecordTypeId);
			}
		}
		return account;
	}

	static async fetchSalesOrderSettings() {
		this.userId = ((await Auth.auth)|| {}).user_id;
		this.user = await (navigator.onLine ? Api.user() : Db.User.get(this.userId));
		return SalesOrder.fetchSettings({
			type: 'gvp__Sales_Orders__c',
			criteria: [
				['gvp__Geography_Key__c', this.user.gvp__Geography_Key__c]
			],
			defaultSettings: {},
			onlyOne: true
		});
	}

	async back(options) {
		options = options || {};
		if (await Modal.promptToContinue({ modified: options.modified })) {
			if (this.nav.views.length > 1) {
				this.nav.pop();
			} else {
				window.history.back();
			}
		}
	}

	async deleteItem(options) {
		options = options || {};
		const value = this.salesOrderItemEditor.value();
		if (value.gvp__Order_Item_Line__c) {
			this.items[value.gvp__Order_Item_Line__c - 1]._changedLocally = Db.DELETED;
		}
		this.salesOrderItemEditor = null;
		if (options.modal) {
			options.onClose(options.button);
		} else {
			this.back();
		}
		this.submittable.notify(this.canSubmit);
		this.renderItems();
		this.modified = true;
	}

	async editItem(options) {
		options = options || {};
		const editItemModal = !App.isSmallScreen;
		const title =  `${this.getLabel(options.item ? 'Edit' : 'Add')} ${this.descriptions.gvp__Sales_Order_Item__c.label}`;
		const result = await this.salesOrderItemEdit({
			element: editItemModal ? (this.element || document.body).appendChild(document.createElement('div')) : 
				this.nav.push(document.createElement('div'), Object.assign(this.header, {
				breadcrumbs: this.description.label,
				buttons: [
					{ icon: Icons.icon('Back'), label: this.getLabel('Back'), value: 'back' },
					...(options.item ? [{ icon: Icons.icon('Delete'), label: this.getLabel('Delete'), value: 'deleteItem' }] : []),
					{ icon: Icons.icon('Save'), label: this.getLabel('Save'), value: 'saveItem', disabled: true },
				],
				menu: [],
				title: title
			})),
			handler: event => {
				switch(event) {
					case 'valueChanged':
						if (this.salesOrderItemEditor) {
							if (editItemModal) {
								const button = this.element.querySelector('#soPopupItemSave');
								button.disabled = !this.salesOrderItemEditor.valid();
							} else {
								this.nav.header.buttons.find(button => button.value === 'saveItem').disabled = !this.salesOrderItemEditor.valid();
								this.nav.header.render();
							}
						}
						break;
				}
			},
			item: options.item,
			editItemModal: editItemModal,
			popup: {
				buttons: [
					{ label: CustomObject.getLabel('Cancel'), value: 'close' },
					...(options.item ? [{ label: CustomObject.getLabel('Delete'), value: 'deleteItem', id: 'soPopupItemDelete', default: false }] : []),
					{ label: CustomObject.getLabel('Save'), value: 'saveItem', id: 'soPopupItemSave', default: true, disabledOnPristine: true }
				],
				texture: null,
				theme: null,
				title: title
			}
		});
		if (editItemModal) {
			await new Promise(resolve => this.resolve = resolve);
		}
		return result;
	}

	async fetchAccount(accountId) {
		return this.account = await SalesOrder.fetchAccount(accountId);
	}

	async fetchSalesOrderItems() {
		if (!(this.record && this.record.Id)) {
			return this.items = this.items || [];
		}
		if (navigator.onLine  && !Db.isLocalId(this.record.Id)) {
			let result = await Api.query(`
				Select
					Id,
					gvp__Extended_Price__c,
					gvp__Item__c,
					gvp__Item__r.Id,
					gvp__Item__r.Name,
					gvp__Item__r.gvp__Item_Number__c,
					gvp__Item__r.gvp__Price_Level_2__c,
					gvp__Item__r.gvp__Price_Level_3__c,
					gvp__Item__r.gvp__Price_Level_4__c,
					gvp__Item__r.gvp__Price_Level_5__c,
					gvp__Item__r.gvp__Price_List__c,
					gvp__Item__r.gvp__Quantity__c,
					gvp__Item__r.gvp__Unit_of_Measurement__c,
					gvp__Item__r.gvp__Unit_of_Measurement_Secondary__c,
					gvp__Item__r.gvp__Units__c,
					gvp__Order_Item_Line__c,
					gvp__Order_Unit__c,
					gvp__Price__c,
					gvp__Price_Level__c,
					gvp__Quantity__c,
					gvp__Sales_Order__c
				From gvp__Sales_Order_Item__c
				Where gvp__Sales_Order__c = '${this.record.Id}'
				Order By gvp__Order_Item_Line__c
			`);
			this.items = (result && result.records) || [];
		}
		this.items = (this.items || []).concat(
			await Db.gvp__Sales_Order_Item__c.where('gvp__Sales_Order__c')
				.equals(this.record.Id)
				.toArray()
		).filter((item, index, items) => !(item._changedLocally === Db.DELETED) && items.map(item => item.Id).indexOf(item.Id) === index)
			.sort((i1, i2) => (i1.gvp__Order_Item_Line__c || 0) - (i2.gvp__Order_Item_Line__c || 0));
		for (let item of this.items) {
			item.Item = item.gvp__Item__r || await Db.gvp__Item__c.get(item.gvp__Item__c);
		}
		return this.items;
	}

	async fetchSalesOrderSettings() {
		return this.settings = await SalesOrder.fetchSalesOrderSettings();
	}


	getInitialHeader() {
		return new Header({
			breadcrumbs: (this.nav && this.salesSequence) ? this.nav.header.breadcrumbs : null,
			element: document.createElement('header'),
			handler: async (event, detail) => {
				switch(event) {
					case 'action':
						switch(detail.value) {
							case 'back':
								this.back({ modified: (this.salesOrderItemEditor && this.salesOrderItemEditor.modified()) || this.modified });
								this.salesOrderItemEditor = null;
								break;
							case 'deleteItem':
								if ((await Modal.confirm({ title: `${this.getLabel('Delete')} ${this.descriptions.gvp__Sales_Order_Item__c.label}` }))) {
									const value = this.salesOrderItemEditor.value();
									if (value.gvp__Order_Item_Line__c) {
										this.items[value.gvp__Order_Item_Line__c - 1]._changedLocally = Db.DELETED;
									}
									this.salesOrderItemEditor = null;
									this.back();
									this.renderItems();
									this.modified = true;
								}
								break;
							case 'saveItem':
								const value = this.salesOrderItemEditor.value();
								if (value.gvp__Order_Item_Line__c) {
									this.items[value.gvp__Order_Item_Line__c - 1] = Object.assign(
										this.items[value.gvp__Order_Item_Line__c - 1],
										value
									);
								} else {
									this.items.push(Object.assign({}, value, {
										gvp__Sales_Order__c: this.record.Id,
										gvp__Order_Item_Line__c: this.items.length+1
									}));
								}
								this.salesOrderItemEditor = null;
								this.back();
								this.renderItems();
								this.modified = true;
								break;
						}
					break;
				}
			},
			icon: (this.nav && this.salesSequence) ? this.nav.header.icon : Icons.icon('gvp__Sales_Order__c'),
			menu: [],
			title: (this.nav && this.salesSequence) ? this.nav.header.title : `${(this.record && this.record.Id) ? 'Edit' : 'New'} ${this.getLabel('Sales_Order')}`
		});

	}


	async handler(event, detail, index) {
		switch (event) {
			case 'action':
				if (!this.validate()) {
					return false;
				}
				Array.from(this.element.querySelectorAll('.tab')).forEach(el => el.classList.add('slds-hidden'));
				this.element.querySelectorAll('.tab')[index].classList.remove('slds-hidden');
				switch(detail.name) {
					case 'buildOrder':
						this.tabs.buttons = [{
							disabled: this.readOnly,
							icon: Icons.icon('AddItem'),
							label: this.getLabel('Add'),
							value: 'addItem'
						}];
						this.tabs.render();
						await this.renderItems();
						break;
					case 'orderDetails':
						this.tabs.buttons = [];
						this.tabs.render();
						this.renderDetails();
						break;
					case 'orderSummary':
						this.tabs.buttons = [{
							disabled: !this.canSave,
							icon: Icons.icon('SaveOrder'),
							label: this.getLabel('Save'),
							value: 'saveOrder'
						}, {
							disabled: !this.canSubmit,
							icon: Icons.icon('SubmitOrder'),
							label: this.getLabel('Submit'),
							value: 'submitOrder'
						}];
						this.tabs.render();
						await this.renderSummary();
						break;
					default:
						this.tabs.buttons = [];
						break;
				}
				(this.tabs.buttons.find(button => button.value === 'saveOrder') || {}).disabled = !this.canSave;
				(this.tabs.buttons.find(button => button.value === 'submitOrder') || {}).disabled = !this.canSubmit;
				this.tabs.render();
				break;
			case 'button':
				switch (detail.value) {
					case 'addItem':
						this.editItem();
						break;
					case 'saveOrder':
						await this.save();
						break;
					case 'submitOrder':
						await this.save({ submit: true });
						break;
					break;
				}
				break;
		}
	}



	
	// render (element) {
	// 	element = element || this.element;
	// 	App.isSmallScreen ? this.renderNarrow(element) : this.renderWide(element);
	// 	return element;
	// }
	
	async render (element) {
		element = element || this.element;
		App.isSmallScreen ? this.renderNarrow(element) : this.renderWide(element);
		return element;
	}

	getNarrowHeaderSettings() {
		return {
			breadcrumbs: (this.nav && this.salesSequence) ? this.nav.header.breadcrumbs.concat([
				this.record.Id ? `${this.description.label} ${this.record.Name || this.record.Id}` :
					`${this.getLabel('New')} ${this.description.label}`
			]) : this.record.Name ? [ this.account.Name, this.description.label ] : (this.account && this.account.Name),
			buttons: [
				{ icon: Icons.icon('Back'), label: this.getLabel('Back'), value: 'back' }
			],
			menu: [],
			onPop: this.onPop ? this.onPop : null,
			title: (this.nav && this.salesSequence) ? this.nav.header.title : this.record.Name || `${this.getLabel('New')} ${this.description.label}`
		}
	}

	getWideHeaderSettings() {
		return {
			breadcrumbs: (this.nav && this.salesSequence) ? this.nav.header.breadcrumbs.concat([
				this.record.Id ? `${this.description.label} ${this.record.Name || this.record.Id}` :
					`${this.getLabel('New')} ${this.description.label}`
			]) : this.record.Name ? [ this.account.Name, this.description.label ] : (this.account && this.account.Name),
			standardButtons: true,
			buttons: [
				{ icon: Icons.icon('Back'), label: this.getLabel('Back'), value: 'back' },
				{ label: 'Add Item', value: 'addItem' },
				{ label: 'Save', value: 'saveOrder', disabled: true },
				{ label: 'Submit', value: 'submitOrder', disabled: true }
			],
			menu: [],
			onPop: this.onPop ? this.onPop : null,
			title: (this.nav && this.salesSequence) ? this.nav.header.title : this.record.Name || `${this.getLabel('New')} ${this.description.label}`,
			handler: async (event, detail) => {
				switch(event) {
					case 'action':
						switch(detail.value) {
							case 'back':
								this.back({ modified: (this.salesOrderItemEditor && this.salesOrderItemEditor.modified()) || this.modified });
								this.salesOrderItemEditor = null;
								break;
							case 'addItem':
								await this.editItem();
								break;
							case 'saveOrder':
								await this.save();
								break;
							case 'submitOrder':
								await this.save({ submit: true });
								break;
						}
					break;
				}
			}
		}
	}


	renderNarrow(element) {
		element.innerHTML = `
			<style>
				.slds-hidden {
					display: none
				}
				.sales-order {
					display: flex;
					flex-direction: column;
					height: 100%;
				}
				.sales-order > * {
					flex: 0;
				}
				.sales-order > .tab {
					flex: 1;
					overflow: auto;
				}
				.no-items {
					margin-right: 1.4em;
					text-align: right;
				}
				.no-items-instructions {
					display: inline-block;
					padding-top: 3px;
					vertical-align: top;
				}
				@media (min-width: 720px) {
					.details fieldset section > div {
						display: inline-block;
						width: 49.75%;
					}
				}
				@media (min-width: 1080px) {
					.details fieldset section > div {
						width: 33%;
					}
				}
				@media (min-width: 1440px) {
					.details fieldset section > div {
						width: 24.75%;
					}
				}
			</style>
			<div class="sales-order">
				<div class="message slds-hidden"></div>
				<div class="tabs"></div>
				<div class="details tab ${!(this.tabs && this.tabs.tabs[0].selected) ? 'slds-hidden' : ''}"></div>
				<div class="items tab ${!(this.tabs && this.tabs.tabs[1].selected) ? 'slds-hidden' : ''}"></div>
				<div class="summary tab ${!(this.tabs && this.tabs.tabs[2].selected) ? 'slds-hidden' : ''}"></div>
			</div>
		`;
		let selectedTab = this.tabs && this.tabs.tabs.find(tab => tab.selected);
		this.tabs = new Tabs({
			buttons: (this.tabs && this.tabs.buttons) || [],
			buttonsOverflow: false,
			element: element.querySelector('.tabs'),
			handler: this.handler.bind(this),
			overflow: false,
			tabs: (this.tabs && this.tabs.tabs) || [{
				label: App.isSmallScreen ? this.getLabel('Order_Details').split(' ').slice(-1)[0] : this.getLabel('Order_Details'),
				name: 'orderDetails',
				selected: !selectedTab || (selectedTab.name === 'orderDetails')
			}, {
				label: this.getLabel('Build_Order'),
				name: 'buildOrder',
				selected: selectedTab && (selectedTab.name === 'buildOrder')
			}, {
				label: this.getLabel('Order_Summary'),
				name: 'orderSummary',
				selected: selectedTab && (selectedTab.name === 'orderSummary')
			}],
			type: 'default'
		});
		return element;
	}

	renderWide (element) {
		element.innerHTML = `
			<style>
				.sales-order-container {
					height: 100%;
					border-top: solid .5px grey;
				}
				.panel-left {
					border-right: solid .5px grey;
					height: 100%;
					overflow: auto;
				}
				
				.signature-panel-hidden {
					background-color: silver;
					height: 60px;
					display: flex;
					flex-direction: row;
					justify-content: center;
					align-items: center;
					width: 100%;
				}
				.signature-panel-visible {
					display: flex;
					justify-content: center;
					width: 100%;
					align-items: center;
				}
				
				.panel-right-container {
					height: 100%;
				}
				.panel-right {
					display: flex;
					flex-direction: column;
					justify-content: space-between;
					height: 100%;
				}
				.signature-pad {
					width: 100%;
					text-align: center;
					background-color: silver;
				}
				.items {
					height: 100%;
					overflow: auto;
				}
				.no-items {
					display: flex;
					align-items: center;
					height: 100%;
				}
				.no-items-instructions {
					align-items: center;
					color: gray;
					display: flex;
					flex: 1 1 auto;
					font-size: large;
					justify-content: center;
				}
			</style>
			<div class="sales-order-container slds-grid slds-grow-none slds-wrap">
				<div class="message slds-hidden"></div>
				<div class="panel-left slds-col slds-size_4-of-12">
					<div class="gvp-edit-state slds-hidden"></div>
					<div class="order-details"></div>
				</div>
				<div class="panel-right-container  slds-col slds-size_8-of-12">
					<div class="panel-right">
						<div class="items"></div>
						<div class="signature-pad slds-grid slds-grid_align-center">
							<div class="signature-panel-hidden slds-hidden"  >
								<button class="toggle-signature slds-button slds-button_outline-brand" ${this.hasOrderItems ? "" : "disabled"}>Sign Order</button>
							</div>
							<div class="signature-panel-visible slds-hidden" >								
							</div>
						</div>
					</div>
				</div>
			</div>`;		

		this.bind(element.querySelector(".toggle-signature"), "click", (event, index) => { 
			element.querySelector(".signature-panel-hidden").classList.add("slds-hidden");
			element.querySelector(".signature-panel-visible").classList.remove("slds-hidden");
			this.setupSignature({newSig: true});
		 });

		this.renderDetails(element.querySelector(".order-details"));
		// TODO: verify this works 
		this.renderItems(element.querySelector(".items"));
	}

	async renderDetails(element) {
		element = element || this.element.querySelector('.details') || this.element.querySelector('.order-details');
		if (this.fieldset && this.fieldset.modified) {
			this.modified = true;
		}
		this.fieldset = new Fieldset({
			disabled: this.readOnly,
			element: element,
			fields: this.layout.filter(field =>
				![
					'gvp__Order_Type__c',
					'gvp__Status__c'
				].includes(field.name) &&
				(!this.record.gvp__Account__c || (field.name !== 'gvp__Account__c'))
			).map(field => Object.assign({
						readOnly: this.readOnly || (this.isNew ? !field.editableForNew : !field.editableForUpdate),
						required: (field.nillable === false) || (field.required && !field.compoundFieldName),
						section: field.section
					}, this.description.fields.filter(f => f.name === field.name)[0])),
			nav: this.nav,
			objectName: this.description.name,
			record: Object.assign(this.record, this.fieldset && this.fieldset.valueForSave),
			showNewButton: { fieldNames: ['gvp__Sold_To__c'] }
		});
	}


	async renderItems(element) {
		element = element || this.element.querySelector('.items');
		const fields = [
			this.descriptions.gvp__Item__c.fields.find(field => field.name === 'gvp__Item_Number__c'),
			this.descriptions.gvp__Item__c.fields.find(field => field.name === 'Name'),
			this.descriptions.gvp__Sales_Order_Item__c.fields.find(field => field.name === 'gvp__Quantity__c'),
			this.descriptions.gvp__Sales_Order_Item__c.fields.find(field => field.name === 'gvp__Price__c')
		];
		const showTip = !((!App.isSmallScreen) || (this.items && (this.items.length > 0)) );
		// const showTip = !(this.items && this.items.length > 0);
		const noItemsInstructions = this.getLabel('Sales_Order_Add_Item_Instructions').replace('{KeyName}', App.isSmallScreen ? '+' : this.getLabel('Add_Item'));
		element.innerHTML = showTip ? `
			<div class="no-items">
				<span class="no-items-instructions">${noItemsInstructions}</span>
				${App.isSmallScreen ? `
				<span class="slds-icon no-items-icon">
					<svg class="slds-icon slds-icon_x-small slds-icon-text-default" aria-hidden="true">
						<use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="${Icons.iconUrl('utility', 'level_up')}" />
					</svg>
				</span>` : ''
				}
			</div>
		` : `
			<style>
				.sales-order-totals {
					background-color: lightgray;
					display: flex;
					padding: .5em  24px;
				}
				.sales-order-totals > * {
					flex: 1;
					text-align: center;
					white-space: nowrap;
				}
				.sales-order-totals > *:first-child {
					text-align: left;
				}
				.sales-order-totals > *:last-child {
					text-align: right;
				}
				.sales-order-items thead tr th {
					background-color: gray;
					color: white;
				}
				.sales-order-items thead tr th:nth-child(3),
				.sales-order-items tbody tr td:nth-child(3),
				.sales-order-items thead tr th:nth-child(4),
				.sales-order-items tbody tr td:nth-child(4) {
					text-align: right;
				}
				.sales-order-items tbody tr td:last-child {
					text-align: right;
					width: 100px;
				}
				.sales-order-items tbody tr.deleted {
					background-color: palevioletred;
					display: none;
					text-decoration: line-through;
				}
				.sales-order-items tbody tr.deleted td {
					background-color: initial !important;
					border: initial !important;
					box-shadow: initial !important;
				}
				.sales-order-items tbody tr:not(.deleted) {
					cursor: pointer;
				}
				.sales-order-items tbody tr td:nth-child(2) div:nth-child(2) {
					display: none;
				}
				@media (max-width: 512px) {
					.sales-order-items thead tr th:first-child,
					.sales-order-items tbody tr td:first-child {
						display: none;
					}
					.sales-order-items tbody tr td:nth-child(2) div:nth-child(2) {
						display: block;
					}
					.sales-order-items tbody tr td:last-child {
						width: 40px;
					}
				}
			</style>
			<div class="sales-order-totals">
				<div>${this.getLabel('Items')}: ${this.items.filter(item => item._changedLocally !== Db.DELETED).length}</div>
				<div>${this.getLabel('Sales_Order_Units')}: ${Math.round(this.items.filter(item => item._changedLocally !== Db.DELETED).reduce((quantity, item) => quantity + item.gvp__Quantity__c, 0) * 10000)/10000}</div>
				<div>${this.getLabel('Order_Total').split(' ').slice(-1)[0]}: ${SalesOrder.displayValue(this.items.filter(item => item._changedLocally !== Db.DELETED).reduce((totalPrice, item) => totalPrice + item.gvp__Extended_Price__c, 0), 'currency')}</div>
			</div>
			<table class="sales-order-items slds-table slds-table_cell-buffer slds-table_bordered">
				<thead>
					<tr class="slds-line-height_reset">
						${fields.map(field => `
							<th class="" scope="col">
								<div class="slds-truncate" title="${field.label}">${field.label}</div>
							</th>
						`).join('\n')}
						<th>&nbsp;</th>
					</tr>
				</thead>
				<tbody>
					${this.items.map(item => `
						<tr class="slds-hint-parent ${(item._changedLocally === Db.DELETED) ? 'deleted' : ''}">
							<td>
								<div class="slds-truncate" title="${item.Item.gvp__Item_Number__c}">${item.Item.gvp__Item_Number__c}</div>
							</td>
							<td>
								<div class="slds-truncate" title="${item.Item.Name}">${item.Item.Name}</div>
								<div class="slds-truncate" title="${item.Item.gvp__Item_Number__c}">${item.Item.gvp__Item_Number__c}</div>
							</td>
							<td>
								<div class="slds-truncate" title="${item.gvp__Quantity__c} ${item.Item.gvp__Unit_of_Measurement__c}">${Math.round(item.gvp__Quantity__c * 10000)/10000} ${item.Item.gvp__Unit_of_Measurement__c}</div>
							</td>
							<td>
								<div class="slds-truncate" title="${SalesOrder.displayValue(item.gvp__Price__c, this.currencyFormat)}">${SalesOrder.displayValue(item.gvp__Price__c, this.currencyFormat)}</div>
							</td>
							<td>
								${(this.readOnly || (item._changedLocally === Db.DELETED)) ? '&nbsp;' : `
									<span class="slds-icon">
										<svg class="slds-icon slds-icon_x-small slds-icon-text-default" aria-hidden="true">
											<use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="${Icons.iconUrl('utility', 'chevronright')}" />
										</svg>
									</span>
								`}
							</td>
						</tr>
					`).join('\n')}
				</tbody>
			</table>
		`;
		if (!this.readOnly) {
			this.bind('.sales-order-items tbody tr:not(.deleted)', 'click', (event, index) => this.editItem({ item: this.items.filter(item => !(item._changedLocally === Db.DELETED))[index] }), element);
		}
	}


	async renderSummary(element) {
		element = element || this.element.querySelector('.summary');
		const fields = [
			this.descriptions.gvp__Item__c.fields.find(field => field.name === 'gvp__Item_Number__c'),
			this.descriptions.gvp__Item__c.fields.find(field => field.name === 'Name'),
			this.descriptions.gvp__Sales_Order_Item__c.fields.find(field => field.name === 'gvp__Quantity__c'),
			this.descriptions.gvp__Sales_Order_Item__c.fields.find(field => field.name === 'gvp__Price__c')
		];
		const record = Object.assign({}, this.record, this.fieldset && this.fieldset.valueForSave);
		element.innerHTML = `
			<style>
				.sales-order-summary {
					display: flex;
					flex-direction: column;
					height: 100%;
				}
				.sales-order-summary > * {
					flex: 0;
				}
				.sales-order-summary-totals {
					background-color: lightgray;
					padding: .5em;
				}
				.sales-order-summary-totals > div,
				.sales-order-summary-totals > div:nth-child(2) > div > div {
					display: flex;
				}
				.sales-order-summary-totals-label {
					margin-right: 1em;
					text-align: right;
					width: 7em;
				}
				.sales-order-summary-totals-value {
					text-align: right;
					width: 5em;
				}
				.sales-order-summary-items {
					flex: 1;
					overflow: auto;
				}
				.sales-order-summary-items thead tr th {
					background-color: gray;
					color: white;
				}
				.sales-order-summary-items thead tr th:nth-child(3),
				.sales-order-summary-items tbody tr td:nth-child(3),
				.sales-order-summary-items thead tr th:nth-child(4),
				.sales-order-summary-items tbody tr td:nth-child(4) {
					text-align: right;
				}
				.sales-order-summary-items tbody tr td:nth-child(2) div:nth-child(2) {
					display: none;
				}
				@media (max-width: 512px) {
					.sales-order-summary-items thead tr th:first-child,
					.sales-order-summary-items tbody tr td:first-child {
						display: none;
					}
					.sales-order-summary-items tbody tr td:nth-child(2) div:nth-child(2) {
						display: block;
					}
				}
				.sales-order-summary-signature {
					background-color: lightgray;
					padding: 1em;
				}
				.sales-order-summary-signature-title {
					font-size: larger;
				}
				.sales-order-summary-signature-instructions {
					font-size: smaller;
				}
				.sales-order-summary-signature-canvas {
					background-color: white;
					border: 1px solid black;
					height: 120px;
					margin: 1em 0;
					max-width: 512px;
					width: 100%;
				}
				.sales-order-summary-signature-clear {
					max-width: 512px;
					text-align: right;
				}
				.sales-order-summary-signature-clear a {
					text-decoration: none;
				}
			</style>
			<div class="sales-order-summary">
				<div class="sales-order-summary-totals">
					<div>
						<div class="sales-order-summary-totals-label">${this.getLabel('Address')}:</div>
						<div>
							${this.deliveryAddress ? `
								<div>${SalesOrder.displayValue(this.deliveryAddress.street, 'string')}</div>
								<div>${SalesOrder.displayValue(this.deliveryAddress.city, 'string')}, ${SalesOrder.displayValue(this.deliveryAddress.state, 'string')} ${SalesOrder.displayValue(this.deliveryAddress.postalCode, 'string')}</div>
							` : SalesOrder.displayValue()}
						</div>
					</div>
					<div>
						<div>
							<div>
								<div class="sales-order-summary-totals-label">${this.description.fields.find(field => field.name === 'gvp__Order_Date__c').label}:</div>
								<div>${SalesOrder.displayValue(record.gvp__Order_Date__c, 'date')}</div>
							</div>
							<div>
								<div class="sales-order-summary-totals-label">${this.description.fields.find(field => field.name === 'gvp__Request_Date__c').label}:</div>
								<div>${SalesOrder.displayValue(record.gvp__Request_Date__c, 'date')}</div>
							</div>
							<div>
								<div class="sales-order-summary-totals-label">${this.description.fields.find(field => field.name === 'gvp__Sold_To__c').label}:</div>
								<div>${await SalesOrder.referenceDisplayValue({ field: this.description.fields.find(field => field.name === 'gvp__Sold_To__c'), value: record.gvp__Sold_To__c })}</div>
							</div>
						</div>
						<div>
							<div>
								<div class="sales-order-summary-totals-label">${this.getLabel('Items')}:</div>
								<div class="sales-order-summary-totals-value">${this.items.filter(item => item._changedLocally !== Db.DELETED).length}</div>
							</div>
							<div>
								<div class="sales-order-summary-totals-label">${this.getLabel('Sales_Order_Units')}:</div>
								<div class="sales-order-summary-totals-value">${Math.round(this.items.filter(item => item._changedLocally !== Db.DELETED).reduce((quantity, item) => quantity + item.gvp__Quantity__c, 0) * 10000)/10000}</div>
							</div>
							<div>
								<div class="sales-order-summary-totals-label">${this.getLabel('Order_Total').split(' ').slice(-1)[0]}:</div>
								<div class="sales-order-summary-totals-value">${SalesOrder.displayValue(this.items.filter(item => item._changedLocally !== Db.DELETED).reduce((totalPrice, item) => totalPrice + item.gvp__Extended_Price__c, 0), 'currency')}</div>
							</div>
						</div>
					</div>
				</div>
				<div class="sales-order-summary-items">
					<table class="slds-table slds-table_cell-buffer slds-table_bordered">
						<thead>
							<tr class="slds-line-height_reset">
								${fields.map(field => `
									<th class="" scope="col">
										<div class="slds-truncate" title="${field.label}">${field.label}</div>
									</th>
								`).join('\n')}
							</tr>
						</thead>
						<tbody>
							${this.items.map(item => `
								<tr class="slds-hint-parent ${(item._changedLocally === Db.DELETED) ? 'deleted' : ''}">
									<td>
										<div class="slds-truncate" title="${item.Item.gvp__Item_Number__c}">${item.Item.gvp__Item_Number__c}</div>
									</td>
									<td>
										<div class="slds-truncate" title="${item.Item.Name}">${item.Item.Name}</div>
										<div class="slds-truncate" title="${item.Item.gvp__Item_Number__c}">${item.Item.gvp__Item_Number__c}</div>
									</td>
									<td>
										<div class="slds-truncate" title="${item.gvp__Quantity__c} ${item.Item.gvp__Unit_of_Measurement__c}">${Math.round(item.gvp__Quantity__c * 10000)/10000} ${item.Item.gvp__Unit_of_Measurement__c}</div>
									</td>
									<td>
										<div class="slds-truncate" title="${SalesOrder.displayValue(item.gvp__Price__c, this.currencyFormat)}">${SalesOrder.displayValue(item.gvp__Price__c, this.currencyFormat)}</div>
									</td>
								</tr>
							`).join('\n')}
						</tbody>
					</table>
				</div>
				${this.settings.gvp__Signature_Capture__c ? `
					<div class="sales-order-summary-signature">
						<div class="sales-order-summary-signature-title">${this.getLabel('Signature')}</div>
						<div class="sales-order-summary-signature-instructions">${this.getLabel('Sales_Order_Signature_Instructions')}</div>
						<canvas class="sales-order-summary-signature-canvas signature"></canvas>
						${!(this.record && (this.record.gvp__Status__c === 'Submitted')) ? `
							<div class="sales-order-summary-signature-clear">
								<a href="javascript:void(0);" title="${this.getLabel('Clear')} ${this.getLabel('Signature')}" >${this.getLabel('Clear')}</a>
							</div>
						` : ''}
					</div>
				` : ''}
			</div>
		`;
		const updateSignatureClear = () => {
			let signatureClear = element.querySelector('.sales-order-summary-signature-clear');
			if (signatureClear) {
				signatureClear.classList[(this.signature && this.signature.isEmpty && !this.signature.isEmpty()) ? 'remove' : 'add']('slds-hidden');
			}
		};
		this.signature = await Signature.create({
			canvas: element.querySelector('.sales-order-summary-signature-canvas'),
			handler: event => {
				switch(event) {
					case 'change':
						this.modified = true;
						break;
				}
				updateSignatureClear();
				this.showLockedMessage();
			},
			id: this.record && this.record.Id,
			readOnly: this.readOnly,
			required: this.settings.gvp__Signature_Required__c,
			signature: this.signature
		});
		updateSignatureClear();
		this.bind('.sales-order-summary-signature-clear a', 'click', () => {
			this.signature.clear();
			this.modified = true;
		}, element);
	}



	async initSignature(element) {
		let canvasElement = element.querySelector('.sales-order-summary-signature-canvas');
		this.signature = await Signature.create({
			canvas: canvasElement,
			handler: event => {
				switch(event) {
					case 'change':
						this.modified = true;						
						break;
				}
			},
			id: this.record && this.record.Id,
			readOnly: this.readOnly,
			required: this.settings.gvp__Signature_Required__c,
			signature: this.signature
		});
		const signatureClose = () => {
			this.element.querySelector(".signature-panel-hidden").classList.remove("slds-hidden");
			this.element.querySelector(".signature-panel-visible").classList.add("slds-hidden");
			if(this.signature && !this.signature.isEmpty()) {
				this.element.querySelector(".toggle-signature").disabled = false;
				this.element.querySelector(".toggle-signature").innerText = "Edit Signature";
			}
			this.updateStateField();
		};
		const signatureClear = () => {
			this.signature.clear();
			this.signature.on();
			if(this.lockedToast) {
				this.lockedToast.value = "Closed";
			}
			this.modified = true;
			this.submittable.notify(this.canSubmit);
			this.renderDetails();
			this.renderItems();
			this.updateStateField();
		};
		const acceptSignature = () => {
			if (this.signature.isEmpty()) {
				this.updateStateField();
				return;
			}
			this.updateStateField();
			this.showLockedMessage();
			this.submittable.notify(this.canSubmit);
			this.renderItems();
			this.renderDetails();
			this.updateStateField();
			signatureClose();
		};

		this.bind('#gvp-signature-clear', 'click', () => {
			signatureClear();
		}, element);
		this.bind('#gvp-signature-accept', 'click', () => {
			acceptSignature();
		}, element);
		this.bind('#gvp-signature-close', 'click', () => {
			if (!this.readOnly) {
				signatureClose();
			}
		});
	}



	setupSignature(options) {
		// only if settings are allowed
		if (this.settings.gvp__Signature_Capture__c) {
			// has a signature
			if ((this.signature && this.signature.image)) {
				let sigPanel = this.element.querySelector(".signature-panel-visible");
				sigPanel.innerHTML = this.getSignatureHtml();
				sigPanel.classList.remove("slds-hidden");
				this.initSignature(sigPanel);
			// needs a signature
			} else {
				if(options && options.newSig) {
					this.element.querySelector(".signature-panel-hidden").classList.add("slds-hidden");
					this.element.querySelector(".toggle-signature").disabled = false;
					this.element.querySelector(".toggle-signature").innerText = "Edit Signature";
					let sigPanel = this.element.querySelector(".signature-panel-visible");
					sigPanel.innerHTML = this.getSignatureHtml();
					sigPanel.classList.remove("slds-hidden");
					this.initSignature(sigPanel);
				} else {
					// show the sign order button
					this.element.querySelector(".signature-panel-hidden").classList.remove("slds-hidden");
				}
			}
		}
	}


	getSignatureHtml(element) {
		return `
		<style>
			.sales-order-summary-signature {
				background-color: silver;
				padding: 1em;
				width: 100%;
			}
			.sales-order-summary-signature-title {
				font-size: larger;
			}
			.sales-order-summary-signature-instructions {
				font-size: smaller;
			}
			.sales-order-summary-signature-canvas {
				background-color: white;
				border: 1px solid black;
				height: 120px;
				margin: 1em 0;
				max-width: 512px;
				width: 100%;
			}
			.sales-order-summary-signature-clear {
			}
			.sales-order-summary-signature-clear a {
				text-decoration: none;
			}
		</style>
		<div class="sales-order-summary-signature">
			<div style="text-align: right;">
				<a href="javascript:void(0);" id="gvp-signature-close">
					<svg class="slds-button__icon slds-button__icon_large" aria-hidden="true">
						<use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="${SalesOrder.getSymbols('utility')}#close" />
					</svg>
				</a>
			</div>
			<div class="sales-order-summary-signature-title">${this.getLabel('Signature')}</div>
			<div class="sales-order-summary-signature-instructions">${this.getLabel('Sales_Order_Signature_Instructions')}</div>
			<canvas class="sales-order-summary-signature-canvas signature"></canvas>
			${!(this.record && (this.record.gvp__Status__c === 'Submitted')) ? `
				<div class="sales-order-summary-signature-clear">
					<a id="gvp-signature-clear" href="javascript:void(0);" title="${this.getLabel('Clear')} ${this.getLabel('Signature')}" >${this.getLabel('Clear')}</a>
					&nbsp; &nbsp; | &nbsp; &nbsp;
					<a id="gvp-signature-accept" href="javascript:void(0);" title=" ${this.getLabel('Sales_Order_Agree_To_Order')}" >${this.getLabel('Sales_Order_Agree_To_Order')}</a>
				</div>
			` : ''}
		</div>`;
	}


	renderPopupButtons(buttons) {
		const buttonHtml = buttons.map(button => {
			const colorClass = button.default === true ? 'slds-button_brand' : 'slds-button_neutral';
			return `<button class="slds-button ${colorClass}" data-value="${button.value}"} ${button.id ? `id=${button.id}` : ''} ${button.disabledOnPristine ? 'disabled' : ''}>${button.label}</button>`;
		}).join('\n');
		return `<div id="soPopupButtons">${buttonHtml}</div>`;
	}


	async salesOrderItemEdit(options) {
		options = options || {};
		options.popup = options.popup || {};
		let element = options.element;
		if (!element) {
			return;
		}
		const fields = {
			item: this.descriptions.gvp__Sales_Order_Item__c.fields.find(field => field.name === 'gvp__Item__c'),
			quantity: this.descriptions.gvp__Sales_Order_Item__c.fields.find(field => field.name === 'gvp__Quantity__c'),
			price: this.descriptions.gvp__Sales_Order_Item__c.fields.find(field => field.name === 'gvp__Price__c')
		};
		element.innerHTML = `
			<style>
				.slds-backdrop_open {
					z-index: 100001;
				}
				.slds-modal {
					z-index: 100002;
				}
				${options.editItemModal && 
				`section[role='alertdialog'] .slds-modal__container {
					max-width: 35rem;
				}`
				}
				.sales-order-item fieldset {
					margin: auto;
					max-width: 90%;
				}
				.sales-order-item fieldset input[type=number]::-webkit-inner-spin-button,
				.sales-order-item fieldset input[type=number]::-webkit-outer-spin-button {
					-webkit-appearance: none;
					margin: 0;
				}
				.sales-order-item fieldset .item {
					display: flex;
				}
				.sales-order-item fieldset .item > * {
					flex: none;
				}
				.sales-order-item fieldset .item > *:first-child {
					flex: 1;
				}
				.sales-order-item fieldset .item > *:last-child {
					margin-top: 39px;
				}
			</style>
			${!options.editItemModal ? `
			<div class="sales-order-item">
				<fieldset></fieldset>
			</div>`
			: `
			<section role="inputform" tabindex="-1" class="slds-modal slds-fade-in-open" aria-modal="true">
				<div class="slds-modal__container">
					<header class="slds-modal__header slds-theme_${options.popup.theme || 'default'} slds-theme_${options.popup.texture || 'default'}-texture">
						${options.popup.title ? `<h2 class="slds-text-heading_medium">${options.popup.title}</h2>` : '' }
					</header>
					<div class="message slds-hidden"></div>
					<div class="slds-modal__content slds-p-around_medium">
						<fieldset></fieldset>
					</div>
					<footer class="slds-modal__footer slds-theme_shade">
						${this.renderPopupButtons(options.popup.buttons)}
					</footer>
				</div>
			</section>
			<div class="slds-backdrop slds-backdrop_open"></div>
			`}
		`;
		this.spinner({ element: element });
		let fieldset = element.querySelector('fieldset');

		// helper methods 
		let checkInventory = async () => {
			if (!(navigator.onLine && this.settings.gvp__Check_Inventory_Object__c)) {
				return;
			}
			const item = itemList.value;
			let quantity = 0;
			if (item && item.Id && this.account && this.account.gvp__Warehouse__c) {
				let result = Api.query(`
					Select gvp__Quantity__c
					From gvp__Inventory__c
					Where gvp__Item_Lookup__c = '${item.Id}'
					And gvp__Warehouse__c = '${this.account.gvp__Warehouse__c}'
				`);
				quantity = result && result.records && result.records[0] && result.records[0].gvp__Quantity__c || 0;
			}
			if (item) {
				itemList.value.gvp__Quantity__c = quantity;
			}
		};
		let itemSearch = async searchString => {
			return (await this.Item.search({ searchString })).map(item => Object.assign({
				label: item.Name,
				value: item.Id
			}, item));
		};
		let maxQuantity = () => {
			const item = itemList.value;
			const itemAvailableQuantity = (item && ![null, undefined].includes(item.gvp__Quantity__c)) ? item.gvp__Quantity__c : null;
			const itemMaxQuantity =  this.settings.gvp__Item_Max_Quantity_6__c || this.settings.gvp__Item_Max_Quantity_3__c || null;
			return ((itemAvailableQuantity !== null) && (itemMaxQuantity !== null)) ?
				Math.min(itemAvailableQuantity, itemMaxQuantity) :
				(
					(itemAvailableQuantity !== null) ?
						itemAvailableQuantity :
						(
							(itemMaxQuantity !== null) ? itemMaxQuantity : null
						)
				);
		};
		let maxQuantityMessage = () => {
			const item = itemList.value;
			const itemAvailableQuantity = (item && ![null, undefined].includes(item.gvp__Quantity__c)) ? item.gvp__Quantity__c : null;
			const itemMaxQuantity =  this.settings.gvp__Item_Max_Quantity_6__c || this.settings.gvp__Item_Max_Quantity_3__c || null;
			const quantity = (Number(itemQuantity.value) || 0) + (Number((itemQuantityPartial.value && itemQuantityPartial.value.value) || 0) / ((item || {}).gvp__Units__c || 1));
			if ((itemAvailableQuantity !== null) && (quantity > itemAvailableQuantity) && ((itemMaxQuantity === null) || (itemAvailableQuantity <= itemMaxQuantity))) {
				return `${this.getLabel('Sales_Order_Available_Quantity_Exceeded')} (${itemAvailableQuantity} ${item.gvp__Unit_of_Measurement__c})`;
			}
			if ((itemMaxQuantity !== null) && (quantity > itemMaxQuantity)) {
				return `${this.getLabel('Sales_Order_Maximum_Quantity_Exceeded')} (${itemMaxQuantity} ${item.gvp__Unit_of_Measurement__c})`;
			}
			return '';
		};
		let partialItems = items => {
			items = items || [];
			const length = (itemList.value && itemList.value.gvp__Units__c) || 0;
			if (items.length < length) {
				items.push({ label: items.length, value: items.length });
				return partialItems(items);
			} else {
				return items;
			}
		};
		let priceLevels = () => {
			const item = itemList.value;
			return item ? [
				{
					type: 'List',
					label: `${this.getLabel('Price_List')}: ${SalesOrder.displayValue(item.gvp__Price_List__c, this.currencyFormat)}`,
					value: item.gvp__Price_List__c
				}, {
					type: 'Level 2',
					label: `${this.getLabel('Price_Level_2')}: ${SalesOrder.displayValue(item.gvp__Price_Level_2__c, this.currencyFormat)}`,
					value: item.gvp__Price_Level_2__c
				}, {
					type: 'Level 3',
					label: `${this.getLabel('Price_Level_3')}: ${SalesOrder.displayValue(item.gvp__Price_Level_3__c, this.currencyFormat)}`,
					value: item.gvp__Price_Level_3__c
				}, {
					type: 'Level 4',
					label: `${this.getLabel('Price_Level_4')}: ${SalesOrder.displayValue(item.gvp__Price_Level_4__c, this.currencyFormat)}`,
					value: item.gvp__Price_Level_4__c
				}, {
					type: 'Level 5',
					label: `${this.getLabel('Price_Level_5')}: ${SalesOrder.displayValue(item.gvp__Price_Level_5__c, this.currencyFormat)}`,
					value: item.gvp__Price_Level_5__c
				}
			].filter(level => ![null, undefined].includes(level.value))
				.concat(this.settings.gvp__Custom_Pricing__c ? [{
					label: this.getLabel('Price_Custom'),
					type: 'Custom',
					value: ''
				}] : []) : [];
		};
		// setup item dropdown list
		let itemList;
		let itemListContainer = fieldset.appendChild(document.createElement('div'));
		itemListContainer.classList.add('item');
		itemList = new List({
			collapsed: true,
			collapsible: true,
			element: itemListContainer.appendChild(document.createElement('div')),
			handler: async (event, v) => {
				switch(event) {
					case 'inputChange':
						itemList.items = await itemSearch((v.value !== undefined) ? (v.value && v.value.label) : v);
						itemList.render();
						break;
					case 'valueChange':
					case 'valueChanged':
						itemList.items = await itemSearch((v.value !== undefined) ? (v.value && v.value.label) : v);
						itemList.render();
						await checkInventory();
						const unitOfMeasure = itemList.value && itemList.value.gvp__Unit_of_Measurement__c;
						itemQuantity.label = `${this.getLabel('Sales_Order_Units')} ${unitOfMeasure ? `(${unitOfMeasure})` : ''}`;
						itemQuantity.render();
						const partialUnitOfMeasure = itemList.value && itemList.value.gvp__Unit_of_Measurement_Secondary__c;
						const partialUnits = itemList.value && itemList.value.gvp__Units__c;
						itemQuantityPartial.label = partialUnits ? `${this.getLabel('Sales_Order_Units_Partial')} ${partialUnitOfMeasure ? `(${partialUnitOfMeasure})` : ''}`: '';
						itemQuantityPartial.items = partialItems();
						itemQuantityPartial.value = itemQuantityPartial.initialValue || 0;
						delete itemQuantityPartial.initialValue;
						itemQuantityPartial.render();
						itemPrice.value = null
						itemPrice.items = priceLevels();
						itemPrice.collapsible = true;
						itemPrice.render();
						if (itemPrice.initialValue !== undefined) {
							itemPrice.value = Object.assign(
								{},
								itemPrice.items.find(item => item.type === itemPrice.initialValue.level),
								(itemPrice.initialValue.level === 'Custom') ? { value: itemPrice.initialValue.price } : {}
							);
							if (itemPrice.initialValue.level === 'Custom') {
								(itemPrice.items.find(item => item.type === 'Custom') || {}).value = itemPrice.initialValue.price;
							}
							delete itemPrice.initialValue;
							itemPrice.render({ valueChanged: true });
						}
						if (options.handler) {
							options.handler('valueChanged');
						}
						let itemImage = await Media.image(itemList.value && itemList.value.value);
						itemImageContainer.innerHTML = itemImage ? `
							<span class="slds-icon slds-m-right_small">
								<svg class="slds-icon slds-icon-text-default" aria-hidden="true">
									<use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="${Icons.iconUrl('utility', 'image')}" />
								</svg>
							</span>
						` : '';
						if (itemImage) {
							this.bind('span.slds-icon', 'click', async () => {
								this.spinner({ blockInput: true });
								await Media.loadContentVersionData(itemImage);
								this.spinner();
								App.navigateToUrl({
									external: false,
									icon: 'SalesOrderImage',
									nav: this.nav,
									title: itemList.value.label,
									type: 'image',
									url: Media.dataUrl(itemImage)
								});
							}, itemImageContainer);
						}
						break;
				}
			},
			itemRenderer: (item, index) => `
				<span class="slds-media__body">
					${(index === 0) && item.orderItem ? `
						<div class="slds-m-bottom_x-small slds-text-title_bold slds-text-title_caps" style="font-size: smaller">
							${this.getLabel('Sales_Order_Recent')}
						</div>
					` : ''}
					<div>${item.Name} (${item.gvp__Item_Number__c})</div>
					${item.orderItem ? `
						<div class="slds-m-top_xx-small" style="font-size: smaller">
							<span class="slds-float_left">${Math.round(item.orderItem.gvp__Quantity__c * 10000)/10000} ${item.gvp__Unit_of_Measurement__c}</span>
							<span class="slds-float_right">${SalesOrder.displayValue(item.orderItem.gvp__Price__c, this.currencyFormat)}</span>
						</div>
					` : ''}
				</span>
			`,
			items: await itemSearch(),
			label: fields.item.label,
			placeholder: this.getLabel('Sales_Order_Search'),
			required: true,
			searchable: true
		});
		// setup 
		let itemImageContainer = itemListContainer.appendChild(document.createElement('div'));
		// setup case quantity
		let itemQuantity = new Input({
			element: fieldset.appendChild(document.createElement('div')),
			handler: event => {
				switch(event) {
					case 'valueChange':
					case 'valueChanged':
						itemQuantity.input.setCustomValidity(itemQuantity.message = maxQuantityMessage());
						if (options.handler) {
							options.handler('valueChanged');
						}
				}
			},
			label: this.getLabel('Sales_Order_Units'),
			max: (maxQuantity() !== null) ? maxQuantity() : '',
			min: 1,
			required: true,
			step: 1,
			type: 'number'
		});
		// setup partial quantity
		let itemQuantityPartial = new List({
			clearable: false,
			collapsed: true,
			collapsible: true,
			element: fieldset.appendChild(document.createElement('div')),
			handler: (event, v) => {
				switch(event) {
					case 'valueChange':
					case 'valueChanged':
						const max = maxQuantity();
						itemQuantity.max = (max !== null) ? ((v.value && v.value.value) ? (max - 1) : max) : '';
						itemQuantity.min = (v.value && v.value.value) ? 0 : 1;
						itemQuantity.required = !(v.value && v.value.value);
						itemQuantity.render();
						itemQuantity.input.setCustomValidity(itemQuantity.message = maxQuantityMessage());
						if (options.handler) {
							options.handler('valueChanged');
						}
						break;
				}
			}
		});
		// setup price drop down
		let itemPrice = new List({
			clearable: true,
			collapsed: true,
			collapsible: true,
			element: fieldset.appendChild(document.createElement('div')),
			handler: (event, v) => {
				switch(event) {
					case 'inputChange':
						itemPrice.value = v;
						(itemPrice.items.find(item => item.type === 'Custom') || {}).value = v;
						break;
					case 'valueChange':
					case 'valueChanged':
						switch(v && v.value && v.value.type) {
							case 'Custom':
								itemPrice.collapsed = true;
								itemPrice.collapsible = false;
								itemPrice.input.removeAttribute('readOnly');
								itemPrice.input.value = v.value.value;
								itemPrice.input.type = 'number';
								itemPrice.input.min = 0;
								itemPrice.input.max = 999999999.9999;
								itemPrice.input.step = .0001;
								itemPrice.input.focus();
								break;
							default:
								if (v && v.value && v.value.type) {
									itemPrice.input.setAttribute('readOnly', '');
									itemPrice.input.type = 'text';
									itemPrice.collapsible = true;
								} else if (v && (v.value === null)) {
									itemPrice.collapsible = true;
								}
								break;
						}
						if (options.handler) {
							options.handler('valueChanged');
						}
						break;
				}
			},
			items: priceLevels(),
			label: fields.price.label,
			placeholder: ' ',
			required: true,
			showEmpty: true,
		});
		if (options.item) {
			itemList.value = Object.assign({
				label: options.item.Item.Name,
				value: options.item.Item.Id
			}, options.item.Item);
			itemQuantity.value = Math.floor(options.item.gvp__Quantity__c || 0);
			itemQuantityPartial.initialValue = Math.round(((options.item.gvp__Quantity__c || 0) % 1) * ((itemList.value && itemList.value.gvp__Units__c) || 0));
			itemPrice.initialValue = {
				level: options.item.gvp__Price_Level__c,
				price: options.item.gvp__Price__c
			};
		}
		if (options.editItemModal) {
			const close = (options) => {
				options = options || {};
				if (options.button) {
					this.resolve(options.button);
				}
				element.remove();
			}
			// add item popup editor footer button handlers
			this.bind('footer button', 'click', async (event) => {
				const button = event.currentTarget.getAttribute('data-value');
				switch (button) {
					case 'deleteItem':
						if ((await Modal.confirm({ title: `${this.getLabel('Delete')} ${this.descriptions.gvp__Sales_Order_Item__c.label}` }))) {
							await this.deleteItem({ modal: true, onClose: close.bind(this), button: button });
						}
						break;
					case 'saveItem':
						await this.saveItem({ modal: true, onClose: close.bind(this), button: button });
						break;
					default:
						if (await Modal.promptToContinue({ fieldset: fieldset, modified: (this.salesOrderItemEditor && this.salesOrderItemEditor.modified()) || this.modified })) {
							close({ button: button });
						}
						break;
				}
			});	
		}
		this.spinner({ element: element });
		// Return the editor 
		return this.salesOrderItemEditor = {
			modified: () => {
				const value = this.salesOrderItemEditor.value();
				return [
					'gvp__Item__c',
					'gvp__Price__c',
					'gvp__Quantity__c'
				].reduce((modified, field) => modified || (options.item ? (options.item[field] !== value[field]) : value[field]), false);
			},
			valid: () => !itemList.input.classList.contains('invalid') &&
				!itemPrice.input.classList.contains('invalid') &&
				itemPrice.input.checkValidity() &&
				itemQuantity.valid,
			value: () => {
				const item = itemList.value;
				const price = (itemPrice.value && itemPrice.value.value) || 0;
				const quantity = (Number(itemQuantity.value) || 0) + (Number((itemQuantityPartial.value && itemQuantityPartial.value.value) || 0) / ((item || {}).gvp__Units__c || 1));
				return {
					gvp__Extended_Price__c: price * quantity,
					gvp__Item__c: (item && item.Id) || null,
					gvp__Order_Item_Line__c: options.item && options.item.gvp__Order_Item_Line__c,
					gvp__Order_Unit__c: (item || {}).gvp__Unit_of_Measurement__c || null,
					gvp__Price__c: price,
					gvp__Price_Level__c: (itemPrice.value && itemPrice.value.type) || 'Custom',
					gvp__Quantity__c: quantity,
					Item: item
				}
			}
		}
	}

	async save(options) {
		options = options || {};
		if (this.record && (this.record.gvp__Status__c === 'Submitted')) {
			return true;
		} else if (!this.validate()) {
			return false;
		} else if (options.submit) {
			if (await Modal.confirm({
				description: this.getLabel(`Sales_Order_Submit_Message`),
				no: 'Cancel',
				title: `${this.getLabel('Submit')} ${this.description.label}?`,
				yes: 'Submit'
			})) {
				this.record.gvp__Status__c = 'Submitted';
			} else {
				return false;
			}
		} else if (!this.modified) {
			return true;
		}
		this.record = Object.assign(this.record || {}, this.fieldset && this.fieldset.valueForSave);
		this.record.gvp__Order_Item_Count__c = this.items.filter(item => item._changedLocally !== Db.DELETED).length;
		try {
			let result = await Db.save('gvp__Sales_Order__c', this.record);
			this.record.Id = (result && result[0] && result[0].Id) || this.record.Id;
		} catch(error) {
			return App.error(error);
		}
		if (!this.account) {
			await this.fetchAccount(this.record.gvp__Account__c);
			this.nav.header.breadcrumbs = this.account && this.account.Name;
			this.nav.header.render();
		}
		this.items = this.items.filter(item => !((item._changedLocally === Db.DELETED) && !item.Id));
		(await this.saveItems()).forEach((result, index) => this.items[index].Id = (result && result[0] && result[0].Id) || this.items[index].Id);
		await this.saveSignature();
		this.modified = false;
		let errors;
		if (navigator.onLine) {
			this.spinner({ blockInput: true });
			await Db.syncUnsyncedRecords({ descriptions: this.descriptions });
			this.record = await Db.fetchById('gvp__Sales_Order__c', this.record.Id);
			errors = (this.record || {})._errors;
			if (errors) {
				if (!(await Db.revert('gvp__Sales_Order__c', this.record.Id))) {
					await Db.gvp__Sales_Order__c.delete(this.record.Id);
				}
			}
			for (let item of this.items.filter(item => item._errors)) {
				errors.push(item._errors);
				if (!(await Db.revert('gvp__Sales_Order_Item__c', item.Id))) {
					await Db.gvp__Sales_Order_Item__c.delete(item.Id);
				}
			};
			this.spinner();
		}
		this.items = this.items.filter(item => !(item._changedLocally === Db.DELETED) || item._errors);
		Toast.displayMessage({
			element: this.element.querySelector('.message'),
			message: errors ? errors.map(error => error.message) : this.getLabel((this.record.gvp__Status__c === 'Submitted') ? 'Order_Submitted' : 'Records_Updated'),
			onClose: () => errors ? null : this.back(),
			type: errors ? 'error' : 'success'
		});
		return { record: this.record, items: this.items };
	}

	async saveItem(options) {
		options = options || {};
		const value = this.salesOrderItemEditor.value();
		if (value.gvp__Order_Item_Line__c) {
			this.items[value.gvp__Order_Item_Line__c - 1] = Object.assign(
				this.items[value.gvp__Order_Item_Line__c - 1],
				value
			);
		} else {
			this.items.push(Object.assign({}, value, {
				gvp__Sales_Order__c: this.record.Id,
				gvp__Order_Item_Line__c: this.items.length+1
			}));
		}
		this.salesOrderItemEditor = null;
		if (options.modal) {
			options.onClose(options.button);
		} else {
			this.back();
		}
		this.modified = true;
		this.signable.notify(this.hasOrderItems);
		this.submittable.notify(this.canSubmit);
		this.saveable.notify(this.canSave);
		this.renderItems();
	}

	async saveItems() {
		this.items.forEach(item => item.gvp__Sales_Order__c = this.record.Id);
		return await this.saveRecords({
			description: this.descriptions.gvp__Sales_Order_Item__c,
			records: this.items
		});
	}

	async saveSignature() {
		if (!this.signature) {
			return;
		}
		const versionData = this.signature.isEmpty && !this.signature.isEmpty() && this.signature.toDataURL().split(',')[1];
		if (this.signature.image) {
			if (Db.isLocalId(this.signature.image.Id)) {
				if (versionData) {
					this.signature.image.VersionData = versionData;
					return await SalesOrder.saveRecords({ record: this.signature.image, type: 'ContentVersion' });
				} else {
					await SalesOrder.remove({ record: this.signature.image, type: 'ContentVersion' });
				}
			} else {
				await SalesOrder.remove({ record: { Id: this.signature.image.ContentDocumentId }, type: 'ContentDocument' });
			}
		}
		if (versionData) {
			return await Media.save({
				Id: Db.nextId,
				CreatedDate: new Date().toISOString(),
				FileType: 'PNG',
				PathOnClient: 'Signature.png',
				Title: this.getLabel('Signature'),
				VersionData: versionData,
				gvp__Type__c: 'Order'
			}, this.record.Id);
		}
	}




	showLockedMessage() {
		if (this.locked && !this.lockedMessageShown &&
			!(this.record && this.record.gvp__Status__c === 'Submitted')
		) {
			this.lockedToast = Toast.displayMessage({
				autoClose: false,
				element: this.element.querySelector('.message'),
				message: this.getLabel('Sales_Order_Locked'),
				type: 'warning',
				onClose: () => {
					this.lockedMessageShown = false;
					this.signature.on();
				}
			});
			this.lockedMessageShown = true;
		}
	}




	updateStateField() {
		// return;
		let state = this.element.querySelector(`.gvp-edit-state`);
		let text = "";
		text += `this.modified: ${this.modified} `;
		text += `this.canSave: ${this.canSave} `;
		text += `this.canSubmit: ${this.canSubmit} `;
		text += `this.readOnly: ${this.readOnly} `;
		text += `this.locked: ${this.locked} `;
		text += `this.hasOrderItems: ${this.hasOrderItems} `;
		text += `sigIsEmpty: ${this.signature && this.signature.isEmpty ? this.signature.isEmpty() : "no sig yet"}`
		state.innerText = text;
	}



}
