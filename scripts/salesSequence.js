import { Api } from './api.js'
import { App } from './app.js'
import { ButtonGroup } from './buttonGroup.js'
import { CustomObject } from './customObject.js'
import { Dashboard } from './dashboard.js'
import { Db } from './db.js'
import { DraggableList } from './draggableList.js'
import { Fieldset } from './fieldset.js'
import { Geolocation } from './geolocation.js'
import { Header } from './header.js'
import { Icons } from './icons.js'
import { ImageList, Media, MediaEditor } from './media.js'
import { Modal } from './modal.js'
import { Nav } from './nav.js'
import { Path } from './path.js'
import { PopupEditor } from './popupEditor.js'
import { RecordView } from './recordView.js'
import { SalesOrder } from './salesOrder.js'
import { Survey } from './survey.js'
import { Toast } from './toast.js'

export class SalesSequence extends CustomObject {
	constructor(options) {
		super(options);
		this.header = new Header({
			buttons: [],
			breadcrumbs: [],
			element: document.createElement('header'),
			handler: async (event, detail) => {
				switch(event) {
					case 'action':
						switch(detail.value) {
							case 'back':
								if (await this.promptToContinue({
									description: this.getLabel('Are_You_Sure'),
									force: true
								})) {
									this.spinner();
									await this.save();
									this.spinner();
									this.nav.pop();
								}
								break;
						}
					break;
				}
			},
			icon: Icons.icon('gvp__Sales_Sequence__c'),
			menu: [],
			path: [],
			title: (this.nav && this.nav.header && this.nav.header.title) || (
				this.record &&
				this.record.descriptions &&
				this.record.descriptions.gvp__Sales_Sequence__c &&
				this.record.descriptions.gvp__Sales_Sequence__c.label
			) || 'Visit Sequence'
		});
		this.nav = this.nav || new Nav(this.element, { header: this.header });
		this.element = document.createElement('div');
		Api.labels().then(labels => {
			CustomObject.labels = labels;
			this.nav.replace(this.render(), Object.assign(this.header, {
				buttons: (this.nav.views.length > 1) ? [{ label: 'Back', value: 'back' }] : [],
				breadcrumbs: options.record ? [options.record.Name] : []
			}));
			this.refresh(options);
		});
	}

	get modified() {
		return this.fieldset && this.fieldset.modified;
	}

	static async end(salesSequence) {
		if (!(salesSequence && salesSequence.accountCall)) {
			return;
		}
		salesSequence.accountCall.gvp__Sales_Sequence_End_Date_Time__c = (new Date()).toISOString();
		salesSequence.accountCall.gvp__Status__c = 'Completed';
		let result = await this.saveRecords({
			description: await Api.describe('gvp__Account_Call__c'),
			onlineOnly: navigator.onLine,
			records: salesSequence.accountCall
		});
		salesSequence.accountCall.Id = (result && result.id) || salesSequence.accountCall.Id;
		return salesSequence;
	}

	static async forAccount(accountId) {
		if (!accountId) {
			return;
		}
		let result;
		let user = await Api.user();
		let profileId = user && user.ProfileId;
		let profile;
		if (navigator.onLine) {
			result = profileId && await Api.query(`Select Name From Profile Where Id = '${profileId}'`);
			profile = result && result.records && result.records[0];
		} else {
			profile = await Db.Profile.get(profileId);
		}
		let account;
		if (navigator.onLine) {
			result = await Api.query(`Select gvp__Account_Segment__c, RecordTypeId From Account Where Id = '${accountId}'`);
			account = result && result.records && result.records[0];
		} else {
			account = await Db.Account.get(accountId);
		}
		let recordTypeId = account && account.RecordTypeId;
		let recordType;
		if (navigator.onLine) {
			result = recordTypeId && await Api.query(`Select Name From RecordType Where Id = '${recordTypeId}'`);
			recordType = result && result.records && result.records[0];
		} else {
			recordType = await Db.RecordType.get(recordTypeId);
		}
		let segmentId = account && account.gvp__Account_Segment__c;
		let segment;
		if (navigator.onLine) {
			result = segmentId && await Api.query(`Select Name From gvp__Account_Segment__c Where Id = '${segmentId}'`);
			segment = result && result.records && result.records[0];
		} else {
			segment = await Db.gvp__Account_Segment__c.get(segmentId);
		}
		let salesSequence = await SalesSequence.fetchSettings({
			type: 'gvp__Sales_Sequence__c',
			criteria: [
				['gvp__Active__c', true],
				['gvp__Account_Segment__c', segment && segment.Name],
				['gvp__Account_Record_Type__c', recordType && recordType.Name],
				['gvp__Geography_Key__c', user && user.gvp__Geography_Key__c],
				['gvp__User_Profile__c', profile && profile.Name]
			],
			defaultSettings: null,
			minimumScore: 17,
			onlyOne: false
		}) || await SalesSequence.fetchSettings({
			type: 'gvp__Sales_Sequence__c',
			criteria: [
				['gvp__Active__c', true],
				['gvp__Account_Record_Type__c', 'all']
			],
			defaultSettings: null,
			minimumScore: 3
		});
		return salesSequence && Object.assign({ accountId: accountId }, await this.getRecord(salesSequence.Id));
	}

	static async forceSalesSequence(accountId) {
		return App.mobileSettings && App.mobileSettings.gvp__Days_Since_Last_Account_Call_Enabled__c && !(await SalesSequence.recentAccountCalls(accountId));
	}

	static async getDescriptions() {
		let descriptions = {};
		for (let objectName of [
			'Account',
			'Contact',
			'Event',
			'gvp__Account_Call__c',
			'gvp__Account_KPI__c',
			'gvp__Account_Objective__c',
			'gvp__By_the_Glass__c',
			'gvp__Chargeback__c',
			'gvp__Cocktail_Menu__c',
			'gvp__Display__c',
			'gvp__Distributor_Meeting__c',
			'gvp__Event__c',
			'gvp__Expense__c',
			'gvp__Invoice__c',
			'gvp__Order_Commitment__c',
			'gvp__POS_Placement__c',
			'gvp__Planned_Spend__c',
			'gvp__Presentation__c',
			'gvp__Product_Set__c',
			'gvp__Program__c',
			'gvp__Retail_Ad__c',
			'gvp__Sales_Order__c',
			'gvp__Sales_Sequence__c',
			'gvp__Sales_Sequence_Step__c',
			'gvp__Sales_Sequence_Step_Status__c',
			'gvp__Scan__c',
			'gvp__Staff_Incentive__c',
			'gvp__Staff_Training__c',
			'gvp__Survey__c',
			'gvp__Well__c',
			'gvp__Wine_List__c',
			'Task'
		]) {
			descriptions[objectName] = await Api.describe(objectName);
		}
		return descriptions;
	}

	static async getRecord(id) {
		if (!id) {
			return;
		}
		if (navigator.onLine) {
			let result = await Api.query(`
				Select
					Id,
					Name,
					gvp__Account_Record_Type__c,
					gvp__Account_Segment__c,
					gvp__Active__c,
					gvp__Enforce_Order__c,
					gvp__Geography_Key__c,
					gvp__User_Profile__c,
					(
						Select
							Id,
							Name,
							gvp__Order_Number__c,
							gvp__Required__c,
							gvp__Sales_Sequence__c,
							gvp__Subtype__c,
							gvp__Type__c
						From gvp__Sales_Sequence_Steps__r
						Order By gvp__Order_Number__c Asc
					)
				From gvp__Sales_Sequence__c
				Where Id = '${id}'
			`);
			return result && result.records && result.records[0];
		}
		return Object.assign({}, await Db.gvp__Sales_Sequence__c.get(id), {
			gvp__Sales_Sequence_Steps__r: {
				records: await Db.gvp__Sales_Sequence_Step__c.where('gvp__Sales_Sequence__c').equals(id).sortBy('gvp__Order_Number__c')
			}
		});
	}

	static getStepLabel(options) {
		options = options || {};
		if (!options.step) {
			return '';
		}
		switch(options.step.gvp__Type__c) {
			case 'Mobile Button':
				return (
					options.step.gvp__Subtype__c &&
					JSON.parse(options.step.gvp__Subtype__c).Name
				) || this.getStepTypeLabel(options);
				break;
			case 'New Activity':
				return (
					options.step.gvp__Subtype__c &&
					options.descriptions &&
					options.descriptions[options.step.gvp__Subtype__c] &&
					options.descriptions[options.step.gvp__Subtype__c].label
				) || this.getStepTypeLabel(options);
				break;
			case 'Object Listview':
				const listViewSuffix = options.listViewSuffix ? ` ${this.getStepTypeLabel(options).split(' ').slice(-1)}` : '';
				return `${(
					options.step.gvp__Subtype__c &&
					options.descriptions &&
					options.descriptions[options.step.gvp__Subtype__c] &&
					options.descriptions[options.step.gvp__Subtype__c].labelPlural
				) || ''}${listViewSuffix}`;
				break;
			default:
				return this.getStepTypeLabel(options);
		}
	}

