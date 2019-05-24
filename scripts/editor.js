import { AccountImages, ImageList, Media, MediaEditor } from './media.js'
import { AccountsNearby } from './map.js'
import { Api } from './api.js'
import { App } from './app.js'
import { Auth } from './auth.js'
import { CustomObject } from './customObject.js'
import { Dashboard } from './dashboard.js'
import { Db } from './db.js'
import { Fieldset } from './fieldset.js'
import { Geolocation } from './geolocation.js'
import { Header } from './header.js'
import { Icons } from './icons.js'
import { Modal } from './modal.js'
import { Nav } from './nav.js'
import { RelatedList } from './relatedList.js'
import { SalesOrder } from './salesOrder.js'
import { SalesSequence } from './salesSequence.js'
import { Survey } from './survey.js'
import { Tabs } from './tabs.js'
import { Tile } from './tile.js'
import { Toast } from './toast.js'

export class Editor extends CustomObject {
	constructor(options) {
		// This short circuits creating an editor and instead creates a Sales Order
		switch (options && options.type) {
			case 'gvp__Sales_Order__c':
				return new SalesOrder(options);
				break;
		}
		super(options);
		this.record = this.record || { attributes: { type: this.type } };
		this.header = new Header({
			buttons: [],
			breadcrumbs: this.nav && this.nav.header && this.nav.header.breadcrumbs,
			element: document.createElement('header'),
			handler: async (event, detail) => {
				switch(event) {
					case 'action':
						switch(detail.value) {
							case 'accountsNearby':
								if (await Modal.promptToContinue({ fieldset: this.fieldset })) {
									this.accountsNearby = new AccountsNearby({
										breadcrumbs: [
											{
												label: [
													this.record.BillingStreet,
													this.record.BillingCity && `${this.record.BillingCity},`,
													this.record.BillingState,
													this.record.BillingPostalCode
												].filter(s => s).join(' ') || ' '
											}
										],
										currentLocation: {
											latitude: this.record.BillingLatitude || this.record.gvp__Geolocation__Latitude__s,
											longitude: this.record.BillingLongitude || this.record.gvp__Geolocation__Longitude__s,
										},
										element: this.nav.push(document.createElement('div')),
										nav: this.nav,
										title: this.nav.header.title
									});
								}
								break;
							case 'cancel':
								if (await Modal.promptToContinue({ fieldset: this.fieldset })) {
									this.nav.pop();
								}
								break;
							case 'dashboard':
								if (await Modal.promptToContinue({ fieldset: this.fieldset })) {
									this.dashboard = new Dashboard({
										element: this.nav.push(document.createElement('div')),
										nav: this.nav,
										record: this.record
									});
								}
								break;
							case 'delete':
								this.remove();
								break;
							case 'media':
								detail.disabled = true;
								this.nav.header.render();
								if (await Modal.promptToContinue({ fieldset: this.fieldset })) {
									await this.handleMedia();
									detail.disabled = false;
									this.nav.header.render();
								}
								break;
							case 'salesSequence':
								this.salesSequenceElement = new SalesSequence({
									record: this.salesSequence,
									editor: this,
									element: this.nav.push(document.createElement('div')),
									nav: this.nav
								});
								break;
							case 'save':
								this.save();
								break;
							case 'salesOrder':
								if (await Modal.promptToContinue({ fieldset: this.fieldset })) {
									this.salesOrder = new SalesOrder({
										element: this.nav.push(document.createElement('div')),
										nav: this.nav,
										parentId: this.record.Id
									});
								}
								break;
							case 'survey':
								if (await Modal.promptToContinue({ fieldset: this.fieldset })) {
									this.survey = new Survey({
										accountId: this.record.Id,
										element: this.nav.push(document.createElement('div')),
										nav: this.nav
									});
								}
								break;
						}
						break;
					case 'breadcrumb':
						if (await Modal.promptToContinue({ fieldset: this.fieldset })) {
							let n = this.header.breadcrumbs.length - this.header.breadcrumbs.findIndex(element => element === detail);
								while(n-- > 1) {
									this.nav.pop();
								}
						}
						break;
				}
			},
			icon: Icons.icon(this.type),
			menu: [],
			path: this.path || [],
			title: this.title || ''
		});
		this.nav = this.nav || new Nav(this.element, { header: this.header });
		this.element = document.createElement('div');
		this.init();
	}

	get isNew() {
		return !(this.record && this.record.Id && !Db.isLocalId(this.record.Id));
	}

	get name() {
		let nameField = ((this.description && this.description.fields) || []).find(field => field.nameField);
		return (nameField && nameField.name && this.record && this.record[nameField.name]) || (this.record && this.record.Name) || '';
	}

	async handleMedia(options) {
		options = options || {};
		return new Promise((resolve, reject) => {
			let mediaEditor = new MediaEditor({
				breadcrumbs: [this.nav.header.title],
				handler: () => resolve((this.type === 'Account') && this.summary && this.summary.accountPhotos && this.summary.accountPhotos.refresh()
										&& this.summary.activity && this.summary.activity.refresh()),
				images: (this.type === 'Account') ? [] : null,
				nav: this.nav,
				record: this.record
			});
		});
	}

