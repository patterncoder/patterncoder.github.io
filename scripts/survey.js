import { Api } from './api.js'
import { App } from './app.js'
import { Auth } from './auth.js'
import { Checkbox } from './checkbox.js'
import { CustomObject } from './customObject.js'
import { Db } from './db.js'
import { Geolocation } from './geolocation.js'
import { Header } from './header.js'
import { Icons } from './icons.js'
import { Input } from './input.js'
import { List } from './list.js'
import { LookupField } from './lookupField.js'
import { Media, MediaEditor } from './media.js'
import { Modal } from './modal.js'
import { Nav } from './nav.js'
import { RadioList } from './radioList.js'
import { SurveySummary } from './surveySummary.js'
import { Tabs } from './tabs.js'
import { Toast } from './toast.js'
import { YesNo } from './yesno.js'

export class Survey extends CustomObject {
	constructor(options) {
		super(options);
		this.header = new Header({
			element: document.createElement('header'),
			handler: async (event, detail) => {
				let back = () => {
					this.nav.pop();
					if (this.accountId && !this.plan && !App.nav) {
						return Api.auth.then(auth => window.history.back());
					} else if (App.nav && this.survey && this.survey.gvp__Status__c) {
						while (this.nav.views.length >= this.startingNav) {
							this.nav.pop();
						}
					} else if (this.nav.views.length >= this.startingNav) {
						this[this.accountId ? 'plan' : 'account'] = null;
					}
				};
				switch(event) {
					case 'action':
						switch(detail.value) {
							case 'back':
								if (await Modal.promptToContinue(this)) {
									back();
								}
								break;
						}
					break;
				}
			},
			icon: Icons.icon('gvp__Survey__c'),
			menu: [],
			title: 'Survey'
		});
		this.nav = this.nav || new Nav(this.element, { header: this.header });
		this.startingNav = this.nav.views.length;
		this.nav.replace(this.renderContainer(), Object.assign(this.header, {
			breadcrumbs: [],
			buttons: [],
			menu: [],
			title: this.getLabel('Survey')
		}));
		this.init();
	}

	static get properties() {
		return [
			'account',
			'answers',
			'questions',
			'survey',
			'plan',
			'userId'
		];
	}

	get planFilters() {
		return [
			surveyPlan => {
				const accountLocations = [
					'gvp__Territory__c',
					'gvp__Region_Id__c',
					'gvp__Division_Id__c',
					'gvp__Company_Id__c'
				];
				const surveyPlanLocations = [
					'gvp__Territory__c',
					'gvp__Region__c',
					'gvp__Division__c',
					'gvp__Company__c'
				];
				return surveyPlanLocations.filter((location, index) =>
					!surveyPlan[location] || (surveyPlan[location] === account[accountLocations[index]])
				).length > 0;
			},
			surveyPlan => {
				const channels = surveyPlan.gvp__Channel_Surveyed__c;
				if (!channels) {
					return false;
				}
				const recordType = this.account.RecordTypeId;
				if (!recordType) {
					return false;
				}
				const recordTypeName = this.account.RecordType.Name.toLowerCase();
				const recordTypeDeveloperName = this.account.RecordType.DeveloperName.toLowerCase();
				return (channels || '').toLowerCase().split(';').filter(channel =>
					(channel === recordTypeName) || (channel === recordTypeDeveloperName)
				).length > 0;
			},
			surveyPlan => {
				const chain = surveyPlan.gvp__Chain_HQ__c;
				return !chain || surveyPlan.gvp__Chain_HQ__r.Name;
			},
			surveyPlan => {
				const surveyPlanSegment = surveyPlan.gvp__Account_Segment__c;
				return !surveyPlanSegment || (surveyPlanSegment === this.account.gvp__Account_Segment__c);
			}
		];
	}

	get account() {
		return this._account;
	}
	set account(account) {
		if (JSON.stringify(this._account || null) !== JSON.stringify(account || null)) {
			this._account = account;
			if (this.plan) {
				this.plan = null;
			} else {
				this.render();
			}
		}
	}
	get complete() {
		return !(this.questions || []).find(question => question.show && question.input && [undefined, null, ''].includes(question.input.value));
	}
	get plan() {
		return this._plan;
	}
	set plan(plan) {
		if (JSON.stringify(this._plan || null) !== JSON.stringify(plan || null)) {
			this._plan = plan;
			this.questions = null;
			this.survey = null;
			this.modified = false;
			this.render();
		}
	}
	get readOnly() {
		return this._readOnly || (this.survey && (this.survey.gvp__Status__c === 'Submitted'));
	}
	set readOnly(readOnly) {
		this._readOnly = readOnly;
	}

	answerChanged(event, input) {
		this.modified = true;
		this.updateConditionalQuestions();
		input.render();
		this.updateImageIcon(input.question);
	}

	copyPrevious() {
		this.questions.filter(question => question.mostRecentAnswer)
			.filter(question => question.input)
			.forEach(question =>
				question.input.value = this.value(question, question.mostRecentAnswer)
			);
	}

	async fetchAccount(accountId) {
		if (!accountId) {
			return Promise.resolve();
		}
		if (navigator.onLine) {
			let result = await Api.query(`
				Select
					Id,
					Name,
					RecordTypeId,
					RecordType.Name,
					RecordType.DeveloperName,
					gvp__Account_Segment__c
				From Account
				Where Id = '${accountId}'
			`);
			this.account = result && result.records && result.records[0];
		} else if (typeof(Db) !== 'undefined') {
			if (this.account = await Db.Account.get(accountId)) {
				this.account.RecordType = await Db.RecordType.get(this.account.RecordTypeId);
			}
		}
		return this.account;
	}

	async fetchAssignedSurveys() {
		if (navigator.onLine) {
			let result = await Api.query(`
				Select
					Id,
					gvp__Survey_Period__c
				From gvp__Survey__c
				Where (gvp__Account__c = '${this.account.Id}')
					AND (RecordType.DeveloperName = 'Assigned')
					AND ((gvp__Surveyed_by__c = '${this.userId}')
						Or (gvp__Manager_1__c = '${this.userId}')
						Or (gvp__Manager_2__c = '${this.userId}')
						Or (gvp__Manager_3__c = '${this.userId}')
						Or (gvp__Alternate_User_1__c = '${this.userId}')
					)
				Order By LastModifiedDate Desc
			`, { syncInterval: 0 });
			this.assignedSurveys = (result && result.records) || [];
		} else if (typeof(Db) !== 'undefined') {
			let assignedRecordType = await Db.RecordType.where('[DeveloperName+SobjectType]').equals(['Assigned', 'gvp__Survey__c']).first();
			this.assignedSurveys = await Db.gvp__Survey__c
				.where('gvp__Account__c').equals(this.account.Id)
				.and(survey => survey.RecordTypeId === assignedRecordType.Id)
				.and(survey =>
					(survey.gvp__Surveyed_by__c === this.userId) ||
					(survey.gvp__Manager_1__c === this.userId) ||
					(survey.gvp__Manager_2__c === this.userId) ||
					(survey.gvp__Manager_3__c === this.userId) ||
					(survey.gvp__Alternate_User_1__c === this.userId)
				)
				.reverse()
				.sortBy('LastModifiedDate');
		}
		return this.assignedSurveys;
	}