	static getStepTypeLabel(options) {
		options = options || {};
		return ((((((options.descriptions && options.descriptions['gvp__Sales_Sequence_Step__c'] || {})
			.fields || [])
			.find(field => field.name === 'gvp__Type__c') || {})
			.picklistValues || [])
			.find(pv => pv.value === options.step.gvp__Type__c) || {}).label) || options.step.gvp__Type__c;
	}

	static async path(salesSequence) {
		await this.start(salesSequence);
		return ((salesSequence.gvp__Sales_Sequence_Steps__r && salesSequence.gvp__Sales_Sequence_Steps__r.records) || [])
			.map(step => Object.assign({}, step))
			.concat([{
				title: `${this.getLabel('End')} ${this.getLabel('Visit')}`,
				type: 'endVisit'
			}]);
	}

	static async recentAccountCalls(accountId) {
		const days = (App.mobileSettings && App.mobileSettings.gvp__Days_Since_Last_Account_Call__c) || 30;
		if (navigator.onLine) {
			let response = await Api.query(`
				Select Id, gvp__Date_of_Call__c, gvp__Status__c
				From gvp__Account_Call__c
				Where (gvp__Account__c = '${accountId}')
				And (gvp__Date_of_Call__c >= LAST_N_DAYS:${days})
				And (gvp__Status__c = 'Completed')
			`);
			return response && response.records && response.records.length;
		}
		const now = new Date().getTime();
		const oneDay = 24 * 60 * 60 * 1000;
		const daysMs = days * oneDay;
		return await Db.gvp__Account_Call__c.where('gvp__Account__c').equals(accountId)
			.and(accountCall => (now - new Date(accountCall.gvp__Date_of_Call__c).getTime()) <= daysMs)
			.and(accountCall => accountCall.gvp__Status__c === 'Completed')
			.toArray();
	}

	static async start(salesSequence) {
		if (!(salesSequence && salesSequence.accountId)) {
			return;
		}
		salesSequence.descriptions = salesSequence.descriptions || await SalesSequence.getDescriptions();
		let result;
		salesSequence.user = salesSequence.user || await Api.user();
		if (!salesSequence.accountCall) {
			let accountCall;
			if (navigator.onLine) {
				result = await Api.query(`
					Select
						Id,
						CreatedById,
						LastModifiedDate,
						gvp__Account__c,
						gvp__Sales_Sequence_End_Date_Time__c,
						gvp__Sales_Sequence_Start_Date_Time__c,
						(
							Select
								Id,
								LastModifiedDate,
								gvp__Account_Call__c,
								gvp__Complete__c,
								gvp__Sales_Sequence_Step__c
							From gvp__Sales_Sequence_Step_Statuses__r
							Where (CreatedById = '${salesSequence.user.Id}')
							Order By LastModifiedDate Desc
						)
					From gvp__Account_Call__c
					Where (CreatedById = '${salesSequence.user.Id}')
						And (gvp__Account__c = '${salesSequence.accountId}')
						And (gvp__Sales_Sequence_End_Date_Time__c = NULL)
						And (gvp__Sales_Sequence_Start_Date_Time__c != NULL)
					Order By LastModifiedDate Desc
				`, { syncInterval: 0 });
				accountCall = result && result.records && result.records[0];
			} else {
				accountCall = (await Db.gvp__Account_Call__c.where('gvp__Account__c')
					.equals(salesSequence.accountId)
					.and(accountCall => accountCall.CreatedById === salesSequence.user.Id)
					.and(accountCall => accountCall.gvp__Sales_Sequence_Start_Date_Time__c)
					.and(accountCall => !accountCall.gvp__Sales_Sequence_End_Date_Time__c)
					.reverse().sortBy('LastModifiedDate'))[0];
				if (accountCall) {
					accountCall.gvp__Sales_Sequence_Step_Statuses__r = {
						records: await Db.gvp__Sales_Sequence_Step_Status__c.where('gvp__Account_Call__c')
							.equals(accountCall.Id)
							.and(accountCall => accountCall.CreatedById = salesSequence.user.Id)
							.reverse()
							.sortBy('LastModifiedDate')
					};
				}
			}
			salesSequence.accountCall = Object.assign({
				isNew: salesSequence.accountCall && salesSequence.accountCall.isNew
			}, (accountCall || {
				attributes: { type: 'gvp__Account_Call__c' },
				gvp__Account__c: salesSequence.accountId,
				gvp__Sales_Sequence_End_Date_Time__c: null,
				gvp__Sales_Sequence_Start_Date_Time__c: (new Date()).toISOString(),
				gvp__Status__c: 'Planning',
				gvp__Subject__c: 'Account Visit',
				isNew: true
			}));
			result = salesSequence.accountCall.isNew && await this.saveRecords({
				description: await Api.describe('gvp__Account_Call__c'),
				onlineOnly: navigator.onLine,
				records: await Geolocation.update(salesSequence.accountCall)
			});
			salesSequence.accountCall.Id = (result && (result.id || (result[0] && result[0].id))) || salesSequence.accountCall.Id;
		}
		let steps = (salesSequence.gvp__Sales_Sequence_Steps__r && salesSequence.gvp__Sales_Sequence_Steps__r.records) || [];
		let records;
		for (let step of steps) {
			step.title = SalesSequence.getStepLabel({ descriptions: salesSequence.descriptions, step: step });
			switch(step.gvp__Type__c) {
				case 'Edit Account Details':
					step.gvp__Subtype__c = 'Account';
					break;
				case 'New Account Call':
					step.record = salesSequence.accountCall;
					step.gvp__Subtype__c = 'gvp__Account_Call__c';
					break;
				case 'New Calendar Event':
				case 'New Follow-up Task':
					step.gvp__Subtype__c = step.gvp__Type__c === 'New Calendar Event' ? 'Event' : 'Task';
				case 'New Activity':
					step.accountField = salesSequence.descriptions[step.gvp__Subtype__c].fields.find(
						field => (field.referenceTo && field.referenceTo[0]) === 'Account'
					);
					step.accountCallField = salesSequence.descriptions[step.gvp__Subtype__c].fields.find(
						field => (field.referenceTo && field.referenceTo[0]) === 'gvp__Account_Call__c'
					);
					if (navigator.onLine) {
						result = !salesSequence.accountCall.isNew && await Api.query(`
							Select Id
							From ${step.gvp__Subtype__c}
							Where ${step.accountCallField.name} = '${salesSequence.accountCall.Id}'
							Order By CreatedDate
						`, { syncInteveral: 0 });
						records = result && result.records || [];
					} else {
						records = (await Db[step.gvp__Subtype__c].where(step.accountCallField.name)
							.equals(salesSequence.accountCall.Id)
							.toArray()
						).sort((r1, r2) => r1.CreatedDate.localCompare(r2.CreatedDate));
					}
					step.record = (records || [])[steps.filter(s => s.gvp__Subtype__c === step.gvp__Subtype__c).map(s => s.Id).indexOf(step.Id)] || {
						attributes: { type: step.gvp__Subtype__c },
					};
					if (step.accountField) {
						step.record[step.accountField.name] = salesSequence.accountId;
					}
					step.record[step.accountCallField.name] = salesSequence.accountCall.Id;
					step.complete = step.complete || !!step.record.Id || (!salesSequence.accountCall.isNew && !step.gvp__Required__c);
					break;
				case 'New Photo':
					step.records = await Media.images(salesSequence.accountCall.Id);
					step.complete = step.complete || (step.records && (step.records.length > 0)) || (!salesSequence.accountCall.isNew && !step.gvp__Required__c);
					break;
				case 'New Sales Order':
					step.accountField = salesSequence.descriptions.gvp__Sales_Order__c.fields.find(
						field => (field.referenceTo && field.referenceTo[0]) === 'Account'
					);
					step.accountCallField = salesSequence.descriptions.gvp__Sales_Order__c.fields.find(
						field => (field.referenceTo && field.referenceTo[0]) === 'gvp__Account_Call__c'
					);
					if (navigator.onLine) {
						result = await Api.query(`
							Select Id
							From gvp__Sales_Order__c
							Where ${step.accountCallField.name} = '${salesSequence.accountCall.Id}'
							And (gvp__Status__c = 'Submitted')
							Order By CreatedDate
						`, { syncInteveral: 0 });
						records = result && result.records || [];
					} else {
						records = (await Db.gvp__Sales_Order__c.where(step.accountCallField.name)
							.equals(salesSequence.accountCall.Id)
							.and(order => order.gvp__Status__c === 'Submitted')
							.toArray()
						).sort((r1, r2) => r1.CreatedDate.localCompare(r2.CreatedDate));
					}
					step.record = (records || [])[steps.filter(s => s.gvp__Type__c === step.gvp__Type__c).map(s => s.Id).indexOf(step.Id)] || {
						attributes: { type: 'gvp__Sales_Order__c' },
					};
					if (step.accountField) {
						step.record[step.accountField.name] = salesSequence.accountId;
					}
					step.record[step.accountCallField.name] = salesSequence.accountCall.Id;
					step.complete = !!step.record.Id;
					break;
				case 'New Survey':
					step.accountField = salesSequence.descriptions.gvp__Survey__c.fields.find(
						field => (field.referenceTo && field.referenceTo[0]) === 'Account'
					);
					step.accountCallField = salesSequence.descriptions.gvp__Survey__c.fields.find(
						field => (field.referenceTo && field.referenceTo[0]) === 'gvp__Account_Call__c'
					);
					if (navigator.onLine) {
						result = await Api.query(`
							Select Id, gvp__Survey_Period__c
							From gvp__Survey__c
							Where ${step.accountCallField.name} = '${salesSequence.accountCall.Id}'
							And (gvp__Status__c = 'Submitted')
							Order By CreatedDate
						`, { syncInteveral: 0 });
						records = result && result.records || [];
					} else {
						records = (await Db.gvp__Survey__c.where(step.accountCallField.name)
							.equals(salesSequence.accountCall.Id)
							.and(survey => survey.gvp__Status__c === 'Submitted')
							.toArray()
						).sort((r1, r2) => r1.CreatedDate.localCompare(r2.CreatedDate));
					}
					step.record = (records || [])[steps.filter(s => s.gvp__Type__c === step.gvp__Type__c).map(s => s.Id).indexOf(step.Id)] || {
						attributes: { type: 'gvp__Survey__c' },
					};
					if (step.accountField) {
						step.record[step.accountField.name] = salesSequence.accountId;
					}
					step.record[step.accountCallField.name] = salesSequence.accountCall.Id;
					step.complete = !!step.record.Id;
					break;
				case 'Object Listview':
					step.accountField = salesSequence.descriptions[step.gvp__Subtype__c].fields.find(
						field => (field.referenceTo && field.referenceTo[0]) === 'Account'
					);
					step.accountCallField = salesSequence.descriptions[step.gvp__Subtype__c].fields.find(
						field => (field.referenceTo && field.referenceTo[0]) === 'gvp__Account_Call__c'
					);
					break;
				default:
					break;
			}
			step.status = ((
				salesSequence.accountCall.gvp__Sales_Sequence_Step_Statuses__r &&
				salesSequence.accountCall.gvp__Sales_Sequence_Step_Statuses__r.records
			) || []).find(status => status.gvp__Sales_Sequence_Step__c === step.Id) || {
				gvp__Account_Call__c: salesSequence.accountCall.Id,
				gvp__Sales_Sequence_Step__c: step.Id
			};
		}
		steps.forEach((step, index) => {
			step.active = step.current = false;
			if ((index > 0) && !steps[index-1].complete) {
				step.complete = false;
			} else if (!salesSequence.accountCall.isNew &&
				(step.complete === undefined) &&
				((index === 0) || steps.find((s, i) => s.complete && (i > index)))
			) {
				step.complete = true;
			}
		});
		(steps.find(step => step.Id === (salesSequence.activeStep || {}).Id) || {}).active = true;
		(steps.find(step => !step.complete) || steps[steps.length-1] || {}).current = true;
		return salesSequence;
	}