	async init() {
		this.render();
		CustomObject.labels = await Api.labels();
		this.description = await Api.describe(this.type);
		// this will prevent creating duplicate breadcrumbs from multiple calls to render()
		let lastBreadCrumb = this.nav.header && this.nav.header.breadcrumbs && this.nav.header.breadcrumbs && this.nav.header.breadcrumbs.length > 0 && 
							this.nav.header.breadcrumbs[this.nav.header.breadcrumbs.length -1];
		let lastBreadCrumbName = lastBreadCrumb && lastBreadCrumb.label || lastBreadCrumb;
		let breadcrumbs;
		// only tack on more bread crumbs if they aren't the same
		if ((lastBreadCrumbName !== this.description.label) || this.nav.header.breadcrumbs.length === 0) {
			breadcrumbs = this.nav.header.breadcrumbs.concat(this.description.label);
		};
		this.nav.replace(this.render(), Object.assign(this.header, {
			breadcrumbs: breadcrumbs || this.nav.header.breadcrumbs,
			buttons: [
				{ icon: Icons.icon('Back'), label: this.getLabel('Cancel'), value: 'cancel' },
				{ icon: Icons.icon('Photo'), label: this.getLabel('Take_A_Photo'), value: 'media', disabled: true },
				{ icon: Icons.icon('Save'), label: this.getLabel('Save'), value: 'save', disabled: true }
			],
			path: this.path || [],
			title: this.title || `${this.getLabel(this.isNew ? 'New' : 'Edit')} ${this.description.label}`,
			onPop: this.onPop ? this.onPop : null
		}));
		this.spinner();
		if ((this.type === 'Account') && this.record && this.record.Id) {
			const account = await SalesOrder.fetchAccount(this.record.Id);
			const excludedRecordTypes = ((App.mobileSettings && App.mobileSettings.gvp__Sales_Orders_Excluded_Rec_Types__c) || '').split(',');
			if (App.mobileSettings && App.mobileSettings.gvp__Sales_Orders__c &&
				!excludedRecordTypes.includes(account && account.RecordTypeId) &&
				!excludedRecordTypes.includes(account && account.RecordType && account.RecordType.DeveloperName) &&
				!this.nav.header.buttons.find(button => button.value === 'salesOrder')
			) {
				this.nav.header.buttons.splice(2, 0, { icon: Icons.icon('gvp__Sales_Order__c'), label: this.getLabel('Sales_Order'), value: 'salesOrder', disabled: true });
			}
			if (!this.nav.header.buttons.find(button => button.value === 'survey')) {
				this.nav.header.buttons.splice(2, 0, { icon: Icons.icon('Survey'), label: this.getLabel('Survey'), value: 'survey', disabled: true });
			}
			if (!this.nav.header.buttons.find(button => button.value === 'dashboard')) {
				this.nav.header.buttons.splice(1, 0, { icon: Icons.icon('Dashboard'), label: this.getLabel('Dashboard'), value: 'dashboard', disabled: true });
			}
		}
		if (this.parentRelationshipField && this.parentId) {
			this.record[this.parentRelationshipField] = this.parentId;
		}
		if (this.isNew && !(await this.getRecord())) {
			this.layout = await Api.editLayout(this.type, this.recordType);
			this.relatedLists = [];
			await Geolocation.update(this.record);
			await this.setDefaults();
			this.record.Id = Db.nextId;
			if (this.parent) {
				let parentDescription = await Api.describe((this.parent.attributes && this.parent.attributes.type) || this.parentType);
				((parentDescription && parentDescription.fields) || []).filter(field => (field.type === 'reference') && ![undefined, null].includes(this.parent[field.name]))
					.forEach(field => {
						let referenceTo = field.referenceTo && field.referenceTo[0];
						let refField = this.description.fields.find(f => (f.createable && f.referenceTo && f.referenceTo[0]) === referenceTo);
						if (refField && [undefined, null].includes(this.record[refField.name])) {
							this.record[refField.name] = this.parent[field.name];
						}
					})
			}
			this.render('details');
		} else {
			await this.getRecord();
			this.layout = await Api.editLayout(this.type, this.recordType || (this.record && this.record.RecordTypeId));
			this.relatedLists = (await Api.layoutRelatedLists(this.type, this.recordType || (this.record && this.record.RecordTypeId)))
				.filter(relatedList => !App.blacklistedObjects.includes(relatedList.sobject));
			this.nav.replace(this.render((this.type === 'Account') ? 'summary' : 'details'), Object.assign(this.header, {
				path: this.path || [],
				title: this.name || this.nav.header.title,
				onPop: this.onPop ? this.onPop : null
			}));
		}
		if (!['Account'].includes(this.type) && this.record && this.record.Id && !this.nav.header.buttons.find(button => button.value === 'delete')) {
			this.nav.header.buttons.push({ icon: Icons.icon('Delete'), label: this.getLabel('Delete'), value: 'delete', disabled: true });
		}
		if ((this.type === 'Account') && !this.isNew && this.record &&
			(this.record.BillingLatitude || this.record.gvp__Geolocation__Latitude__s) &&
			(this.record.BillingLongitude || this.record.gvp__Geolocation__Longitude__s) &&
			!this.nav.header.buttons.find(button => button.value === 'accountsNearby')
		) {
			this.nav.header.buttons.splice(1, 0, { icon: Icons.icon('Map'), label: this.getLabel('Accounts_Nearby'), value: 'accountsNearby' });
		}
		if (['Account'].includes(this.type) && (this.salesSequence = await SalesSequence.forAccount(this.record.Id))) {
			const viewIndex = this.nav.views.indexOf(this.element);
			let buttons = (viewIndex === (this.nav.views.length - 1)) ? this.nav.header.buttons : this.nav.options[viewIndex].buttons;
			if (await SalesSequence.forceSalesSequence(this.record.Id)) {
				['media'].forEach(value => buttons.splice(buttons.map(button => button.value).indexOf(value), 1));
			}
			if (!buttons.find(button => button.value === 'salesSequence') && !this.isNew) {
				buttons.splice(1, 0, { icon: Icons.icon('gvp__Sales_Sequence__c'), label: this.getLabel('Account_Call'), value: 'salesSequence' });
			}
		}
		this.nav.header.buttons.forEach(button => button.disabled = false);
		Editor.trackPageview(`/Editor/${this.description.name}`);
		this.nav.header.render();
		if (this.record._errors) {
			Toast.displayMessage({
				autoClose: false,
				element: this.element.querySelector('.message'),
				message: this.record._errors.map(error => error.message),
				type: 'error'
			});
		} else if (this.record._changedLocally) {
			Toast.displayMessage({
				element: this.element.querySelector('.message'),
				message: this.getLabel('Not_Saved_To_Salesforce'),
				type: 'info'
			});
		}
		await this.refreshTabs();
	}

	async onRestore(closingEditor, field) {
		if (field.type === 'reference' && !closingEditor.isNew) {
			await this.getRecord();
			this.render();
		}
	}

	async refreshTabs() {
		this.renderRelatedLists();
		await this.updateListSizes();
		this.renderRelatedLists();
	}

	async remove() {
		if (!(await Modal.confirm({ title: `${this.getLabel('Delete')} ${this.description.label}` }))) {
			return;
		}
		try {
			this.spinner({ blockInput: true });
			await super.remove();
		} catch (error) {
			return App.error(error);
		} finally {
			this.spinner();
		}
		Toast.displayMessage({
			element: this.element.querySelector('.message'),
			message: this.getLabel('Records_Deleted'),
			onClose: () => this.nav.pop(),
			type: 'success'
		});
	}

	renderRelatedLists() {
		if (this.relatedLists) {
			this.tabs = new Tabs({
				element: this.element.querySelector('.related-lists'),
				handler: async (event, tab) => {
					switch(event) {
						case 'action':
							if ((this.mode === 'summary') || await Modal.promptToContinue({ fieldset: this.fieldset })) {
								const list = this.relatedLists.find(list => list.name === tab.name);
								if (list) {
									new RelatedList({
										element: this.nav.push(document.createElement('div')),
										nav: this.nav,
										parent: this.record,
										parentType: this.type,
										parentId: this.record.Id,
										parentRelationshipField: list.field,
										name: list.name,
										label: list.label,
										type: list.sobject,
										buttonsLayout: list.buttons,
										columnsLayout: list.columns,
										onPop: () => this.refreshTabs()
									});
								} else {
									this.render(tab.name);
								}
								return true;
							}
							return false;
						break;
					}
				},
				selection: true,
				tabs: ((this.type === 'Account') ? [
					{ label: this.getLabel('Summary'), name: 'summary', selected: this.mode === 'summary' },
					{ label: this.getLabel('Account_Details'), name: 'details', selected: this.mode === 'details' }
				] : []).concat(this.relatedLists.map(list => Object.assign({
					badge: list._recordCount ? `(${list._recordCount})` : '',
					icon: Icons.icon(list.sobject),
					label: list.label,
					name: list.name
				})))
			});
		}
	}