	async fetchOpenSurvey() {
		let surveyId = this.surveyId || (this.survey && this.survey.Id);
		let accountCallId = this.accountCallId || (this.survey && this.survey.gvp__Account_Call_c);
		if (typeof(Db) !== 'undefined') {
			if (surveyId) {
				this.survey = await Db.fetchById(Db.gvp__Survey__c, surveyId);
			} else {
				this.survey = (await Db.gvp__Survey__c
					.where('gvp__Account__c').equals(this.account.Id)
					.and(survey => survey.gvp__Status__c === 'Saved')
					.and(survey => survey.gvp__Survey_Period__c === this.plan.Id)
					.and(survey => survey.gvp__Surveyed_by__c === this.userId)
					.reverse()
					.sortBy('LastModifiedDate'))[0];
			}
			if (this.survey) {
				this.survey.answers = await Db.gvp__Survey_Answer__c
					.where('gvp__Survey__c').equals(this.survey.Id)
					.toArray() || [];
			}
		}
		if (!this.survey && navigator.onLine && !(surveyId && surveyId.startsWith('_'))) {
			const answerChildRelationshipName = this.descriptions.gvp__Survey__c.childRelationships.filter(r => r.childSObject=== 'gvp__Survey_Answer__c')[0].relationshipName;
			let result = await Api.query(`
				Select
					Id,
					gvp__Account__c,
					gvp__Account_Team__c,
					gvp__Email_Summary_Sent_Date__c,
					gvp__Points__c,
					gvp__Sales_Team_Division__c,
					gvp__Send_Email_Summary__c,
					gvp__Status__c,
					gvp__Survey_Period__c,
					gvp__Surveyed_by__c,
					(
						Select
							Id,
							CreatedById,
							LastModifiedDate,
							gvp__Answer_Brand__c,
							gvp__Answer_Check__c,
							gvp__Answer_Competitor__c,
							gvp__Answer_Currency__c,
							gvp__Answer_Formula__c,
							gvp__Answer_Item__c,
							gvp__Answer_Label__c,
							gvp__Answer_Multiple__c,
							gvp__Answer_Number__c,
							gvp__Answer_Percent__c,
							gvp__Answer_Product_Set__c,
							gvp__Answer_Program__c,
							gvp__Answer_Text__c,
							gvp__Answer_Saved__c,
							gvp__Answer_Size__c,
							gvp__Audited_Survey_Answer__c,
							gvp__Order__c,
							gvp__Question__c,
							gvp__Question_Text_Sort__c,
							gvp__Matching_Target_Points__c,
							gvp__Matching_Target_Points_Auxiliary__c,
							gvp__Survey__c,
							gvp__Points__c,
							gvp__Status__c
						From ${answerChildRelationshipName}
					)
				From gvp__Survey__c
				Where ${surveyId ? `Id = '${surveyId}'` : `
						(gvp__Account__c = '${this.account.Id}')
						AND ${accountCallId ? `(gvp__Account_Call__c = '${accountCallId}')` : `(gvp__Status__c = 'Saved')`}
						AND (gvp__Survey_Period__c = '${this.plan.Id}')
						AND (gvp__Surveyed_by__c = '${this.userId}')
				`}
				Order By LastModifiedDate Desc
			`, { syncInterval: 0 });
			if (this.survey = ((result && result.records) || [])[0]) {
				this.survey.answers = (this.survey[answerChildRelationshipName] || {}).records || [];
			}
		}
		if (!this.survey) {
			return;
		}
		this.survey.plan = this.plan;
		for (let answer of (this.survey.answers || [])) {
			let question = this.questions.filter(q => q.Id === answer.gvp__Question__c)[0];
			question.answer = answer;
			answer.question = question;
			question.value = this.value(question, answer);
			if (this.isAllowedPhoto(question)) {
				answer.images = await Media.images(answer.Id);
			}
		}
		return this.survey
	}

	async fetchMostRecentAnswers(question, surveys) {
		if (!question || !this.account) {
			return;
		}
		let similarQuestionIds = (question.similarQuestions || []).map(question => question.Id);
		if (navigator.onLine) {
			return Api.query(`
				Select
					Id,
					CreatedById,
					LastModifiedDate,
					gvp__Answer_Brand__c,
					gvp__Answer_Check__c,
					gvp__Answer_Competitor__c,
					gvp__Answer_Currency__c,
					gvp__Answer_Formula__c,
					gvp__Answer_Item__c,
					gvp__Answer_Label__c,
					gvp__Answer_Multiple__c,
					gvp__Answer_Number__c,
					gvp__Answer_Percent__c,
					gvp__Answer_Product_Set__c,
					gvp__Answer_Program__c,
					gvp__Answer_Text__c,
					gvp__Answer_Saved__c,
					gvp__Answer_Size__c,
					gvp__Audited_Survey_Answer__c,
					gvp__Order__c,
					gvp__Question__c,
					gvp__Question_Text_Sort__c,
					gvp__Matching_Target_Points__c,
					gvp__Matching_Target_Points_Auxiliary__c,
					gvp__Survey__c,
					gvp__Survey__r.gvp__Date_of_Survey__c,
					gvp__Survey__r.gvp__Submitted_Date_Time__c,
					gvp__Points__c,
					gvp__Status__c
				From gvp__Survey_Answer__c
				Where gvp__Survey__r.gvp__Account__c = '${this.account.Id}'
					AND gvp__Survey__r.gvp__Status__c = 'Submitted'
					AND gvp__question__c In (${similarQuestionIds.map(Id => `'${Id}'`).join(',')})
				Order By
					gvp__Survey__r.gvp__Date_of_Survey__c DESC,
					gvp__Survey__r.gvp__Submitted_Date_Time__c Desc
				Limit 1
			`, { syncInterval: 0 }).then(result => question.mostRecentAnswer = ((result && result.records) || [])[0]);
		} else if ((typeof(Db) !== 'undefined') && (await Db.synced)) {
			let answers = await Db.gvp__Survey_Answer__c
				.where('gvp__Question__c')
				.anyOf(similarQuestionIds)
				.toArray();
			for (let answer of answers) {
				answer.survey = surveys[answer.gvp__Survey__c || ''] || (surveys[answer.gvp__Survey__c || ''] = await Db.gvp__Survey__c.get(answer.gvp__Survey__c || ''));
			}
			return question.mostRecentAnswer = answers.filter(answer =>
				answer.survey &&
				(answer.survey.gvp__Account__c === (this.account && this.account.Id)) &&
				(answer.survey.gvp__Status__c === 'Submitted')
			).sort((a1, a2) =>
				new Date(a2.survey.gvp__Submitted_Date_Time__c).getTime() - new Date(a1.survey.gvp__Submitted_Date_Time__c).getTime()
			)[0];
		}
	}

