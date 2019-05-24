import { CustomObject } from './customObject.js'

export class Icons {
	static icon(type) {
		switch(type) {
			case 'Account':
				return {
					cssClass: 'slds-icon-standard-account',
					url: this.iconUrl('standard', 'account')
				};
			case 'AddItem':
				return {
					cssClass: 'slds-icon-standard-trailhead',
					size: 'x-small',
					url: this.iconUrl('action', 'new')
				};
			case 'Back':
				return {
					cssClass: 'slds-icon-action-back',
					url: this.iconUrl('action', 'back')
				};
			case 'Camera':
				return {
					cssClass: 'slds-current-color',
					url: this.iconUrl('utility', 'photo')
				};
			case 'Close':
				return {
					cssClass: 'slds-icon-action-close',
					url: this.iconUrl('action', 'close')
				};
			case 'Contact':
				return {
					cssClass: 'slds-icon-standard-customers',
					url: this.iconUrl('standard', 'customers')
				};
			case 'ContentVersion':
				return {
					cssClass: 'slds-icon-standard-account',
					url: this.iconUrl('standard', 'file')
				};
			case 'Copy':
				return {
					cssClass: 'slds-icon-action-clone',
					url: this.iconUrl('action', 'clone')
				};
			case 'Dashboard':
				return {
					cssClass: 'slds-icon-action-update',
					url: this.iconUrl('utility', 'graph')
				};
			case 'Delete':
				return {
					cssClass: 'slds-icon-action-delete',
					url: this.iconUrl('action', 'delete')
				};
			case 'Edit':
				return {
					cssClass: 'slds-icon-action-edit',
					url: this.iconUrl('action', 'edit')
				};
			case 'Event':
				return {
					cssClass: 'slds-icon-standard-event',
					url: this.iconUrl('standard', 'event')
				};
			case 'gvp__Account_Call__c':
				return {
					cssClass: 'slds-icon-standard-topic',
					url: this.iconUrl('standard', 'topic')
				};
			case 'gvp__Account_Objective__c':
				return {
					cssClass: 'slds-icon-custom-custom11',
					url: this.iconUrl('custom', 'custom11')
				};
			case 'gvp__Brand__c':
				return {
					cssClass: 'slds-icon-custom-custom3',
					url: this.iconUrl('custom', 'custom3')
				};
			case 'gvp__By_the_Glass__c':
				return {
					cssClass: 'slds-icon-custom-custom65',
					url: this.iconUrl('custom', 'custom65')
				};
			case 'gvp__Cocktail_Menu__c':
				return {
					cssClass: 'slds-icon-custom-custom62',
					url: this.iconUrl('custom', 'custom62')
				};
			case 'gvp__Competitor__c':
				return {
					cssClass: 'slds-icon-custom-custom101',
					url: this.iconUrl('custom', 'custom101')
				};
			case 'gvp__Distributor_Meeting__c':
				return {
					cssClass: 'slds-icon-custom-custom33',
					url: this.iconUrl('custom', 'custom33')
				};
			case 'gvp__Display__c':
				return {
					cssClass: 'slds-icon-custom-custom96',
					url: this.iconUrl('custom', 'custom96')
				};
			case 'gvp__Event__c':
				return {
					cssClass: 'slds-icon-custom-custom50',
					url: this.iconUrl('custom', 'custom50')
				};
			case 'gvp__Expense__c':
				return {
					cssClass: 'slds-icon-custom-custom41',
					url: this.iconUrl('custom', 'custom41')
				};
			case 'gvp__Invoice__c':
				return {
					cssClass: 'slds-icon-custom-custom17',
					url: this.iconUrl('custom', 'custom17')
				};
			case 'gvp__Item__c':
				return {
					cssClass: 'slds-icon-custom-custom57',
					url: this.iconUrl('custom', 'custom57')
				};
			case 'gvp__Label__c':
				return {
					cssClass: 'slds-icon-custom-custom64',
					url: this.iconUrl('custom', 'custom64')
				};
			case 'gvp__Media__c':
				return {
					cssClass: 'slds-icon-custom-custom100',
					url: this.iconUrl('custom', 'custom100')
				};
			case 'gvp__Order_Commitment__c':
				return {
					cssClass: 'slds-icon-custom-custom53',
					url: this.iconUrl('custom', 'custom53')
				};
			case 'gvp__POS_Material__c':
				return {
					cssClass: 'slds-icon-custom-custom46',
					url: this.iconUrl('custom', 'custom46')
				};
			case 'gvp__POS_Placement__c':
				return {
					cssClass: 'slds-icon-custom-custom73',
					url: this.iconUrl('custom', 'custom73')
				};
			case 'gvp__Presentation__c':
				return {
					cssClass: 'slds-icon-custom-custom82',
					url: this.iconUrl('custom', 'custom82')
				};
			case 'gvp__Program__c':
				return {
					cssClass: 'slds-icon-custom-custom91',
					url: this.iconUrl('custom', 'custom91')
				};
			case 'gvp__RAD__c':
				return {
					cssClass: 'slds-icon-custom-custom91',
					url: this.iconUrl('custom', 'custom91')
				};
			case 'gvp__Retail_Ad__c':
				return {
					cssClass: 'slds-icon-custom-custom98',
					url: this.iconUrl('custom', 'custom98')
				};
			case 'gvp__Retail_Ad__c':
				return {
					cssClass: 'slds-icon-custom-custom85',
					url: this.iconUrl('custom', 'custom85')
				};
			case 'gvp__Sales_Order__c':
				return {
					cssClass: 'slds-icon-custom-custom17',
					url: this.iconUrl('utility', 'moneybag')
				};
			case 'gvp__Sales_Order_Item__c':
				return {
					cssClass: 'slds-icon-standard-orders',
					url: this.iconUrl('standard', 'orders')
				};
			case 'gvp__Sales_Sequence__c':
				return {
					cssClass: 'slds-icon-action-flow',
					size: 'small',
					url: this.iconUrl('action', 'flow')
				};
			case 'gvp__Scan__c':
				return {
					cssClass: 'slds-icon-standard-quotes',
					url: this.iconUrl('standard', 'quotes')
				};
			case 'gvp__Shipment__c':
				return {
					cssClass: 'slds-icon-custom-custom54',
					url: this.iconUrl('custom', 'custom54')
				};
			case 'gvp__Size__c':
				return {
					cssClass: 'slds-icon-custom-custom59',
					url: this.iconUrl('custom', 'custom59')
				};
			case 'gvp__Staff_Incentive__c':
				return {
					cssClass: 'slds-icon-custom-custom41',
					url: this.iconUrl('custom', 'custom41')
				};
			case 'gvp__Staff_Training__c':
				return {
					cssClass: 'slds-icon-custom-custom15',
					url: this.iconUrl('custom', 'custom15')
				};
			case 'gvp__Survey__c':
				return {
					cssClass: 'slds-icon-standard-survey',
					url: this.iconUrl('standard', 'survey')
				};
			case 'gvp__Survey_Answer__c':
				return {
					cssClass: 'slds-icon-custom-custom49',
					url: this.iconUrl('custom', 'custom49')
				};
			case 'gvp__Survey_Plan__c':
				return {
					cssClass: 'slds-icon-custom-custom39',
					url: this.iconUrl('custom', 'custom39')
				};
			case 'gvp__Survey_Plan_Question__c':
				return {
					cssClass: 'slds-icon-custom-custom83',
					url: this.iconUrl('custom', 'custom83')
				};
			case 'gvp__Well__c':
				return {
					cssClass: 'slds-icon-custom-custom6',
					url: this.iconUrl('custom', 'custom6')
				};
			case 'gvp__Wine_List__c':
				return {
					cssClass: 'slds-icon-standard-drafts',
					url: this.iconUrl('standard', 'drafts')
				};
			case 'Map':
				return {
					cssClass: 'slds-icon-action-map',
					url: this.iconUrl('action', 'map')
				};
			case 'New':
				return {
					cssClass: 'slds-icon-action-new',
					url: this.iconUrl('action', 'new')
				};
			case 'Photo':
				return {
					cssClass: 'slds-icon-action-add-photo-video',
					url: this.iconUrl('action', 'add_photo_video')
				};
			case 'PhotoBrowser':
				return {
					cssClass: 'slds-icon-custom-custom38',
					url: this.iconUrl('custom', 'custom38')
				};
			case 'Remove':
				return {
					cssClass: 'slds-icon-action-remove',
					url: this.iconUrl('action', 'remove')
				};
			case 'SalesOrderImage':
				return {
					cssClass: 'slds-icon-standard-file',
					url: this.iconUrl('standard', 'file')
				};
			case 'Save':
				return {
					cssClass: 'slds-icon-action-recall',
					url: this.iconUrl('utility', 'save')
				};
			case 'SaveOrder':
				return {
					cssClass: 'slds-icon-standard-trailhead',
					size: 'x-small',
					url: this.iconUrl('utility', 'save')
				};
			case 'SubmitOrder':
				return {
					cssClass: 'slds-icon-action-flow',
					size: 'x-small',
					url: this.iconUrl('utility', 'merge')
				};
			case 'Survey':
				return {
					cssClass: 'slds-icon-action-view-relationship',
					url: this.iconUrl('action', 'new_task')
				};
			case 'SurveyImage':
				return {
					cssClass: 'slds-icon-standard-file',
					url: this.iconUrl('standard', 'file')
				};
			case 'Task':
				return {
					cssClass: 'slds-icon-standard-task',
					url: this.iconUrl('standard', 'task')
				};
			case 'User':
				return {
					cssClass: 'slds-icon-action-user',
					url: this.iconUrl('action', 'user')
				};
			default:
				return {
					cssClass: 'slds-icon-custom-custom9',
					url: this.iconUrl('custom', 'custom9')
				};
		}
	}

	static iconUrl(iconType, iconName) {
		return `${CustomObject.getSymbols(iconType)}#${iconName}`;
	}
}