	render(mode) {
		this.mode = mode || this.mode;
		this.element.innerHTML = `
			<style>
				.editor {
					height: 100%;
				}
				.editor .summary {
					height: 90%;
				}
				.details > label, .child .slds-card__body > label {
					display: none;
				}
				.slds-hidden {
					display: none;
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
			<div class="editor slds-scope">
				<div class="related-lists"></div>
				<div class="message slds-hidden"></div>
				<div class="summary slds-hidden"></div>
				<div class="details slds-hidden"></div>
			</div>
		`;
		switch(this.mode) {
			case 'summary':
				this.element.querySelector('.summary').classList.remove('slds-hidden');
				this.summary = new Summary({
					element: this.element.querySelector('.summary'),
					nav: this.nav,
					record: this.record,
					type: this.type
				});
				if (this.nav.header.buttons.find(button => button.value === 'save')) {
					this.nav.header.buttons.splice(this.nav.header.buttons.map(button => button.value).indexOf('save'), 1);
					this.nav.header.render();
				}
				break;
			case 'details':
				if (!this.nav.header.buttons.find(button => button.value === 'save')) {
					this.nav.header.buttons.push({ icon: Icons.icon('Save'), label: this.getLabel('Save'), value: 'save' });
					this.nav.header.render();
				}
				this.element.querySelector('.details').classList.remove('slds-hidden');
				if (this.description && this.layout) {
					this.fieldset = new Fieldset({
						element: this.element.querySelector('.details'),
						fields: this.layout.map(field => Object.assign({
							readOnly: this.isNew ? !(field.editableForNew || ['RecordTypeId'].includes(field.name)) : !field.editableForUpdate,
							required: (field.nillable === false) || (field.required && !field.compoundFieldName),
							section: field.section
						}, this.description.fields.filter(f => f.name === field.name)[0])),
						objectName: this.description.name,
						record: this.record,
						linkLabels: { fieldNames: App.labelLinkTargets, handler: (event, field) => {
							switch(event) {
								case 'labelClick':
									if (field.type === 'reference') {
										this.referenceTo({
											field: field,
											value: field && field.value && field.value.value
										}).then(referenceTo => {
											const editor = new Editor({
												parentRelationshipField: field.name,
												parentId: this.record.Id,
												element: this.nav.push(document.createElement('div'), {
													buttons: []
												}),
												nav: this.nav,
												record: field._value ? { Id: field._value.value } : null,
												type: referenceTo,
												onPop: () => this.onRestore(editor, field)
											})
										});
									}
									break;
							}
						}}
					});
				}
		}
		this.renderRelatedLists();
		return this.element;
	}

	async save() {
		if (this.fieldset && !this.fieldset.valid) {
			Toast.displayMessage({
				element: this.element.querySelector('.message'),
				message: this.getLabel('Input_Validation_Error')
			});
			return Promise.reject('invalid');
		}
		this.record = Object.assign(this.record || {}, this.fieldset && this.fieldset.valueForSave);
		try {
			let result = await Db.save(Db[this.type], this.record);
			this.record.Id = (result && result[0] && result[0].Id) || this.record.Id;
			const allPhotoLinks = Editor.getReferenceIds({
				referenceFields: ['Account', 'gvp__Account_Call__c', 'gvp__Brand__c', 'gvp__Item__c', 'gvp__Label__c'],
				description: this.description,
				record: this.record,
				seedIds: [this.record.Id]
			});
			await Media.save(this.images, allPhotoLinks);
		} catch(error) {
			return App.error(error);
		}
		const isNew = this.isNew;
		let errors;
		if (navigator.onLine) {
			this.spinner({ blockInput: true });
			await Db.syncUnsyncedRecords();
			this.record = await Db.fetchById(this.type, this.record.Id);
			errors = (this.record || {})._errors;
			if (errors) {
				if (!(await Db.revert(this.type, this.record.Id))) {
					await Db[this.type].delete(this.record.Id);
				}
			}
			this.spinner();
		}
		Toast.displayMessage({
			element: this.element.querySelector('.message'),
			onClose: () => isNew && !errors ? this.init() : this.render(),
			message: errors ? errors.map(error => error.message) : this.getLabel(`Records_${isNew ? 'Inserted' : 'Updated'}`),
			type: errors ? 'error' : 'success'
		});
		return { record: this.record };
	}

	async updateListSizes() {
		for (let list of this.relatedLists) {
			try {
				let contentDocumentLinks;
				switch(list.sobject) {
					case 'AttachedContentDocument':
						if (!navigator.onLine) {
							contentDocumentLinks = await Db.ContentDocumentLink
								.where('LinkedEntityId')
								.equals(this.record.Id)
								.toArray();
							if (contentDocumentLinks.length > 0) {
								list['_recordCount'] = await Db.ContentDocument
									.where('Id')
									.anyOf(contentDocumentLinks.map(o => o.ContentDocumentId))
									.and(o => o.FileType !== 'SNOTE')
									.count();
							}
						} else {
							contentDocumentLinks = await Api.query(`
								Select ContentDocumentId
								From ContentDocumentLink
								Where LinkedEntityId = '${this.record.Id}'
							`);
							contentDocumentLinks = contentDocumentLinks && contentDocumentLinks.records;
							if (contentDocumentLinks.length > 0) {
								list['_recordCount'] = (await Api.query(`
									Select Id
									From ContentDocument
									Where (Filetype != 'SNOTE')
									And Id In (${contentDocumentLinks.map(o => `'${o.ContentDocumentId}'`).join(',')})
								`)).totalSize;
							}
						}
						break;
					case 'AttachedContentNote':
						if (!navigator.onLine) {
							contentDocumentLinks = await Db.ContentDocumentLink
								.where('LinkedEntityId')
								.equals(this.record.Id)
								.toArray();
							if (contentDocumentLinks.length > 0) {
								list['_recordCount'] = await Db.ContentNote
									.where('Id')
									.anyOf(contentDocumentLinks.map(o => o.ContentDocumentId))
									.count();
							}
						} else {
							contentDocumentLinks = await Api.query(`
								Select ContentDocumentId
								From ContentDocumentLink
								Where LinkedEntityId = '${this.record.Id}'
							`);
							contentDocumentLinks = contentDocumentLinks && contentDocumentLinks.records;
							if (contentDocumentLinks.length > 0) {
								list['_recordCount'] = (await Api.query(`
									Select Id
									From ContentNote
									Where Id In (${contentDocumentLinks.map(o => `'${o.ContentDocumentId}'`).join(',')})
								`)).totalSize;
							}
						}
						break;
					case 'CombinedAttachment':
						list['_recordCount'] = (await Api.query(`
							Select Id
							From Attachment
							Where ParentId = '${this.record.Id}'
						`)).totalSize;
						break;
					default:
						list['_recordCount'] = (
								!navigator.onLine && Db[list.sobject] &&
								Db[list.sobject].schema.indexes.find(index => index.keyPath === list.field)
							) ? await Db[list.sobject].where(list.field).equals(this.record.Id).count() :
							(await Api.query(`Select Id From ${list.sobject} Where ${list.field} = '${this.record.Id}'`, { sObject: list.sobject })).totalSize
						break;
				}
			} catch (error) {
				console.log(error);
			}
		}
	}
}