	bindEvents() {
	}

	async promptToContinue(options) {
		options = options || {};
		return (!this.modified && !options.force) || await Modal.confirm({
			title: options.title || this.getLabel('Mobile_Continue'),
			description: options.description || this.getLabel('Mobile_Leave_Page')
		});
	}

	async refresh() {
		this.spinner();
		this.path = await SalesSequence.path(this.record);
		this.render();
	}

	render() {
		let pathScroll = (this.element.querySelector('.path') || {}).scrollLeft || 0;
		this.element.innerHTML = `
			<style>
				.path, .step {
					margin: 0 .75em;
				}
				.step .slds-card {
					border: none;
					box-shadow: none;
				}
				.step .slds-card .slds-card__header {
					border-bottom: 1px solid #dddbda;
					margin: 0;
					padding-right: 0;
					padding-top: 0;
				}
				.step .slds-card .slds-card__header-title {
					color: #777;
					display: flex;
					margin-bottom: 5px;
				}
				.step .slds-card .slds-card__header-title > * {
					align-self: flex-end;
					flex: none;
				}
				.step .slds-card .slds-card__header-title .step-container-button-group {
					flex: 1;
					text-align: right;
					width: 0;
				}
				@media (min-width: 720px) {
					.sequence .step fieldset section > div {
						display: inline-block;
						width: 49.75%;
					}
				}
				@media (min-width: 1080px) {
					.sequence .step fieldset section > div {
						width: 33%;
					}
				}
				@media (min-width: 1440px) {
					.sequence .step fieldset section > div {
						width: 24.75%;
					}
				}
				.path {
					overflow: auto;
					width: 99%;
				}
				.step .nav > header {
					display: none;
				}
			</style>
			<div class="sequence">
				<div class="message slds-hidden"></div>
				<div class="path"></div>
				<div class="step"></div>
			<div>
		`;
		this.activityStep = this.fieldset = this.survey = null;
		this.pathElement = new Path({
			element: this.element.querySelector('.path'),
			handler: async (event, detail) => {
				switch(event) {
					case 'selectItem':
						if (this.survey && this.survey.survey && (this.survey.survey.gvp__Status__c !== 'Submitted') &&
							!await Modal.confirm({
								description: this.getLabel('Sales_Sequence_Survey_Not_Submitted'),
								no: 'Cancel',
								title: this.getLabel('Survey_Not_Submitted'),
								yes: 'Ok'
							})
						) {
							break;
						}
						if (detail.type === 'endVisit') {
							if (await this.save() && (this.validate() || await this.promptToContinue({
								description: this.getLabel('Sales_Sequence_Required_Step_Incomplete'),
								force: true
							}))) {
								await SalesSequence.end(this.record);
								this.nav.pop();
								this.editor.init();
							}
							break;
						}
						let steps = this.record.gvp__Sales_Sequence_Steps__r.records || [];
						let step = steps.find(step => step.Id === detail.Id);
						if ((!this.record.activeStep || (this.record.activeStep !== step)) && await this.save()) {
							if (!this.record.gvp__Enforce_Order__c || step.complete || step.current ||
								steps.find(
									(s, i) => ((s === step) && (i === 0)) || ((s.complete || (!s.gvp__Required__c && (s.current || s.active))) && steps[i+1] && (steps[i+1] === step))
								)
							) {
								this.record.activeStep = step;
								this.refresh();
							} else {
								Toast.displayMessage({
									element: this.element.querySelector('.message'),
									message: this.getLabel('Sales_Sequence_Step_Must_Be_Completed'),
									onClose: this.refresh.bind(this)
								});
							}
						}
						break;
				}
			},
			items: this.path
		});
		this.element.querySelector('.path').scrollLeft = pathScroll;
		if (this.path && !this.record.activeStep) {
			this.nav.element.querySelector('.slds-path ul li.slds-is-current').click();
		} else {
			const activeStep = this.path && this.record && this.record.activeStep && this.record.activeStep;
			if (activeStep) {
				switch(activeStep.gvp__Type__c) {
					case 'Edit Account Details':
						SalesSequence.trackPageview(`/SalesVisit/${activeStep.gvp__Subtype__c}`);
						this.renderAccountStep();
						break;
					case 'Mobile Button':
						this.renderMobileButtonStep();
						break;
					case 'New Account Call':
						SalesSequence.trackPageview(`/SalesVisit/${activeStep.gvp__Subtype__c}`);
						this.renderAccountCallStep();
						break;
					case 'New Activity':
					case 'New Calendar Event':
					case 'New Follow-up Task':
					case 'New Sales Order':
						SalesSequence.trackPageview(`/SalesVisit/${activeStep.gvp__Subtype__c}`);
						const type = (activeStep.gvp__Type__c === 'New Sales Order') ? 'gvp__Sales_Order__c' : activeStep.gvp__Subtype__c;
						const description = this.record.descriptions[type];
						this.activityStep = new ActivityStep({
							element: this.renderStepContainer({
								buttonGroup: {
									buttons: [{
										icon: Icons.icon('New'),
										label: `${this.getLabel('Add')} ${description.label}`,
										value: 'add'
									}],
									handler: async (event, detail) => {
										switch(event) {
											case 'button':
											case 'menu':
												switch(detail.value) {
													case 'add':
														this.activityStep.addOrEditRecord();
														break;
												}
												break;
										}
									}
								},
								title: description.label
							}),
							nav: this.nav,
							parentRelationshipField: activeStep.accountField.name,
							parentId: this.record.accountId,
							accountCall: this.record.accountCall,
							description: description,
							type: type
						});
						break;
					case 'New Photo':
						SalesSequence.trackPageview('/SalesVisit/Photo');
						this.renderPhotoStep();
						break;
					case 'New Survey':
						this.renderSurveyStep();
						break;
					case 'Object Listview':
						SalesSequence.trackPageview(`/SalesVisit/ListView/${activeStep.gvp__Subtype__c}`);
						this.renderObjectListViewStep();
						break;
					case 'View Dashboard':
						this.renderDashboardStep();
						break;
					default:
						const element = this.renderStepContainer({ title: SalesSequence.getStepLabel({ step: this.record.activeStep }) });
						element.innerHTML = '';
						break;
				}
			}
		}
		this.bindEvents();
		return this.element;
	}

