import { Api } from './api.js'
import { CustomObject } from './customObject.js'
import { Header } from './header.js'
import { InputField } from './inputField.js'
import { List } from './list.js'
import { Media } from './media.js'
import { Nav } from './nav.js'

export class SurveyPhotos extends CustomObject {
	constructor(options) {
		super(options);
		this.header = new Header({
			buttons: [],
			breadcrumbs: [],
			element: document.createElement('header'),
			handler: (event, detail) => {
				switch(event) {
					case 'action':
						switch(detail.value) {
							case 'back':
								this.cancelSearch = true;
								this.nav.pop();
								break;
						}
					break;
				}
			},
			icon: {
				cssClass: 'slds-icon-custom-19',
				url: `${SurveyPhotos.getSymbols('custom')}#custom38`
			},
			menu: [],
			title: this.title || ''
		});
		this.nav = this.nav || new Nav(this.element, { header: this.header });
		this.element = document.createElement('div');
		this.images = [];
		this.init();
	}

	async init() {
		SurveyPhotos.trackPageview('/Survey Photo Browswer');
		this.args = SurveyPhotos.parseArgs();
		CustomObject.labels = await Api.labels();
		this.nav.replace(this.render(), Object.assign(this.header, {
			buttons: (this.nav.views.length > 1) ? [{ label: 'Back', value: 'back' }] : [],
			title: this.title || `${this.getLabel('Survey')} ${this.getLabel('Photo_Browser')}`
		}));
	}

	async renderAccountFilter(accountId) {
		this.accounts = (await Api.query(`
			Select Id,Name From Account
			Where Id IN (Select gvp__Account__c from gvp__Survey__c)
			Order By Name Asc
		`)).records || [];
		this.account = accountId ? this.accounts.filter(account => account.Id === accountId)[0] : this.account;
		this.accountFilter = new List({
			clearable: true,
			collapsed: true,
			collapsible: true,
			element: this.element.querySelector('.filters .account'),
			handler: async (event, detail) => {
				switch(event) {
					case 'valueChange':
						this.account = detail && detail.value && detail.value.account;
						this.plan = null;
						await this.renderPlanFilter();
						await this.renderSurveyFilter();
						this.search();
						break;
				}
			},
			label: 'Account',
			items: this.accounts.map(account => Object.assign({ label: account.Name, value: account.Id, account: account })),
			placeholder: this.getLabel('All'),
			value: this.account ? { label: this.account.Name, value: this.account.Id, account: this.account } : null
		});
	}

	async renderDateFilter(options) {
		this.dateFilter = new InputField({
			element: this.element.querySelector('.filters .date'),
			handler: async (event, detail) => {
				switch(event) {
					case 'valueChange':
						this.startDate = SurveyPhotos.dateToUTC((detail && detail.value[0]) || '').toISOString().split('T')[0];
						this.endDate = SurveyPhotos.dateToUTC((detail && detail.value[1]) || '').toISOString().split('T')[0];
						await this.renderSurveyFilter();
						this.search();
						break;
				}
			},
			isSearch: true,
			label: 'Date',
			type: 'date',
			value: [
				new Date(Date.now() - (30 * 24 * 60 * 60 * 1000)).toISOString(),
				new Date().toISOString()
			]
		});
	}

	async renderPlanFilter(planId) {
		this.plans = (await Api.query(`
			Select Id,Name From gvp__Survey_Plan__c
			Where Id IN (Select gvp__Survey_Period__c from gvp__Survey__c ${this.account ? `Where gvp__Account__c = '${this.account.Id}'` : ''})
			Order By Name Asc
		`)).records || [];
		this.plan = planId ? this.plans.filter(plan => plan.Id === planId)[0] : this.plan;
		this.planFilter = new List({
			clearable: true,
			collapsed: true,
			collapsible: true,
			element: this.element.querySelector('.filters .plan'),
			handler: async (event, detail) => {
				switch(event) {
					case 'valueChange':
						this.plan = detail && detail.value && detail.value.plan;
						this.survey = null;
						await this.renderSurveyFilter();
						this.search();
						break;
				}
			},
			label: 'Plan',
			items: this.plans.map(plan => Object.assign({ label: plan.Name, value: plan.Id, plan: plan })),
			placeholder: this.getLabel('All'),
			value: this.plan ? { label: this.plan.Name, value: this.plan.Id, plan: this.plan } : null
		});
	}