	async fetchSimilarQuestions(question) {
		const fields = [
			'gvp__Brand__c',
			'gvp__Label__c',
			'gvp__Item__c',
			'gvp__Size__c',
			'gvp__Related_Competitor__c',
			'gvp__Bank_Key__c',
			'gvp__Product_Set__c'
		];
		if (navigator.onLine) {
			let result = await Api.query(`
				Select Id From gvp__Survey_Plan_Question__c
				Where ${fields.map(field => `(${field} = ${question[field] ? `'${question[field]}'` : 'NULL'})`).join(' And ')}
			`)
			question.similarQuestions = (result && result.records) || [];
		} else {
			question.similarQuestions = await Db.gvp__Survey_Plan_Question__c.toCollection()
				.and(q => fields.reduce((result, field) => result && (question[field] ? (q[field] === question[field]) : !q[field]), true))
				.toArray();
		}
		return question.similarQuestions;
	}

	async fetchSurveyPlanQuestions() {
		const imageTypes = ['GIF', 'JPG', 'JPEG', 'PNG'];
		if (navigator.onLine) {
			let result = await Api.query(`
				Select
					${this.descriptions.gvp__Survey_Plan_Question__c.fields.map(field => field.name).join(',')},
					gvp__Brand__r.gvp__Supplier__r.Name,
					gvp__Item__r.gvp__Label__r.gvp__Brand__r.gvp__Supplier__r.Name,
					gvp__Label__r.gvp__Brand__r.gvp__Supplier__r.Name,
					gvp__Size__r.gvp__Liter_Volume__c,
					(
						Select ContentDocument.LatestPublishedVersionId
						From ContentDocumentLinks
						Where ContentDocument.FileType In (${imageTypes.map(type => `'${type}'`).join(', ')})
					)
				From gvp__Survey_Plan_Question__c
				Where gvp__Survey_Plan__c = '${this.plan.Id}'
				Order By
					gvp__Group_Number__c Asc,
					gvp__Cluster_Number__c Asc,
					gvp__Product_Number__c Asc,
					gvp__Question_Order__c Asc,
					gvp__Related_Competitor__c Asc
			`);
			this.questions = (result && result.records) || [];
		} else {
			for (let question of this.questions = (await Db.gvp__Survey_Plan_Question__c
				.where('gvp__Survey_Plan__c').equals(this.plan.Id)
				.toArray())
				.sort((q1, q2) => (q1.gvp__Related_Competitor__c || '').localeCompare(q2.gvp__Related_Competitor__c || ''))
				.sort((q1, q2) => q1.gvp__Question_Order__c - q2.gvp__Question_Order__c)
				.sort((q1, q2) => q1.gvp__Product_Number__c - q2.gvp__Product_Number__c)
				.sort((q1, q2) => q1.gvp__Cluster_Number__c - q2.gvp__Cluster_Number__c)
				.sort((q1, q2) => q1.gvp__Group_Number__c - q2.gvp__Group_Number__c)
			) {
				let contentDocumentLinks = await Db.ContentDocumentLink
					.where('LinkedEntityId').equals(question.Id)
					.toArray();
				for (let cdl of contentDocumentLinks) {
					cdl.ContentDocument = await Db.ContentDocument.get(cdl.ContentDocumentId);
				}
				contentDocumentLinks = contentDocumentLinks.filter(cdl => imageTypes.includes(cdl.ContentDocument.FileType));
				question.ContentDocumentLinks = (contentDocumentLinks && (contentDocumentLinks.length > 0)) ? { records: contentDocumentLinks } : null;
			}
		}
		this.questions.forEach(question => {
			if (question.gvp__Question_List__c) {
				question.list = (question.gvp__Question_List__c || '').split('|')
					.filter(option => option)
					.map(option => Object.assign({ label: option, value: option }));
			}
		})
		return this.questions;
	}

	async fetchSurveyPlans() {
		let accountCallId = this.accountCallId || (this.survey && this.survey.gvp__Account_Call_c);
		if (navigator.onLine) {
			let result = await Api.query(`
				Select
					Id,
					Name,
					LastModifiedDate,
					RecordType.DeveloperName,
					gvp__Start_Date_of_Survey__c,
					gvp__End_Date_of_Survey__c,
					gvp__Company__c,
					gvp__Division__c,
					gvp__Region__c,
					gvp__Territory__c,
					gvp__Channel_Surveyed__c,
					gvp__Chain_HQ__c,
					gvp__Chain_HQ__r.Name,
					gvp__Account_Segment__c,
					gvp__Disable_Copy_Previous__c,
					gvp__Disable_Summary_Page__c,
					gvp__Summarize_By_Supplier__c,
					(
						Select Id From gvp__Surveys__r
						Where (gvp__Account__c = '${this.account.Id}')
							AND ${accountCallId ? `(gvp__Account_Call__c = '${accountCallId}')` : `(gvp__Status__c = 'Saved')`}
							AND (gvp__Surveyed_by__c = '${this.userId}')
					)
				From gvp__Survey_Plan__c
				Where (gvp__Published__c = True)
					AND (gvp__Start_Date_of_Survey__c <= TODAY)
					AND (gvp__End_Date_of_Survey__c >= TODAY)
				ORDER BY Name ASC
			`);
			this.plans = (result && result.records) || [];
		} else if (typeof(Db) !== 'undefined') {
			for (let plan of this.plans = await Db.gvp__Survey_Plan__c.toCollection()
				.and(plan => plan.gvp__Published__c)
				.and(plan => {
					let today = new Date(new Date().setHours(0, 0, 0, 0)).getTime();
					let start = new Date(plan.gvp__Start_Date_of_Survey__c).getTime();
					let end = new Date(plan.gvp__End_Date_of_Survey__c).getTime();
					return (start <= today) && (end >= today);
				}).sortBy('Name')
			) {
				plan.RecordType = await Db.RecordType.get(plan.RecordTypeId);
				let surveys = await Db.gvp__Survey__c
					.where('gvp__Survey_Period__c').equals(plan.Id)
					.and(survey => accountCallId ? (survey.gvp__Account_Call__c === accountCallId) : (survey.gvp__Status__c === 'Saved'))
					.and(survey => survey.gvp__Surveyed_by__c === this.userId)
					.toArray();
				plan.gvp__Surveys__r = (surveys && (surveys.length > 0)) ? { records: surveys } : null
			}
		}
		return this.plans;
	}

	async fetchSurveySettings() {
		return this.settings = await Survey.fetchSettings({
			type: 'gvp__Settings_Survey__c',
			criteria: [
				['gvp__Geography_Key__c', this.user.gvp__Geography_Key__c]
			],
			defaultSettings: null,
			onlyOne: true
		});
	}

	image(question) {
		return this.images(question)[0];
	}

	images(question) {
		return question.images || question.answer.images || [];
	}

	isMissingRequiredAnswer(question) {
		return this.isRequiredQuestion(question) && ([undefined, null, ''].indexOf(question.input ? question.input.value : question.value) >= 0);
	}

	isMissingRequiredPhoto(question) {
		return this.isRequiredPhoto(question) && !this.image(question);
	}