	async renderAccountStep() {
		let step = this.record.activeStep;
		let description = this.record.descriptions.Account;
		step.record = await CustomObject.getRecord({ description: description, id: this.record.accountCall.gvp__Account__c });
		let layout = await Api.editLayout('Account');
		this.fieldset = new Fieldset({
			element: this.renderStepContainer({ title: description.label }),
			fields: layout.filter(field => field.name !== 'gvp__Account__c')
				.map(field => Object.assign({
					readOnly: !field.editableForUpdate,
					required: (field.nillable === false) || (field.required && !field.compoundFieldName),
					section: field.section
				}, description.fields.filter(f => f.name === field.name)[0])),
			objectName: description.name,
			record: step.record
		});
	}

	async renderAccountCallStep() {
		let record = this.record.accountCall;
		let description = this.record.descriptions.gvp__Account_Call__c;
		record = await CustomObject.getRecord({ description: description, id: record.Id });
		let layout = await Api.editLayout('gvp__Account_Call__c');
		this.fieldset = new Fieldset({
			element: this.renderStepContainer({ title: description.label }),
			fields: layout.filter(field => field.name !== 'gvp__Account__c')
				.map(field => Object.assign({
					readOnly: !field.editableForUpdate,
					required: (field.nillable === false) || (field.required && !field.compoundFieldName),
					section: field.section
				}, description.fields.filter(f => f.name === field.name)[0])),
			objectName: description.name,
			record: record
		});
	}

	async renderDashboardStep() {
		let record = await CustomObject.getRecord({ description: this.record.descriptions.Account, id: this.record.accountId });
		this.dashboard = new Dashboard({
			element: this.renderStepContainer({ title: this.getLabel('Dashboard') }),
			inline: true,
			record: record
		});
	}

	async renderMobileButtonStep() {
		let step = this.record.activeStep;
		let stepLabel = SalesSequence.getStepLabel({ step: step });
		let stepContainer = this.renderStepContainer({ title: stepLabel });
		stepContainer.innerHTML = `
			<div class="slds-m-around_medium">${this.getLabel('Sales_Sequence_Mobile_Button_Instructions').replace('{Button.Name}', stepLabel)}</div>
			<button class="slds-button slds-button_brand slds-m-around_medium">${stepLabel}</button>
		`;
		stepContainer.querySelector('button').addEventListener('click', async () => {
			let button = JSON.parse(step.gvp__Subtype__c);
			let record = await CustomObject.getRecord({ id: button.Id, type: button.attributes.type });
			let url = record && record.gvp__Link_URL__c;
			App.navigateToUrl({ external: true, url: url });
		});
	}

	async renderObjectListViewStep() {
		let step = this.record.activeStep;
		let type = step.gvp__Subtype__c;
		let description = this.record.descriptions[type];
		let stepLabel = SalesSequence.getStepLabel({ descriptions: this.record.descriptions, step: step });
		let stepContainer = this.renderStepContainer({
				buttonGroup: {
					buttons: [{
						icon: Icons.icon('New'),
						label: `${this.getLabel('Add')} ${description.label}`,
						value: 'add'
					}],
					handler: async (event, detail) => {
						switch(event) {
							case 'button':
							case 'menu':
								switch(detail.value) {
									case 'add':
										step.listView.addOrEditRecord();
										break;
								}
								break;
						}
					}
				},
				title: stepLabel });
		stepContainer.innerHTML = `
			<div class="object-listview"></div>
		`;
		step.listView = new ObjectListViewStep({
			accountCall: this.record.accountCall,
			description: description,
			element: stepContainer.querySelector('.object-listview'),
			nav: this.nav,
			parentRelationshipField: step.accountField.name,
			parentId: this.record.accountId,
			sortBy: step.listView && step.listView.sortBy,
			type: type
		 });
	}

	async renderPhotoStep() {
		let step = this.record.activeStep;
		let stepContainer = this.renderStepContainer({
			buttonGroup: {
				buttons: [
					{
						disabled: true,
						label: this.getLabel('Select_All'),
						value: 'selectAll'
					},
					{
						disabled: true,
						label: this.getLabel('Deselect_All'),
						value: 'deselectAll'
					},
					{
						disabled: true,
						label: this.getLabel('Delete'),
						value: 'delete'
					},
					/*
					{
						disabled: true,
						label: this.getLabel('Edit'),
						value: 'edit'
					},
					*/
					{
						disabled: !step.records || (step.records.length === 0),
						label: this.capitalize(this.getLabel('Select')),
						selectable: true,
						value: 'select'
					},
					{
						label: this.getLabel('Add'),
						value: 'add'
					}
				],
				handler: async (event, detail) => {
					switch(event) {
						case 'button':
						case 'menu':
							switch(detail.value) {
								case 'add':
									step.mediaEditor = new MediaEditor({
										allowDelete: false,
										breadcrumbs: [ this.record.Name ],
										handler: this.refresh.bind(this),
										images: [],
										nav: this.nav,
										record: this.record.accountCall,
										saveAndNew: true
									});
									break;
								case 'delete':
									await step.imageList.removeSelectedImages();
									break;
								case 'deselectAll':
									step.imageList.deselectAll();
									break;
								case 'edit':
									break;
								case 'select':
									step.imageList.deselectAll();
									step.imageList.allowSelect = step.imageList.allowSelect = detail.selected;
									step.imageList.render();
									break;
								case 'selectAll':
									step.imageList.selectAll();
									break;
							}
							step.updateButtonGroup();
							break;
					}
				}
			},
			title: `${this.getLabel('Visit')} ${this.getLabel('Photos')}`
		});
		stepContainer.innerHTML = `
			<div class="new-photo-image-list"></div>
		`;
		step.updateButtonGroup = step.updateButtonGroup || (() => {
			step.buttonGroup.label = (step.imageList.selectedImages.length > 0) ? `${step.imageList.selectedImages.length} ${this.getLabel('Items').toLowerCase()} ${this.getLabel('Selected').toLowerCase()}` : '';
			let select = step.buttonGroup.button('select').selected;
			['delete', 'edit', 'deselectAll'].forEach(value =>
				step.buttonGroup.disabled(value, !select || (step.imageList.selectedImages.length === 0))
			);
			step.buttonGroup.disabled('selectAll', !select || (step.imageList.selectedImages.length === step.imageList.images.length));
		});
		step.imageList = new ImageList({
			element: stepContainer.querySelector('.new-photo-image-list'),
			handler: (event, detail) => {
				switch(event) {
					case 'removeSelectedImages':
						break;
					case 'selectImage':
						step.updateButtonGroup();
						break;
				}
			},
			height: App.isSmallScreen ? 100 : 120,
			images: step.records,
			width: App.isSmallScreen ? 152 : 180
		});
	}

	async renderSurveyStep() {
		let step = this.record.activeStep;
		let stepLabel = SalesSequence.getStepLabel({ step: step });
		let stepContainer = this.renderStepContainer();
		let survey = step.record;
		this.survey = new Survey({
			accountId: this.record.accountId,
			accountCallId: this.record.accountCall.Id,
			element: stepContainer,
			onlineOnly: navigator.onLine,
			sequenceNav: this.nav
		});
	}

	renderStepContainer(options) {
		options = options || {};
		this.element.querySelector('.step').innerHTML = `
			<style>
				.watermark {
					background: url("${SalesSequence.baseUrl}images/watermark-logo.png");
					background-repeat: no-repeat;
					background-position: center;
					background-size: contain;
					height: 20em;
				}
				.slds-card__body.nav {
					padding: 0;
				}
			</style>
			<article class="slds-card">
				${options.title ? `
					<div class="slds-card__header slds-grid">
						<header class="slds-has-flexi-truncate">
							<h2 class="slds-card__header-title">
								<span class="slds-text-heading--medium">${options.title || ''}</span>
								<span class="step-container-button-group"></span>
							</h2>
						</header>
					</div>
				` : ''}
				<div class="slds-card__body slds-card__body_inner"></div>
			</article>
		`;
		if (options.buttonGroup) {
			this.record.activeStep.buttonGroup = new ButtonGroup(Object.assign({
				element: this.element.querySelector(
					'.step .slds-card .step-container-button-group'
				)
			}, options.buttonGroup));
		}
		return this.element.querySelector('.step .slds-card .slds-card__body');
	}

