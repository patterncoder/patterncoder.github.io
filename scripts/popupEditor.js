import { Api } from './api.js'
import { App } from './app.js'
import { ButtonGroup } from './buttonGroup.js'
import { CustomObject } from './customObject.js'
import { Db } from './db.js'
import { Fieldset } from './fieldset.js'
import { Geolocation } from './geolocation.js'
import { ImageList, Media } from './media.js'
import { Modal } from './modal.js'
import { Toast } from './toast.js'

export class PopupEditor extends CustomObject {
	constructor(options) {
		super(options);
		if (this.modal === true) {
			this.element = (this.element || document.body).appendChild(document.createElement('div'));
		} else {
			this.nav.header.handler = async (event, detail) => {
				switch (event) {
					case 'action':
						switch (detail.value) {
							case 'back':
								if (await Modal.promptToContinue({ fieldset: this.fieldset, modified: this.modifiedImages })) {
									this.nav.pop();
								}
								break;
						}
						break;
				}
			}
		}
		this.record = this.record || { attributes: { type: this.type } };
		this.init();
	}

	get addedImages() {
		return (this.images || []).filter(image => !image.Id || ((typeof(Db) !== 'undefined') && Db.isLocalId(image.Id)));
	}

	get modifiedImages() {
		return (this.addedImages.length + this.deletedImages.length) > 0;
	}

	static async open(options) {
		options = options || {};
		return (await new PopupEditor(Object.assign({
			modal: true,
			texture: null,
			theme: null
		}, options)));
	}

	bindEvents() {
		this.bind('footer button', 'click', async (event) => {
			const button = event.currentTarget.getAttribute('data-value');
			switch (button) {
				case 'saveAndNew':
					this.isClone = false;
					const result = await this.save();
					if (!result.errors) {
						this.record = {};
						this.images = [];
						this.init();
						if (!this.nav && this.onPop) {
							this.onPop(this, { button: button });
						}
					}
					break;
				case 'saveAndClone':
					await this.saveAndCloneRecord();
					break;
				case 'save':
					await this.save({ onClose: this.close.bind(this), button: button });
					break;
				default:
					if (await Modal.promptToContinue({ fieldset: this.fieldset, modified: this.modifiedImages })) {
						this.close({ button: button });
					}
					break;
			}
		});
		this.bind('.popup-editor-images button', 'click', event => {
			const button = event.currentTarget.getAttribute('data-value');
			switch (button) {
				case 'addMedia':
					Media.add({
						element: this.element,
						handler: images => {
							this.images.push(...images.map(image => Object.assign({ Id: (typeof(Db) !== 'undefined') && Db.nextId }, image)));
							this.record = Object.assign(this.record || {}, this.fieldset && this.fieldset.valueForSave);
							this.render();
						},
						multiple: true
					});
					break;
			}
		});
	}

	close(options) {
		options = options || {};
		if (!options.errors) {
			if (this.nav) {
				this.nav.pop();
			} else {
				if (options.button) {
					this.resolve(options.button);
				}
				this.element.remove();
			}
			if (this.onPop) {
				this.onPop(this, options);
			}
		}
	}

	async init() {
		this.spinner();
		if (!this.description) {
			this.description =await Api.describe(this.type);
		}
		this.isNew = !(this.record && (this.record.Id || this.record.id));
		this.buttons = [
			{ label: CustomObject.getLabel('Cancel'), value: 'close' },
			{ label: CustomObject.getLabel('Save'), value: 'save', default: true, disabledOnPristine: true }
		];
		if (this.saveAndNew !== false) {
			this.buttons.splice(1, 0, { label: CustomObject.getLabel('Save_And_New'), value: 'saveAndNew', forNewOnly: !(this.saveAndNew === true), disabledOnPristine: true });
		}
		if (this.saveAndClone) {
			this.buttons.splice(1, 0, { label: CustomObject.getLabel('Save_And_Clone'), value: 'saveAndClone', disabledOnPristine: true });
		}

		if (this.type === 'ContentVersion') {
			this.title = App.isSmallScreen ? '' : this.title || `${this.getLabel('Add')} ${this.getLabel('Photos')}`;
			this.layout = await Api.editLayout('ContentVersion', 'Media');
			this.recordId = this.recordId || this.record && (this.record.Id || this.record.id);
			this.images =  this.images || this.recordId && await Media.images(this.recordId);
			if (this.bulkEdit && this.images && (this.images.length > 0)) {
				this.record = (this.images || []).reduce((record, image) => {
					this.layout.forEach(field =>
						record[field.name] = ![undefined, null].includes(record[field.name]) ?
							(![undefined, null].includes(image[field.name]) ? (
								(record[field.name] === image[field.name]) ? record[field.name] :
								null
							) : record[field.name]) :
							((record[field.name] === undefined) ? image[field.name] : record[field.name])
					);
					return record;
				}, {});
			} else {
				this.record = Object.assign(await this.setDefaults({ record: {} }), {
					gvp__Brand__c: this.record.gvp__Brand__c || null,
					gvp__Label__c: this.record.gvp__Label__c || null
				});
			}
		} else if (this.isNew) {
			const clonedFrom = this.getLabel('Cloned_From').replace('{recordname}', this.description.label).replace('{source}', this.clonedFrom);
			const title = this.isClone ? clonedFrom : `${this.getLabel('New')} ${this.description.label}`;
			this.title = title;
			this.layout = await Api.editLayout(this.type, this.recordType);
			await Geolocation.update(this.record);
			this.record = Object.assign(this.record || {}, this.fieldPresets);
			this.record.Id = (typeof(Db) !== 'undefined') && Db.nextId;
			if (this.type !== 'Task' && this.type !== 'Event') {
				await this.setDefaults()
			}
			this.images = [];
		} else {
			this.title = `${this.getLabel('Edit')} ${this.description.label}`;
			await this.getRecord();
			this.layout = await Api.editLayout(this.type, this.recordType || (this.record && this.record.RecordTypeId));
			this.images = this.record && (this.record.Id || this.record.id) && await Media.images(this.record.Id || this.record.id);
		}
		this.showImageSection = this.type !== 'Task' && this.type !== 'Event';
		this.deletedImages = [];
		this.busy = false;
		this.render();
	}

