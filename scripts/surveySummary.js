import { Api } from './api.js'
import { App } from './app.js'
import { CustomObject } from './customObject.js'
import { Db } from './db.js'
import { Field } from './field.js'
import { PopupEditor } from './popupEditor.js'
import { Tabs } from './tabs.js'

export class SurveySummary extends CustomObject {
	constructor(options) {
		super(options);
		this.element.innerHTML = `
			<style>
				.survey-summary .points-summary {
					display: flex;
				}
				.survey-summary .points-summary .possible-points { color: #787878; }
				.survey-summary .points-summary .difference-text {
					margin: 4px 0 2px 0;
				}
				.survey-summary .points-summary .better {
					color: #20831a;
				}
				.survey-summary .points-summary .worse {
					color: #c3272f;
				}
				.survey-summary .points-summary > * {
					flex: none;
				}
				.survey-summary .points-summary > * {
					margin: auto;
				}
				.survey-summary .points-summary .chart {
					flex: 1;
					margin: auto 2rem;
				}
				.survey-summary .points-summary .chart .possible {
					width: 100%;
					height: 50px;
					background-color: lightgray;
					border: 1px solid darkgray;
				}
				.survey-summary .points-summary .chart .actual {
					width: 0;
					height: 50px;
					background-color: orange;
					border: 0;
					border-right: 1px solid darkgray;
				}
				.survey-summary .points-summary .chart span.score {
					float: right;
					font-size: 32px;
					font-weight: bold;
					padding: 4px 12px;
				}
				.survey-summary .points-summary .chart.perfect .possible .actual span.score {
					display: none;
				}
				.survey-summary .points-summary .chart.perfect .actual {
					background-color: mediumseagreen;
				}
				.survey-summary .points-summary .objectives-completed .completed {
					color: lightgreen;
					font-weight: bold;
				}
				.survey-summary .points-summary #send-email-summary {
					margin: 1em 0;
				}
				.survey-summary button.objective {
					min-width: 9rem;
				}
				@media (max-width: 640px) {
					.survey-summary .points-summary {
						flex-direction: column;
					}
					.survey-summary .points-summary > *:first-child {
						margin: initial;
					}
				}
				.survey-summary .watermark {
					background: url("${SurveySummary.baseUrl}images/watermark-logo.png");
					background-repeat: no-repeat;
					background-position: center;
					background-size: contain;
					height: 10em;
					margin: 4em 2em;
				}
				.survey-summary .slds-text-heading_medium {
					font-weight: 400;
				}
				.survey-summary div[data-summary-group] {
					background: white;
					background-clip: padding-box;
					border: 1px solid #dddbda;
					box-shadow: 0 2px 2px 0 rgba(0,0,0,.1);
					display: none;
				}
				.survey-summary div[data-summary-group].active {
					display: block;
				}
				.survey-summary .groups > div header {
					border: none !important;
					margin: 1em !important;
					padding: 0;
				}
				.survey-summary .groups > div .slds-visual-picker {
					margin: .5em;
				}
				.survey-summary .groups > div .slds-visual-picker__text {
					border: 1px solid #dddbda !important;
					box-shadow: 0 2px 2px rgba(0,0,0,.05) !important;
					display: flex;
					flex-direction: column;
					height: 15em;
					width: 20em;
				}
				.survey-summary .groups > div input:checked ~ label .slds-visual-picker__text {
					border: 1px solid #1589ee !important;
					box-shadow: 0 0 0 1px #1589ee inset !important;
				}
				.survey-summary .groups > div .slds-visual-picker__text > article.slds-tile {
					background-color: initial;
					border: none;
					flex: 1;
					width: 100%;
				}
				.survey-summary .groups > div .slds-visual-picker__text > article.slds-tile h3 {
					text-align: left;
				}
				.survey-summary .groups > div .slds-visual-picker__text > article.slds-tile h3 span {
					display: inline-block;
					font-weight: bold;
				}
				.survey-summary .groups > div .slds-visual-picker__text > article.slds-tile .slds-item_detail {
					text-align: left;
				}
				.survey-summary .groups > div .slds-visual-picker__text > article.slds-tile {
					background-color: initial;
					border: none;
					flex: 1;
					width: 100%;
				}
				.survey-summary .groups > div .slds-visual-picker__text > button {
					flex: none;
					margin: 1em auto;
					width: 80%;
				}
			</style>
			<div class="survey-summary slds-scope slds-m-around_medium"></div>
		`;
		this.init();
	}