	async save() {
		if (!(this.record && this.record.activeStep)) {
			return true;
		}
		if (this.fieldset && !this.fieldset.valid) {
			Toast.displayMessage({
				element: this.element.querySelector('.message'),
				message: this.getLabel('Input_Validation_Error')
			});
			return false;
		}
		let step = this.record.activeStep;
		switch (step.gvp__Type__c) {
			case 'New Activity':
			case 'New Calendar Event':
			case 'New Follow-up Task':
				step.complete = step.gvp__Required__c ? (this.activityStep && (this.activityStep.items.length > 0)) : true;
				break;
			case 'New Photo':
				step.complete = step.gvp__Required__c ? (step.records.length > 0) : true;
				break;
			case 'New Sales Order':
				step.complete = step.gvp__Required__c ?
					(this.activityStep && ((this.activityStep.items || []).filter(
						item => item.fields.gvp__Status__c.value === 'Submitted'
					).length > 0)) : true;
				break;
			case 'New Survey':
				step.complete = step.complete || (step.record && (step.record.gvp__Status__c === 'Submitted')) ||
					(this.survey && this.survey.survey && (this.survey.survey.gvp__Status__c === 'Submitted'));
				break;
			default:
				step.complete = true;
				break;
		}
		if (this.fieldset && this.fieldset.modified) {
			step.record = Object.assign(step.record || {}, this.fieldset && this.fieldset.valueForSave);
			let response = await this.saveRecords({
				description: this.record.descriptions.step.gvp__Subtype__c,
				onlineOnly: navigator.onLine,
				records: step.record
			});
			step.record.Id = (response && response.id) || step.record.Id;
			step.complete = true;
		}
		if (this.survey && this.survey.survey && (this.survey.survey.gvp__Status__c !== 'Submitted')) {
			try {
				await this.survey.save('Saved');
			} catch(error) {
				return false;
			}
		}
		if ((step.status.gvp__Complete__c !== step.complete) || this.modified) {
			step.status = Object.assign(step.status, { Id: undefined, gvp__Complete__c: step.complete });
			let response = await this.saveRecords({
				description: this.record.descriptions.gvp__Sales_Sequence_Step_Status__c,
				onlineOnly: navigator.onLine,
				records: step.status
			});
			step.status.Id = (response && response.id) || step.status.Id;
		}
		let steps = (this.record.gvp__Sales_Sequence_Steps__r && this.record.gvp__Sales_Sequence_Steps__r.records) || [];
		steps.forEach((step, index) => {
			if (this.record.gvp__Enforce_Order__c) {
				step.complete = step.complete && ((index === 0) || steps[index-1].complete);
			}
			step.current = false;
		});
		(steps.find(step => !step.complete) || steps[steps.length-1] || {}).current = true;
		return step;
	}

	validate() {
		let steps = (this.record && this.record.gvp__Sales_Sequence_Steps__r && this.record.gvp__Sales_Sequence_Steps__r.records) || [];
		return steps.reduce((valid, step) => valid && (step.complete || !step.gvp__Required__c), true);
	}
}

export class SalesSequenceEditor extends CustomObject {
	constructor(options) {
		super(options);
		this.record = this.record || {
			attributes: { type: 'gvp__Sales_Sequence__c' },
			Id: SalesSequence.parseArgs().salesSequenceId
		};
		this.header = new Header({
			buttons: [],
			breadcrumbs: [],
			element: document.createElement('header'),
			handler: async (event, detail) => {
				switch(event) {
					case 'action':
						switch(detail.value) {
							case 'cancel':
								if (await this.promptToContinue()) {
									this.goBack(this.record.Id);
								}
								break;
							case 'delete':
								this.remove();
								break;
							case 'save':
								detail.disabled = true;
								this.nav.header.render();
								this.save()
									.then(sequenceId => this.goBack(sequenceId))
									.catch(() => {
										detail.disabled = false;
										this.nav.header.render();
									});
								break;
						}
						break;
				}
			},
			icon: Icons.icon('gvp__Sales_Sequence__c'),
			menu: [],
			title: 'Visit Sequence'
		});
		this.nav = this.nav || new Nav(this.element, { header: this.header });
		this.element = document.createElement('div');
		this.init();
	}

	get isNew() {
		return !(this.record && this.record.Id && !this.record.Id.startsWith('_'));
	}

	get modified() {
		return this.fieldset.modified || this.selectedSteps.modified;
	}

	get name() {
		let nameField = ((this.description && this.description.fields) || []).find(field => field.nameField);
		return (nameField && nameField.name && this.record && this.record[nameField.name]) || this.record.Name || '';
	}

	get selectedStep() {
		return ((this.selectedSteps && this.selectedSteps.items) || []).find(item => item.selected);
	}

	bindEvents() {
		this.bind('.slds-panel__header .slds-panel__close', 'click', event => this.selectStep());
		this.bind('input[name="checkbox-toggle-required"]', 'click', event => this.requireStep(event.srcElement.checked));
	}

	async getRecord() {
		return this.record = await SalesSequence.getRecord(this.record.Id);
	}

	getStepStyle(step) {
		return {
			backgroundColor: 'white',
			border: '1px solid gray',
			color: 'black'
		};
		switch(step.gvp__Type__c) {
			case 'Edit Account Details':
			case 'Mobile Button':
			case 'Send Email':
				return {
					backgroundColor: 'lightcoral',
					color: 'black'
				};
			case 'New Calendar Event':
			case 'New Follow-up Task':
				return {
					backgroundColor: 'lightblue',
					color: 'black'
				};
			case 'Object Listview':
			case 'View Dashboard':
				return {
					backgroundColor: 'lightgreen',
					color: 'black'
				};
			default:
				return {
					backgroundColor: 'lightyellow',
					color: 'black'
				};
		}
	}

	getStepIcon(step) {
		let iconType;
		switch(step.gvp__Type__c) {
			case 'Edit Account Details':
				iconType = 'Account';
				break;
			case 'Mobile Button':
				iconType = 'Button';
				break;
			case 'New Account Call':
				iconType = 'gvp__Account_Call__c';
				break;
			case 'New Activity':
				iconType = step.gvp__Subtype__c || 'Activity';
				break;
			case 'New Calendar Event':
				iconType = 'Event';
				break;
			case 'New Follow-up Task':
				iconType = 'Task';
				break;
			case 'New Photo':
				iconType = 'gvp__Media__c';
				break;
			case 'New Sales Order':
				iconType = 'gvp__Sales_Order__c';
				break;
			case 'New Survey':
				iconType = 'gvp__Survey__c';
				break;
			case 'Object Listview':
				iconType = step.gvp__Subtype__c || 'Listview';
				break;
			case 'Send Email':
				iconType = 'Email';
				break;
			case 'View Dashboard':
				iconType = 'Dashboard';
				break;
			default:
				iconType = null;
		}
		return { icon: Icons.icon(iconType) };
	}

	getStepLabel(step) {
		return SalesSequence.getStepLabel({ descriptions: this.descriptions, step: step, listViewSuffix: true });
	}

	getStepTypeLabel(step) {
		return SalesSequence.getStepTypeLabel({ descriptions: this.descriptions, step: step });
	}

	async goBack(id) {
		if (this.nav.views.length > 1) {
			this.nav.pop();
		} else {
			window.top.location.replace(`${(await Api.auth).instance_url}/${id || `${this.description.keyPrefix}/o`}`);
		}
	}

	async init() {
		this.render();
		this.spinner({ blockInput: true });
		await App.registerServiceWorker();
		CustomObject.labels = await Api.labels();
		let result = await Api.query("Select Name from RecordType Where SObjectType = 'Account' Order By Name");
		this.accountRecordTypes = (result && result.records) || [];
		result = await Api.query("Select Name from gvp__Account_Segment__c Order By Name");
		this.accountSegments = (result && result.records) || [];
		result = await Api.query('Select Name From Profile Order By Name');
		this.userProfiles = (result && result.records) || [];
		result = await Api.query('Select gvp__Geography_Key__c from User Where gvp__Geography_Key__c != NULL Order By gvp__Geography_Key__c');
		this.userGeographyKeys = ((result && result.records) || []).map(userGeo => userGeo.gvp__Geography_Key__c)
			.filter((userGeo, index, array) => array.indexOf(userGeo) === index);
		this.description = await Api.describe('gvp__Sales_Sequence__c');
		this.nav.replace(this.render(), Object.assign(this.header, {
			buttons: [
				{ icon: Icons.icon('Back'), label: this.getLabel('Cancel'), value: 'cancel' },
				{ icon: Icons.icon('Save'), label: this.getLabel('Save'), value: 'save' }
			],
			title: this.title || `${this.getLabel(this.isNew ? 'New' : 'Edit')} ${this.description.label}`
		}));
		this.spinner({ blockInput: true });
		if (this.isNew) {
			await this.setDefaults()
			this.render('gvp__Sales_Sequence__c');
		} else {
			await this.getRecord();
			this.nav.replace(this.render(), Object.assign(this.header, { title: this.name }));
		}
		this.spinner({ blockInput: true });
		if (this.record && this.record.Id && !this.nav.header.buttons.find(button => button.value === 'delete')) {
			this.nav.header.buttons.push({ icon: Icons.icon('Delete'), label: this.getLabel('Delete'), value: 'delete' });
			this.nav.header.render();
		}
		this.descriptions = await SalesSequence.getDescriptions();
		this.render();
	}