	async renderSurveyFilter(surveyId) {
		let where = [];
		if (this.account) {
			where.push(`gvp__Account__c = '${this.account.Id}'`);
		}
		if (this.plan) {
			where.push(`gvp__Survey_Period__c = '${this.plan.Id}'`);
		}
		if (this.startDate) {
			where.push(`gvp__Date_of_Survey__c >= ${this.startDate}`);
		}
		if (this.endDate) {
			where.push(`gvp__Date_of_Survey__c <= ${this.endDate}`);
		}
		if (where.length > 0) {
			this.surveys = (await Api.query(`
				Select
					Id,
					Name,
					gvp__Account__r.Name,
					gvp__Date_of_Survey__c,
					gvp__Survey_Period__r.Name,
					gvp__Surveyed_by__r.Name
				From gvp__Survey__c
				Where ${where.map(w => `(${w})`).join(' AND ')}
				Order By gvp__Account__c,gvp__Survey_Period__r.Name,gvp__Date_of_Survey__c Desc
			`)).records || [];
		} else {
			this.surveys = [];
		}
		this.survey = surveyId ? this.surveys.filter(survey => survey.Id === surveyId)[0] : this.survey;
		let surveyLabel = survey => [
			survey.gvp__Survey_Period__r.Name,
			new Date(survey.gvp__Date_of_Survey__c).toLocaleDateString(),
			survey.gvp__Surveyed_by__r && survey.gvp__Surveyed_by__r.Name
		].filter(part => part).join(' - ');
		this.surveyFilter = new List({
			clearable: true,
			collapsed: true,
			collapsible: true,
			element: this.element.querySelector('.filters .survey'),
			handler: (event, detail) => {
				switch(event) {
					case 'valueChange':
						this.survey = detail && detail.value && detail.value.survey;
						this.search();
						break;
				}
			},
			label: 'Survey',
			items: this.surveys.map(survey => Object.assign({ label: surveyLabel(survey), value: survey.Id, survey: survey })),
			placeholder: this.getLabel('All'),
			value: this.survey ? { label: surveyLabel(this.survey), value: this.survey.Id, survey: this.survey } : null
		});
		this.element.querySelector('.filters .survey').classList[this.surveyFilter.items.length > 0 ? 'remove' : 'add']('slds-hidden');
	}

	async renderFilters() {
		await this.renderAccountFilter(this.args.accountId);
		await this.renderDateFilter(this.args.surveyId);
		await this.renderPlanFilter(this.args.surveyPlanId);
		await this.renderSurveyFilter(this.args.surveyId);
		this.search();
	}

	renderImages() {
		this.element.querySelector('.images').innerHTML = `
			${this.images.map((image, index, array) => {
				let previousGroup = array[index-1] && array[index-1].group;
				return `
					${((!previousGroup && image.group) || (image.group !== previousGroup)) ? `<header class="slds-badge slds-text-heading--label">${image.group || this.getLabel('None')}</header>` : ''}
					<div class="slds-visual-picker slds-visual-picker_medium">
						<input type="checkbox" id="visual-picker-${image.Id}" data-media="${image.Id}" ${image.selected ? 'checked' : ''} disabled />
						<label for="visual-picker-${image.Id}">
							<span class="slds-visual-picker__figure slds-visual-picker__text">
								${image ? `
									<img src="${Media.dataUrl(image)}" title="${image.Title}" />
								`: `<span>???</span>`}
							</span>
							<span class="slds-visual-picker__body hidden">
								<span class="slds-text-heading_small">${image.Title}</span>
								<span class="slds-text-title">${image.Description || ''}</span>
							</span>
							<span class="slds-icon_container slds-visual-picker__text-check">
								<svg class="slds-icon slds-icon-text-check slds-icon_x-small" aria-hidden="true">
									<use xlink:href="${SurveyPhotos.getSymbols()}#check"></use>
								</svg>
							</span>
						</label>
					</div>
				`;
			}).join('\n')}
		`;
	}