	removeSelectedImages(selectedImages) {
		this.deletedImages = (this.deletedImages || []).concat(selectedImages);
		let deletedImageIds = this.deletedImages.map(image => image.Id);
		this.images = this.images.filter(image => !deletedImageIds.includes(image.Id));
		this.record = Object.assign(this.record || {}, this.fieldset && this.fieldset.valueForSave);
		this.render();
	}

	renderButtons() {
		const buttons = this.buttons.map(button => {
			const colorClass = button.default === true ? 'slds-button_brand' : 'slds-button_neutral';

			return (!button.forNewOnly || button.forNewOnly === this.isNew) ?
				`<button class="slds-button ${colorClass}" data-value="${button.value}" ${this.busy || (button.disabledOnPristine && ((this.addedImages.length + this.deletedImages.length) === 0)) ? 'disabled' : ''}>${button.label}</button>`
				:``;
		}).join('\n');
		return `<div id="gvpPopupButtons">${buttons}</div>`;
	}

	renderModal() {
		this.element.innerHTML = `
			<style>
				.slds-backdrop_open {
					z-index: 10001;
				}
				.slds-modal {
					z-index: 10002;
				}
				.popup-editor-modal .slds-modal__content {
					display: flex;
					flex-direction: row;
					align-items: flex-start;
				}
				.popup-editor-modal-record {
					flex: 1 1 auto;
				}
				.popup-editor-modal-images {
					background-color: ${App.secondaryColor};
					border: 1px solid #dddbda;
					border-radius: .25rem;
					flex: 1 auto;
					min-width: 30%;
					max-width: 30%;
					min-height: 6.5em;
					text-align: center;
					padding-top: 1em;
				}
				.popup-editor-button-group .slds-button-group {
					margin-right: 1em;
					padding-bottom: 0.65em;
				}
				.popup-editor-modal .slds-modal__container {
					padding-top: 8rem;
					padding-bottom: 6rem;
					max-width: 80%;
					width: 80%;
				}
				.popup-editor-image-list .image-pages {
					margin-left: 1em;
					margin-right: 1em;
					margin-bottom: 1em;
				}
				#add-media-button {
					margin-bottom: 1em;
				}
				@media (min-width: 720px) {
					.slds-modal__content fieldset section > div {
						display: inline-block;
						width: 90%;
					}
				}
				@media (min-width: 1080px) {
					.slds-modal__content fieldset section > div {
						display: inline-block;
						width: 49.75%;
					}
				}
				@media (min-width: 1440px) {
					.slds-modal__content fieldset section > div {
						width: 33%;
					}
				}
			</style>
			<section role="inputform" tabindex="-1" class="popup-editor-modal slds-modal slds-fade-in-open" aria-modal="true">
				<div class="slds-modal__container">
					<header class="slds-modal__header slds-theme_${this.theme || 'default'} slds-theme_${this.texture || 'default'}-texture">
						${this.title ? `<h2 class="slds-text-heading_medium">${this.title}</h2>` : '' }
					</header>
					<div class="message slds-hidden"></div>
					<div class="slds-modal__content slds-p-around_medium">
						${this.showImageSection ? `
						<div class="popup-editor-images popup-editor-modal-images">
							<div class="popup-editor-button-group"></div>
							<div class="popup-editor-image-list"></div>
							${!this.readOnly ? `
								<button id="add-media-button" class="slds-button slds-button_neutral" data-value="addMedia">${this.getLabel('Add_Media')}</button>
							` : ''}
						</div>
						` : ''}
						<div class="popup-editor-modal-record"></div>
					</div>
					<footer class="slds-modal__footer slds-theme_default">
						${this.renderButtons()}
					</footer>
				</div>
			</section>
			<div class="slds-backdrop slds-backdrop_open"></div>
		`;
	}