	async promptToContinue() {
		return !this.modified || await Modal.confirm({
			title: this.getLabel('Mobile_Continue'),
			description: this.getLabel('Mobile_Leave_Page')
		});
	}

	async remove() {
		if (!(await Modal.confirm({ title: `${this.getLabel('Delete')} ${this.description.label}` }))) {
			return;
		}
		this.spinner();
		await Api.remove(this.record, 'gvp__Sales_Sequence__c');
		this.goBack();
	}

	render() {
		this.element.innerHTML = `
			<style>
				.sales-sequence {
					height: 100%;
				}
				.sales-sequence fieldset > div {
					display: inline-block;
					flex: none;
					height: 75px;
					width: 95%;
				}
				@media (min-width: 640px) {
					.sales-sequence fieldset > div {
						width: 49%;
					}
				}
				@media (min-width: 960px) {
					.sales-sequence fieldset > div {
						display: inline-block;
						flex: none;
						width: 32%;
					}
				}
				.sales-sequence .steps {
					display: flex;
					flex: 1;
					height: 100%;
				}
				.sales-sequence .slds-panel {
					display: flex;
					flex-direction: column;
					margin: .25rem;
					min-height: 380px;
				}
				.sales-sequence .slds-panel__header {
					background-color: #f3f2f2;
					flex: none;
					height: 60px;
					padding: .75rem 1rem;
				}
				.sales-sequence .slds-panel__body {
					display: flex;
					flex: 1;
					flex-direction: column;
					padding: 0;
				}
				.sales-sequence .slds-panel__body > * {
					flex: none;
				}
				.sales-sequence .slds-panel__body .draggable-list {
					display: flex;
					flex: 1;
					flex-direction: column;
				}
				.sales-sequence .slds-panel__body .draggable-list ul {
					flex: 1;
				}
				.sales-sequence .slds-panel__body .slds-form-element,
				.sales-sequence .slds-panel__body .step-select-subtype {
					margin: .5rem;
				}
			</style>
			<div class="sales-sequence slds-scope">
				<div class="message slds-hidden"></div>
				<div class="sales-sequence-fieldset"></div>
				${this.descriptions ? `
					<div class="steps">
						<div class="slds-panel slds-size_medium">
							<div class="slds-panel__header">
								<h2 class="slds-panel__header-title slds-text-heading_small" title="${this.getLabel('Sales_Sequence_Drag_Instructions')}">
									${this.getLabel('Sales_Sequence_Drag_Instructions')}
								</h2>
							</div>
							<div class="slds-panel__body">
								<div class="available-steps"></div>
							</div>
						</div>
						<div class="slds-panel slds-size_medium">
							<div class="slds-panel__header">
								<h2 class="slds-panel__header-title slds-text-heading_small" title="${this.description.label}">
									${this.description.label}
								</h2>
							</div>
							<div class="slds-panel__body">
								<div class="selected-steps"></div>
							</div>
						</div>
						<div class="edit-panel slds-panel slds-size_medium slds-hidden">
							<div class="slds-panel__header">
								<h2 class="slds-panel__header-title slds-text-heading_small" title="${this.getLabel('Edit')}">
									${this.getLabel('Edit')}
								</h2>
									<button class="slds-button slds-button_icon slds-button_icon-small slds-panel__close" title="Collapse Panel Header">
										<svg class="slds-button__icon" aria-hidden="true">
											<use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="${this.constructor.getSymbols('utility')}#close" />
										</svg>
										<span class="slds-assistive-text">Collapse Panel Header</span>
									</button>
							</div>
							<div class="slds-panel__body">
								<div class="slds-form-element">
									<label class="slds-checkbox_toggle slds-grid">
										<input name="checkbox-toggle-required" type="checkbox" aria-describedby="checkbox-toggle-required" value="checkbox-toggle-required" />
										<span id="checkbox-toggle-required" class="slds-checkbox_faux_container" aria-live="assertive">
											<span class="slds-checkbox_faux"></span>
											<span class="slds-checkbox_on">${this.getLabel('Required')}</span>
											<span class="slds-checkbox_off">${this.getLabel('Optional')}</span>
										</span>
										<span class="slds-form-element__label slds-m-bottom_none slds-m-left_small slds-m-top_xx-small">${this.getLabel('Sales_Sequence_Require')}</span>
									</label>
								</div>
								<div class="step-select-subtype"></div>
								<div class="step-subtypes"></div>
							</div>
						</div>
					</div>
				`: ''}
			</div>
		`;
		this.fieldset = this.description && new Fieldset({
			element: this.element.querySelector('.sales-sequence-fieldset'),
			fields: [
				'Name',
				'gvp__Account_Segment__c',
				'gvp__Account_Record_Type__c',
				'gvp__Geography_Key__c',
				'gvp__User_Profile__c',
				'gvp__Enforce_Order__c',
				'gvp__Active__c'
			].map(field => {
				let result = Object.assign({ required: field === 'Name' }, this.description.fields.find(f => f.name === field));
				switch(field) {
					case 'gvp__Account_Segment__c':
						result.type = 'picklist';
						result.picklistValues = this.accountSegments.map(segment => Object.assign({ label: segment.Name, value: segment.Name }));
						break;
					case 'gvp__Account_Record_Type__c':
						result.type = 'picklist';
						result.picklistValues = this.accountRecordTypes.map(rt => Object.assign({ label: rt.Name, value: rt.Name }));
						break;
					case 'gvp__Geography_Key__c':
						result.type = 'picklist';
						result.picklistValues = this.userGeographyKeys.map(userGeo => Object.assign({ label: userGeo, value: userGeo }));
						break;
					case 'gvp__User_Profile__c':
						result.type = 'picklist';
						result.picklistValues = this.userProfiles.map(userProfile => Object.assign({ label: userProfile.Name, value: userProfile.Name }));
						break;
				}
				return result;
			}),
			objectName: this.description.name,
			record: this.record
		});
		this.availableSteps = this.descriptions && new DraggableList({
			droppable: false,
			element: this.element.querySelector('.available-steps'),
			items: this.descriptions['gvp__Sales_Sequence_Step__c'].fields
				.find(field => field.name === 'gvp__Type__c').picklistValues
				.map(pv => Object.assign(
					{ label: pv.label, value: { gvp__Type__c: pv.value } },
					this.getStepStyle({ gvp__Type__c: pv.label }),
					this.getStepIcon({ gvp__Type__c: pv.label })
				))
		});
		let dropIndicate = () => {
			if (this.selectedSteps && (this.selectedSteps.items.length === 2)) {
				this.selectedSteps.dropIndicate(this.selectedSteps.element.querySelector('ul li:last-child'));
			}
		};
		this.selectedSteps = this.descriptions &&
			new DraggableList({
				deleteArea: true,
				deleteLabel: this.getLabel('Sales_Sequence_Delete_Instructions'),
				dropLabel: this.getLabel('Sales_Sequence_Drop_Instructions'),
				dropIndicator: true,
				element: this.element.querySelector('.selected-steps'),
				handler: (event, detail) => {
					switch(event) {
						case 'choose':
							if (this.selectStep(detail)) {
								this.renderSubtypes(detail);
							}
							break;
						case 'drop':
							this.selectStep(detail);
							this.renderSubtypes(detail);
							break;
						case 'remove':
						case 'reorder':
							this.selectStep();
							this.renderSubtypes();
							dropIndicate();
							break;
					}
				},
				items: [{
					backgroundColor: 'initial',
					border: '1px solid gray',
					color: 'black',
					draggable: false,
					icon: Icons.icon('gvp__Account_Call__c'),
					label: `${this.getLabel('Start')} ${this.description.label}`,
					required: true
				}].concat(((
					this.record &&
					this.record.gvp__Sales_Sequence_Steps__r &&
					this.record.gvp__Sales_Sequence_Steps__r.records
				) || []).map(step => Object.assign({
					indicateMore: true,
					label: this.getStepLabel(step),
					required: step.gvp__Required__c,
					value: step
				}, this.getStepStyle(step), this.getStepIcon(step))))
				.concat([{
					backgroundColor: 'initial',
					border: '1px solid gray',
					color: 'black',
					draggable: false,
					icon: Icons.icon('gvp__Account_Call__c'),
					label: `${this.getLabel('End')} ${this.description.label}`,
					required: true
				}])
			});
		dropIndicate();
		this.bindEvents();
		return this.element;
	}