	async init() {
		this.spinner();
		this.userId = ((this.user = await (navigator.onLine ? Api.user() : Db.User.get(this.userId))) || {}).Id;
		await this.fetchSurveySettings();
		this.descriptions = {};
		for (let type of [
			'ContentVersion',
			'gvp__Survey__c',
			'gvp__Survey_Answer__c',
			'gvp__Survey_Plan__c',
			'gvp__Survey_Plan_Question__c'
		]) {
			this.descriptions[type] = await Api.describe(type);
		}
		CustomObject.labels = await Api.labels();
		await this.fetchAccount(this.accountId = this.accountId || Survey.parseArgs().accountId);
		this.render();
	}

	isAllowedPhoto(question) {
		return (question.gvp__Photo_Attachment_Type__c === 'Optional') || (question.gvp__Photo_Attachment_Type__c || '').startsWith('Required');
	}

	isRequiredPhoto(question) {
		return (question.gvp__Photo_Attachment_Type__c === 'Required') ||
			((question.gvp__Photo_Attachment_Type__c === 'Required If Yes') &&
				(((question.input && question.input.value) || question.value) === 'yes'));
	}

	isRequiredQuestion(question) {
		return (question.gvp__Required__c === true) && (question.gvp__Type__c !== 'Check');
	}

	lookupField(question) {
		const referenceTo = question.gvp__Reference_To__c && question.gvp__Reference_To__c.toLowerCase();
		return this.descriptions.gvp__Survey_Answer__c.fields.filter(f => f.name.toLowerCase() === referenceTo)[0];
	}

	questionsOffTarget() {
        return this.questions.filter(question => {
            let targetMet = this.targetMet(question);
            let targetRelevant = question.gvp__Type__c !== 'Set';
            let offTarget = (targetMet !== null) && !targetMet && targetRelevant;
            return offTarget;
        }).sort((q1, q2) => (q1.gvp__Group_Number__c || 0) - (q2.gvp__Group_Number__c || 0));
    }

    questionsOnTarget() {
        return this.questions.filter(question => {
            let targetMet = this.targetMet(question);
            let targetRelevant = question.gvp__Type__c !== 'Set';
            let onTarget = targetMet && targetRelevant;
            return onTarget;
        }).sort((q1, q2) => (q1.gvp__Group_Number__c || 0) - (q2.gvp__Group_Number__c || 0));
    }

	renderAccountSelector(element) {
		this.spinner({ element: element });
		return new LookupField(Object.assign({
			element: element,
			handler: (event, account) => account.value && this.fetchAccount(account.value.value),
			objectName: 'gvp__Survey__c'
		}, this.descriptions.gvp__Survey__c.fields.filter(field => field.name === 'gvp__Account__c')[0]));
	}

	renderContainer(element) {
		element = element || (this.element = document.createElement('div'));
		element.innerHTML = `
			<style>
				form.questions.container {
					margin: .75em;
				}
				.slds-hidden {
					display: none !important;
				}
				.question-groups *[data-group].invalid:not(.active) a {
					color: red;
				}
				.questions div[data-group] {
					display: none;
				}
				.questions div[data-group].active {
					display: block;
				}
				.questions div[data-group] > div[data-record-id] {
					margin-top: 15px;
					vertical-align: top;
				}
				.questions label.question-group {
					display: block;
					height: auto;
					min-height: 1em;
				}
				.questions label .icons > * {
					position: relative;
					z-index: 10;
				}
				.questions label .description {
					display: block;
					min-height: 44px;
				}
				.questions label.question-group .slds-icon__container,
				.questions label.question-group .slds-icon__container svg {
					margin: 3px;
				}
				.questions label.question-group .slds-icon__container.invalid {
					background-color: red;
				}
				.questions .product {
					color: #2f4b76;
					font-weight: bold;
					font-size: 1.2em;
				}
				.questions .competitor {
					color: #c3282e;
				}
				.questions label.question-group span.question {
					font-size: 1.1em;
				}
				.questions label.question-group svg.slds-icon {
					cursor: pointer;
				}
				label.slds-form-element__label {
					font-size: 1.1em !important;
				}
				button.slds-button span.question {
					font-size: 1em !important;
				}

				.questions div[data-group] div.slds-form-element {
					margin: 0;
				}

				@media (min-width: 960px) {
					.questions div[data-group] > div[data-record-id] {
						display: inline-block;
						min-height: 50px;
						margin: 0;
						padding: 1em;
						width: 50%;
					}
				}

				@media (min-width: 1440px) {
					.questions div[data-group] > div[data-record-id] {
						width: 33%;
					}
				}

				/* Matrix Clusters */
				.questions .matrix {
					display: block !important;
					overflow-x: auto;
					width: auto !important;
				}
				.questions table td {
					text-align: center;
				}
				.questions table td,
				.questions table th {
					padding: .5em;
					white-space: nowrap;
				}
				.questions table tr {
					vertical-align: top;
				}
				.questions table tr.size-row th:first-child {
					width: 10%;
				}
				.questions table tr.size-row th:not([data-size=""]) {
					border: 1px solid #ccc;
					text-align: center;
				}
				.questions table label.question-group {
					min-height: auto;
				}
				.questions table label.question-group .description,
				.questions table .slds-checkbox__label .slds-form-element__label {
					display: none;
				}
				.questions table tr th.product {
					position: relative;
				}
				.questions table td > div {
					display: flex;
				}
				.questions table label.question-group {
					order: 2;
				}
				.questions table label.question-group .slds-icon__container {
					margin-top: -3px;
				}
				.questions table td > div > div {
					display: inline-block;
				}
			</style>
			<div class="slds-scope"></div>
			<div class="message slds-hidden"></div>
		`;
		return element;
	}

	async renderSurveyPlanSelector(element) {
		this.spinner({ element: element });
		this.planId = this.planId || Survey.parseArgs().planId;
		let assignedSurveys = await this.fetchAssignedSurveys()
		let surveyPlans = await this.fetchSurveyPlans();
		surveyPlans = surveyPlans.filter(surveyPlan => {
			if (surveyPlan.RecordType.DeveloperName === 'Assigned') {
				return this.assignedSurveys.filter(survey =>
					survey.gvp__Survey_Period__c === surveyPlan.Id
				).length > 0;
			} else {
				return this.planFilters.reduce((previous, current) => previous && current(surveyPlan));
			}
		});
		if (surveyPlans.length > 0) {
			if (this.planId && (this.plan = this.plans.find(plan => plan.Id === this.planId))) {
				return;
			}
			this.surveyPlanSelector = new List({
				element: element,
				handler: (event, list) => this.plan = list.value.surveyPlan,
				label: this.getLabel('Choose_Survey'),
				items: surveyPlans.map(surveyPlan => Object.assign({
					label: `${surveyPlan.Name}${surveyPlan.gvp__Surveys__r ? '*' : ''}`,
					value: surveyPlan.Id,
					surveyPlan: surveyPlan
				}))
			});
			this.surveyPlanSelector.element.querySelector('label').style.fontWeight = 'bold';
			this.surveyPlanSelector.element.querySelector('label ~ div').style.width = '512px';
			this.surveyPlanSelector.element.querySelector('label ~ div').style.maxWidth = '100%';
			return this.surveyPlanSelector;
		}
		element.innerHTML = this.getLabel('No_Records');
		return element;
	}