	renderProgress(percentage) {
		this.element.querySelector('.progress').innerHTML = percentage ? `
			<div class="slds-progress-bar slds-progress-bar_circular" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percentage}" role="progressbar">
				<span class="slds-progress-bar__value" style="width: ${percentage}%;">
					<span class="slds-assistive-text">${this.getLabel('Search_Online_Results')}: ${percentage}%</span>
				</span>
			</div>
		` : '';
	}

	render() {
		this.element.innerHTML = `
			<style>
				.hidden {
					display: none !important;
				}

				.images {
					align-content: flex-start;
					display: flex;
					flex: 1;
					flex-wrap: wrap;
					justify-content: flex-start;
					overflow-y: auto;
					margin: 1em;
				}

				.images header {
					font-size: larger;
					width: 100%;
				}

				.images div {
					max-height: 240px;
					max-width: 240px;
					margin: 5px;
					-webkit-touch-callout: none;
				}

				.images div input:not(:checked) ~ label .slds-visual-picker__text-check {
					/* fix for Microsoft Edge */
					display: none;
				}

				.images div img {
					height: 100%;
					object-fit: contain;
					padding: 1px;
					width: 100%;
				}
			</style>
			<div class="filters">
				<div class="account"></div>
				<div class="date"></div>
				<div class="plan"></div>
				<div class="survey"></div>
			</div>
			<div class="progress slds-m-around_medium"></div>
			<div class="images"></div>
		`;
		this.renderFilters();
		return this.element;
	}

	async search() {
		if (this.searching) {
			this.cancelSearch = true;
			return this.searchTimer = this.searchTimer || setTimeout(this.search.bind(this), 100);
		}
		this.cancelSearch = false;
		this.searching = true;
		this.searchTimer = null;
		if (this.images && (this.images.length > 0)) {
			this.images = [];
			this.renderImages();
		}
		let progress = 0;
		this.renderProgress(progress);
		let surveys = this.survey ? [this.survey] : this.surveys || [];
		for (let survey of surveys) {
			if (this.cancelSearch) {
				this.searching = false;
				return;
			}
			let answers = (await Api.query(`
				Select Id
				From gvp__Survey_Answer__c
				Where (gvp__Survey__c = '${survey.Id}')
				And (gvp__Question__r.gvp__Photo_Attachment_Type__c Not In (Null, 'None'))
			`)).records || [];
			for (let answer of answers) {
				if (this.cancelSearch) {
					this.searching = false;
					return;
				}
				let images = (await Media.images(answer.Id)) || [];
				if (images.length > 0) {
					for (let image of images) {
						if (this.account && !this.plan) {
							image.group = survey.gvp__Survey_Period__r.Name;
						} else if (!this.account && this.plan) {
							image.group = survey.gvp__Account__r.Name;
						} else {
							image.group = [
								survey.gvp__Survey_Period__r.Name,
								new Date(survey.gvp__Date_of_Survey__c).toLocaleDateString(),
								survey.gvp__Surveyed_by__r.Name
							].join(' - ');
						}
						await Media.loadContentVersionData(image);
						this.images.push(image);
					}
					this.renderImages();
				}
				this.renderProgress((progress += 1/(answers.length * surveys.length)) * 100);
			}
		}
		if (this.images.length === 0) {
			this.element.querySelector('.images').innerHTML = this.getLabel('No_Records');
		}
		this.renderProgress(0);
		this.searching = false;
	}
}