	async renderSubtypes(step) {
		this.element.querySelector('.edit-panel .slds-panel__header-title').innerHTML = `
			${this.getLabel('Edit')}
			${(step && step.value && this.getStepTypeLabel(step.value)) || ''}
		`;
		this.element.querySelector('.step-select-subtype').innerHTML = '';
		this.element.querySelector('.step-subtypes').innerHTML = '';
		if (!(step && step.value)) {
			return;
		}
		let selectedStep = this.selectedSteps.items.find(item => item.id === step.id);
		let subtypes = [];
		switch(step.value.gvp__Type__c) {
			case 'New Activity':
				subtypes = [
					{ icon: Icons.icon('gvp__By_the_Glass__c'), label: this.descriptions['gvp__By_the_Glass__c'].label, value: 'gvp__By_the_Glass__c' },
					{ icon: Icons.icon('gvp__Cocktail_Menu__c'), label: this.descriptions['gvp__Cocktail_Menu__c'].label, value: 'gvp__Cocktail_Menu__c' },
					{ icon: Icons.icon('gvp__Display__c'), label: this.descriptions['gvp__Display__c'].label, value: 'gvp__Display__c' },
					{ icon: Icons.icon('gvp__Distributor_Meeting__c'), label: this.descriptions['gvp__Distributor_Meeting__c'].label, value: 'gvp__Distributor_Meeting__c' },
					{ icon: Icons.icon('gvp__Order_Commitment__c'), label: this.descriptions['gvp__Order_Commitment__c'].label, value: 'gvp__Order_Commitment__c' },
					{ icon: Icons.icon('gvp__POS_Placement__c'), label: this.descriptions['gvp__POS_Placement__c'].label, value: 'gvp__POS_Placement__c' },
					{ icon: Icons.icon('gvp__Presentation__c'), label: this.descriptions['gvp__Presentation__c'].label, value: 'gvp__Presentation__c' },
					{ icon: Icons.icon('gvp__Event__c'), label: this.descriptions['gvp__Event__c'].label, value: 'gvp__Event__c' },
					{ icon: Icons.icon('gvp__Retail_Ad__c'), label: this.descriptions['gvp__Retail_Ad__c'].label, value: 'gvp__Retail_Ad__c' },
					{ icon: Icons.icon('gvp__Scan__c'), label: this.descriptions['gvp__Scan__c'].label, value: 'gvp__Scan__c' },
					{ icon: Icons.icon('gvp__Staff_Incentive__c'), label: this.descriptions['gvp__Staff_Incentive__c'].label, value: 'gvp__Staff_Incentive__c' },
					{ icon: Icons.icon('gvp__Staff_Training__c'), label: this.descriptions['gvp__Staff_Training__c'].label, value: 'gvp__Staff_Training__c' },
					{ icon: Icons.icon('gvp__Well__c'), label: this.descriptions['gvp__Well__c'].label, value: 'gvp__Well__c' },
					{ icon: Icons.icon('gvp__Wine_List__c'), label: this.descriptions['gvp__Wine_List__c'].label, value: 'gvp__Wine_List__c' },
				]
				break;
			case 'Mobile Button':
				subtypes = [
					await Api.query('Select Id, Name From gvp__Settings_Home_Buttons__c Order By Name Asc'),
					await Api.query('Select Id, Name From gvp__Settings_Account_Buttons__c Order By Name Asc')
				].map(response => (response && response.records) || [])
					.reduce((subtypes, buttons) => subtypes.concat(
						buttons.map(button => Object.assign({ icon: Icons.icon('Button'), label: button.Name, value: JSON.stringify(button) }))
					), []);
				break;
			case 'Object Listview':
				subtypes = this.descriptions.Account.childRelationships.map(cr => this.descriptions[cr.childSObject])
					.filter((description, index, array) => description && (array.indexOf(array.find(o => o && (o.name === description.name))) === index))
					.map(description => Object.assign({ icon: Icons.icon(description.name), label: description.labelPlural, value: description.name }))
					.sort((a, b) => a.label.localeCompare(b.label));
				break;
		}
		if ((selectedStep === this.selectedStep) && (subtypes.length > 0)) {
			this.element.querySelector('.step-select-subtype').innerHTML = `
				${this.capitalize(this.getLabel('Select'))}
				${this.getStepTypeLabel(selectedStep.value)}
			`;
			let selectSubtype = subtype => {
				this.stepSubtypes.items.forEach(item => item.selected = item.value === subtype);
				this.stepSubtypes.render();
			};
			return this.stepSubtypes = this.descriptions && new DraggableList({
				draggable: false,
				droppable: false,
				element: this.element.querySelector('.step-subtypes'),
				handler: (event, detail) => {
					switch(event) {
						case 'choose':
							selectSubtype(detail.value);
							selectedStep.value.gvp__Subtype__c = detail.value;
							selectedStep.label = this.getStepLabel(selectedStep.value);
							Object.assign(selectedStep, this.getStepIcon(selectedStep.value));
							this.selectedSteps.modified = true;
							this.selectStep(selectedStep);
							break;
					}
				},
				items: subtypes.map(subtype => Object.assign(subtype, {
					backgroundColor: 'initial',
					border: '1px solid gray',
					color: 'black',
					selected: subtype.value === selectedStep.value.gvp__Subtype__c
				}))
			});
		}
	}

	requireStep(required) {
		this.selectedStep.required = required;
		this.selectedStep.value.gvp__Required__c = required;
		this.selectedSteps.render();
	}

	async save() {
		if (!this.validate()) {
			return Promise.reject('invalid');
		}
		this.spinner({ blockInput: true });
		this.record = Object.assign(
			this.record || {},
			this.fieldset && this.fieldset.valueForSave
		);
		let response = await Api.save(Object.assign(
			{},
			this.record,
			{ gvp__Sales_Sequence_Steps__r: undefined }
		), 'gvp__Sales_Sequence__c');
		let errors = response && response.errors;
		let sequenceId = (response && response.id) || this.record.Id;
		response = await Api.save((this.selectedSteps.items || []).filter(step => step.value).map((step, index) =>
			Object.assign({
				Id: step.value && step.value.Id,
				Name: `${this.record.Name} - ${step.label}`,
				gvp__Order_Number__c: index+1,
				gvp__Required__c: step.value && step.value.gvp__Required__c,
				gvp__Sales_Sequence__c: sequenceId,
				gvp__Subtype__c: step.value && step.value.gvp__Subtype__c,
				gvp__Type__c: step.value && step.value.gvp__Type__c
			})
		), 'gvp__Sales_Sequence_Step__c');
		let processErrors = response => (response || []).reduce((result, response) => {
			result = result.concat((response && response.errors) || []);
			return result;
		}, []);
		errors = (errors || []).concat(processErrors(response));
		response = await Api.remove(((
				this.record &&
				this.record.gvp__Sales_Sequence_Steps__r &&
				this.record.gvp__Sales_Sequence_Steps__r.records
			) || []).filter(step => !(this.selectedSteps.items || []).find(
				selectedStep => step.Id === (selectedStep.value && selectedStep.value.Id)
			)), 'gvp__Sales_Sequence_Step__c'
		);
		errors = (errors || []).concat(processErrors(response));
		this.spinner();
		return new Promise((resolve, reject) => Toast.displayMessage({
			element: this.element.querySelector('.message'),
			onClose: () => errors.length ? reject(errors) : resolve(sequenceId),
			message: errors.length ? errors.map(error => error.message) : `${this.description.label} ${this.getLabel('Saved')}`,
			type: errors.length ? 'error' : 'success'
		}));
	}

	selectStep(step) {
		if (step && !step.value) {
			return;
		}
		if (this.selectedStep) {
			this.selectedStep.selected = false;
		}
		this.element.querySelector('.edit-panel').classList.add('slds-hidden');
		if (step) {
			step.indicateMore = true;
			step.selected = true;
			switch(step.value.gvp__Type__c) {
				case 'Mobile Button':
					this.element.querySelector('input[name="checkbox-toggle-required"]').disabled = true;
					break;
				default:
					this.element.querySelector('input[name="checkbox-toggle-required"]').disabled = false;
					break;
			}
			this.element.querySelector('input[name="checkbox-toggle-required"]').checked = step.value.gvp__Required__c;
			this.element.querySelector('.edit-panel').classList.remove('slds-hidden');
		}
		return this.selectedSteps.render();
	}

	validate() {
		let messages = [];
		let steps = ((this.selectedSteps && this.selectedSteps.items) || []).filter(step => step.value);
		if (this.fieldset && !this.fieldset.valid) {
			messages.push(this.getLabel('Input_Validation_Error'));
		}
		if (steps.length === 0) {
			messages.push(this.getLabel('Sales_Sequence_Requires_Steps'));
		}
		if (steps.find(step => step.value && !step.value.gvp__Subtype__c && (step.value.gvp__Type__c === 'New Activity'))) {
			messages.push(this.getLabel('Sales_Sequence_Step_Requires_Subtype'));
		}
		let valid = messages.length === 0;
		if (!valid) {
			Toast.displayMessage({ element: this.element.querySelector('.message'), message: messages });
		}
		return valid;
	}
}