	renderSurveyGroups(element) {
		this.groups = this.questions.reduce((groups, question) => {
			let group = groups[groups.length-1];
            if (!group || (question.gvp__Group_Number__c !== group.number)) {
                groups.push(group = {
                    active: (groups.length > 0) ? false : true,
                    clusters: [],
                    name: question.gvp__Group_Name__c || `${this.getLabel('Group')} ${groups.length+1}`,
                    number: question.gvp__Group_Number__c || 0,
                    valid: true
                });
        	}
			let cluster = group.clusters[group.clusters.length-1];
			if (!cluster || (question.gvp__Cluster_Number__c !== cluster.number)) {
				group.clusters.push(cluster = {
					number: question.gvp__Cluster_Number__c || 0,
					questions: []
				});
			}
			question.answer = Object.assign({ sobjectType: 'gvp__Survey_Answer__c' }, question.answer || {});
			cluster.questions.push(question);
            return groups;
        }, []);
        if (this.showSummary) {
			this.groups.push({
				clusters: [],
				disabled: true,
				name: this.getLabel('Survey_Summary'),
				number: 'surveySummary',
			});
		}
		this.tabs = this.groups ? new Tabs({
			buttons: (this.enableCopyPrevious ? [{
				disabled: true,
				label: this.getLabel('Copy_Previous'),
				value: 'copyPrevious'
			}] : []).concat([{
				brand: true,
				disabled: this.readOnly,
				label: this.getLabel('Survey_Submit'),
				value: 'submit'
			}]),
			element: element.appendChild(document.createElement('div')),
			handler: async (event, detail) => {
				switch (event) {
					case 'action':
						if (!detail || detail.disabled) {
							return;
						}
						this.groups.forEach(group => group.active = false);
						detail.group.active = true;
						element.querySelector('.questions > div.active').classList.remove('active');
						element.querySelector(`.questions > div[data-group="${detail.group.number}"]`).classList.add('active');
						break;
					case 'button':
						switch (detail.value) {
							case 'copyPrevious':
								this.copyPrevious();
								break;
							case 'submit':
								detail.disabled = true;
								this.tabs.render();
								try {
									await this.save('Submitted');
									Toast.displayMessage({
										element: this.element.querySelector('.message'),
										onClose: () => this.render(),
										message: this.getLabel(`Survey_${this.survey.gvp__Status__c}`),
										type: 'success'
									});
								} catch(error) {
									detail.disabled = false;
									this.tabs.render();
								}
							break;
						}
						break;
				}
			},
			tabs: this.groups.map(group => Object.assign({
				disabled: group.disabled,
				group: group,
				label: group.name,
				name: group.number,
				selected: group.active,
				valid: group.valid
			})),
			type: 'default'
		}) : null;
		return Promise.resolve(this.groups);
	}

	renderSurveyQuestion(question, element) {
		let questionElement = document.createElement('div');
		questionElement.setAttribute('data-record-id', question.Id);
		questionElement.innerHTML = `
			<label class="question-group">
				<span class="icons">
					${question.ContentDocumentLinks ? `
						<span class="question-image slds-icon__container slds-float--right slds-icon-standard-file" data-record-id="${question.Id}">
							<svg class="slds-icon">
								<use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="${this.constructor.getSymbols('standard')}#file" />
							</svg>
						</span>
					`: ''}
					${this.isAllowedPhoto(question) ? `
						<span class="answer-image slds-icon__container slds-float--right ${(question.answer && question.answer.image) ? 'slds-icon-custom-39' : ((question.gvp__Photo_Attachment_Type__c === 'Required') || ((question.gvp__Photo_Attachment_Type__c === 'Required If Yes') && (question.value === 'yes')) ? 'slds-icon-custom-100' : 'slds-icon-custom-57')}" data-record-id="${question.Id}">
							<svg class="slds-icon">
								<use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="${this.constructor.getSymbols('custom')}#custom38" />
							</svg>
						</span>
					`: ''}
				</span>
				<span class="description">
					${question.gvp__Full_Product_Description__c !== null ? `
						<span class="product ${question.gvp__Related_Competitor__c != null ? ' competitor' : ''}">
							${question.gvp__Full_Product_Description__c}
						</span>
						<br />
					`: ''}
					${question.gvp__Type__c !== 'Check' ? `
						<span class="question">${question.gvp__Question_Text__c}</span>
					` : ''}
				</span>
			</label>
			<div class="${question.gvp__Required__c ? 'required' : ''}"></div>
		`;
		this.bind(questionElement.querySelector('.question-image'), 'click', () => {
			this.spinner({ blockInput: true });
			Media.image(question.Id)
				.then(Media.loadContentVersionData)
				.then(image => {
					this.spinner();
					App.navigateToUrl({
						external: false,
						icon: 'SurveyImage',
						nav: this.sequenceNav || this.nav,
						title: `${question.gvp__Full_Product_Description__c ? `${question.gvp__Full_Product_Description__c} - ` : ''}${question.gvp__Question_Text__c}`,
						type: 'image',
						url: Media.dataUrl(image)
					})
				});
		});
		this.bind(questionElement.querySelector('.answer-image'), 'click', () => {
			this.mediaEditor = new MediaEditor({
				breadcrumbs: [ question.gvp__Question_Text__c ],
				bulkEdit: true,
				handler: images => {
					question.images = images;
					this.updateImageIcon(question);
				},
				images: this.images(question),
				nav: this.nav,
				readOnly: this.readOnly,
				record: question,
				save: false,
				title: `${this.getLabel('Add')} ${this.getLabel('Photos')} - ${question.gvp__Question_Text__c}`
			});
		})
		let questionInput = questionElement.querySelector('div');
		let options = {
			element: questionInput,
			handler: this.answerChanged.bind(this),
			question: question,
			readOnly: this.readOnly,
			required: this.isRequiredQuestion(question)
		};
		switch(question.gvp__Type__c) {
			case 'Check':
				question.input = new Checkbox(Object.assign(options, {
					label: question.gvp__Question_Text__c,
					question: question
				}));
				break;
			case 'List':
				question.input = new List(Object.assign(options, {
					collapsed: true,
					collapsible: true,
					items: question.list,
					multiselect: question.gvp__Allow_Multiple_Answers__c
				}));
				break;
			case 'Lookup':
				question.field = new LookupField(Object.assign(options, {
					objectName: 'gvp__Survey_Answer__c',
					multiselect: question.gvp__Allow_Multiple_Answers__c
				}, this.lookupField(question), { label: null }));
				question.input = question.field.list;
				break;
			case 'Radio':
				question.input = new RadioList(Object.assign(options, {
					items: question.list
				}));
				break;
			case 'YesNo':
				question.input = new YesNo(options);
				break;
			default:
				question.input = new Input(Object.assign(options, {
					type: {
						'Currency': 'number',
						'Number': 'number',
						'Percent': 'number'
					}[question.gvp__Type__c] || 'text'
				}));
				break;
		}
		question.input.value = question.value;
		return element.appendChild(questionElement);
	}