class Highlights extends CustomObject {
	constructor(options) {
		super(options);
		this.refresh();
	}

	async refresh() {
		this.type = this.type || (this.record && this.record.attributes && this.record.attributes.type);
		this.description = this.type && await Api.describe(this.type);
		this.compactLayout = this.type && await Api.compactLayout(this.type, this.record && this.record.RecordTypeId);
		this.fields = (this.compactLayout || []).filter(field => field.name !== 'Name');
		this.render();
	}

	render() {
		this.element.innerHTML = `
			<style>
				.highlights {
					display: flex;
					flex-wrap: wrap;
					overflow: auto;
				}
				.highlights article {
					background-color: ${App.secondaryColor};
					width: 46%;
					height: auto;
					margin: .5em !important;
					padding: .5em !important;
					text-align: center;
					white-space: normal !important;
				}
				@media (min-width: 960px) {
					.highlights article {
						width: 31%;
					}
				}
				.highlights article h3 {
					font-weight: 600;
					color: ${App.primaryColor};
					word-wrap: break-word;
				}
			</style>
			<h2><span class="slds-text-heading--medium">${this.getLabel('Highlights')}</span></h2>
			<section class="highlights slds-m-bottom_medium">
				${(this.fields.length > 0) ? this.fields.map(field => {
					field = this.description.fields.find(f => f.name === field.name) || field;
					const type = field.type || 'string';
					let value = this.record[field.name];
					let displayValue = Highlights.displayValue([undefined, null].includes(value) ? '' : value, type);
					if (value && (type === 'reference')) {
						Highlights.referenceDisplayValue({ field: field, value: value })
							.then(refVal => this.element.querySelector(`h3[data-field="${field.name}"]`).innerHTML = refVal);
					}
					return `
						<article class="slds-card">
							<div class="slds-card__body">
								<label class="slds-truncate">${field.label}</label>
								<h3 class="slds-text-heading--medium" data-field="${field.name}">${(type === 'reference') ? '' : displayValue}</h3>
							</div>
						</article>
					`;
				}).join('\n') : (this.type ? `<p class="slds-m-around_small">${this.getLabel('No_Records')}</p>` : '')}
			</section>
		`;
	}
}

class Summary extends CustomObject {
	constructor(options) {
		super(options);
		this.refresh();
	}

	bindEvents() {
		this.bind('.account-buttons .slds-button-group button', 'click', (event, index) =>
			this.buttonHandler(this.buttons[index])
		);
	}