	static get properties() {
		return [
			'questions',
			'questionsOffTarget',
			'questionsOnTarget',
			'settings',
			'survey'
		];
	}

	get descriptions() {
		return this._descriptions = this._descriptions || {};
	}
    get difference() {
        return Math.abs(this.points - this.previousPoints);
    }
    get differenceType() {
        let points = this.points;
        let previousSurvey = this.previousSurvey;
        let previousPoints = this.previousPoints;
        return previousSurvey ? ((points > previousPoints) ? 'better' : ((points < previousPoints) ? 'worse' : 'unchanged')) : null;
    }
    get fields() {
		return (this.surveyPlanQuestionFieldset.fields || []).map(field =>
			this.descriptions.gvp__Survey_Plan_Question__c.fields.find(
				f => f.name === field.name
			)
		);
    }
	get groups() {
		return this.showTargets ? this.questionsOffTarget.reduce((groups, question) => {
			let groupName = this.groupName(question);
			let group = groups.filter(group => group.name === groupName)[0];
			if (!group) {
				let groupScore = this.questionsOnTarget
					.filter(question => this.groupName(question) === groupName)
					.reduce((points, question) => points += question.gvp__Points__c || 0, 0);
				let totalScore = this.questions
					.filter(question => this.groupName(question) === groupName)
					.reduce((points, question) => points += question.gvp__Points__c || 0, 0);
				groups.push(group = { name: groupName, questions: [], score: `${groupScore}/${totalScore}` });
			}
			group.questions.push(this.questions.find(q => q.Id === question.Id));
			return groups;
        }, []) : [];
	}
	get notMet() {
		return (this.questionsOffTarget || []).length > 0;
	}
	get percentageOfPossiblePoints() {
        let points = this.points;
        let possiblePoints = this.possiblePoints;
        return (possiblePoints > 0) ? Math.round((points / possiblePoints) * 100) : 0;
	}
	get perfect() {
        return this.percentageOfPossiblePoints === 100;
	}
	get points() {
		return (this.survey && this.survey.gvp__Points__c) || 0;
	}
	get possiblePoints() {
        return (this.questions || []).reduce((points, question) => points += question.gvp__Points__c || 0, 0);
	}
	get previousPoints() {
        let previousSurvey = this.previousSurvey;
        return (previousSurvey && previousSurvey.gvp__Points__c) || 0;
	}
	get previousSurvey() {
		return this.surveys && this.surveys[1];
	}
	get showObjectives() {
		return this.showTargets;
	}
	get showSummaryPoints() {
		return this.settings && this.settings.gvp__Show_Summary_Points__c;
	}
	get showTargets() {
		return this.settings && this.settings.gvp__Show_Targets__c;
	}

	bindEvents() {
		this.bind('#send-email-summary button', 'click', async () => {
			this.sendEmailSummary = event.currentTarget.classList.toggle('slds-is-pressed');
			if (this.sendEmailSummary !== this.survey.gvp__Send_Email_Summary__c) {
				this.survey.gvp__Send_Email_Summary__c = this.sendEmailSummary;
				await this.saveRecords({
					description: this.descriptions.gvp__Survey__c,
					onlineOnly: navigator.onLine,
					records: this.survey
				});
				this.render();
			}
		});
		this.bind('button.objective', 'click', event => {
			let questionId = event.srcElement.getAttribute('data-question-id');
			let question = this.questions.find(question => question.Id === questionId);
			this.editObjective(question);
		});
	}