	renderModeless() {
		this.element.innerHTML = `
			<style>
			.popup-editor-modeless .modeless-content {
				display: flex;
				flex-direction: column;
			}
			.popup-editor-modeless-images {
				background-color: ${App.secondaryColor};
				border: 1px solid #dddbda;
				border-radius: .25rem;
				margin: 1em;
				flex: 1 1 auto;
				min-height: 6.5em;
				text-align: center;
				padding-top: 1em;
			}
			.popup-editor-button-group .slds-button-group {
				margin-right: 1em;
				padding-bottom: 0.75em;
			}
			.popup-editor-modeless-record {
				flex: 1 1 auto;
			}
			.popup-editor-modeless .extra-margin-to-compensate-fixed-footer {
				min-height: 5em;
			}
			section .popup-editor-modeless .title {
				margin-left: 1em;
				margin-top: 1em;
			}
			.slds-hidden {
				display: none;
			}
			#add-media-button {
				margin-bottom: 1em;
			}
			</style>
			<section class="popup-editor-modeless">
				<h2 class="title" ><span class="slds-text-heading--medium">${this.title || ''}</span></h2>
				<div class="message slds-hidden"></div>
				<div class="modeless-content">
					${this.showImageSection ? `
					<div class="popup-editor-images popup-editor-modeless-images">
						<div class="popup-editor-button-group"></div>
						<div class="popup-editor-image-list"></div>
						<button id="add-media-button" class="slds-button slds-button_neutral" data-value="addMedia">${this.getLabel('Add_Media')}</button>
					</div>
					` : ''}
					<div class="popup-editor-modeless-record"></div>
					<div class="extra-margin-to-compensate-fixed-footer"></div>
				</div>
				<footer class="slds-docked-form-footer">
					${this.renderButtons()}
				</footer>
			</section>
		`;
	}

	render() {
		this.element.classList.add('slds-scope');
		this.modal === true ? this.renderModal() : this.renderModeless();
		this.fieldset = new Fieldset({
			element: this.element.querySelector(this.modal === true ? '.popup-editor-modal-record' : '.popup-editor-modeless-record'),
			disabled: (this.type === 'ContentVersion') && (this.addedImages.length === 0),
			fields: this.layout.filter(field => !(this.hiddenFields || []).includes(field.name))
				.map(field => Object.assign({
					readOnly: this.isNew ? !field.editableForNew : !field.editableForUpdate,
					required: (field.nillable === false) || (field.required && !field.compoundFieldName),
					section: field.section
				}, this.description.fields.filter(f => f.name === field.name)[0])),
			label: ((this.type === 'ContentVersion') && this.getLabel('Add_Additional_Photo_Details')) || '',
			objectName: this.description.name,
			record: this.record,
			handler: (eventName) => {
				switch(eventName) {
					case "fieldsetSavable":
						const buttons = document.getElementById("gvpPopupButtons").querySelectorAll("button");
						buttons.forEach((btn) => {
							if(['save', 'saveAndNew', 'saveAndClone'].includes(btn["attributes"]["data-value"]["value"])){
								btn.disabled = false;
							}
						});
				}
			}
		});
		if (this.showImageSection) {
			this.imageList = new ImageList({
				element: this.element.querySelector('.popup-editor-image-list'),
				handler: (event, detail) => {
					switch(event) {
						case 'selectImage':
							this.updateButtonGroup();
							break;
					}
				},
				height: 60,
				width: 90,
				images: this.images,
				pageSize: App.isSmallScreen ? 2000 : 12
			});
		}
		if (!this.readOnly && !this.imageAddOnly && (this.images.length > 0)) {
			this.buttonGroup = new ButtonGroup({
				element: this.element.querySelector('.popup-editor-button-group'),
				buttons: [
					{
						disabled: true,
						label: this.getLabel('Delete'),
						value: 'delete'
					},
					{
						disabled: false,
						label: this.capitalize(this.getLabel('Select')),
						selectable: true,
						value: 'select'
					}
				],
				handler: (event, detail) => {
					switch (event) {
						case 'button':
						case 'menu':
							switch (detail.value) {
								case 'delete':
									this.removeSelectedImages(this.imageList.selectedImages);
									if ((this.type === 'ContentVersion') && (this.addedImages.length === 0)) {
										this.fieldset.disabled = true;
										this.fieldset.render();
									}
									break;
								case 'select':
									this.imageList.deselectAll();
									this.imageList.allowSelect = detail.selected;
									this.imageList.render();
									break;
							}
							this.updateButtonGroup();
							break;
					}
				}
			});
		}
		this.bindEvents();
		return this.modal === true ? new Promise(resolve => this.resolve = resolve) : this.element;
	}