	async buttonHandler(button) {
		if (!button) {
			return;
		}
		let data = Object.assign({}, this.record, Object.keys(this.record).reduce((result, key) => {
			result[key.toLowerCase()] = this.record[key];
			return result;
		}, {}), Auth.auth, {
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
	}

	async refresh() {
		let user = await Api.user();
		this.buttons = (user && ((await Summary.fetchSettings({
			all: true,
			criteria: [
				['gvp__Geography_Key_2__c', user.gvp__Geography_Key__c],
				['gvp__Profile_Id__c', user.ProfileId],
				['gvp__Target_Device__c', App.isSmallScreen ? 'phone' : 'tablet']
			],
			defaultSettings: null,
			type: 'gvp__Settings_Account_Buttons__c'
		}))) || []).sort((b1, b2) => (b1.gvp__Order_Number__c || 0) - (b2.gvp__Order_Number__c || 0));
		this.render();
	}

	renderAccountButtons() {
		return (this.buttons && (this.buttons.length > 0)) ? `
			<div class="account-buttons">
				<div class="slds-button-group" role="group">
					${this.buttons.map(button => `
						<button class="slds-button slds-button_neutral">${button.Name}</button>
					`).join('\n')}
				</div>
			</div>
		` : '';
	}

	render() {
		this.element.innerHTML = `
			<style>
				.account-buttons {
					padding-bottom: 1em;
					text-align: center;
				}
				.account-buttons .slds-button-group {
					display: block;
				}
				.account-buttons .slds-button-group button {
					margin: 0 .3em;
				}
				@media (min-width: 960px) {
					.account-summary {
						display: flex;
						flex-direction: row;
					}
					.account-summary .account-left {
						display: flex;
						flex: 2;
						flex-direction: column;
					}
					.account-summary .account-right {
						display: flex;
						flex: 0;
						flex-direction: column;
						margin-top: 0;
						min-width: 300px;
					}
					.account-summary .account-activity,
					.account-summary .account-buttons,
					.account-summary .account-highlights {
						flex: none;
					}
				}
			</style>
			<div class="account-summary slds-m-around_medium">
				<div class="account-left">
					${App.isSmallScreen ? this.renderAccountButtons() : ''}
					<div class="account-highlights"></div>
					<div class="account-activity"></div>
				</div>
				<div class="account-right">
					${App.isSmallScreen ? '' : this.renderAccountButtons()}
					<div class="account-photos"></div>
				</div>
			</div>
		`;
		this.highlights = new Highlights({
			element: this.element.querySelector('.account-summary .account-highlights'),
			record: this.record,
			type: this.type
		});
		this.activity = new Activity({
			element: this.element.querySelector('.account-summary .account-activity'),
			record: this.record,
			type: this.type,
			nav: this.nav
		});
		this.accountPhotos = new AccountImages({
			element: this.element.querySelector('.account-summary .account-photos'),
			id: this.record.Id,
			nav: this.nav,
			handler: (event) => {
				switch(event) {
					case 'refresh':
						this.activity.refresh();
					break;
				}
			}
		});
		this.bindEvents();
		return this.element;
	}
}

class Activity extends CustomObject {
	constructor(options) {
		super(options);
		this.init();
	}

	static lessOrEqualTodayClause(dateString) {
		const date = new Date(dateString);
		if (date !== "Invalid Date" && !isNaN(date)) {
			if (date.getTime() <= new Date().getTime()) {
				return true;
			}
		}
		return false;
	}

	static sortByLastModifiedDate(r1, r2) {
		let valueA = r1.fields['LastModifiedDate'] ? r1.fields['LastModifiedDate'].value : null;
		let valueB = r2.fields['LastModifiedDate'] ? r2.fields['LastModifiedDate'].value : null;;
		if (new Date(valueA) !== "Invalid Date" && !isNaN(new Date(valueA))) {
			valueA = new Date(valueA).getTime();
			valueB = new Date(valueB).getTime();
		}
		return valueB - valueA;
	}

	static startsWithClause(value, textString) {
		if (typeof value === 'string' && typeof textString === 'string') {
			return value.startsWith(textString);
		}
		return false;
	}

	static withinLastNdaysClause(dateString, days) {
		const date = new Date(dateString);
		if (date !== "Invalid Date" && !isNaN(date)) {
			if (date.getTime() > new Date().getTime() - days * 86400000) {
				return true;
			}
		}
		return false;
	}

	bindEvents() {
		this.bind('.more-button', 'click', () => {
			try {
				event.preventDefault();
				event.stopPropagation();
				if (this.busy === false) {
					return this.retrieveNextChunk();
				}
			} catch (error) {
				console.log(error);
				this.busy = false;
			}
		});
		this.bind('.toggle-tile', 'click', () => {
			const record = this.activities[Number(event.currentTarget.getAttribute('data-index'))];
			if (record) {
				record._showTile = !record._showTile;
				this.render();
			}
			event.preventDefault();
			event.stopPropagation();
		});
		this.bind('.subhead-link', 'click', () => {
			const recordId = event.currentTarget.getAttribute('data-id');
			const type = event.currentTarget.getAttribute('data-type');
			new Editor({
				element: this.nav.push(document.createElement('div')),
				nav: this.nav,
				record: { Id: recordId, type: type },
				type: type
			});
			event.preventDefault();
			event.stopPropagation();
		});
	}

	async init() {
		try {
			this.historyDays = (App.mobileSettings && App.mobileSettings.gvp__Activity_Date_Range__c) || 90;
			Activity.labels = await Api.labels();
			this.onLine = navigator.onLine;
			this.user = await Api.user();
			this.chunksToDisplay = 0;
			this.chunkSize = 12;
			this.activities = [];
			this.busy = false;

			await this.prepareChunkedRetrieve();
			await this.retrieveNextChunk();
		} catch (error) {
			console.log(error);
			this.busy = false;
		}
	}

	async normalize(contextKey, record) {
		const context = this.context.get(contextKey);
		const normalizedRecord = await Activity.normalizeRecord(context, record);
		normalizedRecord._contextKey = contextKey;
		normalizedRecord._showTile = false;
		return normalizedRecord;
	}

	async prepareChunkedRetrieve() {
		this.spinner();
		this.context = new window.Map();

		const miscActivityObjects = [
			'ContentVersion',
			'EmailMessage',
			'Event',
			'gvp__Account_Call__c',
			'gvp__Account_Objective__c',
			'gvp__Survey__c',
			'Task'];

		for (const type of miscActivityObjects) {
			const context = { done: false, type: type, label: '', IDs: [], tileFields: [] };
			context.description = await Api.describe(context.type);
			switch (type) {
				case 'ContentVersion':
					context.queryFields = ['Id', 'CreatedById', 'LastModifiedDate', 'Title'];
					break;
				case 'EmailMessage':
					context.queryFields = ['Id', 'CreatedById', 'LastModifiedDate', 'RelatedToId', 'MessageDate', 'ToAddress', 'Subject', 'TextBody', 'HtmlBody'];
					context.whereClause = `(RelatedToId = '${this.record.Id}') AND (MessageDate >= LAST_N_DAYS:${this.historyDays})`;
					context.tileFields = ['ToAddress', 'Subject', 'TextBody', 'HtmlBody'];
					break;
				case 'Event':
					context.queryFields = ['Id', 'CreatedById', 'LastModifiedDate', 'ActivityDate', 'WhatId', 'WhoId', 'Subject', 'Description'];
					context.whereClause = `(WhatId = '${this.record.Id}') AND (ActivityDate >= LAST_N_DAYS:${this.historyDays})`;
					break;
				case 'gvp__Account_Call__c':
					context.queryFields = ['Id', 'CreatedById', 'LastModifiedDate', 'gvp__Date_of_Call__c', 'gvp__Subject__c', 'gvp__Person_Contacted__c'];
					context.whereClause = `(gvp__Account__c = '${this.record.Id}') AND (gvp__Date_of_Call__c >= LAST_N_DAYS:${this.historyDays})`;
					break;
				case 'gvp__Account_Objective__c':
					context.queryFields = ['Id', 'CreatedById', 'LastModifiedDate', 'Name', 'gvp__Accomplish_by__c', 'gvp__Description__c', 'gvp__Status__c'];
					context.whereClause = `(gvp__Account__c = '${this.record.Id}')`;
					context.whereClause += ` AND (gvp__Status__c LIKE 'Closed%')`;
					context.whereClause += ` AND (gvp__Accomplish_by__c >= LAST_N_DAYS:${this.historyDays})`;
					context.whereClause += ` AND (gvp__Accomplish_by__c <= TODAY)`;
					break;
				case 'gvp__Survey__c':
					context.queryFields = ['Id', 'CreatedById', 'LastModifiedDate', 'Name', 'gvp__Submitted_Date_Time__c', 'gvp__Points__c', 'gvp__Survey_Period__c'];
					context.whereClause = `(gvp__Account__c = '${this.record.Id}')`;
					context.whereClause += ` AND (gvp__Status__c = 'Submitted')`;
					context.whereClause += ` AND (gvp__Submitted_Date_Time__c >= LAST_N_DAYS:${this.historyDays})`;
					break;
				case 'Task':
					context.queryFields = ['Id', 'CreatedById', 'LastModifiedDate', 'ActivityDate', 'WhatId', 'WhoId', 'Subject', 'Description', 'IsClosed'];
					context.whereClause = `(WhatId = '${this.record.Id}') AND (ActivityDate >= LAST_N_DAYS:${this.historyDays})`;
					context.tileFields = ['WhoId', 'Description', 'WhatId'];
					break;
			}
			this.context.set(type, context);
		}

		const salesActivityObjects = [
			{ key: 'accountCall.gvp__By_the_Glass__c', label: 'By_The_Glass' },
			{ key: 'accountCall.gvp__Cocktail_Menu__c', label: 'Cocktail_Menu' },
			{ key: 'accountCall.gvp__Display__c', label: 'Display' },
			{ key: 'accountCall.gvp__Distributor_Meeting__c', label: 'Distributor_Meeting' },
			{ key: 'accountCall.gvp__Staff_Incentive__c', label: 'Staff_Incentive' },
			{ key: 'accountCall.gvp__Order_Commitment__c', label: 'Order_Commitment' },
			{ key: 'accountCall.gvp__POS_Placement__c', label: 'POS_Placement' },
			{ key: 'accountCall.gvp__Presentation__c', label: 'Presentation' },
			{ key: 'accountCall.gvp__Event__c', label: 'Event' },
			{ key: 'accountCall.gvp__Retail_Ad__c', label: 'Retail_Ad' },
			{ key: 'accountCall.gvp__Scan__c', label: 'Scan' },
			{ key: 'accountCall.gvp__Staff_Training__c', label: 'Staff_Training' },
			{ key: 'accountCall.gvp__Well__c', label: 'Well' },
			{ key: 'accountCall.gvp__Wine_List__c', label: 'Wine_List' },
			{ key: 'accountCall.gvp__Account_Objective__c', label: 'Objective' }
		];

		for (const entry of salesActivityObjects) {
			const context = { done: false, type: entry.key.split('.')[1], label: this.getLabel(entry.label), IDs: [], tileFields: [] };
			context.description = await Api.describe(context.type);
			const activityFields = context.description.fields;
			const field = activityFields.filter(function (field) {
				return field.name === 'gvp__Account_Visit__c';
			})[0] || activityFields.filter(function (field) {
				return field.name === 'gvp__Related_Account_Call__c';
			})[0] || activityFields.filter(function (field) {
				return field.name === 'gvp__Account_Call__c';
			})[0];
			const activityFieldNames = activityFields.map(function (field) {
				return field.name;
			});
			context.relationshipFieldName = field.name;

			context.queryFields = ['Id', 'CreatedById', 'LastModifiedDate', 'Name', field].filter(field =>
				activityFieldNames.indexOf(field) >= 0);

			const relationshipFieldName = field.name.replace('__c', '__r');
			context.whereClause = `(${relationshipFieldName}.gvp__Account__c = '${this.record.Id}')`;
			context.whereClause += ` AND (${relationshipFieldName}.gvp__Date_of_Call__c >= LAST_N_DAYS:${this.historyDays})`;
			this.context.set(entry.key, context);
		}

		for (const [contextKey, context] of this.context) {
			if (context.tileFields.length === 0) {
				const compactLayout = await Api.compactLayout(context.type);
				let moreQueryFields = (compactLayout || []).filter(field => context.queryFields.indexOf(field.name) < 0);

				const recordTypeField = context.description.fields.find(field => field.name === 'RecordTypeId');
				if (recordTypeField) {
					moreQueryFields = context.description.fields.filter(field => field.type !== 'base64' && context.queryFields.indexOf(field.name) < 0);
					const recordTypeinfos = context.description.recordTypeInfos.filter(recordTypeInfo => recordTypeInfo.defaultRecordTypeMapping === true);
					if (recordTypeinfos.length > 0) {
						context.currentRecordTypeId = recordTypeinfos[0].recordTypeId;
					}
				}
				moreQueryFields.forEach(field => context.queryFields.push(field.name));
				context.columns = this.prepareTileLayout(compactLayout);
			} else {
				context.columns = [];
				for (const fieldName of context.tileFields) {
					const field = context.description.fields.find(field => field.name === fieldName);
					if (field) {
						const fieldApiName = field.referenceTo.length > 0 ? `${field.name}.Name` : field.name;
						context.columns.push({ fieldApiName: fieldApiName, label: field.label, sortable: field.sortable, sort: 'ascending' });
					}
				}
			}
		}
	}

	prepareTileLayout(compactLayout) {
		return (compactLayout || []).map(field => {
			const fieldApiName = field.referenceTo.length > 0 ? `${field.name}.Name` : field.name;
			return { fieldApiName: fieldApiName, label: field.label, sortable: field.sortable, sort: 'ascending' };
		});
	}

	async processQueryResults(contextKey, response) {
		if (response) {
			const context = this.context.get(contextKey);
			const records = (response.records && response.totalSize) ? response.records : response;
			if (records.length > 0) {
				for (const record of records) {
					context.IDs.push(record.Id);
					const preppedRecord = await this.normalize(contextKey, record);
					this.activities.push(preppedRecord);
				}
				this.activities.sort(Activity.sortByLastModifiedDate);
				if (records.length < this.chunkSize || this.onLine === false) {
					context.done = true;
				}
				this.render();
			} else {
				context.done = true;
			}
		}
	}

	async refresh() {
		this.resetContext();
		this.activities = [];
		await this.retrieveNextChunk();
	}

	retrieveComplete() {
		let complete = true;
		for (const [contextKey, context] of this.context) {
			if (context.done === false) {
				complete = false;
				break;
			}
		}
		return complete;
	}

	async retrieveNextChunk() {
		// if online state has changed since last retrieve, reset activities cache
		if (this.onLine !== navigator.onLine) {
			this.onLine = navigator.onLine;
			this.resetContext();
			this.activities = [];
		}
		// retrieve the next chunk of records unless the next chunk is already cached in memory
		if ((this.chunksToDisplay + 1) * this.chunkSize <= this.activities.length) {
			this.chunksToDisplay += 1;
		} else {
			let moreRecordsRequested = false;
			this.busy = true;
			try {
				this.spinner({ element: this.element });
				if (this.onLine) {
					moreRecordsRequested = await this.retrieveOnline();
				} else {
					// since all database records are retrieved at once when offline, do not attempt to retrieve more
					if (this.activities.length === 0) {
						// prefetch relevant gvp__Account_Call__c records
						let idCache = {};
						const records = await Db.gvp__Account_Call__c
							.where('gvp__Account__c').equals(this.record.Id)
							.and(record => Activity.withinLastNdaysClause(record.gvp__Date_of_Call__c, this.historyDays))
							.sortBy('LastModifiedDate');
						idCache.gvp__Account_Call__c = records.reduce((IDs, record) => {
							IDs.push(record.Id);
							return IDs;
						}, []);

						for (const [contextKey, context] of this.context) {
							if (context.done === false) {
								await this.retrieveOffline(contextKey, idCache);
								moreRecordsRequested = true;
							}
						}
					}
				}
			} catch (error) {
				console.log(error);
			}
			if (moreRecordsRequested) {
				this.chunksToDisplay += 1;
			} else {
				this.chunksToDisplay = Math.floor(this.activities.length / this.chunkSize) + 1;
			}
		}
		this.render();
		this.busy = false;
	}

	async retrieveOffline(contextKey, idCache) {
		const context = this.context.get(contextKey);
		let promise = Promise.resolve();
		if (context.type === 'ContentVersion') {
			promise = Media.images({
				id: this.record.Id,
				historyDays: this.historyDays,
				offset: context.IDs.length
			});
		} else {
			if (contextKey.startsWith('accountCall.')) {
				promise = Db[context.type]
					.where(context.relationshipFieldName)
					.anyOf(idCache.gvp__Account_Call__c)
					.sortBy('LastModifiedDate');
			} else {
				switch (context.type) {
					case 'EmailMessage':
						promise = Db.EmailMessage
							.where('RelatedToId').equals(this.record.Id)
							.and(emailMessage => Activity.withinLastNdaysClause(emailMessage.MessageDate, this.historyDays))
							.sortBy('LastModifiedDate');
						break;
					case 'Event':
						promise = Db.Event
							.where('WhatId').equals(this.record.Id)
							.and(event => Activity.withinLastNdaysClause(event.ActivityDate, this.historyDays))
							.sortBy('LastModifiedDate');
						break;
					case 'gvp__Account_Call__c':
						promise = Db.gvp__Account_Call__c
							.where('gvp__Account__c').equals(this.record.Id)
							.and(gvp__Account_Call__c => Activity.withinLastNdaysClause(gvp__Account_Call__c.gvp__Date_of_Call__c, this.historyDays))
							.sortBy('LastModifiedDate');
						break;
					case 'gvp__Account_Objective__c':
						promise = Db.gvp__Account_Objective__c
							.where('gvp__Account__c').equals(this.record.Id)
							.and(gvp__Account_Objective__c => Activity.startsWithClause(gvp__Account_Objective__c.gvp__Status__c, 'Closed'))
							.and(gvp__Account_Objective__c => Activity.withinLastNdaysClause(gvp__Account_Objective__c.gvp__Accomplish_by__c, this.historyDays))
							.and(gvp__Account_Objective__c => Activity.lessOrEqualTodayClause(gvp__Account_Objective__c.gvp__Accomplish_by__c))
							.sortBy('LastModifiedDate');
						break;
					case 'gvp__Survey__c':
						promise = Db.gvp__Survey__c
							.where('gvp__Account__c').equals(this.record.Id)
							.and(gvp__Survey__c => gvp__Survey__c.gvp__Status__c === 'Submitted')
							.and(gvp__Survey__c => Activity.withinLastNdaysClause(gvp__Survey__c.gvp__Submitted_Date_Time__c, this.historyDays))
							.sortBy('LastModifiedDate');
						break;
					case 'Task':
						promise = Db.Task
							.where('WhatId').equals(this.record.Id)
							.and(task => Activity.withinLastNdaysClause(task.ActivityDate, this.historyDays))
							.sortBy('LastModifiedDate');
						break;
				}
			}
		}
		this.processQueryResults(contextKey, await promise);
	}

	async retrieveOnline() {
		let moreRecordsRequested = false;
		const batchRequests = [];
		const contextKeys = [];
		for (const [contextKey, context] of this.context) {
			if (context.done === false) {
				if (context.type === 'ContentVersion') {
					const records = await Media.images({
						id: this.record.Id,
						historyDays: this.historyDays,
						limit: this.chunkSize,
						offset: context.IDs.length
					});
					this.processQueryResults(contextKey, records);
				} else {
					const queryString = `Select ${context.queryFields.map(fieldName => `${fieldName}`).join(',')}
						From ${context.type}
						Where ${context.whereClause}
						Order By LastModifiedDate Desc
						Limit ${this.chunkSize}
						Offset ${context.IDs.length}`
						;
					batchRequests.push(Api.prepBatchRequest({ queryString }));
					contextKeys.push(contextKey);
				}
				moreRecordsRequested = true;
			}
		}
		if (batchRequests.length > 0) {
			const response = await Api.batchRequest({ batchRequests });
			for (let i = 0; i < response.results.length; ++i) {
				if (response.results[i].statusCode === 200) {
					this.processQueryResults(contextKeys[i], response.results[i].result);
				} else {
					console.log(response.results[i]);
				}
			}
		}
		return moreRecordsRequested;
	}

	render() {
		this.element.innerHTML = `
			<style>
				.activity {
					height: 100%;
					display: flex;
					flex-direction: column;
				}
				.activity article {
					background-color: ${App.secondaryColor};
					height: auto;
					margin: .5em !important;
					padding: .5em !important;
					text-align: center;
				}
				.activity article > * {
					white-space: nowrap;
				}
				.activity article h3 {
					font-weight: 600;
				}
				.slds-timeline {
					flex: 1;
					width: 98%;
					overflow-y: auto;
				}
				.hide-chevron {
					visibility: hidden;
				}
				.more-button {
					height: 40px;
				}
				.slds-timeline__item_expandable .slds-media__figure .slds-button_icon {
					margin-right: .3rem;
				}
			</style>
			<h2><span class="slds-text-heading--medium">${this.getLabel('Activity_Timeline')}</span></h2>
			<section class="activity">
				<ul class="slds-timeline">
				${(this.activities || []).map((record, index) => {
					const context = this.context.get(record._contextKey);
					// use Media line color (gray) for all lines until SLDS makes more classes available beyond Call, Email, Event, Media, and Task
					let timelineClass = 'slds-timeline__item_media';
					const fields = record.fields;
					let headLine = 'Headline';
					let subHead = 'Subhead';

					let userName = this.getLabel('Someone');
					if (record.fields['CreatedById']) {
						userName = ((this.user && this.user.Id) === fields['CreatedById'].value.id) ? this.getLabel('You') : userName = fields['CreatedById'].displayValue;
					}
					userName = `<strong>${userName}</strong>`;

					let whatLink = fields.WhatId && fields.WhatId.value.id ? this.renderLink({
						linkText: fields.WhatId.displayValue,
						recordId: fields.WhatId.value.id,
						type: fields.WhatId.value.apiName
						}) : null;

					const whoField = record._contextKey === 'gvp__Account_Call__c' ? 'gvp__Person_Contacted__c' : 'WhoId';
					let whoLink = fields[whoField] && fields[whoField].value.id ? this.renderLink({
						linkText: fields[whoField].displayValue,
						recordId: fields[whoField].value.id,
						type: fields[whoField].value.apiName
						}) : null;

					switch(record._contextKey) {
						case 'ContentVersion':
							headLine = `${this.getLabel('New_Account_Photo')}: ${fields.Title.displayValue}`;
							subHead = this.getLabel('Timeline_Media');
							subHead = subHead.replace('{UserName}', userName);
							break;
						case 'EmailMessage':
							headLine = `${this.getLabel('Email')}: ${fields.Subject.displayValue}`;
							subHead = this.getLabel('Timeline_EmailMessage');
							subHead = subHead.replace('{UserName}', userName);
							subHead = subHead.replace('{ToAddress}', fields.ToAddress.displayValue);
							break;
						case 'Event':
							headLine = `${this.getLabel('Event')}: ${fields.Subject.displayValue}`;
							if (whoLink) {
								subHead = this.getLabel('Timeline_Event_WhoId');
							} else {
								subHead = this.getLabel('Timeline_Event');
							}
							subHead = subHead.replace('{UserName}', userName);
							subHead = subHead.replace('{WhoId}', whoLink);
							break;
						case 'gvp__Account_Call__c':
							headLine = this.getLabel('Timeline_AccountCall_On');
							headLine = headLine.replace('{Date}', fields.gvp__Date_of_Call__c.displayValue);
							if (whoLink) {
								subHead = this.getLabel('Timeline_AccountCall_WhoId');
							} else {
								subHead = this.getLabel('Timeline_AccountCall');
							}
							subHead = subHead.replace('{UserName}', userName);
							subHead = subHead.replace('{Subject}', fields.gvp__Subject__c.displayValue);
							subHead = subHead.replace('{WhoId}', whoLink);
							break;
						case 'gvp__Account_Objective__c':
							headLine = `${this.getLabel('Objective')}: ${fields.gvp__Description__c.displayValue}`;
							subHead = this.getLabel('Timeline_Objective');
							subHead = subHead.replace('{UserName}', userName);
							subHead = subHead.replace('{Name}', fields.Name.displayValue);
							subHead = subHead.replace('{Status}', fields.gvp__Status__c.displayValue);
							break;
						case 'gvp__Survey__c':
							headLine = `${this.getLabel('Survey')}: ${fields.gvp__Survey_Period__c.displayValue} (${fields.gvp__Points__c.displayValue})`;
							subHead = this.getLabel('Timeline_Survey');
							subHead = subHead.replace('{UserName}', userName);
							subHead = subHead.replace('{Name}', fields.Name.displayValue);
							break;
						case 'Task':
							headLine = this.getLabel('Task');
							if (fields.IsClosed.value === true) {
								if (whoLink && whatLink) {
									subHead = this.getLabel('Timeline_Task_WhoId_WhatId_Completed');
								} else if (whoLink) {
									subHead = this.getLabel('Timeline_Task_WhoId_Completed');
								} else if (whatLink) {
									subHead = this.getLabel('Timeline_Task_WhatId_Completed');
								} else {
									subHead = this.getLabel('Timeline_Task_Completed');
								}
							} else {
								if (whoLink && whatLink) {
									subHead = this.getLabel('Timeline_Task_WhoId_WhatId');
								} else if (whoLink) {
									subHead = this.getLabel('Timeline_Task_WhoId');
								} else if (whatLink) {
									subHead = this.getLabel('Timeline_Task_WhatId');
								} else {
									subHead = this.getLabel('Timeline_Task');
								}
							}
							subHead = subHead.replace('{UserName}', userName);
							subHead = subHead.replace('{Subject}', fields.Subject.displayValue);
							subHead = subHead.replace('{WhoId}', whoLink);
							subHead = subHead.replace('{WhatId}', whatLink);
							break;
						default:
							headLine = context.label;
							subHead = this.getLabel('Timeline_Sales_Activity');
							subHead = subHead.replace('{UserName}', userName);
							subHead = subHead.replace('{Name}', fields.Name ? fields.Name.displayValue : '');
						break;
					}
					const hasFields = context.columns.filter(columnInfo => Tile.displayValue(record, columnInfo, context.description) !== Activity.nullString).length > 0;
					return index < (this.chunksToDisplay * this.chunkSize) ? `
					<li>
						<div class="slds-timeline__item_expandable ${timelineClass}">
							<span class="slds-assistive-text">log_a_call</span>
							<div class="slds-media">
								<div class="slds-media__figure">
									<button data-index=${index} class="toggle-tile slds-button slds-button_icon ${hasFields ? "" : "hide-chevron"}" title="Toggle details for ${headLine}"
									aria-controls="call-item-base" aria-expanded="false">
										<svg class="slds-button__icon ${record._showTile === true ? '' : 'slds-timeline__details-action-icon'}" aria-hidden="true">
											<use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="${Activity.symbols}#switch" />
										</svg>
										<span class="slds-assistive-text">Toggle details for ${headLine}</span>
									</button>

									<div class="slds-icon_container slds-icon-standard-log-a-call slds-timeline__icon" title="call">
										<svg class="slds-icon slds-icon_small ${Icons.icon(context.type).cssClass}" aria-hidden="true">
											<use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="${Icons.icon(context.type).url}" />
										</svg>
									</div>
								</div>
								<div class="slds-media__body">
									<div class="slds-grid slds-grid_align-spread slds-timeline__trigger">
										<div class="slds-grid slds-grid_vertical-align-center slds-truncate_container_75 slds-no-space">
											<h3 class="slds-truncate" title="${headLine}"><strong>${headLine}</strong></h3>
										</div>
										<div class="slds-timeline__actions slds-timeline__actions_inline">
											<p class="slds-timeline__date">${Activity.displayValue(record.fields.LastModifiedDate.value, 'datetime')}</p>
										</div>
									</div>
									<p class="slds-m-horizontal_xx-small">${subHead}</p>
									${ record._showTile === true ? `<div class="tile_${index}"/>` : ''}
								</div>
							</div>
						</div>
					</li>
					` : ''}).join('\n')}
				</ul>
				${ this.retrieveComplete() === false || (this.chunksToDisplay * this.chunkSize) <= this.activities.length  ? `
				<button class="more-button slds-button slds-button_neutral slds-align_absolute-center">
					<svg class="slds-button__icon slds-button__icon_left" aria-hidden="true">
						<use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="${Activity.symbols}#download" />
					</svg>${this.getLabel('Load_More_Activites')}
				</button>` : ''}
			</section>`;
		this.renderTiles();
		this.bindEvents();
		return this.element;
	}

	renderLink(options) {
		return `<a class='subhead-link' data-id=${options.recordId} data-type=${options.type} href="javascript:void(0);"><strong>${options.linkText}</strong></a>`;
	}

	async renderTiles() {
		for (const [index, record] of this.activities.entries()) {
			if (index >= (this.chunksToDisplay * this.chunkSize)) {
				break;
			}
			if (record._showTile === true) {
				const context = this.context.get(record._contextKey);
				if (context.currentRecordTypeId) {
					if (record.fields.RecordTypeId.value.id !== context.currentRecordTypeId) {
						context.currentRecordTypeId = record.fields.RecordTypeId.value.id;
						context.columns = this.prepareTileLayout(await Api.compactLayout(context.type, context.currentRecordTypeId));
					}
				}

				const extractFields = columns => columns.reduce((fields, column) => {
					const fieldName = Object.keys(record.fields).find(key => key === column.fieldApiName.split('.')[0]);
					fields[fieldName] = record.fields[fieldName];
					return fields;
				}, {});

				const filteredColumns = context.columns.filter(columnInfo => Tile.displayValue(record, columnInfo, context.description) !== Activity.nullString);
				if (filteredColumns.length === 0) {
					record._showTile = false;
					setTimeout(() => this.render(), 500);
					continue;
				}

				new Tile({
					columnInfo: [filteredColumns],
					columns: [extractFields(filteredColumns)],
					description: context.description,
					element: this.element.querySelector(`.tile_${index}`),
					handler: (event, detail) => {
						switch (event) {
							case 'select':
								new Editor({
									element: this.nav.push(document.createElement('div')),
									nav: this.nav,
									record: detail,
									type: detail.type
								});
								break;
						}
					},
					id: record.id,
					record: record,
					type: record.apiName
				});
				if (context.type === 'ContentVersion') {
					new ImageList({
						element: this.element.querySelector(`.tile_${index} .tile-images-list`),
						height: App.isSmallScreen ? 0 : 240,
						width: App.isSmallScreen ? 0 : 360,
						images: [Object.keys(record.fields).reduce((image, field) => {
							image[field] = record.fields[field] && record.fields[field].value &&
								(record.fields[field].value.id || record.fields[field].value);
							return image;
						}, {})]
					});

				}
			}
		}
	}

	resetContext() {
		for (const [contextKey, context] of this.context) {
			context.done = false;
			context.IDs = [];
		}
	}
}