class ActivityStep extends CustomObject {
	constructor(options) {
		super(options);
		this.init();
	}

	get icon() {
		return Icons.icon(this.type);
	}

	async addOrEditRecord(options) {
		options = options || {};
		const editorOptions = {
			additionalPhotoLinks: [this.accountCall.Id],
			record: (options.Id || options.id) ? options : null,
			description: (options.type  && (options.type != this.type)) ? await Api.describe(options.type) : this.description,
			type: options.type || this.type,
			fieldPresets: { [this.accountCallField]: this.accountCall.Id, [this.parentRelationshipField]: this.parentId },
			hiddenFields: [this.accountCallField, this.parentRelationshipField],
			saveAndClone: true,
			onPop: () => this.refresh()
		};
		if (this.type === 'gvp__Sales_Order__c') {
			new SalesOrder(Object.assign(editorOptions, {
				element: this.nav.push(document.createElement('div'), {}),
				nav: this.nav,
				salesSequence: true
			}));
		} else if (App.isSmallScreen) {
			new PopupEditor(Object.assign(editorOptions, {
				element: this.nav.push(document.createElement('div'), {}),
				nav: this.nav
			}));
		} else {
			await PopupEditor.open(editorOptions);
		}
	}

	async fetchApi(options) {
		options = options || {};
		if (!this.description.queryable) {
			return { records: [] };
		}
		let limit = options.limit || 2000;
		limit = limit > 2000 ? 2000 : limit;
		if (options.result) {
			options.records = (options.records || []).concat((options.result && options.result.records) || []);
			if (options.result.nextPageUrl && options.records.length < limit) {
				try {
					options.result = await Api.request(options.result.nextPageUrl);
					return this.fetchApi(options);
				} catch (error) {
					App.error(error);
					return;
				}
			}
			const sortedRecords = options.records.slice(0, limit).sort((a,b) => ActivityStep.sort(a, b, this.sortBy));
			return Object.assign(options.result, { records: sortedRecords });
		} else {
			try {
				const q = `Select ${[...this.queryFields].map(fieldName => `${fieldName}`).join(',')} From ${this.type} Where ${this.whereClause} Order By LastModifiedDate Desc`;
				return this.fetchApi({ result: await Api.query(q), limit: limit });
			} catch (error) {
				App.error(error);
			}
		}
	}

	async init() {
		const compactLayout = await Api.compactLayout(this.type);
		this.columns = (compactLayout || []).map(field => {
			return { fieldApiName: field.name, label: field.label, sortable: field.sortable, sort: 'ascending' };
		});
		this.columns = ActivityStep.normalizeColumns(this.columns, this.description);

		this.queryFields = new Set(['Id', 'LastModifiedDate']);
		this.columns.forEach(column => this.queryFields.add(column.fieldApiName));
		switch(this.type) {
			case 'Event':
				this.queryFields.add('IsAllDayEvent');
				break;
			case 'gvp__Sales_Order__c':
				this.queryFields.add('gvp__Status__c');
				break;
		}

		const activityFields = this.description.fields;
		const field = activityFields.filter(field => {
			return field.name === 'gvp__Account_Visit__c';
		})[0] || activityFields.filter(function (field) {
			return field.name === 'gvp__Related_Account_Call__c';
		})[0] || activityFields.filter(function (field) {
			return field.name === 'gvp__Account_Call__c';
		})[0];
		this.accountCallField = field.name;

		this.whereClause = `${this.accountCallField} = '${this.accountCall.Id}'`;

		await this.refresh();
	}

	async refresh() {
		this.spinner();
		let records = [];
		if (navigator.onLine === true) {
			const response = await this.fetchApi();
			records = (response && response.records) || [];
		}
		if (Db[this.type]) {
			const sortField = this.sortBy ? this.sortBy.fieldApiName.replace('__r', '__c') : 'LastModifiedDate';
			let dbRecords = await Db[this.type]
				.where(this.accountCallField)
				.equals(this.accountCall.Id)
				.sortBy(sortField);
			if (this.sortBy && this.sortBy.isAscending !== true) {
				dbRecords = dbRecords.reverse();
			}
			records = records.concat(dbRecords || []);
			let recordIds = records.map(record => record.Id || record.id);
			records = records.filter((record, index) => recordIds.indexOf(record.Id || record.id) === index);
		}
		this.items = [];
		for (const record of records) {
			this.items.push(await ActivityStep.normalizeRecord(this, record));
		}
		this.render();
	}

	async remove(Id) {
		if (!(await Modal.confirm({ title: `${this.getLabel('Delete')} ${this.description.label}` }))) {
			return;
		}
		try {
			this.spinner({ blockInput: true });
			await ActivityStep.remove({ record: { Id: Id }, type: this.type });
		} catch (error) {
			return App.error(error);
		} finally {
			this.spinner();
		}
		Toast.displayMessage({
			element: this.element.querySelector('.message'),
			onClose: async () => await this.refresh(),
			message: this.getLabel('Records_Deleted'),
			type: 'success'
		});
	}

	async cloneRecord(detail) {
		try {
			const objectToClone = await Db.fetchById(detail.type, detail.id);
			const clonedName = objectToClone.Name || "Record";
			// Delete all unique values that will throw errors
			const uniqueFields = await Api.fieldNamesWithUniqueAttribute(this.type);
			uniqueFields.forEach(key =>  delete objectToClone[key]);
			await Db.save(detail.type, objectToClone);
			await Db.syncUnsyncedRecords();
			await this.refresh();
			return;
		} catch (error) {
			App.error(error);
			throw error;
		}
	}

	render() {
		if (this.items && this.items.length > 0) {
			this.recordView = new RecordView({
				element: this.element,
				displayFormat: App.isSmallScreen ? 'tiles' : 'table',
				description: this.description,
				icon: this.icon,
				columns: this.columns,
				items: this.items,
				menus: [{label: `${this.getLabel('clone')} ${this.description.label}`, action: 'clone', className: 'menuitem-clone'},
								{label: `${this.getLabel('Delete')} ${this.description.label}`, action: 'delete', className: 'menuitem-delete'},
						{label: `${this.getLabel('Edit')} ${this.description.label}`, action: 'edit', className: 'menuitem-edit'}],
				handler: (event, detail) => {
					switch(event) {
						case 'delete':
							this.remove(detail.id);
							break;
						case 'edit':
							if (typeof detail === 'string') {
								detail = { Id: detail, type: this.type }
							}
							this.addOrEditRecord(detail);
							break;
						case 'select':
							this.addOrEditRecord(detail);
							break;
						case 'clone':
							this.cloneRecord(detail);
							break;
						case 'sort':
							this.sortBy = detail;
							this.refresh();
							break;
					}
				},
				sortBy: this.sortBy
			});
		} else {
			this.element.innerHTML = `<p class="slds-m-around_small">${this.getLabel('No_Records')}</p>`;
		}
		return this.element;
	}
}

class ObjectListViewStep extends ActivityStep {
	async init() {
		this.spinner({ element: document.body });
		let result = await Api.request(`/search/layout/?q=${this.type}`);
		this.label = result && result[0] && result[0].label;
		this.columns = ((result && result[0] && result[0].searchColumns) || []).map(
			column => Object.assign({
				fieldApiName: column.name,
				label: column.label,
				name: column.field,
				sortable: true
			})
		);
		if (this.columns.length === 0) {
			const compactLayout = await Api.compactLayout(this.type);
			this.columns = (compactLayout || []).map(field => {
				return { fieldApiName: field.name, label: field.label, sortable: field.sortable, sort: 'ascending' };
			});
			this.columns = ObjectListViewStep.normalizeColumns(this.columns, this.description);
		}
		this.spinner({ element: document.body });
		await this.refresh();
	}

	async refresh() {
		this.spinner({ element: document.body });
		let result = await Api.query(`
			Select ${['Id'].concat(this.columns.map(column => column.fieldApiName))
				.filter((field, index, fields) => fields.indexOf(field) === index)}
			From ${this.type}
			Where ${this.parentRelationshipField} = '${this.parentId}'
			And Id != '${this.accountCall.Id}'
			Order By ${this.sortBy ? `${this.sortBy.fieldApiName} ${this.sortBy.isAscending ? 'Asc' : 'Desc'}` : 'LastModifiedDate Desc'} NULLS Last
			Limit ${this.limit || 100}
		`);
		let process = record => Object.keys(record).reduce((result, key) => {
			let value = record[key];
			result[key] = { value: ((value !== null) && (typeof(value) === 'object')) ? { fields: process(value) } : value };
			return result;
		}, {});
		this.items = ((result && result.records) || []).map(record =>
			Object.assign({
				apiName: this.type,
				fields: process(record),
				id: record.Id

			})
		);
		this.spinner({ element: document.body });
		this.render();
	}
}