	async closeObjectives() {
		let onTargetIds = this.questionsOnTarget.map(question => question.Id);
		let objectivesToClose = this.objectives.filter(objective => onTargetIds.indexOf(objective.gvp__Survey_Plan_Question__c) >= 0)
			.map(objective => Object.assign({
				Id: objective.Id,
				gvp__Status__c: 'Closed - Won'
			}))
		await this.saveRecords({
			description: this.descriptions.gvp__Account_Objective__c,
			onlineOnly: navigator.onLine,
			records: objectivesToClose
		});
		this.objectivesCompleted = objectivesToClose;
	}

	async createRequiredObjectives() {
		let objectivesToCreate = this.questionsOffTarget.filter(question =>
			!question.objective &&
			(question.gvp__Objective_Creation__c === 'Always')
		).map(question => this.newObjective(question));
		let result = await this.saveRecords({
			description: this.descriptions.gvp__Account_Objective__c,
			onlineOnly: navigator.onLine,
			records: objectivesToCreate
		});
		objectivesToCreate.forEach((objective, index) => {
			if (result[index].id) {
				objective.Id = result[index].id;
				this.objectives.push(objective);
			}
		});
		this.questions.forEach(question =>
			question.objective = (this.objectives || []).find(
				objective => objective.gvp__Survey_Plan_Question__c === question.Id
			)
		);
	}

	async editObjective(question) {
		const editorOptions = {
			description: this.descriptions.gvp__Account_Objective__c,
			type: 'gvp__Account_Objective__c',
			hiddenFields: ['gvp__Account__c', 'gvp__Survey_Plan_Question__c'],
			onPop: async (editor, options) => {
				options = options || {};
				switch(options.button) {
					case 'save':
						question.objective = editor.record;
						if (question.objective && (typeof(Db) !== 'undefined')) {
							let dbRecord = await Db.fetchById(Db.gvp__Account_Objective__c, editor.record.Id);
							if (dbRecord) {
								question.objective.Id = dbRecord.Id;
							}
						}
						break;
				}
				this.render();
			},
			record: question.objective || this.newObjective(question),
			saveAndNew: false
		};
		if (App.isSmallScreen) {
			new PopupEditor(Object.assign(editorOptions, {
				element: this.nav.push(document.createElement('div'), {}),
				nav: this.nav
			}));
		} else {
			await PopupEditor.open(editorOptions);
		}
	}

	async fetchObjectives() {
		if (navigator.onLine) {
			let result = await Api.query(`
				Select
					Id,
					CreatedById,
					LastModifiedDate,
					Name,
					gvp__Accomplish_by__c,
					gvp__Description__c,
					gvp__Survey_Plan_Question__c
				From gvp__Account_Objective__c
				Where (gvp__Account__c = '${this.survey.gvp__Account__c}')
					And (Not gvp__Status__c LIKE 'Closed%')
					And (gvp__Survey_Plan_Question__r.gvp__Survey_Plan__c = '${this.survey.gvp__Survey_Period__c}')
			`, { syncInterval: 0 })
			this.objectives = (result && result.records) || [];
		} else if (typeof(Db) !== 'undefined') {
			this.objectives = await Db.gvp__Account_Objective__c
				.where('gvp__Account__c').equals(this.survey.gvp__Account__c)
				.and(objective => !(objective.gvp__Status__c || '').startsWith('Closed'))
				.toArray();
			for (let objective of this.objectives) {
				objective.question = await Db.gvp__Survey_Plan_Question__c.get(objective.gvp__Survey_Plan_Question__c || '');
			}
			this.objectives = this.objectives.filter(objective => objective.question && (objective.question.gvp__Survey_Plan__c === this.survey.gvp__Survey_Period__c));
		}
		return this.objectives;
	}