	renderSurveyMatrixClusterHeader(cluster, element) {
		cluster.sizes = cluster.questions.reduce((sizes, question) => {
			let size = sizes.find(size => size.name === (question.gvp__Product_Size__c || ''));
			if (size) {
				size.questions.push(question);
			} else {
				sizes.push(size = {
					name: question.gvp__Product_Size__c || '',
					questions: [question],
					volume: (question.gvp__Size__r && question.gvp__Size__r.gvp__Liter_Volume__c) || 0
				});
			}
			return sizes;
		}, [])
			.sort((s1, s2) => s1.volume - s2.volume)
			.sort((s1, s2) => s1.name.localeCompare(s2.name));
		let sizeRow = element.appendChild(document.createElement('tr'));
		sizeRow.classList.add('size-row');
		sizeRow.innerHTML = `<th colspan="1" data-size=""></th>${
			cluster.sizes.filter(size => ![undefined, null].includes(size.name))
				.map((size, index) => `<th colspan="${
					size.questions.map(question => question.gvp__Question_Text__c)
						.filter((questionText, index, array) => array.indexOf(questionText) === index).length
				}" data-size="${size.name}">${size.name}</th>`
				).join('\n')
		}`;
		let questionRow = element.appendChild(document.createElement('tr'));
		questionRow.innerHTML = cluster.sizes.map(
			size => [''].concat(size.questions.map(question => question.gvp__Question_Text__c))
				.filter((questionText, index, array) => array.indexOf(questionText) === index)
				.map(questionText => `<th>${questionText}</th>`)
				.join('\n')
		).join('');
	}

	renderSurveyMatrixCluster(cluster, element) {
		let matrix = element.appendChild(document.createElement('div'));
		matrix.classList.add('matrix');
		let table = matrix.appendChild(document.createElement('table'));
		cluster.questions
			.reduce((products, question) => {
				products[question.gvp__Product_Number__c || 0] = products[question.gvp__Product_Number__c || 0] || [];
				products[question.gvp__Product_Number__c || 0].push(question);
				return products;
			}, [])
			.forEach((product, index, products) => {
				if (((index % 5) === 0) && (index < (products.length-1))) {
					this.renderSurveyMatrixClusterHeader(cluster, table);
				}
				let row = table.appendChild(document.createElement('tr'));
				row.innerHTML = `
					<th class="product ${product[0].gvp__Related_Competitor__c != null ? ' competitor' : ''}">
						${product[0].gvp__Product_Name__c}
					</th>
				`;
				(cluster.sizes || []).forEach(size => size.questions
					.map(question => question.gvp__Question_Text__c)
					.filter((questionText, index, array) => array.indexOf(questionText) === index)
					.forEach(questionText => {
						let productQuestion = product.filter(question => question.gvp__Question_Text__c === questionText)[0];
						if (productQuestion) {
							this.renderSurveyQuestion(
								productQuestion,
								row.appendChild(document.createElement('td'))
							);
						} else {
							row.appendChild(document.createElement('td'));
						}
					})
				);
			});
		return matrix;
	}

	renderSurveyCluster(cluster, element) {
		let isMatrixCluster = cluster.questions.reduce((result, question) => result && question.gvp__Matrix__c && ![undefined, null].includes(question.gvp__Product_Number__c), true);
		let isSmallScreen = window.matchMedia('(max-width: 960px)').matches;
		if (isMatrixCluster && !isSmallScreen) {
			return this.renderSurveyMatrixCluster(cluster, element);
		}
		let clusterElement = element;
		cluster.questions.map(question => this.renderSurveyQuestion(
			question, clusterElement
		));
		return clusterElement;
	}

	renderSurveyQuestions(element) {
		let questions = document.createElement('form')
		questions.classList.add('questions', 'container');
		questions.innerHTML += this.groups.map(group => `
			<div class="${group.active ? 'active' : ''}" data-group="${group.number}"></div>
        `).join('\n');
		this.groups.map(group => group.clusters.map(cluster => this.renderSurveyCluster(
			cluster, questions.querySelector(`div[data-group="${group.number}"]`)
		)));
        return element.appendChild(questions);
	}

	async renderSurvey(element) {
		const modified = this.modified;
		this.spinner({ element: element });
		Survey.trackPageview('/Survey');
		element.classList.add('slds-scope', 'survey');
		await this.fetchSurveyPlanQuestions();
		await this.fetchOpenSurvey();
		await this.renderSurveyGroups(element);
		await this.renderSurveyQuestions(element)
		await this.updateConditionalQuestions();
		this.questions.forEach(this.updateImageIcon.bind(this));
		this.spinner({ element: element });
		this.modified = modified;
		if (this.readOnly) {
			this.renderSurveySummary();
		} else {
			if (this.enableCopyPrevious) {
				let surveys = {};
				for (let question of this.questions) {
					await this.fetchSimilarQuestions(question);
					await this.fetchMostRecentAnswers(question, surveys);
				}
				if (this.questions.filter(question => question.mostRecentAnswer).length > 0) {
					this.tabs.buttons.find(button => button.value === 'copyPrevious').disabled = false;
					this.tabs.render();
				}
			}
			await Geolocation.update(this.survey = this.survey || {});
		}
	}

	async render() {
		this.nav.footer = '';
		if (!this.account) {
			return this.renderAccountSelector(this.nav.replace(this.renderContainer(), Object.assign(this.header, {
				breadcrumbs: [],
				buttons: (this.nav.views.length > 1) ? [
					{ icon: Icons.icon('Back'), label: this.getLabel('Back'), value: 'back' }
				] : [],
				title: this.getLabel('Survey')
			})).querySelector('div'));
		}
		if (!this.plan) {
			return this.renderSurveyPlanSelector(this.nav.replace(this.renderContainer(), Object.assign(this.header, {
				breadcrumbs: this.account.Name,
				buttons: [
					{ icon: Icons.icon('Back'), label: this.getLabel('Back'), value: 'back' }
				],
				title: this.getLabel('Survey')
			})).querySelector('div'));
		}
		let buttons = [];
		buttons.push({ icon: Icons.icon('Back'), label: this.getLabel('Back'), value: 'back' });
		this.enableCopyPrevious = !this.plan.gvp__Disable_Copy_Previous__c && this.settings && this.settings.gvp__Show_Previous_Answers__c;
		this.showSummary = this.settings && this.settings.gvp__Show_Summary_Page__c && !this.plan.gvp__Disable_Summary_Page__c;
		return this.renderSurvey(this.nav.push(this.renderContainer(), {
			breadcrumbs: this.account.Name,
			buttons: buttons,
			title: this.plan.Name
		}));
	}

	renderSurveySummary() {
		if (this.element && this.showSummary && this.survey &&
			(this.survey.gvp__Status__c === 'Submitted')
		) {
			let surveySummaryTab = this.tabs.tabs.find(tab => tab.name === 'surveySummary');
			surveySummaryTab.disabled = false;
			this.tabs.select(surveySummaryTab);
			this.groups.forEach(group => group.active = false);
			surveySummaryTab.group.active = true;
			try {
				this.element.querySelector('.questions > div.active').classList.remove('active');
				this.element.querySelector(`.questions > div[data-group="${surveySummaryTab.group.number}"]`).classList.add('active');
			} catch(error) {}
			return this.surveySummary = new SurveySummary({
				element: this.element.querySelector('.questions div[data-group="surveySummary"]'),
				nav: this.sequenceNav || this.nav,
				questions: this.questions,
				questionsOffTarget: this.questionsOffTarget(),
				questionsOnTarget: this.questionsOnTarget(),
				settings: this.settings,
				survey: this.survey,
				userId: this.userId
			});
		}
	}

	async save(status) {
		status = status || 'Submitted';
		let valid = this.validate({ displayMessage: status === 'Submitted' });
		if (!(this.account && this.plan) ||
			((status === 'Submitted') && !valid)
		) {
			return Promise.reject();
		}
		let incomplete = !this.complete;
		if ((status === 'Submitted') && !await Modal.confirm({
			description: this.getLabel(`Survey_${incomplete ? 'Incomplete' : 'Submit'}_Message`),
			no: 'Cancel',
			title: incomplete ? this.getLabel('Survey_Incomplete') : `${this.getLabel('Survey_Submit')}?`,
			yes: 'Survey_Submit'
		})) {
			return Promise.reject();
		}
		this.spinner({ blockInput: true });
		let isNew = this.survey && !this.survey.Id;
		let now = new Date();
		let survey = Object.assign({
			gvp__Date_of_Survey__c: `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`,
			gvp__Points__c: (status === 'Submitted') ? this.questions.reduce((points, question) =>
				points += question.answer.gvp__Matching_Target_Points__c = this.targetMet(question) ? question.gvp__Points__c : 0
			, 0) : 0,
			gvp__Send_Email_Summary__c: this.settings.gvp__Send_Email_Summary__c,
			gvp__Source__c: 'Mobile',
			gvp__Status__c: status,
			gvp__Submitted_Date_Time__c: (status === 'Submitted') ? now.toISOString() :null
		}, {
			gvp__Account__c: this.account.Id,
			gvp__Account_Call__c: this.accountCallId || null,
			gvp__Survey_Period__c: this.plan.Id,
			gvp__Surveyed_by__c: this.userId
		}, this.survey ? {
			Id: this.survey.Id,
			gvp__Geolocation__Latitude__s: this.survey.gvp__Geolocation__Latitude__s,
			gvp__Geolocation__Longitude__s: this.survey.gvp__Geolocation__Longitude__s
		} : {});
		if (valid) {
			await this.updateTeams(survey);
		}
		let result = await this.saveRecords({ description: this.descriptions.gvp__Survey__c, records: survey });
		if (!this.validate({ result: result[0] })) {
			this.spinner();
			return Promise.reject();
		}
		this.survey = Object.assign(this.survey || {}, survey, {
			Id: (result && result[0] && result[0].id) || (this.survey && this.survey.Id),
			plan: this.plan
		});
		if (!(await this.saveAnswers(isNew))) {
			this.spinner();
			return Promise.reject();
		}
		await this.saveImages();
		if (navigator.onLine && (typeof(Db) !== 'undefined')) {
			Db.syncUnsyncedRecords({ descriptions: this.descriptions });
		}
		this.modified = false;
		this.spinner();
		return this.survey;
	}

	async saveAnswers(isNew) {
		let getAnswer = (question, index) => {
			let answer = Object.assign({
				gvp__Matching_Target_Points__c: question.answer.gvp__Matching_Target_Points__c,
				gvp__Matching_Target_Points_Auxiliary__c: question.answer.gvp__Matching_Target_Points__c ? (question.gvp__Points_Auxiliary__c || 0) : 0,
				gvp__Order__c: index,
				gvp__Question__c: question.Id,
				gvp__Status__c: status,
				gvp__Survey__c: this.survey.Id
			}, question.answer.Id ? { Id: question.answer.Id } : {});
			let value = question.input.value;
			let values = (Array.isArray(value) ? value : (([undefined, null].indexOf(value) < 0) ? [value] : []))
				.map(value => ({'yes': 'true', 'no': 'false'}[value] || value.value || value));
			value = (values.length > 0) ? values[0] : ((question.gvp__Type__c === 'Check') ? false : null);
			if (question.gvp__Allow_Multiple_Answers__c) {
				answer.gvp__Answer_Multiple__c = values.join('|');
			}
			answer[this.valueKey(question)] = value;
			return answer;
		}
		let result;
		if (isNew && (typeof(Db) === 'undefined')) {
			let answers = this.questions.map(getAnswer.bind(this));
			result = await Api.bulkInsert({
				description: this.descriptions.gvp__Survey_Answer__c,
				records: answers
			});
			if (!(result && (result.length === answers.length) && result.reduce((valid, result) => valid && this.validate({ result: result }), true))) {
				return false;
			}
			result.forEach((result, index) => Object.assign(
				this.questions[index].answer,
				answers[index],
				{ Id: result.id }
			));
		} else {
			let index = 0;
			for (let question of this.questions) {
				let answer = getAnswer(question, index);
				result = await this.saveRecords({ description: this.descriptions.gvp__Survey_Answer__c, records: answer });
				if (!this.validate({ result: result[0] })) {
					return false;
				}
				Object.assign(question.answer, answer, {
					Id: (result && result[0] && result[0].id) || (question.answer && question.answer.Id)
				});
				index++;
			}
		}
		return true;
	}

	async saveImages() {
		const additionalPhotoLinks = Survey.getReferenceIds({
			referenceFields: ['Account', 'gvp__Account_Call__c'],
			description: this.descriptions.gvp__Survey__c,
			record: this.survey,
			seedIds: [this.survey.Id]
		});
		for (const question of this.questions) {
			const answerSpecificLinks = Survey.getReferenceIds({
				referenceFields: ['gvp__Brand__c', 'gvp__Item__c', 'gvp__Label__c'],
				description: this.descriptions.gvp__Survey_Plan_Question__c,
				record: question,
				seedIds: [question.answer.Id]
			});
			await Media.save(this.images(question), answerSpecificLinks.concat(additionalPhotoLinks));
		}
	}

    target(question) {
		let targetKey = this.targetKey(question);
		let target = question[targetKey];
		let booleans = { 'true': true, 'false': false };
		return target in booleans ? booleans[target] : target;
    }

	targetKey(question) {
		const type = question.gvp__Type__c;
		switch(type) {
			case 'Lookup':
				let referenceTo = question.gvp__Reference_To__c;
				let targetKey = referenceTo && referenceTo.toLowerCase().replace('_answer_', '_target_');
				let field = this.descriptions.gvp__Survey_Plan_Question__c.fields.filter(f => f.name.toLowerCase() === targetKey)[0];
				return field && field.name;
			default:
				const typeToTargetKey = {
					Text: 'gvp__Target_Text_List__c',
					Radio: 'gvp__Target_Text_List__c',
					List: 'gvp__Target_Text_List__c',
					Check: 'gvp__Target_Checkbox__c',
					YesNo: 'gvp__Target_YesNo__c',
					Currency: 'gvp__Target_Currency__c',
					Percent: 'gvp__Target_Percentage__c',
					Number: 'gvp__Target_Number__c'
				};
				return typeToTargetKey[type] || 'gvp__Target_Text_List__c';
		}
	}

	targetMet(question, value) {
		let target = this.target(question);
		if ((target === null) || (target === undefined)) {
			return null;
		}
		value = value || (question.input && question.input.value);
		if ([undefined, null].includes(value)) {
			value = question.value;
		}
		if (Array.isArray(value)) {
			return value.reduce((value, v) => value || this.targetMet(question, v), false);
		}
		value = (value && value.value) || value;
		switch (question.gvp__Type__c) {
			case 'Check':
				return !!value === target;
			case 'Currency':
			case 'Number':
			case 'Percent':
				value = Number(value);
				let match = question.gvp__Match__c;
				switch(match) {
					case '=':
						return value === target;
					case '>':
						return value > target;
					case '>=':
						return value >= target;
					case '<':
						return value < target;
					case '<=':
						return value <= target;
				}
				break;
			case 'YesNo':
				if (typeof(value) === 'boolean') {
					return ({'yes': true, 'no': false}[value] === target.toLowerCase().trim());
				}
			default:
				return (value || '').toString().toLowerCase().trim() === target.toLowerCase().trim();
		}
		return false;
	}

	async updateTeams(survey) {
		if (!navigator.onLine) {
			return;
		}
		if (!survey.gvp__Account_Team__c) {
			if (survey.gvp__Audited_Survey__c) {
				survey.gvp__Account_Team__c = auditedSurvey.gvp__Account_Team__c || null;
			} else {
				let managedTeams = await Api.query(`
					Select gvp__SalesPerson__c
					From gvp__Account_Team__c
					Where (gvp__Manager_1__c = '${this.userId}')
						OR (gvp__Manager_2__c = '${this.userId}')
						OR (gvp__Manager_3__c = '${this.userId}')
						OR (gvp__Alternate_User_1__c = '${this.userId}')
				`).then(result => (result && result.records) || []);
				let managedUserIds = managedTeams.map(team => team.gvp__SalesPerson__c)
					.filter((id, index, array) => id && (array.indexOf(id) === index));
				let previousSurvey = await Api.query(`
					Select gvp__Account_Team__c
					From gvp__Survey__c
					Where (Id <> ${survey.Id ? `'${survey.Id}'` : 'NULL'})
						AND (gvp__Account__c = '${survey.gvp__Account__c}')
						AND (gvp__Survey_Period__c = '${survey.gvp__Survey_Period__c}')
						AND (gvp__Status__c = 'Submitted')
						${survey.gvp__Submitted_Date_Time__c ? `AND (gvp__Submitted_Date_Time__c < ${survey.gvp__Submitted_Date_Time__c})` : ''}
						AND ((gvp__Surveyed_by__c = '${this.userId}')
							${(managedUserIds.length > 0) ? `
								OR ((gvp__Account_Team__c <> NULL)
									AND (gvp__Surveyed_by__c In (${managedUserIds.map(id => `'${id}'`)}))
								)
							` : ''}
						)
					Order By gvp__Submitted_Date_Time__c Desc, gvp__Date_of_Survey__c Desc
				`, { syncInterval: 0 }).then(result => result && result.records && result.records[0]);
				if (previousSurvey) {
					survey.gvp__Account_Team__c = previousSurvey.gvp__Account_Team__c || null;
				} else if (managedTeams.length > 0) {
					survey.gvp__Account_Team__c = managedTeams[0].Id;
				}
			}
		}
		if (survey.gvp__Account_Team__c) {
			let team = await Api.query(`
				Select gvp__Sales_Team_Division__c
				From gvp__Account_Team__c
				Where Id = '${survey.gvp__Account_Team__c}'
			`).then(result => result && result.records && result.records[0]);
			if (team) {
				survey.gvp__Sales_Team_Division__c = team.gvp__Sales_Team_Division__c;
			}
		}
	}

	updateConditionalQuestions() {
		let met = true;
		let cluster;
		let group;
		this.questions.forEach(question => {
			if ((question.gvp__Cluster_Number__c !== cluster) || (question.gvp__Group_Number__c !== group)) {
				cluster = question.gvp__Cluster_Number__c;
				group = question.gvp__Group_Number__c;
				met = question.gvp__Conditional__c ? this.targetMet(question) : true;
				question.show = true;
			} else {
				question.show = met;
			}
			let element = this.element.querySelector(`div[data-record-id="${question.Id}"]`);
			if (element) {
				element.classList[question.show ? 'remove' : 'add']('slds-hidden');
			}
		});
	}

	updateImageIcon(question) {
		let icon = this.element.querySelector(`.answer-image[data-record-id="${question.Id}"]`);
		if (!icon) {
			return;
		}
		icon.classList.remove('slds-icon-custom-57', 'slds-icon-custom-39', 'slds-icon-custom-100');
		if (this.image(question)) {
			icon.classList.add('slds-icon-custom-39');
		} else if (this.isRequiredPhoto(question)) {
			icon.classList.add('slds-icon-custom-100');
		} else {
			icon.classList.add('slds-icon-custom-57');
		}
	}

	validate(options) {
		options = options || {};
		let result = options.result;
		let errors = [];
		let messages = [];
		if (result) {
			let resultErrors = (result && result.errors) || [];
			resultErrors.forEach(error => messages.push(error.message));
			errors = [ resultErrors ];
		} else {
			let missingAnswers = this.questions.filter(q => q.show !== false).filter(this.isMissingRequiredAnswer.bind(this));
			let missingPhotos = this.questions.filter(q => q.show !== false).filter(this.isMissingRequiredPhoto.bind(this));
			this.nav.footer = '';
			if (missingAnswers.length > 0) {
				messages.push(`${this.getLabel('survey_answers_missing')} - ${missingAnswers.length}`);
			}
			if (missingPhotos.length > 0) {
				messages.push(`${this.getLabel('survey_answer_photos_missing')} - ${missingPhotos.length}`);
			}
			errors = [ missingAnswers, missingPhotos ];
		}
		let valid = errors.reduce((count, array) => count + array.length, 0) === 0;
		if (!valid && (options.displayMessage !== false)) {
			Toast.displayMessage({ element: this.element.querySelector('.message'), message: messages });
		}
		return valid;
	}

    value(question, answer) {
		if (!(question && answer)) {
			return;
		}
		if (answer.gvp__Answer_Multiple__c) {
			return answer.gvp__Answer_Multiple__c.split('|');
		}
		const valueKey = this.valueKey(question);
		let value = answer[valueKey];
		switch(question.gvp__Type__c) {
			case 'YesNo':
				value = { 'true': 'yes', 'false': 'no' }[value];
				break;
		}
		return value;
    }

	valueKey(question) {
		const type = question.gvp__Type__c;
		switch(type) {
			case 'Lookup':
				let field = this.lookupField(question);
				return field && field.name;
			default:
				const typeToValueKey = {
					Text: 'gvp__Answer_Text__c',
					Radio: 'gvp__Answer_Text__c',
					List: 'gvp__Answer_Text__c',
					Check: 'gvp__Answer_Check__c',
					YesNo: 'gvp__Answer_Text__c',
					Currency: 'gvp__Answer_Currency__c',
					Percent: 'gvp__Answer_Percent__c',
					Number: 'gvp__Answer_Number__c'
				};
				return typeToValueKey[type] || 'gvp__Answer_Text__c';
		}
	}
}