	async save(options) {
		options = options || {};
		if (this.fieldset && !this.fieldset.disabled && !this.fieldset.valid) {
			Toast.displayMessage({
				element: this.element.querySelector('.message'),
				message: this.getLabel('Input_Validation_Error')
			});
			return Promise.reject('invalid');
		}
		Array.from(this.element.querySelectorAll('footer button')).filter(button => button.value !== 'close')
			.forEach(button => button.disabled = true);
		this.record = Object.assign(this.record || {}, this.fieldset && this.fieldset.valueForSave);
		let errors;
		if (this.quickSave) {
			if (options.onClose) {
				options.onClose(Object.assign(options, { errors: errors }));
			}
			return { record: this.record, errors: errors };
		}
		let recordId;
		if (this.type === 'ContentVersion') {
			await this.saveImages(
				this.addedImages.map(image => Object.assign({}, image, this.fieldset && this.fieldset.valueForSave)),
				this.recordId
			);
		} else {
			recordId = this.record.Id || this.record.id;
			try {
				let result = await Db.save(Db[this.type], this.record);
				recordId = (result && result[0] && result[0].Id) || recordId;
				const allPhotoLinks = PopupEditor.getReferenceIds({
					referenceFields: ['Account', 'gvp__Account_Call__c', 'gvp__Brand__c', 'gvp__Item__c', 'gvp__Label__c'],
					description: this.description,
					record: this.record,
					seedIds: [recordId].concat(this.additionalPhotoLinks || [])
				});
				await this.saveImages(this.addedImages, allPhotoLinks);
			} catch (error) {
				return App.error(error);
			}
		}
		if (navigator.onLine && (typeof(Db) !== 'undefined') && recordId) {
			this.spinner({ blockInput: true });
			await Db.syncUnsyncedRecords();
			errors = (await Db[this.type].get(recordId) || {})._errors;
			if (errors) {
				if (!(await Db.revert(this.type, this.record.Id))) {
					await Db[this.type].delete(this.record.Id);
				}
			} else if (this.isNew) {
				const updatedRecord = await Db.fetchById(this.type, recordId);
				this.record = Object.assign(this.record, updatedRecord || {});
			}
			Db.syncFiles({ field: 'VersionData', table: Db.ContentVersion });
			this.spinner();
		}
		if (this.deletedImages.length > 0) {
			let contentDocuments = this.deletedImages.map(
				image => Object.assign({ Id: image.ContentDocumentId })
			);
			try {
				this.spinner({ blockInput: true });
				await PopupEditor.remove({ record: contentDocuments, type: 'ContentDocument'});
			} catch (error) {
				return App.error(error);
			} finally {
				this.spinner();
			}
		}
		Toast.displayMessage({
			element: this.element.querySelector('.message'),
			onClose: () => {
				Array.from(this.element.querySelectorAll('footer button')).forEach(button => button.disabled = false);
				if (options.onClose) {
					options.onClose(Object.assign(options, { errors: errors }));
				}
			},
			message: errors ? errors.map(error => error.message) : this.getLabel(`Records_${this.isNew ? 'Inserted' : 'Updated'}`),
			type: errors ? 'error' : 'success'
		});
		return { record: this.record, errors: errors };
	}

	async saveAndCloneRecord() {
		try {
			const result = await this.save();
			if (!result.errors) {
				this.record = await Db.fetchById(this.type, result.record.Id);
				const uniqueFields = await Api.fieldNamesWithUniqueAttribute(this.type);
				// remove id and unique record fields
				uniqueFields.forEach(key => delete this.record[key]);
				this.images = [];
				this.isClone = true;
				this.clonedFrom = result.record.Name || "New Record";
				await this.init();
				if (!this.nav && this.onPop) {
					this.onPop();
				}
			} else {
				throw result.errors;
			}
		} catch (error) {
			App.error(error);
			throw error;
		}
	}

	async saveImages(images, parentIds) {
		this.spinner({ blockInput: true });
		await Media.save(images, parentIds);
		this.spinner();
	}

	updateButtonGroup() {
		if (!this.buttonGroup) {
			return;
		}
		this.buttonGroup.label = (this.imageList.selectedImages.length > 0) ? `${this.imageList.selectedImages.length} ${this.getLabel('Items').toLowerCase()} ${this.getLabel('Selected').toLowerCase()}` : '';
		let select = this.buttonGroup.button('select').selected;
		this.buttonGroup.disabled('delete', !select || (this.imageList.selectedImages.length === 0));
	}
}