	async fetchSurveys() {
		if (navigator.onLine) {
			let result = await Api.query(`
				Select
					Id,
					Name,
					LastModifiedDate,
					gvp__Account__c,
					gvp__Points__c,
					gvp__Survey_Period__c
				From gvp__Survey__c
				Where (gvp__Account__c = '${this.survey.gvp__Account__c}')
					And (gvp__Survey_Period__c = '${this.survey.gvp__Survey_Period__c}')
					And (gvp__Status__c = 'Submitted')
				Order By gvp__Submitted_Date_Time__c Desc, gvp__Date_of_Survey__c Desc
				Limit 2
			`, { syncInterval: 0 })
			this.surveys = (result && result.records) || [];
		} else if (typeof(Db) !== 'undefined') {
			this.surveys = (await Db.gvp__Survey__c
				.where('gvp__Account__c').equals(this.survey.gvp__Account__c)
				.and(survey => survey.gvp__Survey_Period__c === this.survey.gvp__Survey_Period__c)
				.and(survey => survey.gvp__Status__c === 'Submitted')
				.toArray())
				.sort((s1, s2) => new Date(s2.gvp__Submitted_Date_Time__c).getTime() - new Date(s1.gvp__Submitted_Date_Time__c).getTime());
		}
		return this.surveys;
	}

	groupName(question) {
		return (this.survey.plan.gvp__Summarize_By_Supplier__c &&
			((question.gvp__Brand__r &&
				question.gvp__Brand__r.gvp__Supplier__r &&
				question.gvp__Brand__r.gvp__Supplier__r.Name
			) || (question.gvp__Label__r &&
				question.gvp__Label__r.question.gvp__Brand__r &&
				question.gvp__Label__r.question.gvp__Brand__r.gvp__Supplier__r &&
				question.gvp__Label__r.question.gvp__Brand__r.gvp__Supplier__r.Name
			) || (question.gvp__Item__r &&
				question.gvp__Item__r.question.gvp__Label__r &&
				question.gvp__Item__r.question.gvp__Label__r.question.gvp__Brand__r &&
				question.gvp__Item__r.question.gvp__Label__r.question.gvp__Brand__r.gvp__Supplier__r &&
				question.gvp__Item__r.question.gvp__Label__r.question.gvp__Brand__r.gvp__Supplier__r.Name
			))) || question.gvp__Group_Name__c || this.getLabel('None');
	}

	async init() {
		for (let objectName of [
			'gvp__Account_Objective__c',
			'gvp__Survey__c',
			'gvp__Survey_Plan_Question__c'
		]) {
			this.descriptions[objectName] = await Api.describe(objectName);
		}
		this.surveyPlanQuestionFieldset = await Api.fieldset('gvp__Survey_Plan_Question__c', 'mobile');
		await this.fetchObjectives();
		await this.createRequiredObjectives();
		this.questions.forEach(question =>
			question.objective = (this.objectives || []).find(
				objective => objective.gvp__Survey_Plan_Question__c === question.Id
			)
		);
		await this.fetchSurveys();
		for (let question of this.questionsOffTarget) {
			question.fieldValues = {};
			for (let field of this.fields) {
				question.fieldValues[field.name] = await Field.getText(field, question);
			}
		}
		await this.closeObjectives();
		SurveySummary.trackPageview('/Survey Summary');
		this.render();
	}

	newObjective(question) {
		return {
			gvp__Accomplish_by__c: (() => {
				let date = new Date(this.survey.plan.gvp__End_Date_of_Survey__c || (Date.now()+(7*24*60*60*1000)));
				return `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
			})(),
			gvp__Account__c: this.survey.gvp__Account__c,
			gvp__Account_Team__c: this.survey.gvp__Account_Team__c || null,
			gvp__Brand__c: question.gvp__Brand__c || null,
			gvp__Description__c: [
				question.gvp__Question_Text__c,
				`${this.getLabel('Last_Answer')}:`,
				`${(question.input.value && question.input.value[0] && question.input.value[0].value) ||
					(([undefined, null].indexOf(question.input.value) < 0) && ((question.input.value && question.input.value.value) || question.input.value.toString())) ||
					''
				},`,
				`${this.getLabel('Target')}:`,
				question.gvp__Target_Formula__c
			].filter(s => s).join(' '),
			gvp__Item__c: question.gvp__Item__c || null,
			gvp__Label__c: question.gvp__Label__c || null,
			gvp__Owner__c: this.userId,
			gvp__Status__c: 'Not Started',
			gvp__Survey_Plan_Question__c: question.Id,
			gvp__Type__c: question.gvp__Sales_Driver__c || 'Survey Answer',
		}
	}

	renderChart() {
		return this.showSummaryPoints ? `
			<div class="slds-text-heading_medium">${this.getLabel('Survey_Points_Scored')}</div>
			<div class="chart ${this.perfect ? 'perfect' : ''} slds-m-left_medium slds-m-right_medium">
				<div class="possible">
					<span class="score">${this.possiblePoints}</span>
						<div class="actual" style="width:${this.percentageOfPossiblePoints}%">
							<span class="score">${this.points ? this.points : ''}</span>
						</div>
				</div>
			</div>
		` : '';
	}

	renderContent() {
		return (this.groups.length > 0) ? `
			${this.renderNotMet()}
			<div class="tabs"></div>
			<div class="groups">
				${this.groups.map(this.renderGroup.bind(this)).join('\n')}
			</div>
		` : this.renderMet();
	}

	renderGroup(group) {
		let description = this.descriptions.gvp__Account_Objective__c;
		return `
			<div class="slds-card" data-summary-group="${group.name}">
				<header class="slds-card__header slds-grid">
					<div class="slds-media slds-media--center slds-has-flexi-truncate">
						<div class="slds-media__body">
							<h3 class="slds-text-heading--small slds-truncate">
								${this.getLabel('Survey_Summary_Group_Score')}: ${group.score}
							</h3>
						</div>
					</div>
				</header>
				<section class="slds-card__body">
					${group.questions.length > 0 ? `
						${group.questions.map((question, questionIndex) => `
							<div class="slds-visual-picker slds-visual-picker_large">
								<input type="checkbox" ${question.objective ? 'checked' : ''} readonly />
								<label for="visual-picker-11">
									<span class="slds-visual-picker__figure slds-visual-picker__text">
										<article class="slds-tile">
											<h3 class="slds-tile__title slds-truncate" title="${question.gvp__Question_Text__c}">
												<span>Q</span>:
												${question.gvp__Question_Text__c}
											</h3>
											<div class="slds-tile__detail">
												<dl class="slds-list_horizontal slds-wrap">
													${this.fields.map(f => `
														<dt class="slds-item_label slds-text-color_weak slds-truncate" title="${f.label}">${f.label}</dt>
														<dd class="slds-item_detail slds-truncate" title="${question.fieldValues[f.name]}">${question.fieldValues[f.name]}</dd>
													`).join('\n')}
												</dl>
											</div>
										</article>
										${question.gvp__Objective_Creation__c !== 'Never' ? `
											<button type="button" class="objective slds-button slds-button--neutral"
												data-question-id="${question.Id}"
											>
												${this.getLabel(question.objective ? 'Edit' : 'New')}&nbsp;${description.label}
											</button>
										` : ''}
									</span>
									<span class="slds-visual-picker__body slds-hidden"></span>
									<span class="slds-icon_container slds-visual-picker__text-check">
										<svg class="slds-icon slds-icon-text-check slds-icon_x-small" aria-hidden="true">
											<use xlink:href="${SurveySummary.getSymbols()}#check"></use>
										</svg>
									</span>
								</label>
							</div>
						`).join('\n')}
					` : this.renderMet()}
				</section>
			</div>
		`;
	}

	renderHeader() {
		return `
			<div class="points-summary">
				${this.renderChart()}
				<div>
					${this.renderObjectivesCompleted()}
					${this.renderSendEmailSummary()}
				</div>
			</div>
		`;
	}

	renderMet() {
		return `
			<div class="slds-m-around_medium slds-text-align_center slds-text-heading_medium" role="alert">
				<h2>${this.getLabel('Survey_Matched_Target')}</h2>
			</div>
		`;
	}

	renderNotMet() {
		return this.notMet ? `
			<div class="slds-m-around_medium slds-text-align_center slds-text-heading_medium" role="alert">
				<h2>${this.getLabel('Survey_Not_On_Target')}</h2>
			</div>
		` : '';
	}

	renderObjectivesCompleted() {
		return this.showObjectives ? `
			<div class="objectives-completed">
				<dl class="slds-list_horizontal">
					<dt class="slds-m-right_medium">
						<p class="slds-truncate" title="${this.getLabel('Objectives_Completed')}">
							${this.getLabel('Objectives_Completed')}:
						</p>
					</dt>
					<dd class="${this.objectivesCompleted.length ? 'completed' : ''}" >
						<p class="slds-text-body--regular slds-truncate">
							${this.objectivesCompleted.length}
						</p>
					</dd>
				</dl>
			</div>
		` : '';
	}

	renderPoints() {
		return this.showSummaryPoints ? `
			<div class="slds-size--1-of-4">
				<dl>
					<dt>
						<p class="slds-truncate">
							${this.getLabel('Survey_Points_Scored')}
						</p>
					</dt>
					<dd>
						<p class="${this.differenceType} slds-text-body--regular slds-truncate"
							title="${this.previousPoints} (${this.difference})"
						>
							${this.points}
						</p>
					</dd>
				</dl>
			</div>
			<div class="slds-size--1-of-4">
				<dl>
					<dt>
						<p class="slds-truncate">
							${this.getLabel('Survey_Points_Possible')}
						</p>
					</dt>
					<dd>
						<p class="slds-text-body--regular slds-truncate">
							${this.possiblePoints}
						</p>
					</dd>
				</dl>
			</div>
		` : '';
	}

	renderSendEmailSummary() {
		return `
			<div id="send-email-summary">
				<button type="button" class="slds-button slds-button_neutral slds-button_dual-stateful ${this.survey.gvp__Send_Email_Summary__c ? 'slds-is-pressed' : ''}" aria-live="assertive" ${this.survey.gvp__Send_Email_Summary__c ? 'disabled' : ''}>
					<span class="slds-text-not-pressed">
						<svg class="slds-button__icon slds-button__icon_small slds-button__icon_left" aria-hidden="true">
							<use xlink:href="${SurveySummary.getSymbols()}#add"></use>
						</svg>
						${this.descriptions.gvp__Survey__c.fields.find(field => field.name === 'gvp__Send_Email_Summary__c').label}
					</span>
					<span class="slds-text-pressed">
						<svg class="slds-button__icon slds-button__icon_small slds-button__icon_left" aria-hidden="true">
							<use xlink:href="${SurveySummary.getSymbols()}#check"></use>
						</svg>
						${this.descriptions.gvp__Survey__c.fields.find(field => field.name === 'gvp__Send_Email_Summary__c').label}
					</span>
				</button>
			</div>
		`;
	}

	render() {
		let selectedTabIndex = (this.tabs && this.tabs.tabs.indexOf(this.tabs.tabs.find(tab => tab.selected))) || 0;
		this.element.querySelector('.survey-summary').innerHTML = `
			<div class="survey-summary-container">
				${this.renderHeader()}
				${this.renderContent()}
			</div>
		`;
		this.tabs = new Tabs({
			element: this.element.querySelector('.tabs'),
			handler: (event, tab) => Array.from(
				this.element.querySelectorAll('.groups > *')
			).forEach(element => element.classList[
				(tab.group.name === element.getAttribute('data-summary-group')) ? 'add' : 'remove'
			]('active')),
			tabs: this.groups.map(group => Object.assign({
				group: group,
				label: group.name,
				name: group.name
			})),
			type: 'scoped'
		});
		this.tabs.select(this.tabs.tabs[selectedTabIndex]);
		(Array.from(this.element.querySelectorAll('.groups > *'))[selectedTabIndex] || document.createElement('div')).classList.add('active');
		this.bindEvents();
	}
}
