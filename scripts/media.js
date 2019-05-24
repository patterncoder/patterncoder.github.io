import { Api } from './api.js'
import { App } from './app.js'
import { ButtonGroup } from './buttonGroup.js'
import { CustomElement } from './customElement.js'
import { CustomObject } from './customObject.js'
import { Db } from './db.js'
import { FieldFactory } from './fieldFactory.js'
import { Fieldset } from './fieldset.js'
import { Header } from './header.js'
import { Geolocation } from './geolocation.js'
import { Icons } from './icons.js'
import { List } from './list.js'
import { Modal } from './modal.js'
import { Nav } from './nav.js'
import { PopupEditor } from './popupEditor.js'
import { Toast } from './toast.js'

export class Media extends CustomObject {
	static async accountImages(id) {
		let limit = (App.mobileSettings && App.mobileSettings.gvp__Photo_Storage__c) || 12;
		let images = await Media.images(id)
		return images.slice(0, limit);
	}

	static async add(options) {
		options = options || {};
		let element = options.element || document;
		const mediaRecordType = await Media.recordType();

		let chooseFiles = options => {
			options = options || {};
			let fileInput  = document.createElement('input');
			fileInput.setAttribute('accept', 'image/*');
			if (options.multiple) {
				fileInput.setAttribute('multiple', '');
			}
			fileInput.setAttribute('style', 'display:block;height:1px;visibility:hidden');
			fileInput.setAttribute('type', 'file');
			element.appendChild(fileInput);
			let images = [];
			let complete = () => {
				element.removeChild(fileInput);
				if (options.handler) {
					options.handler(images);
				}
			};
			let processFiles = async event => {
				for (let file of event.target.files || []) {
					images.push(await new Promise(resolve =>
						loadImage.parseMetaData(file, data => loadImage(
							file,
							canvas => {
								let dataUrl = canvas.toDataURL('image/png', 1);
								resolve({
									Id: Db.nextId,
									CreatedDate: new Date().toISOString(),
									FileType: 'PNG',
									PathOnClient: file.name,
									RecordTypeId: mediaRecordType.Id,
									Title: file.name,
									VersionData: dataUrl.split(',')[1]
								});
							}, {
								canvas: true,
								maxHeight: 768,
								maxWidth: 1024,
								orientation: (data.exif && data.exif.get('Orientation'))
							}
						))
					));
				}
				complete();
			};
			fileInput.addEventListener('change', processFiles);
			fileInput.click();
			return fileInput;
		}

		if (App.isiOS) {
			return chooseFiles(options);
		}
		let cameras = ((navigator.mediaDevices && (await navigator.mediaDevices.enumerateDevices())) || [])
			.filter(device => device.deviceId && (device.kind.toLowerCase() === 'videoinput'))
			.map((device, index) => Object.assign({
				deviceId: device.deviceId,
				label: ((typeof(device.label) === 'string') && (device.label.length > 0)) ? device.label : `${this.getLabel('Camera')} ${index+1}`
			}));
		let camera = cameras[0];
		let canvas;
		let context;
		let height;
		let initializing;
		let stream;
		let video;
		let width;
		let render = () => {
			let complete = () => {
				if (stream) {
					stream.getTracks()[0].stop();
				}
				element.remove();
			}
			(element = element.appendChild(document.createElement('div'))).innerHTML = `
				<style>
					add-media .slds-backdrop_open {
						z-index: 100001;
					}
					add-media .slds-modal {
						z-index: 100002;
					}
					.add-media header button#cancel {
						color: initial;
						right: -.25em;
						top: ${App.isSmallScreen ? '.75em': '0'};
					}
					.add-media .slds-modal__content {
						height: 100%;
					}
					.add-media .slds-modal__content canvas {
						display: none;
					}
					.add-media .slds-modal__content video {
						width: 100%;
					}
				</style>
				<section role="alertdialog" tabindex="-1" class="add-media slds-modal slds-modal_large slds-fade-in-open" aria-modal="true">
					<div class="slds-modal__container">
						<header class="slds-modal__header slds-theme_default slds-theme_default-texture">
							<button id="cancel" class="slds-button slds-button_icon slds-modal__close slds-button_icon-inverse" title="${this.getLabel('Close')}">
								<svg class="slds-button__icon slds-button__icon_large" aria-hidden="true">
									<use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="${Icons.iconUrl('utility', 'close')}" />
								</svg>
								<span class="slds-assistive-text">${this.getLabel('Close')}</span>
							</button>
							<h2 class="slds-text-heading_medium">${this.getLabel('Add_Media')}</h2>
						</header>
						<div class="slds-modal__content slds-p-around_medium">
							<canvas></canvas>
							<video>Video stream not available</video>
							<div id="cameras"></div>
						</div>
						<footer class="slds-modal__footer slds-theme_default">
							<button id="choose-existing" class="slds-button slds-button_neutral">${this.getLabel('Choose_Existing')}</button>
							<button id="take-a-photo" class="slds-button slds-button_brand" disabled>${this.getLabel('Take_A_Photo')}</button>
						</footer>
					</div>
				</section>
				<div class="slds-backdrop slds-backdrop_open"></div>
			`;
			this.bind('#cancel', 'click', () => complete(), element);
			this.bind('#choose-existing', 'click', () => {
				chooseFiles(Object.assign(options, { element: element.parentNode }));
				complete();
			}, element);
			this.bind('#take-a-photo', 'click', () => {
				canvas.width = width;
				canvas.height = height;
				context.drawImage(video, 0, 0, width, height);
				let dataUrl = canvas.toDataURL('image/jpeg', 50);
				if (options.handler) {
					let now = new Date().toISOString();
					let imageName = `Mobile-Image-${now.replace(/[:\.]/g, '-')}.jpg`;
					options.handler([{
						Id: Db.nextId,
						CreatedDate: now,
						FileType: 'PNG',
						PathOnClient: imageName,
						RecordTypeId: mediaRecordType.Id,
						Title: imageName,
						VersionData: dataUrl.split(',')[1]
					}]);
					complete();
				}
			}, element);
			let cameraList = new List({
				clearable: false,
				collapsed: true,
				collapsible: true,
				element: element.querySelector('#cameras'),
				handler: (event, list) => {
					switch(event) {
						case 'valueChange':
							camera = cameras.find(camera => camera.deviceId === (list.value && list.value.value)) || cameras[0];
							const deviceId = camera && camera.deviceId;
							if (!initializing && (options.deviceId !== deviceId)) {
								initializeCamera(Object.assign(options, { deviceId: deviceId }));
							}
							break;
					}
				},
				items: cameras.map(cam => Object.assign({
					label: cam.label,
					selected: camera && (camera.deviceId === cam.deviceId),
					value: cam.deviceId
				})),
				value: (camera && {
					label: camera.label,
					value: camera.deviceId
				}) || null
			});
		};
		let initializeCamera = async options => {
			options = options || {};
			if (initializing) {
				return;
			}
			initializing = true;
			try {
				stream = await navigator.mediaDevices.getUserMedia({
					video: options.deviceId ? { deviceId: { exact: options.deviceId } } : true,
					audio: false
				});
			} catch(error) {
				console.log(JSON.stringify(error));
				return chooseFiles(options);
			}
			render();
			canvas = element.querySelector('canvas');
			context = canvas.getContext('2d');
			height = 0;
			stream;
			video = element.querySelector('video');
			width = App.isSmallScreen ? 320 : 640;
			video.addEventListener('canplay', () => {
				height = Math.min(video.videoHeight / (video.videoWidth/width), video.parentNode.clientHeight - 90);
				video.setAttribute('height', height);
				video.setAttribute('width', width);
				canvas.setAttribute('height', height);
				canvas.setAttribute('width', width);
				element.querySelector('#take-a-photo').disabled = false;
			}, false);
			video.srcObject = stream;
			video.play();
			initializing = false;
		};
		initializeCamera(Object.assign(options, { deviceId: (cameras[0] || {}).deviceId }));
		return element;
	}

	static contentType(image) {
		return image.ContentType || `image/${[
			'gif', 'jpg', 'jpeg', 'png'
		].find(ext => (image.FileType || '').toLowerCase().endsWith(ext)) || 'unknown'}`;
	}

	static dataUrl(image) {
		return (image && image.VersionData &&
			`data:${this.contentType(image)};base64,${image.VersionData}`
		) || '';
	}

	static async getFileName(options) {
		options = options || {};
		let image = options.image;
		let fileName = await Media.getImageName({ image });
		if (image.FileExtension) {
			fileName += `.${image.FileExtension.replace(/:/g, '_')}`;
		}
		return fileName
	}

	static async getImageName(options) {
		options = options || {};
		let image = options.image;
		let fields = (options.fields && (options.fields.length > 0)) ? options.fields : [
			'gvp__Brand__c',
			'gvp__Label__c',
			'CreatedDate'
		];
		let maxLength = options.maxLength || 80;
		let parts = [];
		for (let field of fields.filter(field => image[field])) {
			let description = ((options.descriptions && options.descriptions.ContentVersion) ||
				await Api.describe('ContentVersion')
			).fields.find(f => f.name === field);
			switch(description && description.type) {
				case 'date':
				case 'datetime':
					parts.push(new Date(image[field].replace('+0000', 'Z')).toISOString());
					break;
				case 'reference':
					let referenceTo = await this.referenceTo({ field: description });
					if (referenceTo) {
						let record;
						if (navigator.onLine) {
							let result = await Api.query(`SELECT Id, Name FROM ${referenceTo} WHERE Id = '${image[field]}'`);
							record = result && result.records && result.records[0];
						} else {
							record = await Db[referenceTo].where('Id').equals(image[field]).first();
						}
						parts.push(record && record.Name);
					} else {
						parts.push(image[field]);
					}
					break;
				default:
					parts.push(image[field].toString());
			}
		}
		return parts.filter(part => part)
			.map(part => part.replace(/[^a-zA-Z0-9]/g, "-")
				.replace(/-+/g, '-')
				.substr(0, Math.floor((maxLength - 5 - (fields.length - 1)) / fields.length))
				.replace(/-$/, '')
			).join('-');
	}

	static async fetchContentDocumentLinks(options) {
		options = options || {};
		let contentDocumentLinks = [];
		let surveyAnswers = [];
		if (navigator.onLine) {
			let result;
			for (let type of (options.types || [
				'Account',
				'gvp__Account_Call__c',
				'gvp__Account_Objective__c',
				'gvp__Survey_Answer__c'
			])) {
				result = await Api.query(`
					Select
						Id,
						ContentDocumentId,
						ContentDocument.FileType,
						ContentDocument.LastModifiedDate,
						ContentDocument.LatestPublishedVersionId,
						LinkedEntityId,
						LinkedEntity.Name
					From ContentDocumentLink
					Where (LinkedEntityId In (Select Id From ${type}))
						And (ContentDocument.FileType In ('GIF', 'JPG', 'JPEG', 'PNG'))
				`, { syncInterval: 0 });
				let records = (result && result.records) || [];
				for (let chunk of this.chunk(records)) {
					let ids = chunk.map(record => record.LinkedEntityId).filter((id, index, array) => id && array.indexOf(id) === index);
					result = await Api.query(`
						Select
							Id,
							gvp__Question__r.gvp__Question_Text__c,
							gvp__Survey__r.gvp__Survey_Period__r.Name
						From gvp__Survey_Answer__c
						Where Id In (${ids.map(id => `'${id}'`).join(',')})
					`);
					surveyAnswers = surveyAnswers.concat((result && result.records) || []);
				}
				surveyAnswers = surveyAnswers.filter((answer, index, array) => answer && array.indexOf(answer) === index);
				contentDocumentLinks = contentDocumentLinks.concat(records.filter(
					record => record.ContentDocument && record.ContentDocument.LatestPublishedVersionId
				).reduce((result, record) => {
					switch(type) {
						case 'gvp__Survey_Answer__c':
							const answer = surveyAnswers.find(answer => answer.Id === record.LinkedEntityId);
							const question = answer && answer.gvp__Question__r;
							const survey = answer && answer.gvp__Survey__r;
							const plan = survey && survey.gvp__Survey_Period__r;
							result.push(Object.assign({}, record, { LinkedEntity : {
								Name: plan && plan.Name,
								Type: 'gvp__Survey_Plan__c'
							} }));
							result.push(Object.assign({}, record, { LinkedEntity : {
								Name: question && question.gvp__Question_Text__c,
								Type: 'gvp__Survey_Plan_Question__c'
							} }));
							break;
						default:
							result.push(Object.assign({}, record, { LinkedEntity : {
								Name: record.LinkedEntity && record.LinkedEntity.Name,
								Type: type
							} }));
							break;
					}
					return result;
				}, []));
			}
		}
		return (this.contentDocumentLinks = contentDocumentLinks).filter(cdl =>
			(options.filters || []).filter(filter => filter.type === 'contentDocumentLink')
				.reduce((result, filter) => result && cdl.LinkedEntity && filter.value.includes(cdl.LinkedEntity.Name), true)
		);
	}

	static async image(id) {
		let images = await this.images(id);
		return images && images[0];
	}

	static async images(options) {
		options = options || {};
		const id = (typeof(options) === 'string') ? options : options.id;
		if (!id) {
			return [];
		}
		let contentVersions = [];
		let description = await Api.describe('ContentVersion');
		if (navigator.onLine && !id.startsWith('_')) {
			let result = await Api.query(`
				Select
					Id,
					ContentDocument.FileType,
					ContentDocument.LastModifiedDate,
					ContentDocument.LatestPublishedVersionId,
					LinkedEntityId
				From ContentDocumentLink
				Where (LinkedEntityId = '${id}')
					And (ContentDocument.FileType In ('GIF', 'JPG', 'JPEG', 'PNG'))
					${options.historyDays ? `AND (ContentDocument.LastModifiedDate >= LAST_N_DAYS:${options.historyDays})` : ''}
				Order By ContentDocument.LastModifiedDate Desc
				${options.limit ? `Limit ${options.limit}` : ''}
				${options.offset ? `Offset ${options.offset}` : ''}
			`, { syncInterval: 0 });
			let contentDocumentIds = ((result && result.records) || [])
				.map(record => record.ContentDocument.LatestPublishedVersionId)
				.filter((id, index, array) => id && (array.indexOf(id) === index));
			if (contentDocumentIds.length > 0) {
				result = await Api.query(`
					Select ${description.fields.filter(field => field.type !== 'base64')
						.map(field => field.name).join(',')}
					From ContentVersion
					Where Id In (${contentDocumentIds.map(id => `'${id}'`).join(',')})
				`, { syncInterval: 0 });
				contentVersions = (result && result.records) || [];
			}
		}
		if (typeof(Db) !== 'undefined') {
			let contentDocumentLinks = await Db.ContentDocumentLink
				.where('LinkedEntityId').equals(id)
				.and(o => o._changedLocally !== Db.DELETED)
				.toArray();
			let contentDocumentIds = contentDocumentLinks.map(o => o.ContentDocumentId)
				.filter((id, index, array) => id && (array.indexOf(id) === index));
			let contentDocuments = await Db.ContentDocument
				.where('Id').anyOf(contentDocumentIds)
				.and(o => o._changedLocally !== Db.DELETED)
				.toArray();
			contentVersions = contentVersions.concat(await Db.ContentVersion
				.where('Id').anyOf(contentDocuments.map(o => o.LatestPublishedVersionId)
					.concat(contentDocumentIds)
					.filter((id, index, array) => id && (array.indexOf(id) === index) &&
						!contentVersions.find(o => o.Id === id)
					)).sortBy('LastModifiedDate')
			);
		}
		contentVersions.sort((i1, i2) => (i2.LastModifiedDate || i2.CreatedDate).localeCompare(i1.LastModifiedDate || i1.CreatedDate))
		return contentVersions;
	}

	static async loadContentVersionData(contentVersion) {
		if (!contentVersion || !contentVersion.Id) {
			return contentVersion;
		}
		if (contentVersion.Id.startsWith('_')) {
			contentVersion.VersionData = contentVersion.VersionData || ((await Db.fetchById('ContentVersion', contentVersion.Id)) || {}).VersionData;
			return contentVersion;
		}
		let path = `/sobjects/ContentVersion/${contentVersion.Id}/VersionData`;
		if (contentVersion.VersionData && (contentVersion.VersionData !== path)) {
			// data already loaded
			return contentVersion;
		}
		let cache = window.caches && (await window.caches.open('ContentVersion'));
		let requestOptions = {
			dataUrl: false,
			path: path,
			syncInterval: 0
		};
		let request = await Api.createRequest(requestOptions);
		try {
			let response = cache && (await cache.match(request));
			response = await (response ? response.blob() : Api.request(requestOptions));
			let versionData = await Api.dataUrl(response);
			contentVersion.VersionData = versionData && versionData.split(',')[1];
		} catch(error) {
			console.log(error);
		}
		return contentVersion;
	}

	static async recordType() {
		return this._recordType = (this._recordType || (navigator.onLine ?
			(await Api.query(`
				Select Id, DeveloperName, Name
				From RecordType
				Where (DeveloperName = 'Media')
				And (SobjectType = 'ContentVersion')
			`)).records[0] :
			(await Db.RecordType.where('[DeveloperName+SobjectType]').equals(['Media', 'ContentVersion']).first())
		));
	}

	static async save(images, parentIds) {
		images = (Array.isArray(images) ? images : [images]).filter(image => image);
		parentIds = (Array.isArray(parentIds) ? parentIds : [parentIds]).filter(parentId => parentId);
		if (!(images && (images.length > 0) && parentIds && (parentIds.length > 0))) {
			return;
		}
		let description = await Api.describe('ContentVersion');
		for (let image of images) {
			image.gvp__Date_Time__c = new Date().toISOString();
			image.Title = await this.getImageName({ descriptions: { ContentVersion: description }, image: image });
		}
		let result = await this.saveRecords({ description: description, records: images });
		(result || []).forEach((result, index) => images[index].Id = result && result.id);
		for (let image of images.filter(image => !image.ContentDocumentId)) {
			let contentDocumentLinks = parentIds.map(parentId =>
				Object.assign({
					ContentDocumentId: image.Id,
					LinkedEntityId: parentId,
					ShareType: 'I'
				})
			);
			await this.saveRecords({ description: await Api.describe('ContentDocumentLink'), records: contentDocumentLinks });
		}
		return images;
	}

	static async search(options) {
		options = options || {};
		options.limit = options.limit || (App.isSmallScreen ? 999 : 2000);
		let contentDocumentLinks = await this.fetchContentDocumentLinks(options);
		let contentVersions = [];
		let description = await Api.describe('ContentVersion');
		let fieldFilters = (options.filters || []).filter(filter => description.fields.find(field => field.name === filter.name));
		if (navigator.onLine) {
			let result;
			let filters = fieldFilters && (fieldFilters.length > 0) && fieldFilters.map(filter => filter.type.startsWith('date') ?
				`((${filter.name} >= ${this.dateToUTC(filter.value[0]).toISOString()}) And (${filter.name} <= ${this.dateToUTC(filter.value[1]).toISOString()}))` :
				`(${filter.name} In (${filter.value.map(v => `'${v.value}'`).join(',')}))`);
			for (let chunk of this.chunk(contentDocumentLinks)) {
				let ids = chunk.map(record => record.ContentDocument.LatestPublishedVersionId);
				result  = await Api.query(`
					Select ${description.fields.filter(field => field.type !== 'base64')
						.map(field => field.name).join(',')}
					From ContentVersion
					Where Id In (${ids.map(id => `'${id}'`).join(',')})
						${filters ? `And ${filters.join(' And ')}` : ''}
					Order By LastModifiedDate Desc
				`, { syncInterval: 0 });
				contentVersions = contentVersions.concat(((result && result.records) || []));
			}
		}
		if ((typeof(Db) !== 'undefined')) {
			contentVersions = contentVersions.concat((await Db.ContentVersion.toArray())
				.filter(record => contentDocumentLinks.find(cdl => cdl.ContentDocumentId === record.ContentDocumentId))
				.filter(record => (fieldFilters || []).reduce((result, filter) => result &&
					filter.type.startsWith('date') ? (
						(new Date(record[filter.name]).getTime() >= new Date(filter.value[0]).getTime()) &&
						(new Date(record[filter.name]).getTime() <= new Date(filter.value[1]).getTime())
					) : (filter.value || []).includes(record[filter.name]), true))
				.filter(record => !contentVersions.find(o => o.Id === record.Id))
			);
		}
		return contentVersions.map(record => Object.assign(record, {
				contentDocumentLinks: contentDocumentLinks.filter(cdl => record.Id === cdl.ContentDocument.LatestPublishedVersionId)
			}))
				.sort((i1, i2) => (i2.LastModifiedDate || i2.CreatedDate).localeCompare(i1.LastModifiedDate || i1.CreatedDate))
				.slice(0, options.limit);
	}
}

class MediaDetails extends CustomObject {
	constructor(options) {
		super(options);
		if (this.popover) {
			this.overlay = document.body.appendChild(document.createElement('div'));
			this.overlay.classList.add('media-details-overlay');
			this.element = this.overlay.appendChild(document.createElement('div'));
		} else {
			this.nav.header = Object.assign(this.nav.header, {
				buttons: ((this.nav.views.length > 1) ? [
					{ icon: Icons.icon('Back'), label: this.getLabel('Cancel'), value: 'back' }
				] : []).concat([
					{ icon: Icons.icon('Delete'), label: this.getLabel('Delete'), value: 'delete' },
					{ icon: Icons.icon('Edit'), label: this.getLabel('Edit'), value: 'edit' },
					{ icon: Icons.icon('Remove'), label: this.getLabel('Close'), value: 'close' }
				]),
				handler: async (event, detail) => {
					switch (event) {
						case 'action':
							switch (detail.value) {
								case 'back':
								case 'close':
									if (this.mode === 'view') {
										if (await Modal.promptToContinue({ fieldset: this.fieldset })) {
											this.nav.pop();
										}
									} else {
										this.changeMode({ newMode: 'view' });
									}
									break;
								case 'delete':
									await this.remove({ onClose: this.close.bind(this), button: 'delete' });
									break;
								case 'edit':
									this.changeMode({ newMode: 'edit' });
									break;
								case 'save':
									await this.save({ onClose: this.changeMode.bind(this), newMode: 'view' });
									break;
							}
							break;
					}
				},
				icon: this.nav.header.icon || Icons.icon('PhotoBrowser'),
				title: (this.nav.header.title === '&nbsp;') ? this.getLabel('Photos') : this.nav.header.title
			});
		}
		this.mode = 'view';
		this.refresh();
		if (this.popover === true) {
			return new Promise(resolve => this.resolve = resolve);
		}
	}

	static async popover(options) {
		options = options || {};
		return (await new MediaDetails(Object.assign({
			popover: true,
		}, options)));
	}

	bindEvents() {
		if (this.popover) {
			this.bind(document, 'click', async (event) => {
				this.close({ button: 'close' });
			});
			this.bind(document, 'keydown', async (event) => {
				if (event.keyCode === 27) {
					this.close({ button: 'close' });
				}
			});
			this.bind('header button', 'click', async (event) => {
				event.preventDefault();
				event.stopPropagation();
				const button = event.currentTarget.getAttribute('data-value');
				switch (button) {
					case 'close':
						this.close({ button: button });
						break;
				}
			});
			this.bind('footer a', 'click', async (event) => {
				event.preventDefault();
				event.stopPropagation();
				const linkButton = event.currentTarget.getAttribute('data-value');
				switch (linkButton) {
					case 'details':
						this.close({ button: linkButton });
						break;
					case 'delete':
						await this.remove({ onClose: this.close.bind(this), button: linkButton });
						break;
					case 'sticky':
						break;
				}
			});
		}
	}

	changeMode(options) {
		options = options || {};
		if (!options.errors) {
			let i;
			switch (options.newMode) {
				case 'edit':
					i = this.nav.header.buttons.findIndex(button => button.value === 'edit');
					this.nav.header.buttons[i] = { icon: Icons.icon('Save'), label: this.getLabel('Save'), value: 'save' };
					this.nav.header.render();
					break;
				case 'view':
					i = this.nav.header.buttons.findIndex(button => button.value === 'save');
					this.nav.header.buttons[i] = { icon: Icons.icon('Edit'), label: this.getLabel('Edit'), value: 'edit' };
					this.nav.header.render();
					break;
			}
			this.mode = options.newMode;
			this.render();
		}
	}

	close(options) {
		options = options || {};
		if (this.popover) {
			this.resolve(options.button);
			this.element.remove();
			this.overlay.remove();
		} else {
			this.nav.pop();
		}
		if (options.button && options.button === 'delete' && this.onPop) {
			this.onPop();
		}
	}

	async refresh() {
		this.description = await Api.describe('ContentVersion');
		if (this.popover) {
			this.top = this.mediaElement.getBoundingClientRect().y;
			this.left = this.mediaElement.getBoundingClientRect().x;
			this.width = 320;

			this.icons = {
				camera: Icons.icon('Camera'),
				close: Icons.icon('Close')
			}
			this.linkButtons = [
				{ label: CustomObject.getLabel('View_Photo_Details'), value: 'details'},
				{ label: CustomObject.getLabel('Delete_Photo'), value: 'delete'},
				{ label: CustomObject.getLabel('Sticky'), value: 'sticky'}
			];
			this.layoutFields = ['Title', 'CreatedDate', 'Description'];
		} else {
			this.layout = await Api.editLayout('ContentVersion');
		}
		this.render();
	}

	async remove(options) {
		options = options || {};
		if (!(await Modal.confirm({
			description: this.getLabel('Are_You_Sure_Delete_Photos').replace('{NumPhotos}', 1),
			title: `${this.getLabel('Delete')} 1 ${this.getLabel('Photos')}?`
		}))) {
			return;
		}
		try {
			this.spinner({ blockInput: true });
			const contentDocument = { Id: this.record.ContentDocumentId };
			await MediaDetails.remove({ record: contentDocument, type: 'ContentDocument'});
		} catch (error) {
			return App.error(error);
		} finally {
			this.spinner();
		}
		Toast.displayMessage({
			element: this.element.querySelector('.message'),
			message: this.getLabel('Records_Deleted'),
			onClose: options.onClose ? () => options.onClose(options) : () => this.nav.pop(),
			type: 'success'
		});
	}

	render() {
		this.element.classList.add('slds-scope');
		this.popover === true ? this.renderPopover() : this.renderModeless();
		this.bindEvents();
		return this.element;
	}

	renderLinkButtons() {
		return this.linkButtons.map(linkButton => {
			return `<a class="slds-col slds-card__footer-action" data-value=${linkButton.value} href="javascript:void(0);">${linkButton.label}
				<span class="slds-assistive-text">${linkButton.label}</span>
			</a>`;
		}).join('\n');
	}

	renderModeless() {
		this.element.innerHTML = `
			<style>
				.media-details {
					display: flex;
					flex-direction: column;
					height: 100%;
					padding: 1em;
				}
				.media-details .image {
					display: flex;
					flex: 1;
					min-height: 300px;
					min-width: 300px;
				}
				.media-details img {
					height: 100%;
					object-fit: contain;
					object-position: top;
					width: 100%;
					vertical-align: top;
				}
				.media-details-record {
					display: flex;
					flex-direction: column;
					flex: none;
					padding: 1em;
				}
				.media-details article.slds-tile {
					background-color: transparent;
					border: 1px solid #dddbda;
					border-radius: .25rem;
					cursor: default;
					display: inline-block;
					flex: none;
					float: none;
					margin: 0 !important;
					overflow: auto;
					padding: 1em;
					width: auto;
				}
				.media-details-record footer {
					align-self: center;
					flex-shrink: 0;
					height: 4em;
					padding: 1em;
				}
				@media (min-width: 960px) {
					.media-details {
						flex-direction: row;
					}
					.media-details .image {
						flex: 2;
						margin: 1em;
					}
					.media-details article.slds-tile {
						flex: 1;
					}
					.media-details-record {
						flex: 1;
					}
				}
			</style>
			<div class="media-details">
				<div class="message slds-hidden"></div>
				<div class="image">
					<img src="${Media.dataUrl(this.record)}" alt="${this.record.Title}" title="${this.record.Title}" />
				</div>
				<div class="media-details-record">
					<article class="slds-tile slds-card__tile slds-hint-parent">
						<div class="media-details-fieldset"></div>
					</article>
					<footer>
					</footer>
				</div>
			</div>
		`;
		this.fieldset = new Fieldset({
			element: this.element.querySelector('.media-details-fieldset'),
			disabled: this.mode !== 'edit',
			fields: this.layout.filter(field => !(this.hiddenFields || []).includes(field.name))
				.map(field => Object.assign({
					readOnly: !field.editableForUpdate || this.mode !== 'edit',
					required: (field.nillable === false) || (field.required && !field.compoundFieldName),
					section: field.section
				}, this.description.fields.filter(f => f.name === field.name)[0])),
			label: null,
			objectName: this.description.name,
			record: this.record
		});
	}

	renderPopover() {
		this.element.innerHTML = `
			<style>
			.media-details-overlay {
				position:fixed;
				width:100%;
				height:100%;
				top:0px;
				left:0px;
				z-index:1000;
			}
			.media-details-popover {
				position: fixed;
				left: ${this.left - (this.width + 12)}px;
				top: ${this.top}px;
				width: ${this.width}px;
			}
			.media-details-popover .slds-card__header {
				background-color: ${App.secondaryColor};
				padding-top: 0.25rem;
				padding-bottom: 0.25rem;
				text-align: center;
			}
			.media-details-popover .slds-m-around_small {
				margin: 0;
			}
			</style>
			<section aria-label="Dialog Title" class="slds-popover slds-nubbin_right media-details-popover" role="dialog">
				<div class="message slds-hidden"></div>
				<article class="slds-card">
					<div class="slds-card__header slds-grid">
						<header class="slds-media slds-media_center slds-has-flexi-truncate">
							<div class="slds-media__figure">
								<span class="slds-icon_container ${this.icons.camera.cssClass || ''}" title="Camera Icon">
									<svg class="slds-icon slds-icon_small slds-current-color" aria-hidden="true">
										<use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="${this.icons.camera.url || this.icons.camera}" />
									</svg>
									<span class="slds-assistive-text">${this.getLabel('Photo_Details')}</span>
								</span>
							</div>
							<div class="slds-media__body">
								<h2 class="slds-card__header-title">
									${this.getLabel('Photo_Details')}
								</h2>
							</div>
							<button class="slds-button slds-button_icon slds-button_icon-small slds-float_right slds-popover__close" data-value="close" title="Close dialog">
								<svg class="slds-button__icon" aria-hidden="true">
									<use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="${this.icons.close.url || this.icons.close}"  />
								</svg>
								<span class="slds-assistive-text">Close dialog</span>
							</button>
						</header>
					</div>
					<div class="slds-card__body slds-card__body_inner">
						<div class="media-details-fieldset"></div>
					</div>
					<footer class="slds-card__footer">
						<div class="slds-grid slds-gutters">
							${this.renderLinkButtons()}
						</div>
					</footer>
				</article>
			</section>
		`;

		const fields = this.description.fields.filter(f => this.layoutFields.includes(f.name) && this.record[f.name]);
		this.fieldset = new Fieldset({
			element: this.element.querySelector('.media-details-fieldset'),
			disabled: true,
			fields: fields,
			label: null,
			objectName: this.description.name,
			record: this.record
		});
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
		this.record = Object.assign(this.record, this.fieldset && this.fieldset.valueForSave);
		await this.saveRecords({ description: this.description, records: this.record });
		let errors;
		if (navigator.onLine && (typeof(Db) !== 'undefined')) {
			this.spinner({ blockInput: true });
			await Db.syncUnsyncedRecords();
			errors = (await Db['ContentVersion'].get(this.record.Id) || {})._errors;
			this.spinner();
		}
		if (!errors) {
			this.record = Object.assign(this.record, await this.getRecord());
		}
		Toast.displayMessage({
			element: this.element.querySelector('.message'),
			onClose: options.onClose ? () => options.onClose(Object.assign(options, { errors: errors })) : null,
			message: errors ? errors.map(error => error.message) : this.getLabel('Records_Updated'),
			type: errors ? 'error' : 'success'
		});
	}
}

export class MediaEditor extends CustomObject {
	constructor(options) {
		super(options);
		this.refresh();
	}

	async refresh() {
		const editorOptions = {
			bulkEdit: this.bulkEdit,
			imageAddOnly: this.allowDelete === false,
			images: this.images,
			description: await Api.describe('ContentVersion'),
			hiddenFields: [ 'Title' ],
			quickSave: this.save === false,
			readOnly: this.readOnly,
			record: this.record,
			saveAndNew: this.saveAndNew,
			title: this.title || `${this.getLabel('Add')} ${this.getLabel('Photos')}`,
			type: 'ContentVersion',
			onPop: popupEditor => this.handler && this.handler(popupEditor.images.map(image =>
				Object.assign({}, image, this.save ? {} : popupEditor.record)
			))
		};
		if (App.isSmallScreen) {
			new PopupEditor(Object.assign(editorOptions, {
				element: this.nav.push(document.createElement('div'), {
					breadcrumbs: this.breadcrumbs || [],
					buttons: [
						{ label: this.getLabel('Back'), value: 'back' }
					],
					icon: Icons.icon('gvp__Media__c'),
					title: this.title || `${this.getLabel('Add')} ${this.getLabel('Photos')}`
				}),
				nav: this.nav
			}));
		} else {
			await PopupEditor.open(editorOptions);
		}
	}
}

class MediaUploader extends CustomElement {
	constructor(options) {
		super(options);
		this.render();
		this.refresh();
	}

	static get properties() {
		return [
			'account',
			'image'
		];
	}

	get dataUrl() {
		return Media.dataUrl(this.image);
	}
	get modified() {
		return this.image || (this.mediaForm && this.mediaForm.modified);
	}
	get valid() {
		return this.mediaForm && this.mediaForm.valid;
	}

	bindEvents() {
		this.bind('#photo-button', 'click', () => Media.add({
			element: this.element,
			handler: images => {
				this.image = Object.assign(this.image, images[0]);
				this.render();
			}
		}));
	}

	async getImageName(options) {
		options = Object.assign({ image: this.image }, options || {});
		return Media.getImageName(options);
	}

	async refresh() {
		Geolocation.update(this.image = this.image || {});
		this.descriptions = {};
		for (let type of ['ContentVersion']) {
			this.descriptions[type] = await Api.describe(type);
		}
		this.layout = await Api.editLayout('ContentVersion');
		this.render();
	}

	render() {
		this.element.innerHTML = `
			<style>
				#media-uploader button.choose {
					display: block;
					margin: 20px auto;
				}
				#media-uploader #media-image {
					display: block;
					height: 100%;
					margin: 0 auto;
					max-height: 200px;
					object-fit: contain;
					width: 100%;
				}
			</style>
			<div class="slds-scope slds-p-around_medium" id="media-uploader">
				${this.dataUrl ? `
					<img id="media-image" src="${this.dataUrl}" title="${this.image && this.image.Title}" />
				` : ''}
				<button id="photo-button" class="slds-button slds-button--brand choose">${(this.constructor.mobile ? `${this.getLabel('Take Photo')} / ` : '') + this.getLabel('Choose Existing')}</button>
				<div class="slds-form slds-form_stacked"></div>
			</div>
		`;
		this.renderMediaForm();
		this.bindEvents();
		return this.element;
	}

	renderMediaForm() {
		return this.mediaForm = (this.dataUrl && this.descriptions &&
			this.descriptions.ContentVersion && this.layout &&
			new Fieldset({
				element: this.element.querySelector('.slds-form'),
				fields: (this.layout || []).map(field => field.name)
					.concat([
						'gvp__Brand__c',
						'gvp__Label__c',
						'gvp__Type__c',
						'gvp__Location__c',
						'gvp__Comments__c'
					])
					.filter((fieldName, index, array) => array.indexOf(fieldName) === index)
					.map(fieldName => {
						let field = (this.layout || []).find(field => field.name === fieldName) || {};
						return Object.assign({
							model: 'ContentVersion',
							readOnly: !field.editableForNew,
							required: field.nillable === false
						}, this.descriptions.ContentVersion.fields.find((field) => field.name === fieldName) || {})
					})
					.filter(field => field.name),
				objectName: 'ContentVersion',
				record: this.image
			})
		);
	}

	async save() {
		if (!this.mediaForm.valid) {
			return Promise.reject('invalid');
		}
		this.image = Object.assign({
			gvp__Date_Time__c: new Date().toISOString()
		}, Object.entries(this.mediaForm.value).reduce((r, [k, v]) => {
			r[k] = (v.value && v.value.value) || v.value;
			return r;
		}, this.image));
		this.image.Title = await this.getImageName({ descriptions: this.descriptions });
		return this.image;
	}
}

export class ImageList extends CustomObject {
	constructor(options) {
		super(options);
		this.element = this.element || document.body.appendChild(document.createElement('div'));
		this.init();
	}

	get groupBy() {
		return this._groupBy = ([undefined, null, ''].includes(this._groupBy) ? false : this._groupBy);
	}
	set groupBy(groupBy) {
		let none = this.getLabel('None');
		if ((groupBy === this.groupBy) && ((this.groupBy !== 'none') || !this.images.find(image => image.group !== none))) {
			return;
		}
		this._groupBy = groupBy;
		this.images.forEach(image => {
			switch(this.groupBy) {
				case 'Account':
				case 'gvp__Survey_Plan__c':
				case 'gvp__Survey_Plan_Question__c':
					image.group = ((image.contentDocumentLinks || []).find(cdl => cdl.LinkedEntity && (cdl.LinkedEntity.Type === this.groupBy)) || { LinkedEntity: {} }).LinkedEntity.Name;
					break;
				case 'gvp__Location__c':
				case 'gvp__Type__c':
					image.group = image[groupBy];
					break;
				case 'LastModifiedDate':
					image.group = (new Date((image.LastModifiedDate || image.CreatedDate).replace('+0000', 'Z'))).toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
					break;
				default:
					image.group = none;
					break;
			}
			image.group = image.group || none;
		});
		this.images.sort((i1, i2) => (i2.LastModifiedDate || i2.CreatedDate).localeCompare(i1.LastModifiedDate || i1.CreatedDate));
		if (this.groupBy !== 'LastModifiedDate') {
			this.images.sort((i1, i2) => (i1.group === none) ? ((i2.group === none) ? 0 : 1) : ((i2.group === none) ? -1 : i1.group.localeCompare(i2.group)));
		}
		this.deselectAll();
		this.page = 1;
		this.render();
	}
	get groups() {
		return (this.images || []).map(image => image.group).filter((group, index, groups) => group && (groups.indexOf(group) === index));
	}
	get height() {
		return this._height || 200;
	}
	set height(height) {
		this._height = height;
		this.render();
	}
	get images() {
		return this._images || [];
	}
	set images(images) {
		this._images = images;
		this.render();
	}
	get page() {
		return this._page = this._page || 1;
	}
	set page(page) {
		if (page !== this.page) {
			this.deselectAll();
			this._page = page;
			this.render();
		}
	}
	get pages() {
		return Math.ceil(this.images.length / this.pageSize);
	}
	get pageSize() {
		return this._pageSize = this._pageSize || 20;
	}
	set pageSize(pageSize) {
		this._pageSize = pageSize;
		this.render();
	}
	get selectedImages() {
		return this.images.filter(image => this.element.querySelector(`#visual-picker-${image.Id}:checked`));
	}
	get width() {
		return this._width;
	}
	set width(width) {
		this._width = width;
		this.render();
	}

	bindEvents() {
		this.bind('.image-list figure', 'click',
			(event, index) => this.handler && this.handler(
				`${this.allowSelect ? 'select' : 'choose'}Image`,
				this.images[index]
			)
		);
		this.bind('.image-pages button', 'click', (event, index) => this.page = Number(event.target.getAttribute('data-page')) || (index + 1));
		if (this.hoverEvents) {
			this.bind('.image-list-image', 'mouseover', (event, index) => {
				const element = event.currentTarget;
				this.hoverTimer = setTimeout(() => this.handler && this.handler('hover', Object.assign(this.images[index], { _element: element })), this.hoverTimeout);
			});
			this.bind('.image-list-image', 'mouseout', () => clearTimeout(this.hoverTimer));
		}
	}

	deselectAll() {
		Array.from(this.element.querySelectorAll('.image-list figure input[type="checkbox"]')).forEach(checkbox => checkbox.checked = false);
		if (this.handler) {
			this.handler('deselectAll');
		}
	}

	async init() {
		this.initialized = true;
		this.refresh();
	}

	async refresh() {
		this.descriptions = {};
		for (let type of [
			'Account',
			'ContentVersion',
			'gvp__Survey__c',
			'gvp__Survey_Plan__c',
			'gvp__Survey_Plan_Question__c'
		]) {
			this.descriptions[type] = await Api.describe(type);
		}
		this.render();
	}

	async removeSelectedImages() {
		if (!(await Modal.confirm({
			description: this.getLabel('Are_You_Sure_Delete_Photos').replace('{NumPhotos}', this.selectedImages.length),
			title: `${this.getLabel('Delete')} ${this.selectedImages.length} ${this.getLabel('Photos')}?`
		}))) {
			return;
		}
		let existingContentDocuments = this.selectedImages.filter(image => image.ContentDocumentId).map(
			image => Object.assign({ Id: image.ContentDocumentId })
		);
		let newContentVersions = this.selectedImages.filter(image => !image.ContentDocumentId);
		try {
			this.spinner({ blockInput: true });
			await ImageList.remove({ record: existingContentDocuments, type: 'ContentDocument'});
			if (typeof (Db) !== 'undefined') {
				newContentVersions.forEach(async cv => {
					let result = await Db.ContentDocumentLink.where('ContentDocumentId').equals(cv.Id).and(o => o._changedLocally !== Db.DELETED).toArray();
					if (result) {
						ImageList.remove({ record: result, type: 'ContentDocumentLink'});
					}
				});
			}
		} catch (error) {
			return App.error(error);
		} finally {
			this.spinner();
		}
		if (this.handler) {
			this.handler('delete', this.selectedImages);
		}
		let selectedImageIds = this.selectedImages.map(image => image.Id);
		this.images = this.images.filter(image => !selectedImageIds.find(imageId => imageId === image.Id));
		Toast.displayMessage({
			element: this.element.querySelector('.message'),
			message: `${this.getLabel('Records_Deleted')} ${selectedImageIds.length}`,
			onClose: () => {
				this.render();
				if (this.handler) {
					this.handler('removeSelectedImages', selectedImageIds);
				}
			},
			type: 'success'
		});
		return true;
	}

	render() {
		if (!this.initialized) {
			return this.element;
		}
		let selectedImages = this.selectedImages;
		this.element.id = this.element.id || `id${new Date().getTime()}${Math.random()}`.replace('.', '');
		this.element.innerHTML = `
			<style>
				.image-list {
					display: flex;
					flex-direction: column;
					height: 100%;
				}
				.image-list label {
					flex: none;
				}
				.image-list .images {
					flex: 1;
					margin-bottom: 1em;
					overflow-x: hidden;
					overflow-y: auto;
				}
				.image-list .images header {
					white-space: normal;
				}
				.image-list .image-pages {
					flex: none;
				}
				#${this.element.id} .image-list article {
					border: none;
					box-shadow: none;
					display: inline-block;
					height: ${this.height}${Number.isInteger(this.height) ? 'px' : ''};
					margin: .25em !important;
					max-width: 99%;
					width: ${this.width && `${this.width}${Number.isInteger(this.width) ? 'px' : ''}` || '100%'};
					vertical-align: middle;
				}
				.image-list figure {
					display: flex;
					flex-direction: column;
					height: 100%;
					width: 100%;
				}
				.image-list figure > * {
					display: flex;
					flex: 1;
					justify-content: center;
				}
				.image-list figure label > .slds-visual-picker__figure {
					display: flex;
					flex-direction: column;
					height: 100%;
					width: 100%;
				}
				.image-list figure input:not(:checked) ~ label:not(:hover) > .slds-visual-picker__figure {
					border: 1px solid #dddbda;
					box-shadow: 0 2px 2px rgba(0,0,0,.05);
				}
				.image-list figure label > .slds-visual-picker__figure > *:first-child {
					flex: 1;
					height: 0;
				}
				.image-list figure label .slds-visual-picker__text-check {
					display: none;
				}
				.image-list figure input:checked ~ label .slds-visual-picker__text-check {
					display: inline-block;
				}
				.image-list figcaption {
					background-color: #f3f2f2;
					display: inline-block;
					flex: none;
					width: 100%;
				}
				.image-list input ~ label:hover figcaption,
				.image-list input:checked ~ label figcaption {
					border: 1px solid #1589ee;
					border-top: none;
				}
				.image-list figcaption .slds-media__figure {
					display: none;
					margin: .5rem .75rem 0 0
				}
				.image-list figcaption .slds-media__body {
					margin: 0;
				}
				.image-list figcaption .slds-media__body > div {
					margin: .25em;
					text-align: right;
					width: 30%;
				}
				.image-list figcaption .slds-media__body > div:first-child {
					text-align: left;
					width: 70%;
				}
				.image-list figcaption .slds-media__body > div:first-child div {
					font-size: smaller;
				}
				.image-list figcaption .slds-media__body > div:first-child div:first-child {
					font-size: medium;
				}
				.image-list figcaption span {
					display: inline-block;
				}
				.image-list article img {
					height: 100%;
					object-fit: cover;
					padding: 1px;
					width: 100%;
				}
				.image-list .images-footer {
					display: flex;
					${(!this.groupBy && (this.pages > 1)) ? `
						background: #f3f2f2;
						background-clip: padding-box;
						border: 1px solid #dddbda;
						border-bottom: 1px solid #dddbda;
						border-radius: .25rem;
						box-shadow: 0 2px 2px 0 rgba(0,0,0,.1);
						padding: .5rem;
					` : ''}
				}
				.image-list .images-footer > * {
					flex: none;
				}
				.image-list .image-group-by .slds-form-element {
					margin: 0;
				}
				.image-list .image-group-by .slds-input {
					min-width: initial;
					padding: 0 1.65em 0 .25em;
				}
				.image-list .image-pages {
					display: flex;
					margin-left: auto;
				}
				.image-list .image-pages > * {
					flex: 1;
					margin: auto .3em;
					white-space: nowrap;
				}
				.image-list .image-pages > .slds-button-group {
					flex: none;
					max-width: 80%
					overflow-x: auto;
				}
				.image-list .image-pages > .slds-button-group button {
					padding: 0;
					width: 36px;
				}
				.image-list .image-pages > .slds-button-group button svg {
					color: initial;
				}
				.message {
					padding-left: 5px;
				}
			</style>
			<section class="image-list">
				<div class="message">&nbsp;</div>
				<section class="images">
					${(this.images.length > 0) ? this.images.map((img, idx, imgs) => {
						let onCurrentPage = ((idx >= ((this.page-1) * this.pageSize)) && (idx < (this.page * this.pageSize)));
						let previousGroup = imgs[idx-1] && imgs[idx-1].group;
						return `
							${((this.groups.length > 1) && (((!previousGroup || ((idx === ((this.page-1) * this.pageSize)))) && img.group) || (img.group !== previousGroup))) ? `<header class="slds-badge slds-text-heading--label slds-truncate ${onCurrentPage ? '' : 'slds-hidden'}">${img.group || this.getLabel('None')}</header>` : ''}
							<article class="slds-card ${onCurrentPage ? '' : 'slds-hidden'}">
								<figure class="slds-visual-picker slds-visual-picker_medium">
									${this.allowSelect ? `
										<input type="checkbox" id="visual-picker-${img.Id}" ${selectedImages.find(image => img.Id === image.Id) ? 'checked' : ''}>
									` : ''}
									<label for="visual-picker-${img.Id}">
										<span class="slds-visual-picker__figure slds-visual-picker__text">
											<div class="image-list-image">
												<!-- images load asynchronously -->
											</div>
											${this.showCaption ? `
												<figcaption>
													<div class="slds-media slds-media_small slds-media_center">
														<div class="slds-media__figure slds-line-height_reset">
															<span class="slds-icon_container" title="${img.Title}">
																<svg class="slds-icon slds-icon-text-default slds-icon_small" aria-hidden="true">
																	<use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="${Media.getSymbols('utility')}#photo" />
																</svg>
																<span class="slds-assistive-text">${img.Title}</span>
															</span>
														</div>
														<div class="slds-media__body slds-grid">
															<div>
																<div class="slds-truncate" title="${img.gvp__Type__c || img.Description || ''}">${img.gvp__Type__c || img.Description || ''}</div>
																<div class="slds-truncate" title="${img.gvp__Location__c || ''}">${img.gvp__Location__c || ''}</div>
															</div>
															<div>
																<div class="slds-truncate" title="${ImageList.displayValue(img.LastModifiedDate || img.CreatedDate, 'datetime')}">${ImageList.displayValue(img.LastModifiedDate || img.CreatedDate, 'dateLong')}</div>
															</div>
														</div>
													</div>
												</figcaption>
											` : ''}
										</span>
										<span class="slds-icon_container slds-visual-picker__text-check">
											<svg class="slds-icon slds-icon-text-check slds-icon_x-small" aria-hidden="true">
												<use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="${Media.getSymbols('utility')}#check" />
											</svg>
										</span>
									</label>
								</figure>
							</article>
						`;
					}).join('\n') : (this.noRecordsMessage ? this.getLabel('No_Records') : '')}
				</section>
				<section class="images-footer">
					<section class="image-group-by ${!this.groupBy ? 'slds-hidden' : ''}"></section>
					${(this.pages > 1) ? `
						<section class="image-pages">
							<div>${((this.page - 1) * this.pageSize) + 1} - ${Math.min(this.page * this.pageSize, this.images.length)} of ${this.images.length}</div>
							<div class="slds-button-group" role="group">
								${(App.isSmallScreen && (this.groupBy !== false)) ? `
									<button class="slds-button slds-button_neutral" data-page="${Math.max(this.page-1, 1)}">
										<svg class="slds-button__icon slds-button__icon_medium" aria-hidden="true">
											<use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="${Icons.iconUrl('utility', 'left')}" />
										</svg>
										<span class="slds-assistive-text">${this.getLabel('Previous')}</span>
									</button>
									<button class="slds-button slds-button_neutral" data-page="${Math.min(this.page+1, this.pages)}">
										<svg class="slds-button__icon slds-button__icon_medium" aria-hidden="true">
											<use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="${Icons.iconUrl('utility', 'right')}" />
										</svg>
										<span class="slds-assistive-text">${this.getLabel('Next')}</span>
									</button>
								` : (new Array(this.pages+1)).join(0).split('').map((o, i) =>
									((Math.abs(this.page - (i+1)) <= 1) || ((this.page < 4) && (i < 4)) || (((this.pages - this.page) < 3) && ((this.pages - i) < 5)) || (i == 0) || (i === (this.pages-1))) ? `
										<button class="slds-button slds-button_${(this.page === i+1) ? 'brand' : 'neutral'}" data-page="${i+1}">${((i === (this.pages-1)) && (this.page < (this.pages - 2))) ? '… ' : ''}${i+1}${((i === 0) && (this.page > 3)) ? ' …' : ''}</button>
									` : ''
								).join('\n')}
							</div>
						</section>
					` : ''}
				</section>
			</section>
		`;
		this.bindEvents();
		this.groupByList = new List({
			clearable: false,
			collapsed: true,
			collapsible: true,
			disabled: true,
			element: this.element.querySelector('.image-group-by'),
			handler: (event, list) => {
				switch(event) {
					case 'valueChange':
						this.groupBy = this.groupBy && ((list.value && list.value.value) || 'none');
						break;
				}
			},
			items: this.groupByItems = [{
				label: `${this.getLabel('Group_By')}: ${this.getLabel('None')}`,
				value: 'none'
			}, {
				label: `${this.getLabel('Group_By')}: ${this.descriptions && this.descriptions.Account && this.descriptions.Account.label}`,
				value: 'Account'
			}, {
				label: `${this.getLabel('Group_By')}: ${
					this.descriptions && this.descriptions.ContentVersion && (this.descriptions.ContentVersion.fields || [])
						.find(field => field.name === 'CreatedDate').label
				}`,
				value: 'LastModifiedDate'
			}, {
				label: `${this.getLabel('Group_By')}: ${
					this.descriptions && this.descriptions.ContentVersion && (this.descriptions.ContentVersion.fields || [])
						.find(field => field.name === 'gvp__Location__c').label
				}`,
				value: 'gvp__Location__c'
			}, {
				label: `${this.getLabel('Group_By')}: ${this.getLabel('Question')}`,
				value: 'gvp__Survey_Plan_Question__c'
			}, {
				label: `${this.getLabel('Group_By')}: ${this.descriptions && this.descriptions.gvp__Survey__c && this.descriptions.gvp__Survey__c.label}`,
				value: 'gvp__Survey_Plan__c'
			}, {
				label: `${this.getLabel('Group_By')}: ${
					this.descriptions && this.descriptions.ContentVersion && (this.descriptions.ContentVersion.fields || [])
						.find(field => field.name === 'gvp__Type__c').label
				}`,
				value: 'gvp__Type__c'
			}],
			placeholder: this.getLabel('Group_By'),
			searchable: false,
			value: (this.groupBy === false) ? false : this.groupByItems.find(item => item.value === (this.groupBy || 'none'))
		});
		this.renderImages();
		return this.element;
	}

	async renderImages() {
		let elements = Array.from(this.element.querySelectorAll('.image-list figure .slds-visual-picker__figure > *:first-child'));
		let index = -1;
		for (let image of this.images) {
			index += 1;
			if ((index >= ((this.page-1) * this.pageSize)) &&
				(index < (this.page * this.pageSize))
				&& !elements[index].querySelector('img')
			) {
				await Media.loadContentVersionData(image);
				elements[index].innerHTML = `<img
					src="${Media.dataUrl(image)}"
					alt="${image.Title}"
					title="${image.Title}"
				/>`;
			}
		}
	}

	selectAll() {
		Array.from(this.element.querySelectorAll('.image-list figure input[type="checkbox"]')).forEach((checkbox, index) =>
			checkbox.checked = (index >= (((this.page-1) * this.pageSize)) &&
				(index < (this.page * this.pageSize))) ? true : checkbox.checked
		);
		if (this.handler) {
			this.handler('selectAll');
		}
	}
}

class ObjectImageList extends CustomObject {
	constructor(options) {
		super(options);
		this.element = this.element || document.body.appendChild(document.createElement('div'));
		this.refresh();
	}

	get selectedImages() {
		return this.imageList.selectedImages;
	}

	async refresh() {
		this.spinner();
		await this.refreshImages();
		this.render();
	}

	async refreshImages() {
		this.images = await Media.Images(this.id);
	}

	render() {
		this.renderImageList();
		return this.element;
	}

	renderImageList(options) {
		options = options || {};
		return this.imageList = new ImageList(Object.assign({
			allowSelect: this.allowSelect,
			element: this.element,
			handler: this.handler,
			images: this.images
		}, options));
	}
}

export class AccountImages extends ObjectImageList {
	constructor(options) {
		super(options);
	}
	get handler() {
		return async (event, detail) => {
			switch(event) {
				case 'hover':
					let response = '';
					if (this.showingPopover !== true) {
						try {
							this.showingPopover = true;
							response = await MediaDetails.popover({ mediaElement: detail._element, record: detail, onPop: async () => await this.onPop() });
						} catch (error) {
							console.log(error);
						} finally {
							this.showingPopover = false;
						}
					}
					if (response !== 'details') {
						break;
					}
				case 'chooseImage':
					this.nav.push((this.details = new MediaDetails({
						element: document.createElement('div'),
						record: detail,
						nav: this.nav,
						onPop: this.onPop.bind(this)
					})).element, { breadcrumbs: this.nav.header.breadcrumbs.concat([this.getLabel('Photos'), detail.Title]) });
					break;
				case 'selectImage':
					this.updateButtonGroup();
					break;
			}
		};
	}

	set handler(handler) {
		this._handler = handler;
	}

	async onPop() {
		if (this._handler) {
			this._handler('refresh');
		}
		await this.refreshImages();
		this.render();
	}

	async refreshImages() {
		this.images = await Media.accountImages(this.id);
	}

	render() {
		this.element.innerHTML = `
			<style>
				.account-images {
					display: flex;
					flex-direction: column;
					height: 100%;
				}
				.account-images .account-images-header {
					display: flex;
					flex: none;
				}
				.account-images .account-images-header > * {
					flex: none;
				}
				.account-images .account-images-header .account-images-button-group {
					flex: 1;
					text-align: right;
				}
				.account-images .account-images-list {
					flex: 1;
					overflow: auto;
				}
			</style>
			<div class="account-images">
				<h2 class="account-images-header">
					<span class="slds-text-heading--medium">${this.getLabel('Photos')}</span>
					<span class="account-images-button-group"></span>
				</h2>
				<div class="account-images-list"></div>
			</div>
		`;
		this.buttonGroup = new ButtonGroup({
			buttons: [
				{
					disabled: !this.images || (this.images.length === 0),
					label: this.capitalize(this.getLabel('Select')),
					selectable: true,
					value: 'select'
				}
			],
			element: this.element.querySelector('.account-images-button-group'),
			handler: async (event, detail) => {
				switch(event) {
					case 'button':
						switch(detail.value) {
							case 'select':
								this.imageList.deselectAll();
								this.allowSelect = this.imageList.allowSelect = detail.selected;
								this.updateButtonGroup();
								this.imageList.render();
								break;
						}
						break;
					case 'menu':
						switch(detail.value) {
							case 'delete':
								await this.imageList.removeSelectedImages();
								if (this._handler) {
									this._handler('refresh');
								}
								break;
							case 'deselectAll':
								this.imageList.deselectAll();
								break;
							case 'edit':
								break;
							case 'selectAll':
								this.imageList.selectAll();
								break;
						}
						this.updateButtonGroup();
						break;
				}
			},
			menu: [
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
				}
				*/
			]
		});
		this.renderImageList({
			element: this.element.querySelector('.account-images-list'),
			height: 280,
			showCaption: true,
			hoverEvents: false,
			hoverTimeout: 2000
		});
		return this.element;
	}

	updateButtonGroup() {
		this.buttonGroup.label = (this.selectedImages.length > 0) ? `${this.selectedImages.length} ${this.getLabel('Items').toLowerCase()} ${this.getLabel('Selected').toLowerCase()}` : '';
		let select = this.buttonGroup.button('select').selected;
		['delete', 'edit', 'deselectAll'].forEach(value =>
			this.buttonGroup.disabled(value, !select || (this.imageList.selectedImages.length === 0))
		);
		this.buttonGroup.disabled('selectAll', !select || (this.imageList.selectedImages.length >= Math.min(this.imageList.pageSize, this.imageList.images.length)));
	}
}

export class PhotoBrowser extends CustomObject {
	constructor(options) {
		super(options);
		this.accountId = this.accountId || PhotoBrowser.parseArgs().accountId;
		this.header = new Header({
			buttons: [],
			breadcrumbs: [],
			element: document.createElement('header'),
			handler: (event, detail) => {
				switch(event) {
					case 'action':
						switch(detail.value) {
							case 'back':
								if (App.isSmallScreen && this.filtersOpen) {
									this.toggleFilters();
								} else {
									this.nav.pop();
								}
								break;
							case 'filter':
								this.toggleFilters();
								break;
						}
					break;
				}
			},
			icon: this.accountId ? null : Icons.icon('PhotoBrowser'),
			menu: [],
			title: ' '
		});
		this.nav = this.nav || new Nav(this.element, { header: this.header });
		this.element = document.createElement('div');
		this.groupBy = 'none';
		this.init();
	}

	get filters() {
		return this._filters = this._filters || [];
	}
	set filters(filters) {
		if (filters !== this._filters) {
			this._filters = filters;
			this.search();
		}
		this.nav.header.element.querySelector('.slds-button[data-value="filter"] svg').style.fill = (this.filters.length > 0) ? '#0070d2' : '#706e6b';
	}

	get selectedImages() {
		return (this.imageList && this.imageList.selectedImages) || [];
	}

	async addFilter() {
		this.filterFields = (await Api.describe('ContentVersion')).fields.filter(field => [
			'CreatedDate',
			'gvp__Location__c',
			'gvp__Type__c'
		].includes(field.name)).concat([{
			label: (await Api.describe('Account')).label,
			name: 'Account'
		}, {
			label: this.getLabel('Question'),
			name: 'gvp__Survey_Plan_Question__c'
		}, {
			label: (await Api.describe('gvp__Survey__c')).label,
			name: 'gvp__Survey_Plan__c'
		}]).filter(field => !this.filters.find(filter => filter.name === field.name));
		if (this.filterFields.length === 0) {
			this.element.querySelector('.add-filter').innerHTML = '';
			return;
		}
		this.element.querySelector('.add-filter').innerHTML = `
			<style>
				.photo-browser-filters .add-filter-confirmation-button {
					margin-bottom: .5em !important;
				}
				.photo-browser-filters .slds-popover__body {
					max-height: 320px;
					overflow: scroll;
				}
				.photo-browser-filters .slds-popover__body .filter-field .slds-form-element__label {
					display: none;
				}
			</style>
			<section aria-describedby="dialog-body-id-18" class="slds-popover slds-nubbin_${App.isSmallScreen ? 'top-left' : 'right-top'} slds-popover_medium" role="dialog">
				<button class="slds-button slds-button_icon slds-button_icon-small slds-float_right slds-popover__close" title="${this.getLabel('Close')}">
					<svg class="slds-button__icon" aria-hidden="true">
						<use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="${Icons.iconUrl('utility', 'close')}" />
					</svg>
					<span class="slds-assistive-text">${this.getLabel('Close')}</span>
				</button>
				<div class="slds-popover__body" id="dialog-body-id-18">
					<div class="filter-list"></div>
					<div class="filter-field"></div>
					<button class="add-filter-confirmation-button slds-button slds-button_brand slds-float_right slds-m-around_small slds-hidden">${this.getLabel('Add')} ${this.getLabel('Filter')}</button>
				</div>
			</section>
		`;
		this.filterList = new List({
			clearable: false,
			collapsed: false,
			collapsible: true,
			element: this.element.querySelector('.add-filter .filter-list'),
			handler: async (event, list) => {
				switch(event) {
					case 'valueChange':
						let label = list.value && list.value.label;
						let value = list.value && list.value.value;
						switch(value) {
							case 'Account':
							case 'gvp__Survey_Plan__c':
							case 'gvp__Survey_Plan_Question__c':
								this.filterField = {
									list: new List({
										clearable: false,
										collpased: true,
										collapsible: true,
										element: this.element.querySelector('.add-filter .filter-field'),
										handler: (event, list) => {
											switch(event) {
												case 'valueChange':
													this.element.querySelector('.add-filter-confirmation-button').classList[((list.value && list.value.length) > 0) ? 'remove' : 'add']('slds-hidden');
													this.filterField.value = (list.value || []).map(value => value.value || value);
													break;
											}
										},
										items: (Media.contentDocumentLinks || (await Media.fetchContentDocumentLinks()))
											.filter(cdl => cdl.LinkedEntity && cdl.LinkedEntity.Name &&
												(cdl.LinkedEntity.Type === value)
											)
											.map(cdl => cdl.LinkedEntity.Name)
											.filter((name, index, names) => name && (names.indexOf(name) === index))
											.map(name => Object.assign({ label: name, value: name })),
										label: label,
										multiselect: true
									}),
									label: label,
									name: value,
									type: 'contentDocumentLink'
								}
								break;
							default:
								let filterableField = this.filterFields.find(field => field.name === value);
								filterableField.type = filterableField.type === 'datetime' ? 'date' : filterableField.type; // don't allow time in filter
								this.filterField = FieldFactory.create(
									Object.assign({
										element: this.element.querySelector('.add-filter .filter-field'),
										handler: (event, field) => {
											switch(event) {
												case 'valueChange':
													let hideAddFilter = (
														!field.value ||
														(field.value.length === 0) ||
														field.value.includes(undefined) ||
														field.value.includes(null) ||
														field.value === ''
													);
													this.element.querySelector('.add-filter-confirmation-button').classList[hideAddFilter ? 'add' : 'remove']('slds-hidden');
													break;
											}
										},
										isSearch: true,
										mode: "range", // for datepicker
										required: true,
										objectName: 'ContentVersion',
									},filterableField)
								);
								break;
						}
						break;
				}
			},
			items: this.filterFields.map(field => Object.assign({
				label: field.label,
				value: field.name
			})),
			placeholder: this.getLabel('Filter'),
			searchable: false
		});
		this.bind('.add-filter .slds-popover__close', 'click', () => this.element.querySelector('.add-filter').innerHTML = '');
		this.bind('.add-filter-confirmation-button', 'click', () => {
			if (this.filterField && (this.filterField.valid !== false)) {
				if(this.filterField.type === 'date') {
					let dateParts = this.filterField.value.split(' ');
					this.filterField.value = [dateParts[0], dateParts[2]];
					this.filters = this.filters.concat(Object.assign({}, this.filterField, { value: this.filterField.value, label: 'Date Range', hideValue: true }));
				} else {
					this.filters = this.filters.concat(Object.assign({}, this.filterField, { value: this.filterField.value }));
				}
			}
		});
	}

	bindEvents() {
		this.bind('.photo-browser-filters .slds-filters__item .slds-button_icon', 'click', (event, index) => this.filters = this.filters.slice(0, index).concat(this.filters.slice(index+1)));
		this.bind('.add-filter-button', 'click', this.addFilter.bind(this));
		this.bind('.remove-filters-button', 'click', this.removeFilters.bind(this));
		this.bind('.toggle-filter-panel', 'click', this.toggleFilters.bind(this));
	}

	async download(options) {
		options = options || {};
		let blob;
		let fileName;

		this.spinner();
		if (options.popup && options.popup.document && options.popup.document.write) {
			options.popup.document.write(this.getLabel('Loading'));
		}
		for (let image of this.selectedImages) {
			image.FileName = await Media.getFileName({ image });
		}
		if (this.selectedImages.length === 1) {
			blob = await (await fetch(Media.dataUrl(this.selectedImages[0]))).blob();
			fileName = this.selectedImages[0].FileName;
		} else {
			let zip = new JSZip();
			let img = zip.folder(this.getLabel('Photos'));

			for (let image of this.selectedImages) {
				img.file(image.FileName, image.VersionData, { base64: true });
			}
			blob = await zip.generateAsync({ type: 'blob' });
			fileName = `${this.getLabel('Photos')}.zip`;
		}
		await saveAs(blob, fileName, undefined, options.popup);
		this.spinner();
	}

	async init() {
		CustomObject.labels = await Api.labels();
		if (this.accountId) {
			this._filters = [{
				label: this.getLabel('Account'),
				name: 'Account',
				type: 'contentDocumentLink',
				value: [ (((await Api.query(`Select Name From Account Where Id = '${this.accountId}'`)).records || [])[0] || {}).Name ]
			}];
		}
		this.nav.replace(this.render(), Object.assign(this.header, {
			breadcrumbs: [],
			buttons: [{ label: 'Back', value: 'back' }]
				.concat(this.accountId ? [] : [{ icon: { iconClass: 'slds-icon-text-default', url: Icons.iconUrl('utility', 'filterList') }, label: this.getLabel('Filter'), value: 'filter' }]),
			title: this.accountId ? '&nbsp;' : (this.getLabel(App.isSmallScreen ? 'Photos' : 'Photo_Browser'))
		}));
		await this.search();
	}

	removeFilters() {
		this.filters = [];
	}

	render() {
		this.element.innerHTML = `
			<style>
				.slds-hidden {
					display: none !important;
				}
				#${this.nav.header.element.id} .slds-container--right button.slds-m-around_small {
					margin-top: .4rem
				}
				#${this.nav.header.element.id} button[data-value="back"] {
					display: none;
				}
				.photo-browser-container {
					display: flex;
					height: 100%;
				}
				.photo-browser {
					flex: 1;
					height: 100%;
					padding: 1em;
				}
				.photo-browser-filters {
					flex: none;
				}
				.photo-browser-filters .slds-input[type=text] {
					min-width: 10rem;
				}
				.photo-browser-filters .add-filter {
					margin-left: ${App.isSmallScreen ? '1em' : '-320px'};
					margin-top: ${App.isSmallScreen ? '1em' : '-42px'};
					position: fixed;
				}
				.slds-panel__body {
					display: flex;
					flex-direction: column;
					min-height: 100%;
				}
				.slds-filters {
					flex-grow: 1;
				}
				.toggle-filter-panel {
					flex-shrink: 0;
					margin-bottom: 50px;
					padding: .5rem 1rem;
				}
			</style>
			<div class="message slds-hidden"></div>
			<div class="photo-browser-container">
				<section class="photo-browser"></section>
				<div class="photo-browser-filters slds-panel slds-size_${App.isSmallScreen ? 'full' : 'large'} slds-panel_docked slds-panel_docked-right ${this.filtersOpen ? 'slds-is-open' : ''}" aria-hidden="false">
					<div class="slds-panel__header">
						<h2 class="slds-panel__header-title slds-text-heading_small slds-truncate" title="${this.getLabel('Filter')}">${this.getLabel('Filter')}</h2>
						<button class="slds-hidden slds-button slds-button_icon slds-button_icon-small slds-panel__close" title="${this.getLabel('Close')} ${this.getLabel('Filter')}">
							<svg class="slds-button__icon" aria-hidden="true">
								<use xlink:href="${Icons.iconUrl('utility', 'close')}"></use>
							</svg>
							<span class="slds-assistive-text">${this.getLabel('Close')}</span>
						</button>
					</div>
					<div class="slds-panel__body">
						<div class="slds-filters">
							<ol class="slds-list_vertical slds-list_vertical-space">
								${this.filters.map(filter => `
									<li class="slds-item slds-hint-parent">
										<div class="slds-filters__item slds-grid slds-grid_vertical-align-center">
											<button class="slds-button_reset slds-grow slds-has-blur-focus">
												<span class="slds-assistive-text">${this.getLabel('Edit')} ${this.getLabel('Filter')}:</span>
												<span class="slds-show slds-text-body_small">${filter.label}</span>
												<span class="slds-show">${(filter.value || []).map(value => value.label || value).join(', ')}</span>
											</button>
											<button class="slds-button slds-button_icon slds-button_icon slds-button_icon-small" title="${this.getLabel('Remove')} ${this.getLabel('Filter')} ${filter.label}">
												<svg class="slds-button__icon slds-button__icon_hint" aria-hidden="true">
													<use xlink:href="${Icons.iconUrl('utility', 'close')}"></use>
												</svg>
												<span class="slds-assistive-text">${this.getLabel('Remove')} ${this.getLabel('Filter')} ${filter.label}</span>
											</button>
										</div>
									</li>
								`).join('\n')}
							</ol>
							<div class="slds-filters__footer slds-grid slds-shrink-none">
								<button class="add-filter-button slds-button_reset slds-text-link">${this.getLabel('Add')} ${this.getLabel('Filter')}</button>
								<button class="remove-filters-button slds-button_reset slds-text-link slds-col_bump-left ${(!this.filters || (this.filters.length == 0)) ? 'slds-hidden' : ''}">${this.getLabel('Remove')} ${this.getLabel('All')}</button>
							</div>
							<div class="add-filter"></div>
						</div>
							<button class="toggle-filter-panel slds-button_reset slds-text-link">${this.getLabel('Close')}</button>
						</div>
					</div>
			</div>
		`;
		this.details = null;
		this.imageList = new ImageList({
			element: this.element.querySelector('.photo-browser'),
			handler: (event, detail) => {
				switch(event) {
					case 'chooseImage':
						this.nav.push((this.details = new MediaDetails({
							element: document.createElement('div'),
							record: detail,
							nav: this.nav
						})).element, {
							breadcrumbs: this.nav.header.breadcrumbs.concat([ detail.Title ]),
							onPop: async () => (this.details = null) || await this.search()
						});
						break;
					case 'delete':
					case 'deselectAll':
					case 'removeSelectedImages':
					case 'selectAll':
					case 'selectImage':
						this.updateButtonGroup();
						break;
				}
			},
			groupBy: !this.accountId,
			height: this.accountId ? '32%' : (App.isSmallScreen ? '23%' : '23%'),
			images: this.images,
			noRecordsMessage: !this.searching,
			pageSize: this.accountId ? 9 : (App.isSmallScreen ? 12 : 28),
			width: (App.isSmallScreen || this.accountId) ? '30%' : (this.element.querySelector('.photo-browser-filters.slds-is-open') ? '23%' : '13%')
		});
		this.buttonGroup = new ButtonGroup({
			buttons: [
				{
					disabled: !this.images || (this.images.length === 0),
					label: this.capitalize(this.getLabel('Select')),
					selectable: true,
					value: 'select'
				},
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
				{
					disabled: true,
					label: this.getLabel('Download'),
					value: 'download'
				}
			],
			element: this.nav.header.element.querySelector('.slds-container--right .header-button-group') || (this.nav.header.element.querySelector('.slds-container--right') || document.createElement('div')).appendChild(document.createElement('div')),
			handler: async (event, detail) => {
				switch(event) {
					case 'button':
					case 'menu':
						switch(detail.value) {
							case 'delete':
								await this.imageList.removeSelectedImages();
								break;
							case 'deselectAll':
								this.imageList.deselectAll();
								break;
							case 'download':
								this.download({ popup: App.isiOS ? window.open('', this.getLabel('Download'), '_blank') : undefined });
								break;
							case 'edit':
								break;
							case 'select':
								this.imageList.deselectAll();
								this.allowSelect = this.imageList.allowSelect = detail.selected;
								this.imageList.render();
								break;
							case 'selectAll':
								this.imageList.selectAll();
								break;
						}
						break;
				}
			},
			overflow: !this.accountId
		});
		this.buttonGroup.element.classList.add('header-button-group', 'slds-float--right', 'slds-m-horizontal_small', 'slds-m-vertical_xx-small');
		(this.element.querySelector('.photo-browser') || document.createElement('div')).classList[((this.element.querySelector('.photo-browser-filters') || document.createElement('div')).classList.contains('slds-is-open') && App.isSmallScreen) ? 'add' : 'remove']('slds-hidden');
		this.bindEvents();
		return this.element;
	}

	async search(options) {
		this.searching = true;
		options = Object.assign({ filters: this.filters, types: this.accountId ? ['Account'] : null }, options || {});
		this.images = [];
		this.render();
		this.spinner();
		this.images = await Media.search(options);
		this.searching = false;
		this.render();
	}

	toggleFilters() {
		(this.element.querySelector('.photo-browser') || document.createElement('div')).classList[((this.element.querySelector('.photo-browser-filters') || document.createElement('div')).classList.toggle('slds-is-open') && App.isSmallScreen) ? 'add' : 'remove']('slds-hidden');
		this.imageList.width = App.isSmallScreen ? this.imageList.width : (this.element.querySelector('.photo-browser-filters.slds-is-open') ? '23%' : '13%');
		this.filtersOpen = this.element.querySelector('.photo-browser-filters.slds-is-open');
	}

	updateButtonGroup() {
		if (!this.buttonGroup) {
			return;
		}
		let selectedMessage = this.element.querySelector(".photo-browser .message");
		if (this.selectedImages.length > 0) {
			if (selectedMessage) {
				selectedMessage.innerHTML = `${this.selectedImages.length} ${this.getLabel('Selected').toLowerCase()}`;
			}
		} else {
			if (selectedMessage) {
				selectedMessage.innerHTML = "&nbsp;";
			}
		}
		let select = this.buttonGroup.button('select').selected;
		['delete', 'edit', 'deselectAll', 'download'].forEach(value =>
			this.buttonGroup.disabled(value, !select || (this.imageList.selectedImages.length === 0))
		);
		this.buttonGroup.disabled('selectAll', !select || (this.imageList.selectedImages.length >= Math.min(this.imageList.pageSize, this.imageList.images.length)));
	}
}

export class Signature {
	static async create(options) {
		options = options || {};
		if (!options.canvas) {
			return;
		}
		const handler = event => {
			signature.canvas.style.borderColor = options.required && signature.isEmpty() ? 'red' : 'black';
			if (options.handler) {
				options.handler(event, signature);
			}
		}
		const signature = options.canvas.signature || new SignaturePad(options.canvas, {
			onBegin: () => handler('change'),
			onEnd: () => handler('change')
		});
		signature._clear = signature.clear;
		signature.clear = () => {
			signature._clear();
			handler('clear');
		};
		signature._fromDataURL = signature.fromDataURL;
		signature.fromDataURL = dataUrl => {
			signature._fromDataURL(dataUrl);
			handler('load', dataUrl);
		};
		Signature.resize();
		let dataUrl;
		if (options.signature) {
			signature.image = options.signature.image;
			dataUrl = options.signature.isEmpty ? (!options.signature.isEmpty() && options.signature.toDataURL()) : Media.dataUrl(signature.image);
		} else {
			dataUrl = await Signature.load({ id: options.id, signature });
		}
		if (dataUrl) {
			signature.fromDataURL(dataUrl);
		}
		if (options.readOnly) {
			signature.off();
		} else {
			signature.canvas.style.borderColor = options.required && signature.isEmpty() ? 'red' : 'black';
		}
		return options.canvas.signature = signature;
	}

	static async load(options) {
		options = options || {};
		let signatureImage = await Media.image(options.id);
		(options.signature || {}).image = signatureImage;
		return signatureImage && await Media.dataUrl(await Media.loadContentVersionData(signatureImage));
	}

	static resize() {
		let canvas = document.querySelector('canvas.signature');
		if (!canvas) {
			return;
		}
		let dataUrl = canvas.signature && !canvas.signature.isEmpty() && canvas.signature.toDataURL();
		const ratio =  Math.max(window.devicePixelRatio || 1, 1);
		canvas.width = canvas.offsetWidth * ratio;
		canvas.height = canvas.offsetHeight * ratio;
		canvas.getContext('2d').scale(ratio, ratio);
		if (canvas.signature && dataUrl) {
			canvas.signature.clear();
			canvas.signature.fromDataURL(dataUrl);
		}
	}
}
window.addEventListener('resize', () => {
	clearTimeout(Signature.resizeTimer);
	Signature.resizeTimer = setTimeout(Signature.resize.bind(Signature), 1000);
});

/*! @source https://github.com/eligrey/FileSaver.js/blob/master/dist/FileSaver.min.js */
(function(a,b){if("function"==typeof define&&define.amd)define([],b);else if("undefined"!=typeof exports)b();else{b(),a.FileSaver={exports:{}}.exports}})(window,function(){"use strict";function b(a,b){return"undefined"==typeof b?b={autoBom:!1}:"object"!=typeof b&&(console.warn("Depricated: Expected third argument to be a object"),b={autoBom:!b}),b.autoBom&&/^\s*(?:text\/\S*|application\/xml|\S*\/\S*\+xml)\s*;.*charset\s*=\s*utf-8/i.test(a.type)?new Blob(["\uFEFF",a],{type:a.type}):a}function c(b,c,d){var e=new XMLHttpRequest;e.open("GET",b),e.responseType="blob",e.onload=function(){a(e.response,c,d)},e.onerror=function(){console.error("could not download file")},e.send()}function d(a){var b=new XMLHttpRequest;return b.open("HEAD",a,!1),b.send(),200<=b.status&&299>=b.status}function e(a){try{a.dispatchEvent(new MouseEvent("click"))}catch(c){var b=document.createEvent("MouseEvents");b.initMouseEvent("click",!0,!0,window,0,0,0,80,20,!1,!1,!1,!1,0,null),a.dispatchEvent(b)}}var f="object"==typeof window&&window.window===window?window:"object"==typeof self&&self.self===self?self:"object"==typeof global&&global.global===global?global:void 0,a=f.saveAs||("object"!=typeof window||window!==f?function(){}:"download"in HTMLAnchorElement.prototype?function(b,g,h){var i=f.URL||f.webkitURL,j=document.createElement("a");g=g||b.name||"download",j.download=g,j.rel="noopener","string"==typeof b?(j.href=b,j.origin===location.origin?e(j):d(j.href)?c(b,g,h):e(j,j.target="_blank")):(j.href=i.createObjectURL(b),setTimeout(function(){i.revokeObjectURL(j.href)},4E4),setTimeout(function(){e(j)},0))}:"msSaveOrOpenBlob"in navigator?function(f,g,h){if(g=g||f.name||"download","string"!=typeof f)navigator.msSaveOrOpenBlob(b(f,h),g);else if(d(f))c(f,g,h);else{var i=document.createElement("a");i.href=f,i.target="_blank",setTimeout(function(){e(i)})}}:function(a,b,d,e){if(e=e||open("","_blank"),e&&(e.document.title=e.document.body.innerText="downloading..."),"string"==typeof a)return c(a,b,d);var g="application/octet-stream"===a.type,h=/constructor/i.test(f.HTMLElement)||f.safari,i=/CriOS\/[\d]+/.test(navigator.userAgent);if((i||g&&h)&&"object"==typeof FileReader){var j=new FileReader;j.onloadend=function(){var a=j.result;a=i?a:a.replace(/^data:[^;]*;/,"data:attachment/file;"),e?e.location.href=a:location=a,e=null},j.readAsDataURL(a)}else{var k=f.URL||f.webkitURL,l=k.createObjectURL(a);e?e.location=l:location.href=l,e=null,setTimeout(function(){k.revokeObjectURL(l)},4E4)}});f.saveAs=a.saveAs=a,"undefined"!=typeof module&&(module.exports=a)});

// JSZip - A Javascript class for generating and reading zip files <http://stuartk.com/jszip> (c) 2009-2014 Stuart Knightley <stuart [at] stuartk.com> Dual licenced under the MIT license or GPLv3. See https://raw.github.com/Stuk/jszip/master/LICENSE.markdown. JSZip uses the library pako released under the MIT license : https://github.com/nodeca/pako/blob/master/LICENSE
!function(a){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=a();else if("function"==typeof define&&define.amd)define([],a);else{var b;b="undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof self?self:this,b.JSZip=a()}}(function(){var a;return function b(a,c,d){function e(g,h){if(!c[g]){if(!a[g]){var i="function"==typeof require&&require;if(!h&&i)return i(g,!0);if(f)return f(g,!0);var j=new Error("Cannot find module '"+g+"'");throw j.code="MODULE_NOT_FOUND",j}var k=c[g]={exports:{}};a[g][0].call(k.exports,function(b){var c=a[g][1][b];return e(c?c:b)},k,k.exports,b,a,c,d)}return c[g].exports}for(var f="function"==typeof require&&require,g=0;g<d.length;g++)e(d[g]);return e}({1:[function(a,b,c){"use strict";var d=a("./utils"),e=a("./support"),f="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";c.encode=function(a){for(var b,c,e,g,h,i,j,k=[],l=0,m=a.length,n=m,o="string"!==d.getTypeOf(a);l<a.length;)n=m-l,o?(b=a[l++],c=m>l?a[l++]:0,e=m>l?a[l++]:0):(b=a.charCodeAt(l++),c=m>l?a.charCodeAt(l++):0,e=m>l?a.charCodeAt(l++):0),g=b>>2,h=(3&b)<<4|c>>4,i=n>1?(15&c)<<2|e>>6:64,j=n>2?63&e:64,k.push(f.charAt(g)+f.charAt(h)+f.charAt(i)+f.charAt(j));return k.join("")},c.decode=function(a){var b,c,d,g,h,i,j,k=0,l=0;a=a.replace(/[^A-Za-z0-9\+\/\=]/g,"");var m=3*a.length/4;a.charAt(a.length-1)===f.charAt(64)&&m--,a.charAt(a.length-2)===f.charAt(64)&&m--;var n;for(n=e.uint8array?new Uint8Array(m):new Array(m);k<a.length;)g=f.indexOf(a.charAt(k++)),h=f.indexOf(a.charAt(k++)),i=f.indexOf(a.charAt(k++)),j=f.indexOf(a.charAt(k++)),b=g<<2|h>>4,c=(15&h)<<4|i>>2,d=(3&i)<<6|j,n[l++]=b,64!==i&&(n[l++]=c),64!==j&&(n[l++]=d);return n}},{"./support":27,"./utils":29}],2:[function(a,b,c){"use strict";function d(a,b,c,d,e){this.compressedSize=a,this.uncompressedSize=b,this.crc32=c,this.compression=d,this.compressedContent=e}var e=a("./external"),f=a("./stream/DataWorker"),g=a("./stream/DataLengthProbe"),h=a("./stream/Crc32Probe"),g=a("./stream/DataLengthProbe");d.prototype={getContentWorker:function(){var a=new f(e.Promise.resolve(this.compressedContent)).pipe(this.compression.uncompressWorker()).pipe(new g("data_length")),b=this;return a.on("end",function(){if(this.streamInfo.data_length!==b.uncompressedSize)throw new Error("Bug : uncompressed data size mismatch")}),a},getCompressedWorker:function(){return new f(e.Promise.resolve(this.compressedContent)).withStreamInfo("compressedSize",this.compressedSize).withStreamInfo("uncompressedSize",this.uncompressedSize).withStreamInfo("crc32",this.crc32).withStreamInfo("compression",this.compression)}},d.createWorkerFrom=function(a,b,c){return a.pipe(new h).pipe(new g("uncompressedSize")).pipe(b.compressWorker(c)).pipe(new g("compressedSize")).withStreamInfo("compression",b)},b.exports=d},{"./external":6,"./stream/Crc32Probe":22,"./stream/DataLengthProbe":23,"./stream/DataWorker":24}],3:[function(a,b,c){"use strict";var d=a("./stream/GenericWorker");c.STORE={magic:"\x00\x00",compressWorker:function(a){return new d("STORE compression")},uncompressWorker:function(){return new d("STORE decompression")}},c.DEFLATE=a("./flate")},{"./flate":7,"./stream/GenericWorker":25}],4:[function(a,b,c){"use strict";function d(){for(var a,b=[],c=0;256>c;c++){a=c;for(var d=0;8>d;d++)a=1&a?3988292384^a>>>1:a>>>1;b[c]=a}return b}function e(a,b,c,d){var e=h,f=d+c;a=-1^a;for(var g=d;f>g;g++)a=a>>>8^e[255&(a^b[g])];return-1^a}function f(a,b,c,d){var e=h,f=d+c;a=-1^a;for(var g=d;f>g;g++)a=a>>>8^e[255&(a^b.charCodeAt(g))];return-1^a}var g=a("./utils"),h=d();b.exports=function(a,b){if("undefined"==typeof a||!a.length)return 0;var c="string"!==g.getTypeOf(a);return c?e(0|b,a,a.length,0):f(0|b,a,a.length,0)}},{"./utils":29}],5:[function(a,b,c){"use strict";c.base64=!1,c.binary=!1,c.dir=!1,c.createFolders=!0,c.date=null,c.compression=null,c.compressionOptions=null,c.comment=null,c.unixPermissions=null,c.dosPermissions=null},{}],6:[function(a,b,c){"use strict";var d=a("es6-promise").Promise;b.exports={Promise:d}},{"es6-promise":37}],7:[function(a,b,c){"use strict";function d(a,b){h.call(this,"FlateWorker/"+a),this._pako=new f[a]({raw:!0,level:b.level||-1}),this.meta={};var c=this;this._pako.onData=function(a){c.push({data:a,meta:c.meta})}}var e="undefined"!=typeof Uint8Array&&"undefined"!=typeof Uint16Array&&"undefined"!=typeof Uint32Array,f=a("pako"),g=a("./utils"),h=a("./stream/GenericWorker"),i=e?"uint8array":"array";c.magic="\b\x00",g.inherits(d,h),d.prototype.processChunk=function(a){this.meta=a.meta,this._pako.push(g.transformTo(i,a.data),!1)},d.prototype.flush=function(){h.prototype.flush.call(this),this._pako.push([],!0)},d.prototype.cleanUp=function(){h.prototype.cleanUp.call(this),this._pako=null},c.compressWorker=function(a){return new d("Deflate",a)},c.uncompressWorker=function(){return new d("Inflate",{})}},{"./stream/GenericWorker":25,"./utils":29,pako:38}],8:[function(a,b,c){"use strict";function d(a,b,c,d){f.call(this,"ZipFileWorker"),this.bytesWritten=0,this.zipComment=b,this.zipPlatform=c,this.encodeFileName=d,this.streamFiles=a,this.accumulate=!1,this.contentBuffer=[],this.dirRecords=[],this.currentSourceOffset=0,this.entriesCount=0,this.currentFile=null,this._sources=[]}var e=a("../utils"),f=a("../stream/GenericWorker"),g=a("../utf8"),h=a("../crc32"),i=a("../signature"),j=function(a,b){var c,d="";for(c=0;b>c;c++)d+=String.fromCharCode(255&a),a>>>=8;return d},k=function(a,b){var c=a;return a||(c=b?16893:33204),(65535&c)<<16},l=function(a,b){return 63&(a||0)},m=function(a,b,c,d,f,m){var n,o,p=a.file,q=a.compression,r=m!==g.utf8encode,s=e.transformTo("string",m(p.name)),t=e.transformTo("string",g.utf8encode(p.name)),u=p.comment,v=e.transformTo("string",m(u)),w=e.transformTo("string",g.utf8encode(u)),x=t.length!==p.name.length,y=w.length!==u.length,z="",A="",B="",C=p.dir,D=p.date,E={crc32:0,compressedSize:0,uncompressedSize:0};b&&!c||(E.crc32=a.crc32,E.compressedSize=a.compressedSize,E.uncompressedSize=a.uncompressedSize);var F=0;b&&(F|=8),r||!x&&!y||(F|=2048);var G=0,H=0;C&&(G|=16),"UNIX"===f?(H=798,G|=k(p.unixPermissions,C)):(H=20,G|=l(p.dosPermissions,C)),n=D.getUTCHours(),n<<=6,n|=D.getUTCMinutes(),n<<=5,n|=D.getUTCSeconds()/2,o=D.getUTCFullYear()-1980,o<<=4,o|=D.getUTCMonth()+1,o<<=5,o|=D.getUTCDate(),x&&(A=j(1,1)+j(h(s),4)+t,z+="up"+j(A.length,2)+A),y&&(B=j(1,1)+j(h(v),4)+w,z+="uc"+j(B.length,2)+B);var I="";I+="\n\x00",I+=j(F,2),I+=q.magic,I+=j(n,2),I+=j(o,2),I+=j(E.crc32,4),I+=j(E.compressedSize,4),I+=j(E.uncompressedSize,4),I+=j(s.length,2),I+=j(z.length,2);var J=i.LOCAL_FILE_HEADER+I+s+z,K=i.CENTRAL_FILE_HEADER+j(H,2)+I+j(v.length,2)+"\x00\x00\x00\x00"+j(G,4)+j(d,4)+s+z+v;return{fileRecord:J,dirRecord:K}},n=function(a,b,c,d,f){var g="",h=e.transformTo("string",f(d));return g=i.CENTRAL_DIRECTORY_END+"\x00\x00\x00\x00"+j(a,2)+j(a,2)+j(b,4)+j(c,4)+j(h.length,2)+h},o=function(a){var b="";return b=i.DATA_DESCRIPTOR+j(a.crc32,4)+j(a.compressedSize,4)+j(a.uncompressedSize,4)};e.inherits(d,f),d.prototype.push=function(a){var b=a.meta.percent||0,c=this.entriesCount,d=this._sources.length;this.accumulate?this.contentBuffer.push(a):(this.bytesWritten+=a.data.length,f.prototype.push.call(this,{data:a.data,meta:{currentFile:this.currentFile,percent:c?(b+100*(c-d-1))/c:100}}))},d.prototype.openedSource=function(a){if(this.currentSourceOffset=this.bytesWritten,this.currentFile=a.file.name,this.streamFiles&&!a.file.dir){var b=m(a,this.streamFiles,!1,this.currentSourceOffset,this.zipPlatform,this.encodeFileName);this.push({data:b.fileRecord,meta:{percent:0}})}else this.accumulate=!0},d.prototype.closedSource=function(a){this.accumulate=!1;var b=m(a,this.streamFiles,!0,this.currentSourceOffset,this.zipPlatform,this.encodeFileName);if(this.dirRecords.push(b.dirRecord),this.streamFiles&&!a.file.dir)this.push({data:o(a),meta:{percent:100}});else for(this.push({data:b.fileRecord,meta:{percent:0}});this.contentBuffer.length;)this.push(this.contentBuffer.shift());this.currentFile=null},d.prototype.flush=function(){for(var a=this.bytesWritten,b=0;b<this.dirRecords.length;b++)this.push({data:this.dirRecords[b],meta:{percent:100}});var c=this.bytesWritten-a,d=n(this.dirRecords.length,c,a,this.zipComment,this.encodeFileName);this.push({data:d,meta:{percent:100}})},d.prototype.prepareNextSource=function(){this.previous=this._sources.shift(),this.openedSource(this.previous.streamInfo),this.isPaused?this.previous.pause():this.previous.resume()},d.prototype.registerPrevious=function(a){this._sources.push(a);var b=this;return a.on("data",function(a){b.processChunk(a)}),a.on("end",function(){b.closedSource(b.previous.streamInfo),b._sources.length?b.prepareNextSource():b.end()}),a.on("error",function(a){b.error(a)}),this},d.prototype.resume=function(){return f.prototype.resume.call(this)?!this.previous&&this._sources.length?(this.prepareNextSource(),!0):this.previous||this._sources.length||this.generatedError?void 0:(this.end(),!0):!1},d.prototype.error=function(a){var b=this._sources;if(!f.prototype.error.call(this,a))return!1;for(var c=0;c<b.length;c++)try{b[c].error(a)}catch(a){}return!0},d.prototype.lock=function(){f.prototype.lock.call(this);for(var a=this._sources,b=0;b<a.length;b++)a[b].lock()},b.exports=d},{"../crc32":4,"../signature":20,"../stream/GenericWorker":25,"../utf8":28,"../utils":29}],9:[function(a,b,c){"use strict";var d=a("../compressions"),e=a("./ZipFileWorker"),f=function(a,b){var c=a||b,e=d[c];if(!e)throw new Error(c+" is not a valid compression method !");return e};c.generateWorker=function(a,b,c){var d=new e(b.streamFiles,c,b.platform,b.encodeFileName),g=0;try{a.forEach(function(a,c){g++;var e=f(c.options.compression,b.compression),h=c.options.compressionOptions||b.compressionOptions||{},i=c.dir,j=c.date;c._compressWorker(e,h).withStreamInfo("file",{name:a,dir:i,date:j,comment:c.comment||"",unixPermissions:c.unixPermissions,dosPermissions:c.dosPermissions}).pipe(d)}),d.entriesCount=g}catch(h){d.error(h)}return d}},{"../compressions":3,"./ZipFileWorker":8}],10:[function(a,b,c){"use strict";function d(){if(!(this instanceof d))return new d;if(arguments.length)throw new Error("The constructor with parameters has been removed in JSZip 3.0, please check the upgrade guide.");this.files={},this.comment=null,this.root="",this.clone=function(){var a=new d;for(var b in this)"function"!=typeof this[b]&&(a[b]=this[b]);return a}}d.prototype=a("./object"),d.prototype.loadAsync=a("./load"),d.support=a("./support"),d.defaults=a("./defaults"),d.loadAsync=function(a,b){return(new d).loadAsync(a,b)},d.external=a("./external"),b.exports=d},{"./defaults":5,"./external":6,"./load":11,"./object":13,"./support":27}],11:[function(a,b,c){"use strict";function d(a){return new f.Promise(function(b,c){var d=a.decompressed.getContentWorker().pipe(new i);d.on("error",function(a){c(a)}).on("end",function(){d.streamInfo.crc32!==a.decompressed.crc32?c(new Error("Corrupted zip : CRC32 mismatch")):b()}).resume()})}var e=a("./utils"),f=a("./external"),g=a("./utf8"),e=a("./utils"),h=a("./zipEntries"),i=a("./stream/Crc32Probe"),j=a("./nodejsUtils");b.exports=function(a,b){var c=this;return b=e.extend(b||{},{base64:!1,checkCRC32:!1,optimizedBinaryString:!1,createFolders:!1,decodeFileName:g.utf8decode}),j.isNode&&j.isStream(a)?f.Promise.reject(new Error("JSZip can't accept a stream when loading a zip file.")):e.prepareContent("the loaded zip file",a,!0,b.optimizedBinaryString,b.base64).then(function(a){var c=new h(b);return c.load(a),c}).then(function(a){var c=[f.Promise.resolve(a)],e=a.files;if(b.checkCRC32)for(var g=0;g<e.length;g++)c.push(d(e[g]));return f.Promise.all(c)}).then(function(a){for(var d=a.shift(),e=d.files,f=0;f<e.length;f++){var g=e[f];c.file(g.fileNameStr,g.decompressed,{binary:!0,optimizedBinaryString:!0,date:g.date,dir:g.dir,comment:g.fileCommentStr.length?g.fileCommentStr:null,unixPermissions:g.unixPermissions,dosPermissions:g.dosPermissions,createFolders:b.createFolders})}return d.zipComment.length&&(c.comment=d.zipComment),c})}},{"./external":6,"./nodejsUtils":12,"./stream/Crc32Probe":22,"./utf8":28,"./utils":29,"./zipEntries":30}],12:[function(a,b,c){(function(a){"use strict";b.exports={isNode:"undefined"!=typeof a,newBuffer:function(b,c){return new a(b,c)},isBuffer:function(b){return a.isBuffer(b)},isStream:function(a){return a&&"function"==typeof a.on&&"function"==typeof a.pause&&"function"==typeof a.resume}}}).call(this,"undefined"!=typeof Buffer?Buffer:void 0)},{}],13:[function(a,b,c){"use strict";function d(a){return"[object RegExp]"===Object.prototype.toString.call(a)}var e=a("./utf8"),f=a("./utils"),g=a("./stream/GenericWorker"),h=a("./stream/StreamHelper"),i=a("./defaults"),j=a("./compressedObject"),k=a("./zipObject"),l=a("./generate"),m=a("./nodejsUtils"),n=a("./nodejs/NodejsStreamInputAdapter"),o=function(a,b,c){var d,e=f.getTypeOf(b);c=f.extend(c||{},i),c.date=c.date||new Date,null!==c.compression&&(c.compression=c.compression.toUpperCase()),"string"==typeof c.unixPermissions&&(c.unixPermissions=parseInt(c.unixPermissions,8)),c.unixPermissions&&16384&c.unixPermissions&&(c.dir=!0),c.dosPermissions&&16&c.dosPermissions&&(c.dir=!0),c.dir&&(a=q(a)),c.createFolders&&(d=p(a))&&r.call(this,d,!0);var h="string"===e&&c.binary===!1&&c.base64===!1;c.binary=!h;var l=b instanceof j&&0===b.uncompressedSize;(l||c.dir||!b||0===b.length)&&(c.base64=!1,c.binary=!0,b="",c.compression="STORE",e="string");var o=null;o=b instanceof j||b instanceof g?b:m.isNode&&m.isStream(b)?new n(a,b):f.prepareContent(a,b,c.binary,c.optimizedBinaryString,c.base64);var s=new k(a,o,c);this.files[a]=s},p=function(a){"/"===a.slice(-1)&&(a=a.substring(0,a.length-1));var b=a.lastIndexOf("/");return b>0?a.substring(0,b):""},q=function(a){return"/"!==a.slice(-1)&&(a+="/"),a},r=function(a,b){return b="undefined"!=typeof b?b:i.createFolders,a=q(a),this.files[a]||o.call(this,a,null,{dir:!0,createFolders:b}),this.files[a]},s={load:function(){throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.")},forEach:function(a){var b,c,d;for(b in this.files)this.files.hasOwnProperty(b)&&(d=this.files[b],c=b.slice(this.root.length,b.length),c&&b.slice(0,this.root.length)===this.root&&a(c,d))},filter:function(a){var b=[];return this.forEach(function(c,d){a(c,d)&&b.push(d)}),b},file:function(a,b,c){if(1===arguments.length){if(d(a)){var e=a;return this.filter(function(a,b){return!b.dir&&e.test(a)})}var f=this.files[this.root+a];return f&&!f.dir?f:null}return a=this.root+a,o.call(this,a,b,c),this},folder:function(a){if(!a)return this;if(d(a))return this.filter(function(b,c){return c.dir&&a.test(b)});var b=this.root+a,c=r.call(this,b),e=this.clone();return e.root=c.name,e},remove:function(a){a=this.root+a;var b=this.files[a];if(b||("/"!==a.slice(-1)&&(a+="/"),b=this.files[a]),b&&!b.dir)delete this.files[a];else for(var c=this.filter(function(b,c){return c.name.slice(0,a.length)===a}),d=0;d<c.length;d++)delete this.files[c[d].name];return this},generate:function(a){throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.")},generateInternalStream:function(a){var b,c={};try{if(c=f.extend(a||{},{streamFiles:!1,compression:"STORE",compressionOptions:null,type:"",platform:"DOS",comment:null,mimeType:"application/zip",encodeFileName:e.utf8encode}),c.type=c.type.toLowerCase(),c.compression=c.compression.toUpperCase(),"binarystring"===c.type&&(c.type="string"),!c.type)throw new Error("No output type specified.");f.checkSupport(c.type),"darwin"!==a.platform&&"freebsd"!==a.platform&&"linux"!==a.platform&&"sunos"!==a.platform||(a.platform="UNIX"),"win32"===a.platform&&(a.platform="DOS");var d=c.comment||this.comment||"";b=l.generateWorker(this,c,d)}catch(i){b=new g("error"),b.error(i)}return new h(b,c.type||"string",c.mimeType)},generateAsync:function(a,b){return this.generateInternalStream(a).accumulate(b)},generateNodeStream:function(a,b){return a=a||{},a.type||(a.type="nodebuffer"),this.generateInternalStream(a).toNodejsStream(b)}};b.exports=s},{"./compressedObject":2,"./defaults":5,"./generate":9,"./nodejs/NodejsStreamInputAdapter":35,"./nodejsUtils":12,"./stream/GenericWorker":25,"./stream/StreamHelper":26,"./utf8":28,"./utils":29,"./zipObject":32}],14:[function(a,b,c){"use strict";function d(a){e.call(this,a);for(var b=0;b<this.data.length;b++)a[b]=255&a[b]}var e=a("./DataReader"),f=a("../utils");f.inherits(d,e),d.prototype.byteAt=function(a){return this.data[this.zero+a]},d.prototype.lastIndexOfSignature=function(a){for(var b=a.charCodeAt(0),c=a.charCodeAt(1),d=a.charCodeAt(2),e=a.charCodeAt(3),f=this.length-4;f>=0;--f)if(this.data[f]===b&&this.data[f+1]===c&&this.data[f+2]===d&&this.data[f+3]===e)return f-this.zero;return-1},d.prototype.readAndCheckSignature=function(a){var b=a.charCodeAt(0),c=a.charCodeAt(1),d=a.charCodeAt(2),e=a.charCodeAt(3),f=this.readData(4);return b===f[0]&&c===f[1]&&d===f[2]&&e===f[3]},d.prototype.readData=function(a){if(this.checkOffset(a),0===a)return[];var b=this.data.slice(this.zero+this.index,this.zero+this.index+a);return this.index+=a,b},b.exports=d},{"../utils":29,"./DataReader":15}],15:[function(a,b,c){"use strict";function d(a){this.data=a,this.length=a.length,this.index=0,this.zero=0}var e=a("../utils");d.prototype={checkOffset:function(a){this.checkIndex(this.index+a)},checkIndex:function(a){if(this.length<this.zero+a||0>a)throw new Error("End of data reached (data length = "+this.length+", asked index = "+a+"). Corrupted zip ?")},setIndex:function(a){this.checkIndex(a),this.index=a},skip:function(a){this.setIndex(this.index+a)},byteAt:function(a){},readInt:function(a){var b,c=0;for(this.checkOffset(a),b=this.index+a-1;b>=this.index;b--)c=(c<<8)+this.byteAt(b);return this.index+=a,c},readString:function(a){return e.transformTo("string",this.readData(a))},readData:function(a){},lastIndexOfSignature:function(a){},readAndCheckSignature:function(a){},readDate:function(){var a=this.readInt(4);return new Date(Date.UTC((a>>25&127)+1980,(a>>21&15)-1,a>>16&31,a>>11&31,a>>5&63,(31&a)<<1))}},b.exports=d},{"../utils":29}],16:[function(a,b,c){"use strict";function d(a){e.call(this,a)}var e=a("./Uint8ArrayReader"),f=a("../utils");f.inherits(d,e),d.prototype.readData=function(a){this.checkOffset(a);var b=this.data.slice(this.zero+this.index,this.zero+this.index+a);return this.index+=a,b},b.exports=d},{"../utils":29,"./Uint8ArrayReader":18}],17:[function(a,b,c){"use strict";function d(a){e.call(this,a)}var e=a("./DataReader"),f=a("../utils");f.inherits(d,e),d.prototype.byteAt=function(a){return this.data.charCodeAt(this.zero+a)},d.prototype.lastIndexOfSignature=function(a){return this.data.lastIndexOf(a)-this.zero},d.prototype.readAndCheckSignature=function(a){var b=this.readData(4);return a===b},d.prototype.readData=function(a){this.checkOffset(a);var b=this.data.slice(this.zero+this.index,this.zero+this.index+a);return this.index+=a,b},b.exports=d},{"../utils":29,"./DataReader":15}],18:[function(a,b,c){"use strict";function d(a){e.call(this,a)}var e=a("./ArrayReader"),f=a("../utils");f.inherits(d,e),d.prototype.readData=function(a){if(this.checkOffset(a),0===a)return new Uint8Array(0);var b=this.data.subarray(this.zero+this.index,this.zero+this.index+a);return this.index+=a,b},b.exports=d},{"../utils":29,"./ArrayReader":14}],19:[function(a,b,c){"use strict";var d=a("../utils"),e=a("../support"),f=a("./ArrayReader"),g=a("./StringReader"),h=a("./NodeBufferReader"),i=a("./Uint8ArrayReader");b.exports=function(a){var b=d.getTypeOf(a);return d.checkSupport(b),"string"!==b||e.uint8array?"nodebuffer"===b?new h(a):e.uint8array?new i(d.transformTo("uint8array",a)):new f(d.transformTo("array",a)):new g(a)}},{"../support":27,"../utils":29,"./ArrayReader":14,"./NodeBufferReader":16,"./StringReader":17,"./Uint8ArrayReader":18}],20:[function(a,b,c){"use strict";c.LOCAL_FILE_HEADER="PK",c.CENTRAL_FILE_HEADER="PK",c.CENTRAL_DIRECTORY_END="PK",c.ZIP64_CENTRAL_DIRECTORY_LOCATOR="PK",c.ZIP64_CENTRAL_DIRECTORY_END="PK",c.DATA_DESCRIPTOR="PK\b"},{}],21:[function(a,b,c){"use strict";function d(a){e.call(this,"ConvertWorker to "+a),this.destType=a}var e=a("./GenericWorker"),f=a("../utils");f.inherits(d,e),d.prototype.processChunk=function(a){this.push({data:f.transformTo(this.destType,a.data),meta:a.meta})},b.exports=d},{"../utils":29,"./GenericWorker":25}],22:[function(a,b,c){"use strict";function d(){e.call(this,"Crc32Probe")}var e=a("./GenericWorker"),f=a("../crc32"),g=a("../utils");g.inherits(d,e),d.prototype.processChunk=function(a){this.streamInfo.crc32=f(a.data,this.streamInfo.crc32||0),this.push(a)},b.exports=d},{"../crc32":4,"../utils":29,"./GenericWorker":25}],23:[function(a,b,c){"use strict";function d(a){f.call(this,"DataLengthProbe for "+a),this.propName=a,this.withStreamInfo(a,0)}var e=a("../utils"),f=a("./GenericWorker");e.inherits(d,f),d.prototype.processChunk=function(a){if(a){var b=this.streamInfo[this.propName]||0;this.streamInfo[this.propName]=b+a.data.length}f.prototype.processChunk.call(this,a)},b.exports=d},{"../utils":29,"./GenericWorker":25}],24:[function(a,b,c){"use strict";function d(a){f.call(this,"DataWorker");var b=this;this.dataIsReady=!1,this.index=0,this.max=0,this.data=null,this.type="",this._tickScheduled=!1,a.then(function(a){b.dataIsReady=!0,b.data=a,b.max=a&&a.length||0,b.type=e.getTypeOf(a),b.isPaused||b._tickAndRepeat()},function(a){b.error(a)})}var e=a("../utils"),f=a("./GenericWorker"),g=16384;e.inherits(d,f),d.prototype.cleanUp=function(){f.prototype.cleanUp.call(this),this.data=null},d.prototype.resume=function(){return f.prototype.resume.call(this)?(!this._tickScheduled&&this.dataIsReady&&(this._tickScheduled=!0,e.delay(this._tickAndRepeat,[],this)),!0):!1},d.prototype._tickAndRepeat=function(){this._tickScheduled=!1,this.isPaused||this.isFinished||(this._tick(),this.isFinished||(e.delay(this._tickAndRepeat,[],this),this._tickScheduled=!0))},d.prototype._tick=function(){if(this.isPaused||this.isFinished)return!1;var a=g,b=null,c=Math.min(this.max,this.index+a);if(this.index>=this.max)return this.end();switch(this.type){case"string":b=this.data.substring(this.index,c);break;case"uint8array":b=this.data.subarray(this.index,c);break;case"array":case"nodebuffer":b=this.data.slice(this.index,c)}return this.index=c,this.push({data:b,meta:{percent:this.max?this.index/this.max*100:0}})},b.exports=d},{"../utils":29,"./GenericWorker":25}],25:[function(a,b,c){"use strict";function d(a){this.name=a||"default",this.streamInfo={},this.generatedError=null,this.extraStreamInfo={},this.isPaused=!0,this.isFinished=!1,this.isLocked=!1,this._listeners={data:[],end:[],error:[]},this.previous=null}d.prototype={push:function(a){this.emit("data",a)},end:function(){if(this.isFinished)return!1;this.flush();try{this.emit("end"),this.cleanUp(),this.isFinished=!0}catch(a){this.emit("error",a)}return!0},error:function(a){return this.isFinished?!1:(this.isPaused?this.generatedError=a:(this.isFinished=!0,this.emit("error",a),this.previous&&this.previous.error(a),this.cleanUp()),!0)},on:function(a,b){return this._listeners[a].push(b),this},cleanUp:function(){this.streamInfo=this.generatedError=this.extraStreamInfo=null,this._listeners=[]},emit:function(a,b){if(this._listeners[a])for(var c=0;c<this._listeners[a].length;c++)this._listeners[a][c].call(this,b)},pipe:function(a){return a.registerPrevious(this)},registerPrevious:function(a){if(this.isLocked)throw new Error("The stream '"+this+"' has already been used.");this.streamInfo=a.streamInfo,this.mergeStreamInfo(),this.previous=a;var b=this;return a.on("data",function(a){b.processChunk(a)}),a.on("end",function(){b.end()}),a.on("error",function(a){b.error(a)}),this},pause:function(){return this.isPaused||this.isFinished?!1:(this.isPaused=!0,this.previous&&this.previous.pause(),!0)},resume:function(){if(!this.isPaused||this.isFinished)return!1;this.isPaused=!1;var a=!1;return this.generatedError&&(this.error(this.generatedError),a=!0),this.previous&&this.previous.resume(),!a},flush:function(){},processChunk:function(a){this.push(a)},withStreamInfo:function(a,b){return this.extraStreamInfo[a]=b,this.mergeStreamInfo(),this},mergeStreamInfo:function(){for(var a in this.extraStreamInfo)this.extraStreamInfo.hasOwnProperty(a)&&(this.streamInfo[a]=this.extraStreamInfo[a])},lock:function(){if(this.isLocked)throw new Error("The stream '"+this+"' has already been used.");this.isLocked=!0,this.previous&&this.previous.lock()},toString:function(){var a="Worker "+this.name;return this.previous?this.previous+" -> "+a:a}},b.exports=d},{}],26:[function(a,b,c){(function(c){"use strict";function d(a,b,c){switch(a){case"blob":return h.newBlob(h.transformTo("arraybuffer",b),c);case"base64":return k.encode(b);default:return h.transformTo(a,b)}}function e(a,b){var d,e=0,f=null,g=0;for(d=0;d<b.length;d++)g+=b[d].length;switch(a){case"string":return b.join("");case"array":return Array.prototype.concat.apply([],b);case"uint8array":for(f=new Uint8Array(g),d=0;d<b.length;d++)f.set(b[d],e),e+=b[d].length;return f;case"nodebuffer":return c.concat(b);default:throw new Error("concat : unsupported type '"+a+"'")}}function f(a,b){return new m.Promise(function(c,f){var g=[],h=a._internalType,i=a._outputType,j=a._mimeType;a.on("data",function(a,c){g.push(a),b&&b(c)}).on("error",function(a){g=[],f(a)}).on("end",function(){try{var a=d(i,e(h,g),j);c(a)}catch(b){f(b)}g=[]}).resume()})}function g(a,b,c){var d=b;switch(b){case"blob":case"arraybuffer":d="uint8array";break;case"base64":d="string"}try{this._internalType=d,this._outputType=b,this._mimeType=c,h.checkSupport(d),this._worker=a.pipe(new i(d)),a.lock()}catch(e){this._worker=new j("error"),this._worker.error(e)}}var h=a("../utils"),i=a("./ConvertWorker"),j=a("./GenericWorker"),k=a("../base64"),l=a("../nodejs/NodejsStreamOutputAdapter"),m=a("../external");g.prototype={accumulate:function(a){return f(this,a)},on:function(a,b){var c=this;return"data"===a?this._worker.on(a,function(a){b.call(c,a.data,a.meta)}):this._worker.on(a,function(){h.delay(b,arguments,c)}),this},resume:function(){return h.delay(this._worker.resume,[],this._worker),this},pause:function(){return this._worker.pause(),this},toNodejsStream:function(a){if(h.checkSupport("nodestream"),"nodebuffer"!==this._outputType)throw new Error(this._outputType+" is not supported by this method");return new l(this,{objectMode:"nodebuffer"!==this._outputType},a)}},b.exports=g}).call(this,"undefined"!=typeof Buffer?Buffer:void 0)},{"../base64":1,"../external":6,"../nodejs/NodejsStreamOutputAdapter":35,"../utils":29,"./ConvertWorker":21,"./GenericWorker":25}],27:[function(a,b,c){(function(b){"use strict";if(c.base64=!0,c.array=!0,c.string=!0,c.arraybuffer="undefined"!=typeof ArrayBuffer&&"undefined"!=typeof Uint8Array,c.nodebuffer="undefined"!=typeof b,c.uint8array="undefined"!=typeof Uint8Array,"undefined"==typeof ArrayBuffer)c.blob=!1;else{var d=new ArrayBuffer(0);try{c.blob=0===new Blob([d],{type:"application/zip"}).size}catch(e){try{var f=window.BlobBuilder||window.WebKitBlobBuilder||window.MozBlobBuilder||window.MSBlobBuilder,g=new f;g.append(d),c.blob=0===g.getBlob("application/zip").size}catch(e){c.blob=!1}}}c.nodestream=!!a("./nodejs/NodejsStreamOutputAdapter").prototype}).call(this,"undefined"!=typeof Buffer?Buffer:void 0)},{"./nodejs/NodejsStreamOutputAdapter":35}],28:[function(a,b,c){"use strict";function d(){i.call(this,"utf-8 decode"),this.leftOver=null}function e(){i.call(this,"utf-8 encode")}for(var f=a("./utils"),g=a("./support"),h=a("./nodejsUtils"),i=a("./stream/GenericWorker"),j=new Array(256),k=0;256>k;k++)j[k]=k>=252?6:k>=248?5:k>=240?4:k>=224?3:k>=192?2:1;j[254]=j[254]=1;var l=function(a){var b,c,d,e,f,h=a.length,i=0;for(e=0;h>e;e++)c=a.charCodeAt(e),55296===(64512&c)&&h>e+1&&(d=a.charCodeAt(e+1),56320===(64512&d)&&(c=65536+(c-55296<<10)+(d-56320),e++)),i+=128>c?1:2048>c?2:65536>c?3:4;for(b=g.uint8array?new Uint8Array(i):new Array(i),f=0,e=0;i>f;e++)c=a.charCodeAt(e),55296===(64512&c)&&h>e+1&&(d=a.charCodeAt(e+1),56320===(64512&d)&&(c=65536+(c-55296<<10)+(d-56320),e++)),128>c?b[f++]=c:2048>c?(b[f++]=192|c>>>6,b[f++]=128|63&c):65536>c?(b[f++]=224|c>>>12,b[f++]=128|c>>>6&63,b[f++]=128|63&c):(b[f++]=240|c>>>18,b[f++]=128|c>>>12&63,b[f++]=128|c>>>6&63,b[f++]=128|63&c);return b},m=function(a,b){var c;for(b=b||a.length,b>a.length&&(b=a.length),c=b-1;c>=0&&128===(192&a[c]);)c--;return 0>c?b:0===c?b:c+j[a[c]]>b?c:b},n=function(a){var b,c,d,e,g=a.length,h=new Array(2*g);for(c=0,b=0;g>b;)if(d=a[b++],128>d)h[c++]=d;else if(e=j[d],e>4)h[c++]=65533,b+=e-1;else{for(d&=2===e?31:3===e?15:7;e>1&&g>b;)d=d<<6|63&a[b++],e--;e>1?h[c++]=65533:65536>d?h[c++]=d:(d-=65536,h[c++]=55296|d>>10&1023,h[c++]=56320|1023&d)}return h.length!==c&&(h.subarray?h=h.subarray(0,c):h.length=c),f.applyFromCharCode(h)};c.utf8encode=function(a){return g.nodebuffer?h.newBuffer(a,"utf-8"):l(a)},c.utf8decode=function(a){return g.nodebuffer?f.transformTo("nodebuffer",a).toString("utf-8"):(a=f.transformTo(g.uint8array?"uint8array":"array",a),n(a))},f.inherits(d,i),d.prototype.processChunk=function(a){var b=f.transformTo(g.uint8array?"uint8array":"array",a.data);if(this.leftOver&&this.leftOver.length){if(g.uint8array){var d=b;b=new Uint8Array(d.length+this.leftOver.length),b.set(this.leftOver,0),b.set(d,this.leftOver.length)}else b=this.leftOver.concat(b);this.leftOver=null}var e=m(b),h=b;e!==b.length&&(g.uint8array?(h=b.subarray(0,e),this.leftOver=b.subarray(e,b.length)):(h=b.slice(0,e),this.leftOver=b.slice(e,b.length))),this.push({data:c.utf8decode(h),meta:a.meta})},d.prototype.flush=function(){this.leftOver&&this.leftOver.length&&(this.push({data:c.utf8decode(this.leftOver),meta:{}}),this.leftOver=null)},c.Utf8DecodeWorker=d,f.inherits(e,i),e.prototype.processChunk=function(a){this.push({data:c.utf8encode(a.data),meta:a.meta})},c.Utf8EncodeWorker=e},{"./nodejsUtils":12,"./stream/GenericWorker":25,"./support":27,"./utils":29}],29:[function(a,b,c){"use strict";function d(a){var b=null;return b=i.uint8array?new Uint8Array(a.length):new Array(a.length),f(a,b)}function e(a){return a}function f(a,b){for(var c=0;c<a.length;++c)b[c]=255&a.charCodeAt(c);return b}function g(a){var b=65536,d=c.getTypeOf(a),e=!0;if("uint8array"===d?e=n.applyCanBeUsed.uint8array:"nodebuffer"===d&&(e=n.applyCanBeUsed.nodebuffer),e)for(;b>1;)try{return n.stringifyByChunk(a,d,b)}catch(f){b=Math.floor(b/2)}return n.stringifyByChar(a)}function h(a,b){for(var c=0;c<a.length;c++)b[c]=a[c];return b}var i=a("./support"),j=a("./base64"),k=a("./nodejsUtils"),l=a("asap"),m=a("./external");c.newBlob=function(a,b){c.checkSupport("blob");try{return new Blob([a],{type:b})}catch(d){try{var e=window.BlobBuilder||window.WebKitBlobBuilder||window.MozBlobBuilder||window.MSBlobBuilder,f=new e;return f.append(a),f.getBlob(b)}catch(d){throw new Error("Bug : can't construct the Blob.")}}};var n={stringifyByChunk:function(a,b,c){var d=[],e=0,f=a.length;if(c>=f)return String.fromCharCode.apply(null,a);for(;f>e;)"array"===b||"nodebuffer"===b?d.push(String.fromCharCode.apply(null,a.slice(e,Math.min(e+c,f)))):d.push(String.fromCharCode.apply(null,a.subarray(e,Math.min(e+c,f)))),e+=c;return d.join("")},stringifyByChar:function(a){for(var b="",c=0;c<a.length;c++)b+=String.fromCharCode(a[c]);return b},applyCanBeUsed:{uint8array:function(){try{return i.uint8array&&1===String.fromCharCode.apply(null,new Uint8Array(1)).length}catch(a){return!1}}(),nodebuffer:function(){try{return i.nodebuffer&&1===String.fromCharCode.apply(null,k.newBuffer(1)).length}catch(a){return!1}}()}};c.applyFromCharCode=g;var o={};o.string={string:e,array:function(a){return f(a,new Array(a.length))},arraybuffer:function(a){return o.string.uint8array(a).buffer},uint8array:function(a){return f(a,new Uint8Array(a.length))},nodebuffer:function(a){return f(a,k.newBuffer(a.length))}},o.array={string:g,array:e,arraybuffer:function(a){return new Uint8Array(a).buffer},uint8array:function(a){return new Uint8Array(a)},nodebuffer:function(a){return k.newBuffer(a)}},o.arraybuffer={string:function(a){return g(new Uint8Array(a));
},array:function(a){return h(new Uint8Array(a),new Array(a.byteLength))},arraybuffer:e,uint8array:function(a){return new Uint8Array(a)},nodebuffer:function(a){return k.newBuffer(new Uint8Array(a))}},o.uint8array={string:g,array:function(a){return h(a,new Array(a.length))},arraybuffer:function(a){return a.buffer},uint8array:e,nodebuffer:function(a){return k.newBuffer(a)}},o.nodebuffer={string:g,array:function(a){return h(a,new Array(a.length))},arraybuffer:function(a){return o.nodebuffer.uint8array(a).buffer},uint8array:function(a){return h(a,new Uint8Array(a.length))},nodebuffer:e},c.transformTo=function(a,b){if(b||(b=""),!a)return b;c.checkSupport(a);var d=c.getTypeOf(b),e=o[d][a](b);return e},c.getTypeOf=function(a){return"string"==typeof a?"string":"[object Array]"===Object.prototype.toString.call(a)?"array":i.nodebuffer&&k.isBuffer(a)?"nodebuffer":i.uint8array&&a instanceof Uint8Array?"uint8array":i.arraybuffer&&a instanceof ArrayBuffer?"arraybuffer":void 0},c.checkSupport=function(a){var b=i[a.toLowerCase()];if(!b)throw new Error(a+" is not supported by this platform")},c.MAX_VALUE_16BITS=65535,c.MAX_VALUE_32BITS=-1,c.pretty=function(a){var b,c,d="";for(c=0;c<(a||"").length;c++)b=a.charCodeAt(c),d+="\\x"+(16>b?"0":"")+b.toString(16).toUpperCase();return d},c.delay=function(a,b,c){l(function(){a.apply(c||null,b||[])})},c.inherits=function(a,b){var c=function(){};c.prototype=b.prototype,a.prototype=new c},c.extend=function(){var a,b,c={};for(a=0;a<arguments.length;a++)for(b in arguments[a])arguments[a].hasOwnProperty(b)&&"undefined"==typeof c[b]&&(c[b]=arguments[a][b]);return c},c.prepareContent=function(a,b,e,f,g){var h=null;return h=i.blob&&b instanceof Blob&&"undefined"!=typeof FileReader?new m.Promise(function(a,c){var d=new FileReader;d.onload=function(b){a(b.target.result)},d.onerror=function(a){c(a.target.error)},d.readAsArrayBuffer(b)}):m.Promise.resolve(b),h.then(function(b){var h=c.getTypeOf(b);return h?("arraybuffer"===h?b=c.transformTo("uint8array",b):"string"===h&&(g?b=j.decode(b):e&&f!==!0&&(b=d(b))),b):m.Promise.reject(new Error("The data of '"+a+"' is in an unsupported format !"))})}},{"./base64":1,"./external":6,"./nodejsUtils":12,"./support":27,asap:33}],30:[function(a,b,c){"use strict";function d(a){this.files=[],this.loadOptions=a}var e=a("./reader/readerFor"),f=a("./utils"),g=a("./signature"),h=a("./zipEntry"),i=(a("./utf8"),a("./support"));d.prototype={checkSignature:function(a){if(!this.reader.readAndCheckSignature(a)){this.reader.index-=4;var b=this.reader.readString(4);throw new Error("Corrupted zip or bug : unexpected signature ("+f.pretty(b)+", expected "+f.pretty(a)+")")}},isSignature:function(a,b){var c=this.reader.index;this.reader.setIndex(a);var d=this.reader.readString(4),e=d===b;return this.reader.setIndex(c),e},readBlockEndOfCentral:function(){this.diskNumber=this.reader.readInt(2),this.diskWithCentralDirStart=this.reader.readInt(2),this.centralDirRecordsOnThisDisk=this.reader.readInt(2),this.centralDirRecords=this.reader.readInt(2),this.centralDirSize=this.reader.readInt(4),this.centralDirOffset=this.reader.readInt(4),this.zipCommentLength=this.reader.readInt(2);var a=this.reader.readData(this.zipCommentLength),b=i.uint8array?"uint8array":"array",c=f.transformTo(b,a);this.zipComment=this.loadOptions.decodeFileName(c)},readBlockZip64EndOfCentral:function(){this.zip64EndOfCentralSize=this.reader.readInt(8),this.reader.skip(4),this.diskNumber=this.reader.readInt(4),this.diskWithCentralDirStart=this.reader.readInt(4),this.centralDirRecordsOnThisDisk=this.reader.readInt(8),this.centralDirRecords=this.reader.readInt(8),this.centralDirSize=this.reader.readInt(8),this.centralDirOffset=this.reader.readInt(8),this.zip64ExtensibleData={};for(var a,b,c,d=this.zip64EndOfCentralSize-44,e=0;d>e;)a=this.reader.readInt(2),b=this.reader.readInt(4),c=this.reader.readData(b),this.zip64ExtensibleData[a]={id:a,length:b,value:c}},readBlockZip64EndOfCentralLocator:function(){if(this.diskWithZip64CentralDirStart=this.reader.readInt(4),this.relativeOffsetEndOfZip64CentralDir=this.reader.readInt(8),this.disksCount=this.reader.readInt(4),this.disksCount>1)throw new Error("Multi-volumes zip are not supported")},readLocalFiles:function(){var a,b;for(a=0;a<this.files.length;a++)b=this.files[a],this.reader.setIndex(b.localHeaderOffset),this.checkSignature(g.LOCAL_FILE_HEADER),b.readLocalPart(this.reader),b.handleUTF8(),b.processAttributes()},readCentralDir:function(){var a;for(this.reader.setIndex(this.centralDirOffset);this.reader.readAndCheckSignature(g.CENTRAL_FILE_HEADER);)a=new h({zip64:this.zip64},this.loadOptions),a.readCentralPart(this.reader),this.files.push(a);if(this.centralDirRecords!==this.files.length&&0!==this.centralDirRecords&&0===this.files.length)throw new Error("Corrupted zip or bug: expected "+this.centralDirRecords+" records in central dir, got "+this.files.length)},readEndOfCentral:function(){var a=this.reader.lastIndexOfSignature(g.CENTRAL_DIRECTORY_END);if(0>a){var b=!this.isSignature(0,g.LOCAL_FILE_HEADER);throw b?new Error("Can't find end of central directory : is this a zip file ? If it is, see http://stuk.github.io/jszip/documentation/howto/read_zip.html"):new Error("Corrupted zip : can't find end of central directory")}this.reader.setIndex(a);var c=a;if(this.checkSignature(g.CENTRAL_DIRECTORY_END),this.readBlockEndOfCentral(),this.diskNumber===f.MAX_VALUE_16BITS||this.diskWithCentralDirStart===f.MAX_VALUE_16BITS||this.centralDirRecordsOnThisDisk===f.MAX_VALUE_16BITS||this.centralDirRecords===f.MAX_VALUE_16BITS||this.centralDirSize===f.MAX_VALUE_32BITS||this.centralDirOffset===f.MAX_VALUE_32BITS){if(this.zip64=!0,a=this.reader.lastIndexOfSignature(g.ZIP64_CENTRAL_DIRECTORY_LOCATOR),0>a)throw new Error("Corrupted zip : can't find the ZIP64 end of central directory locator");if(this.reader.setIndex(a),this.checkSignature(g.ZIP64_CENTRAL_DIRECTORY_LOCATOR),this.readBlockZip64EndOfCentralLocator(),!this.isSignature(this.relativeOffsetEndOfZip64CentralDir,g.ZIP64_CENTRAL_DIRECTORY_END)&&(this.relativeOffsetEndOfZip64CentralDir=this.reader.lastIndexOfSignature(g.ZIP64_CENTRAL_DIRECTORY_END),this.relativeOffsetEndOfZip64CentralDir<0))throw new Error("Corrupted zip : can't find the ZIP64 end of central directory");this.reader.setIndex(this.relativeOffsetEndOfZip64CentralDir),this.checkSignature(g.ZIP64_CENTRAL_DIRECTORY_END),this.readBlockZip64EndOfCentral()}var d=this.centralDirOffset+this.centralDirSize;this.zip64&&(d+=20,d+=12+this.zip64EndOfCentralSize);var e=c-d;if(e>0)this.isSignature(c,g.CENTRAL_FILE_HEADER)||(this.reader.zero=e);else if(0>e)throw new Error("Corrupted zip: missing "+Math.abs(e)+" bytes.")},prepareReader:function(a){this.reader=e(a)},load:function(a){this.prepareReader(a),this.readEndOfCentral(),this.readCentralDir(),this.readLocalFiles()}},b.exports=d},{"./reader/readerFor":19,"./signature":20,"./support":27,"./utf8":28,"./utils":29,"./zipEntry":31}],31:[function(a,b,c){"use strict";function d(a,b){this.options=a,this.loadOptions=b}var e=a("./reader/readerFor"),f=a("./utils"),g=a("./compressedObject"),h=a("./crc32"),i=a("./utf8"),j=a("./compressions"),k=a("./support"),l=0,m=3,n=function(a){for(var b in j)if(j.hasOwnProperty(b)&&j[b].magic===a)return j[b];return null};d.prototype={isEncrypted:function(){return 1===(1&this.bitFlag)},useUTF8:function(){return 2048===(2048&this.bitFlag)},readLocalPart:function(a){var b,c;if(a.skip(22),this.fileNameLength=a.readInt(2),c=a.readInt(2),this.fileName=a.readData(this.fileNameLength),a.skip(c),-1===this.compressedSize||-1===this.uncompressedSize)throw new Error("Bug or corrupted zip : didn't get enough informations from the central directory (compressedSize === -1 || uncompressedSize === -1)");if(b=n(this.compressionMethod),null===b)throw new Error("Corrupted zip : compression "+f.pretty(this.compressionMethod)+" unknown (inner file : "+f.transformTo("string",this.fileName)+")");this.decompressed=new g(this.compressedSize,this.uncompressedSize,this.crc32,b,a.readData(this.compressedSize))},readCentralPart:function(a){this.versionMadeBy=a.readInt(2),a.skip(2),this.bitFlag=a.readInt(2),this.compressionMethod=a.readString(2),this.date=a.readDate(),this.crc32=a.readInt(4),this.compressedSize=a.readInt(4),this.uncompressedSize=a.readInt(4);var b=a.readInt(2);if(this.extraFieldsLength=a.readInt(2),this.fileCommentLength=a.readInt(2),this.diskNumberStart=a.readInt(2),this.internalFileAttributes=a.readInt(2),this.externalFileAttributes=a.readInt(4),this.localHeaderOffset=a.readInt(4),this.isEncrypted())throw new Error("Encrypted zip are not supported");a.skip(b),this.readExtraFields(a),this.parseZIP64ExtraField(a),this.fileComment=a.readData(this.fileCommentLength)},processAttributes:function(){this.unixPermissions=null,this.dosPermissions=null;var a=this.versionMadeBy>>8;this.dir=!!(16&this.externalFileAttributes),a===l&&(this.dosPermissions=63&this.externalFileAttributes),a===m&&(this.unixPermissions=this.externalFileAttributes>>16&65535),this.dir||"/"!==this.fileNameStr.slice(-1)||(this.dir=!0)},parseZIP64ExtraField:function(a){if(this.extraFields[1]){var b=e(this.extraFields[1].value);this.uncompressedSize===f.MAX_VALUE_32BITS&&(this.uncompressedSize=b.readInt(8)),this.compressedSize===f.MAX_VALUE_32BITS&&(this.compressedSize=b.readInt(8)),this.localHeaderOffset===f.MAX_VALUE_32BITS&&(this.localHeaderOffset=b.readInt(8)),this.diskNumberStart===f.MAX_VALUE_32BITS&&(this.diskNumberStart=b.readInt(4))}},readExtraFields:function(a){var b,c,d,e=a.index+this.extraFieldsLength;for(this.extraFields||(this.extraFields={});a.index<e;)b=a.readInt(2),c=a.readInt(2),d=a.readData(c),this.extraFields[b]={id:b,length:c,value:d}},handleUTF8:function(){var a=k.uint8array?"uint8array":"array";if(this.useUTF8())this.fileNameStr=i.utf8decode(this.fileName),this.fileCommentStr=i.utf8decode(this.fileComment);else{var b=this.findExtraFieldUnicodePath();if(null!==b)this.fileNameStr=b;else{var c=f.transformTo(a,this.fileName);this.fileNameStr=this.loadOptions.decodeFileName(c)}var d=this.findExtraFieldUnicodeComment();if(null!==d)this.fileCommentStr=d;else{var e=f.transformTo(a,this.fileComment);this.fileCommentStr=this.loadOptions.decodeFileName(e)}}},findExtraFieldUnicodePath:function(){var a=this.extraFields[28789];if(a){var b=e(a.value);return 1!==b.readInt(1)?null:h(this.fileName)!==b.readInt(4)?null:i.utf8decode(b.readData(a.length-5))}return null},findExtraFieldUnicodeComment:function(){var a=this.extraFields[25461];if(a){var b=e(a.value);return 1!==b.readInt(1)?null:h(this.fileComment)!==b.readInt(4)?null:i.utf8decode(b.readData(a.length-5))}return null}},b.exports=d},{"./compressedObject":2,"./compressions":3,"./crc32":4,"./reader/readerFor":19,"./support":27,"./utf8":28,"./utils":29}],32:[function(a,b,c){"use strict";var d=a("./stream/StreamHelper"),e=a("./stream/DataWorker"),f=a("./utf8"),g=a("./compressedObject"),h=a("./stream/GenericWorker"),i=function(a,b,c){this.name=a,this.dir=c.dir,this.date=c.date,this.comment=c.comment,this.unixPermissions=c.unixPermissions,this.dosPermissions=c.dosPermissions,this._data=b,this._dataBinary=c.binary,this.options={compression:c.compression,compressionOptions:c.compressionOptions}};i.prototype={internalStream:function(a){var b=a.toLowerCase(),c="string"===b||"text"===b;"binarystring"!==b&&"text"!==b||(b="string");var e=this._decompressWorker(),g=!this._dataBinary;return g&&!c&&(e=e.pipe(new f.Utf8EncodeWorker)),!g&&c&&(e=e.pipe(new f.Utf8DecodeWorker)),new d(e,b,"")},async:function(a,b){return this.internalStream(a).accumulate(b)},nodeStream:function(a,b){return this.internalStream(a||"nodebuffer").toNodejsStream(b)},_compressWorker:function(a,b){if(this._data instanceof g&&this._data.compression.magic===a.magic)return this._data.getCompressedWorker();var c=this._decompressWorker();return this._dataBinary||(c=c.pipe(new f.Utf8EncodeWorker)),g.createWorkerFrom(c,a,b)},_decompressWorker:function(){return this._data instanceof g?this._data.getContentWorker():this._data instanceof h?this._data:new e(this._data)}};for(var j=["asText","asBinary","asNodeBuffer","asUint8Array","asArrayBuffer"],k=function(){throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.")},l=0;l<j.length;l++)i.prototype[j[l]]=k;b.exports=i},{"./compressedObject":2,"./stream/DataWorker":24,"./stream/GenericWorker":25,"./stream/StreamHelper":26,"./utf8":28}],33:[function(a,b,c){"use strict";function d(){if(i.length)throw i.shift()}function e(a){var b;b=h.length?h.pop():new f,b.task=a,g(b)}function f(){this.task=null}var g=a("./raw"),h=[],i=[],j=g.makeRequestCallFromTimer(d);b.exports=e,f.prototype.call=function(){try{this.task.call()}catch(a){e.onerror?e.onerror(a):(i.push(a),j())}finally{this.task=null,h[h.length]=this}}},{"./raw":34}],34:[function(a,b,c){(function(a){"use strict";function c(a){h.length||(g(),i=!0),h[h.length]=a}function d(){for(;j<h.length;){var a=j;if(j+=1,h[a].call(),j>k){for(var b=0,c=h.length-j;c>b;b++)h[b]=h[b+j];h.length-=j,j=0}}h.length=0,j=0,i=!1}function e(a){var b=1,c=new l(a),d=document.createTextNode("");return c.observe(d,{characterData:!0}),function(){b=-b,d.data=b}}function f(a){return function(){function b(){clearTimeout(c),clearInterval(d),a()}var c=setTimeout(b,0),d=setInterval(b,50)}}b.exports=c;var g,h=[],i=!1,j=0,k=1024,l=a.MutationObserver||a.WebKitMutationObserver;g="function"==typeof l?e(d):f(d),c.requestFlush=g,c.makeRequestCallFromTimer=f}).call(this,"undefined"!=typeof global?global:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{})},{}],35:[function(a,b,c){},{}],36:[function(a,b,c){function d(){k=!1,h.length?j=h.concat(j):l=-1,j.length&&e()}function e(){if(!k){var a=setTimeout(d);k=!0;for(var b=j.length;b;){for(h=j,j=[];++l<b;)h&&h[l].run();l=-1,b=j.length}h=null,k=!1,clearTimeout(a)}}function f(a,b){this.fun=a,this.array=b}function g(){}var h,i=b.exports={},j=[],k=!1,l=-1;i.nextTick=function(a){var b=new Array(arguments.length-1);if(arguments.length>1)for(var c=1;c<arguments.length;c++)b[c-1]=arguments[c];j.push(new f(a,b)),1!==j.length||k||setTimeout(e,0)},f.prototype.run=function(){this.fun.apply(null,this.array)},i.title="browser",i.browser=!0,i.env={},i.argv=[],i.version="",i.versions={},i.on=g,i.addListener=g,i.once=g,i.off=g,i.removeListener=g,i.removeAllListeners=g,i.emit=g,i.binding=function(a){throw new Error("process.binding is not supported")},i.cwd=function(){return"/"},i.chdir=function(a){throw new Error("process.chdir is not supported")},i.umask=function(){return 0}},{}],37:[function(b,c,d){(function(d,e){(function(){"use strict";function f(a){return"function"==typeof a||"object"==typeof a&&null!==a}function g(a){return"function"==typeof a}function h(a){return"object"==typeof a&&null!==a}function i(a){U=a}function j(a){Y=a}function k(){return function(){d.nextTick(p)}}function l(){return function(){T(p)}}function m(){var a=0,b=new _(p),c=document.createTextNode("");return b.observe(c,{characterData:!0}),function(){c.data=a=++a%2}}function n(){var a=new MessageChannel;return a.port1.onmessage=p,function(){a.port2.postMessage(0)}}function o(){return function(){setTimeout(p,1)}}function p(){for(var a=0;X>a;a+=2){var b=ca[a],c=ca[a+1];b(c),ca[a]=void 0,ca[a+1]=void 0}X=0}function q(){try{var a=b,c=a("vertx");return T=c.runOnLoop||c.runOnContext,l()}catch(d){return o()}}function r(){}function s(){return new TypeError("You cannot resolve a promise with itself")}function t(){return new TypeError("A promises callback cannot return that same promise.")}function u(a){try{return a.then}catch(b){return ga.error=b,ga}}function v(a,b,c,d){try{a.call(b,c,d)}catch(e){return e}}function w(a,b,c){Y(function(a){var d=!1,e=v(c,b,function(c){d||(d=!0,b!==c?z(a,c):B(a,c))},function(b){d||(d=!0,C(a,b))},"Settle: "+(a._label||" unknown promise"));!d&&e&&(d=!0,C(a,e))},a)}function x(a,b){b._state===ea?B(a,b._result):b._state===fa?C(a,b._result):D(b,void 0,function(b){z(a,b)},function(b){C(a,b)})}function y(a,b){if(b.constructor===a.constructor)x(a,b);else{var c=u(b);c===ga?C(a,ga.error):void 0===c?B(a,b):g(c)?w(a,b,c):B(a,b)}}function z(a,b){a===b?C(a,s()):f(b)?y(a,b):B(a,b)}function A(a){a._onerror&&a._onerror(a._result),E(a)}function B(a,b){a._state===da&&(a._result=b,a._state=ea,0!==a._subscribers.length&&Y(E,a))}function C(a,b){a._state===da&&(a._state=fa,a._result=b,Y(A,a))}function D(a,b,c,d){var e=a._subscribers,f=e.length;a._onerror=null,e[f]=b,e[f+ea]=c,e[f+fa]=d,0===f&&a._state&&Y(E,a)}function E(a){var b=a._subscribers,c=a._state;if(0!==b.length){for(var d,e,f=a._result,g=0;g<b.length;g+=3)d=b[g],e=b[g+c],d?H(c,d,e,f):e(f);a._subscribers.length=0}}function F(){this.error=null}function G(a,b){try{return a(b)}catch(c){return ha.error=c,ha}}function H(a,b,c,d){var e,f,h,i,j=g(c);if(j){if(e=G(c,d),e===ha?(i=!0,f=e.error,e=null):h=!0,b===e)return void C(b,t())}else e=d,h=!0;b._state!==da||(j&&h?z(b,e):i?C(b,f):a===ea?B(b,e):a===fa&&C(b,e))}function I(a,b){try{b(function(b){z(a,b)},function(b){C(a,b)})}catch(c){C(a,c)}}function J(a,b){var c=this;c._instanceConstructor=a,c.promise=new a(r),c._validateInput(b)?(c._input=b,c.length=b.length,c._remaining=b.length,c._init(),0===c.length?B(c.promise,c._result):(c.length=c.length||0,c._enumerate(),0===c._remaining&&B(c.promise,c._result))):C(c.promise,c._validationError())}function K(a){return new ia(this,a).promise}function L(a){function b(a){z(e,a)}function c(a){C(e,a)}var d=this,e=new d(r);if(!W(a))return C(e,new TypeError("You must pass an array to race.")),e;for(var f=a.length,g=0;e._state===da&&f>g;g++)D(d.resolve(a[g]),void 0,b,c);return e}function M(a){var b=this;if(a&&"object"==typeof a&&a.constructor===b)return a;var c=new b(r);return z(c,a),c}function N(a){var b=this,c=new b(r);return C(c,a),c}function O(){throw new TypeError("You must pass a resolver function as the first argument to the promise constructor")}function P(){throw new TypeError("Failed to construct 'Promise': Please use the 'new' operator, this object constructor cannot be called as a function.")}function Q(a){this._id=na++,this._state=void 0,this._result=void 0,this._subscribers=[],r!==a&&(g(a)||O(),this instanceof Q||P(),I(this,a))}function R(){var a;if("undefined"!=typeof e)a=e;else if("undefined"!=typeof self)a=self;else try{a=Function("return this")()}catch(b){throw new Error("polyfill failed because global object is unavailable in this environment")}var c=a.Promise;c&&"[object Promise]"===Object.prototype.toString.call(c.resolve())&&!c.cast||(a.Promise=oa)}var S;S=Array.isArray?Array.isArray:function(a){return"[object Array]"===Object.prototype.toString.call(a)};var T,U,V,W=S,X=0,Y=({}.toString,function(a,b){ca[X]=a,ca[X+1]=b,X+=2,2===X&&(U?U(p):V())}),Z="undefined"!=typeof window?window:void 0,$=Z||{},_=$.MutationObserver||$.WebKitMutationObserver,aa="undefined"!=typeof d&&"[object process]"==={}.toString.call(d),ba="undefined"!=typeof Uint8ClampedArray&&"undefined"!=typeof importScripts&&"undefined"!=typeof MessageChannel,ca=new Array(1e3);V=aa?k():_?m():ba?n():void 0===Z&&"function"==typeof b?q():o();var da=void 0,ea=1,fa=2,ga=new F,ha=new F;J.prototype._validateInput=function(a){return W(a)},J.prototype._validationError=function(){return new Error("Array Methods must be provided an Array")},J.prototype._init=function(){this._result=new Array(this.length)};var ia=J;J.prototype._enumerate=function(){for(var a=this,b=a.length,c=a.promise,d=a._input,e=0;c._state===da&&b>e;e++)a._eachEntry(d[e],e)},J.prototype._eachEntry=function(a,b){var c=this,d=c._instanceConstructor;h(a)?a.constructor===d&&a._state!==da?(a._onerror=null,c._settledAt(a._state,b,a._result)):c._willSettleAt(d.resolve(a),b):(c._remaining--,c._result[b]=a)},J.prototype._settledAt=function(a,b,c){var d=this,e=d.promise;e._state===da&&(d._remaining--,a===fa?C(e,c):d._result[b]=c),0===d._remaining&&B(e,d._result)},J.prototype._willSettleAt=function(a,b){var c=this;D(a,void 0,function(a){c._settledAt(ea,b,a)},function(a){c._settledAt(fa,b,a)})};var ja=K,ka=L,la=M,ma=N,na=0,oa=Q;Q.all=ja,Q.race=ka,Q.resolve=la,Q.reject=ma,Q._setScheduler=i,Q._setAsap=j,Q._asap=Y,Q.prototype={constructor:Q,then:function(a,b){var c=this,d=c._state;if(d===ea&&!a||d===fa&&!b)return this;var e=new this.constructor(r),f=c._result;if(d){var g=arguments[d-1];Y(function(){H(d,e,g,f)})}else D(c,e,a,b);return e},"catch":function(a){return this.then(null,a)}};var pa=R,qa={Promise:oa,polyfill:pa};"function"==typeof a&&a.amd?a(function(){return qa}):"undefined"!=typeof c&&c.exports?c.exports=qa:"undefined"!=typeof this&&(this.ES6Promise=qa),pa()}).call(this)}).call(this,b("_process"),"undefined"!=typeof global?global:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{})},{_process:36}],38:[function(a,b,c){"use strict";var d=a("./lib/utils/common").assign,e=a("./lib/deflate"),f=a("./lib/inflate"),g=a("./lib/zlib/constants"),h={};d(h,e,f,g),b.exports=h},{"./lib/deflate":39,"./lib/inflate":40,"./lib/utils/common":41,"./lib/zlib/constants":44}],39:[function(a,b,c){"use strict";function d(a){if(!(this instanceof d))return new d(a);this.options=i.assign({level:s,method:u,chunkSize:16384,windowBits:15,memLevel:8,strategy:t,to:""},a||{});var b=this.options;b.raw&&b.windowBits>0?b.windowBits=-b.windowBits:b.gzip&&b.windowBits>0&&b.windowBits<16&&(b.windowBits+=16),this.err=0,this.msg="",this.ended=!1,this.chunks=[],this.strm=new l,this.strm.avail_out=0;var c=h.deflateInit2(this.strm,b.level,b.method,b.windowBits,b.memLevel,b.strategy);if(c!==p)throw new Error(k[c]);if(b.header&&h.deflateSetHeader(this.strm,b.header),b.dictionary){var e;if(e="string"==typeof b.dictionary?j.string2buf(b.dictionary):"[object ArrayBuffer]"===m.call(b.dictionary)?new Uint8Array(b.dictionary):b.dictionary,c=h.deflateSetDictionary(this.strm,e),c!==p)throw new Error(k[c]);this._dict_set=!0}}function e(a,b){var c=new d(b);if(c.push(a,!0),c.err)throw c.msg;return c.result}function f(a,b){return b=b||{},b.raw=!0,e(a,b)}function g(a,b){return b=b||{},b.gzip=!0,e(a,b)}var h=a("./zlib/deflate"),i=a("./utils/common"),j=a("./utils/strings"),k=a("./zlib/messages"),l=a("./zlib/zstream"),m=Object.prototype.toString,n=0,o=4,p=0,q=1,r=2,s=-1,t=0,u=8;d.prototype.push=function(a,b){var c,d,e=this.strm,f=this.options.chunkSize;if(this.ended)return!1;d=b===~~b?b:b===!0?o:n,"string"==typeof a?e.input=j.string2buf(a):"[object ArrayBuffer]"===m.call(a)?e.input=new Uint8Array(a):e.input=a,e.next_in=0,e.avail_in=e.input.length;do{if(0===e.avail_out&&(e.output=new i.Buf8(f),e.next_out=0,e.avail_out=f),c=h.deflate(e,d),c!==q&&c!==p)return this.onEnd(c),this.ended=!0,!1;0!==e.avail_out&&(0!==e.avail_in||d!==o&&d!==r)||("string"===this.options.to?this.onData(j.buf2binstring(i.shrinkBuf(e.output,e.next_out))):this.onData(i.shrinkBuf(e.output,e.next_out)))}while((e.avail_in>0||0===e.avail_out)&&c!==q);return d===o?(c=h.deflateEnd(this.strm),this.onEnd(c),this.ended=!0,c===p):d===r?(this.onEnd(p),e.avail_out=0,!0):!0},d.prototype.onData=function(a){this.chunks.push(a)},d.prototype.onEnd=function(a){a===p&&("string"===this.options.to?this.result=this.chunks.join(""):this.result=i.flattenChunks(this.chunks)),this.chunks=[],this.err=a,this.msg=this.strm.msg},c.Deflate=d,c.deflate=e,c.deflateRaw=f,c.gzip=g},{"./utils/common":41,"./utils/strings":42,"./zlib/deflate":46,"./zlib/messages":51,"./zlib/zstream":53}],40:[function(a,b,c){"use strict";function d(a){if(!(this instanceof d))return new d(a);this.options=h.assign({chunkSize:16384,windowBits:0,to:""},a||{});var b=this.options;b.raw&&b.windowBits>=0&&b.windowBits<16&&(b.windowBits=-b.windowBits,0===b.windowBits&&(b.windowBits=-15)),!(b.windowBits>=0&&b.windowBits<16)||a&&a.windowBits||(b.windowBits+=32),b.windowBits>15&&b.windowBits<48&&0===(15&b.windowBits)&&(b.windowBits|=15),this.err=0,this.msg="",this.ended=!1,this.chunks=[],this.strm=new l,this.strm.avail_out=0;var c=g.inflateInit2(this.strm,b.windowBits);if(c!==j.Z_OK)throw new Error(k[c]);this.header=new m,g.inflateGetHeader(this.strm,this.header)}function e(a,b){var c=new d(b);if(c.push(a,!0),c.err)throw c.msg;return c.result}function f(a,b){return b=b||{},b.raw=!0,e(a,b)}var g=a("./zlib/inflate"),h=a("./utils/common"),i=a("./utils/strings"),j=a("./zlib/constants"),k=a("./zlib/messages"),l=a("./zlib/zstream"),m=a("./zlib/gzheader"),n=Object.prototype.toString;d.prototype.push=function(a,b){var c,d,e,f,k,l,m=this.strm,o=this.options.chunkSize,p=this.options.dictionary,q=!1;if(this.ended)return!1;d=b===~~b?b:b===!0?j.Z_FINISH:j.Z_NO_FLUSH,"string"==typeof a?m.input=i.binstring2buf(a):"[object ArrayBuffer]"===n.call(a)?m.input=new Uint8Array(a):m.input=a,m.next_in=0,m.avail_in=m.input.length;do{if(0===m.avail_out&&(m.output=new h.Buf8(o),m.next_out=0,m.avail_out=o),c=g.inflate(m,j.Z_NO_FLUSH),c===j.Z_NEED_DICT&&p&&(l="string"==typeof p?i.string2buf(p):"[object ArrayBuffer]"===n.call(p)?new Uint8Array(p):p,c=g.inflateSetDictionary(this.strm,l)),c===j.Z_BUF_ERROR&&q===!0&&(c=j.Z_OK,q=!1),c!==j.Z_STREAM_END&&c!==j.Z_OK)return this.onEnd(c),this.ended=!0,!1;m.next_out&&(0!==m.avail_out&&c!==j.Z_STREAM_END&&(0!==m.avail_in||d!==j.Z_FINISH&&d!==j.Z_SYNC_FLUSH)||("string"===this.options.to?(e=i.utf8border(m.output,m.next_out),f=m.next_out-e,k=i.buf2string(m.output,e),m.next_out=f,m.avail_out=o-f,f&&h.arraySet(m.output,m.output,e,f,0),this.onData(k)):this.onData(h.shrinkBuf(m.output,m.next_out)))),0===m.avail_in&&0===m.avail_out&&(q=!0)}while((m.avail_in>0||0===m.avail_out)&&c!==j.Z_STREAM_END);return c===j.Z_STREAM_END&&(d=j.Z_FINISH),d===j.Z_FINISH?(c=g.inflateEnd(this.strm),this.onEnd(c),this.ended=!0,c===j.Z_OK):d===j.Z_SYNC_FLUSH?(this.onEnd(j.Z_OK),m.avail_out=0,!0):!0},d.prototype.onData=function(a){this.chunks.push(a)},d.prototype.onEnd=function(a){a===j.Z_OK&&("string"===this.options.to?this.result=this.chunks.join(""):this.result=h.flattenChunks(this.chunks)),this.chunks=[],this.err=a,this.msg=this.strm.msg},c.Inflate=d,c.inflate=e,c.inflateRaw=f,c.ungzip=e},{"./utils/common":41,"./utils/strings":42,"./zlib/constants":44,"./zlib/gzheader":47,"./zlib/inflate":49,"./zlib/messages":51,"./zlib/zstream":53}],41:[function(a,b,c){"use strict";var d="undefined"!=typeof Uint8Array&&"undefined"!=typeof Uint16Array&&"undefined"!=typeof Int32Array;c.assign=function(a){for(var b=Array.prototype.slice.call(arguments,1);b.length;){var c=b.shift();if(c){if("object"!=typeof c)throw new TypeError(c+"must be non-object");for(var d in c)c.hasOwnProperty(d)&&(a[d]=c[d])}}return a},c.shrinkBuf=function(a,b){return a.length===b?a:a.subarray?a.subarray(0,b):(a.length=b,a)};var e={arraySet:function(a,b,c,d,e){if(b.subarray&&a.subarray)return void a.set(b.subarray(c,c+d),e);for(var f=0;d>f;f++)a[e+f]=b[c+f]},flattenChunks:function(a){var b,c,d,e,f,g;for(d=0,b=0,c=a.length;c>b;b++)d+=a[b].length;for(g=new Uint8Array(d),e=0,b=0,c=a.length;c>b;b++)f=a[b],g.set(f,e),e+=f.length;return g}},f={arraySet:function(a,b,c,d,e){for(var f=0;d>f;f++)a[e+f]=b[c+f]},flattenChunks:function(a){return[].concat.apply([],a)}};c.setTyped=function(a){a?(c.Buf8=Uint8Array,c.Buf16=Uint16Array,c.Buf32=Int32Array,c.assign(c,e)):(c.Buf8=Array,c.Buf16=Array,c.Buf32=Array,c.assign(c,f))},c.setTyped(d)},{}],42:[function(a,b,c){"use strict";function d(a,b){if(65537>b&&(a.subarray&&g||!a.subarray&&f))return String.fromCharCode.apply(null,e.shrinkBuf(a,b));for(var c="",d=0;b>d;d++)c+=String.fromCharCode(a[d]);return c}var e=a("./common"),f=!0,g=!0;try{String.fromCharCode.apply(null,[0])}catch(h){f=!1}try{String.fromCharCode.apply(null,new Uint8Array(1))}catch(h){g=!1}for(var i=new e.Buf8(256),j=0;256>j;j++)i[j]=j>=252?6:j>=248?5:j>=240?4:j>=224?3:j>=192?2:1;i[254]=i[254]=1,c.string2buf=function(a){var b,c,d,f,g,h=a.length,i=0;for(f=0;h>f;f++)c=a.charCodeAt(f),55296===(64512&c)&&h>f+1&&(d=a.charCodeAt(f+1),56320===(64512&d)&&(c=65536+(c-55296<<10)+(d-56320),f++)),i+=128>c?1:2048>c?2:65536>c?3:4;for(b=new e.Buf8(i),g=0,f=0;i>g;f++)c=a.charCodeAt(f),55296===(64512&c)&&h>f+1&&(d=a.charCodeAt(f+1),56320===(64512&d)&&(c=65536+(c-55296<<10)+(d-56320),f++)),128>c?b[g++]=c:2048>c?(b[g++]=192|c>>>6,b[g++]=128|63&c):65536>c?(b[g++]=224|c>>>12,b[g++]=128|c>>>6&63,b[g++]=128|63&c):(b[g++]=240|c>>>18,b[g++]=128|c>>>12&63,b[g++]=128|c>>>6&63,b[g++]=128|63&c);return b},c.buf2binstring=function(a){return d(a,a.length)},c.binstring2buf=function(a){for(var b=new e.Buf8(a.length),c=0,d=b.length;d>c;c++)b[c]=a.charCodeAt(c);return b},c.buf2string=function(a,b){var c,e,f,g,h=b||a.length,j=new Array(2*h);for(e=0,c=0;h>c;)if(f=a[c++],128>f)j[e++]=f;else if(g=i[f],g>4)j[e++]=65533,c+=g-1;else{for(f&=2===g?31:3===g?15:7;g>1&&h>c;)f=f<<6|63&a[c++],g--;g>1?j[e++]=65533:65536>f?j[e++]=f:(f-=65536,j[e++]=55296|f>>10&1023,j[e++]=56320|1023&f)}return d(j,e)},c.utf8border=function(a,b){var c;for(b=b||a.length,b>a.length&&(b=a.length),c=b-1;c>=0&&128===(192&a[c]);)c--;return 0>c?b:0===c?b:c+i[a[c]]>b?c:b}},{"./common":41}],43:[function(a,b,c){"use strict";function d(a,b,c,d){for(var e=65535&a|0,f=a>>>16&65535|0,g=0;0!==c;){g=c>2e3?2e3:c,c-=g;do e=e+b[d++]|0,f=f+e|0;while(--g);e%=65521,f%=65521}return e|f<<16|0}b.exports=d},{}],44:[function(a,b,c){"use strict";b.exports={Z_NO_FLUSH:0,Z_PARTIAL_FLUSH:1,Z_SYNC_FLUSH:2,Z_FULL_FLUSH:3,Z_FINISH:4,Z_BLOCK:5,Z_TREES:6,Z_OK:0,Z_STREAM_END:1,Z_NEED_DICT:2,Z_ERRNO:-1,Z_STREAM_ERROR:-2,Z_DATA_ERROR:-3,Z_BUF_ERROR:-5,Z_NO_COMPRESSION:0,Z_BEST_SPEED:1,Z_BEST_COMPRESSION:9,Z_DEFAULT_COMPRESSION:-1,Z_FILTERED:1,Z_HUFFMAN_ONLY:2,Z_RLE:3,Z_FIXED:4,Z_DEFAULT_STRATEGY:0,Z_BINARY:0,Z_TEXT:1,Z_UNKNOWN:2,Z_DEFLATED:8}},{}],45:[function(a,b,c){"use strict";function d(){for(var a,b=[],c=0;256>c;c++){a=c;for(var d=0;8>d;d++)a=1&a?3988292384^a>>>1:a>>>1;b[c]=a}return b}function e(a,b,c,d){var e=f,g=d+c;a^=-1;for(var h=d;g>h;h++)a=a>>>8^e[255&(a^b[h])];return-1^a}var f=d();b.exports=e},{}],46:[function(a,b,c){"use strict";function d(a,b){return a.msg=I[b],b}function e(a){return(a<<1)-(a>4?9:0)}function f(a){for(var b=a.length;--b>=0;)a[b]=0}function g(a){var b=a.state,c=b.pending;c>a.avail_out&&(c=a.avail_out),0!==c&&(E.arraySet(a.output,b.pending_buf,b.pending_out,c,a.next_out),a.next_out+=c,b.pending_out+=c,a.total_out+=c,a.avail_out-=c,b.pending-=c,0===b.pending&&(b.pending_out=0))}function h(a,b){F._tr_flush_block(a,a.block_start>=0?a.block_start:-1,a.strstart-a.block_start,b),a.block_start=a.strstart,g(a.strm)}function i(a,b){a.pending_buf[a.pending++]=b}function j(a,b){a.pending_buf[a.pending++]=b>>>8&255,a.pending_buf[a.pending++]=255&b}function k(a,b,c,d){var e=a.avail_in;return e>d&&(e=d),0===e?0:(a.avail_in-=e,E.arraySet(b,a.input,a.next_in,e,c),1===a.state.wrap?a.adler=G(a.adler,b,e,c):2===a.state.wrap&&(a.adler=H(a.adler,b,e,c)),a.next_in+=e,a.total_in+=e,e)}function l(a,b){var c,d,e=a.max_chain_length,f=a.strstart,g=a.prev_length,h=a.nice_match,i=a.strstart>a.w_size-la?a.strstart-(a.w_size-la):0,j=a.window,k=a.w_mask,l=a.prev,m=a.strstart+ka,n=j[f+g-1],o=j[f+g];a.prev_length>=a.good_match&&(e>>=2),h>a.lookahead&&(h=a.lookahead);do if(c=b,j[c+g]===o&&j[c+g-1]===n&&j[c]===j[f]&&j[++c]===j[f+1]){f+=2,c++;do;while(j[++f]===j[++c]&&j[++f]===j[++c]&&j[++f]===j[++c]&&j[++f]===j[++c]&&j[++f]===j[++c]&&j[++f]===j[++c]&&j[++f]===j[++c]&&j[++f]===j[++c]&&m>f);if(d=ka-(m-f),f=m-ka,d>g){if(a.match_start=b,g=d,d>=h)break;n=j[f+g-1],o=j[f+g]}}while((b=l[b&k])>i&&0!==--e);return g<=a.lookahead?g:a.lookahead}function m(a){var b,c,d,e,f,g=a.w_size;do{if(e=a.window_size-a.lookahead-a.strstart,a.strstart>=g+(g-la)){E.arraySet(a.window,a.window,g,g,0),a.match_start-=g,a.strstart-=g,a.block_start-=g,c=a.hash_size,b=c;do d=a.head[--b],a.head[b]=d>=g?d-g:0;while(--c);c=g,b=c;do d=a.prev[--b],a.prev[b]=d>=g?d-g:0;while(--c);e+=g}if(0===a.strm.avail_in)break;if(c=k(a.strm,a.window,a.strstart+a.lookahead,e),a.lookahead+=c,a.lookahead+a.insert>=ja)for(f=a.strstart-a.insert,a.ins_h=a.window[f],a.ins_h=(a.ins_h<<a.hash_shift^a.window[f+1])&a.hash_mask;a.insert&&(a.ins_h=(a.ins_h<<a.hash_shift^a.window[f+ja-1])&a.hash_mask,a.prev[f&a.w_mask]=a.head[a.ins_h],a.head[a.ins_h]=f,f++,a.insert--,
!(a.lookahead+a.insert<ja)););}while(a.lookahead<la&&0!==a.strm.avail_in)}function n(a,b){var c=65535;for(c>a.pending_buf_size-5&&(c=a.pending_buf_size-5);;){if(a.lookahead<=1){if(m(a),0===a.lookahead&&b===J)return ua;if(0===a.lookahead)break}a.strstart+=a.lookahead,a.lookahead=0;var d=a.block_start+c;if((0===a.strstart||a.strstart>=d)&&(a.lookahead=a.strstart-d,a.strstart=d,h(a,!1),0===a.strm.avail_out))return ua;if(a.strstart-a.block_start>=a.w_size-la&&(h(a,!1),0===a.strm.avail_out))return ua}return a.insert=0,b===M?(h(a,!0),0===a.strm.avail_out?wa:xa):a.strstart>a.block_start&&(h(a,!1),0===a.strm.avail_out)?ua:ua}function o(a,b){for(var c,d;;){if(a.lookahead<la){if(m(a),a.lookahead<la&&b===J)return ua;if(0===a.lookahead)break}if(c=0,a.lookahead>=ja&&(a.ins_h=(a.ins_h<<a.hash_shift^a.window[a.strstart+ja-1])&a.hash_mask,c=a.prev[a.strstart&a.w_mask]=a.head[a.ins_h],a.head[a.ins_h]=a.strstart),0!==c&&a.strstart-c<=a.w_size-la&&(a.match_length=l(a,c)),a.match_length>=ja)if(d=F._tr_tally(a,a.strstart-a.match_start,a.match_length-ja),a.lookahead-=a.match_length,a.match_length<=a.max_lazy_match&&a.lookahead>=ja){a.match_length--;do a.strstart++,a.ins_h=(a.ins_h<<a.hash_shift^a.window[a.strstart+ja-1])&a.hash_mask,c=a.prev[a.strstart&a.w_mask]=a.head[a.ins_h],a.head[a.ins_h]=a.strstart;while(0!==--a.match_length);a.strstart++}else a.strstart+=a.match_length,a.match_length=0,a.ins_h=a.window[a.strstart],a.ins_h=(a.ins_h<<a.hash_shift^a.window[a.strstart+1])&a.hash_mask;else d=F._tr_tally(a,0,a.window[a.strstart]),a.lookahead--,a.strstart++;if(d&&(h(a,!1),0===a.strm.avail_out))return ua}return a.insert=a.strstart<ja-1?a.strstart:ja-1,b===M?(h(a,!0),0===a.strm.avail_out?wa:xa):a.last_lit&&(h(a,!1),0===a.strm.avail_out)?ua:va}function p(a,b){for(var c,d,e;;){if(a.lookahead<la){if(m(a),a.lookahead<la&&b===J)return ua;if(0===a.lookahead)break}if(c=0,a.lookahead>=ja&&(a.ins_h=(a.ins_h<<a.hash_shift^a.window[a.strstart+ja-1])&a.hash_mask,c=a.prev[a.strstart&a.w_mask]=a.head[a.ins_h],a.head[a.ins_h]=a.strstart),a.prev_length=a.match_length,a.prev_match=a.match_start,a.match_length=ja-1,0!==c&&a.prev_length<a.max_lazy_match&&a.strstart-c<=a.w_size-la&&(a.match_length=l(a,c),a.match_length<=5&&(a.strategy===U||a.match_length===ja&&a.strstart-a.match_start>4096)&&(a.match_length=ja-1)),a.prev_length>=ja&&a.match_length<=a.prev_length){e=a.strstart+a.lookahead-ja,d=F._tr_tally(a,a.strstart-1-a.prev_match,a.prev_length-ja),a.lookahead-=a.prev_length-1,a.prev_length-=2;do++a.strstart<=e&&(a.ins_h=(a.ins_h<<a.hash_shift^a.window[a.strstart+ja-1])&a.hash_mask,c=a.prev[a.strstart&a.w_mask]=a.head[a.ins_h],a.head[a.ins_h]=a.strstart);while(0!==--a.prev_length);if(a.match_available=0,a.match_length=ja-1,a.strstart++,d&&(h(a,!1),0===a.strm.avail_out))return ua}else if(a.match_available){if(d=F._tr_tally(a,0,a.window[a.strstart-1]),d&&h(a,!1),a.strstart++,a.lookahead--,0===a.strm.avail_out)return ua}else a.match_available=1,a.strstart++,a.lookahead--}return a.match_available&&(d=F._tr_tally(a,0,a.window[a.strstart-1]),a.match_available=0),a.insert=a.strstart<ja-1?a.strstart:ja-1,b===M?(h(a,!0),0===a.strm.avail_out?wa:xa):a.last_lit&&(h(a,!1),0===a.strm.avail_out)?ua:va}function q(a,b){for(var c,d,e,f,g=a.window;;){if(a.lookahead<=ka){if(m(a),a.lookahead<=ka&&b===J)return ua;if(0===a.lookahead)break}if(a.match_length=0,a.lookahead>=ja&&a.strstart>0&&(e=a.strstart-1,d=g[e],d===g[++e]&&d===g[++e]&&d===g[++e])){f=a.strstart+ka;do;while(d===g[++e]&&d===g[++e]&&d===g[++e]&&d===g[++e]&&d===g[++e]&&d===g[++e]&&d===g[++e]&&d===g[++e]&&f>e);a.match_length=ka-(f-e),a.match_length>a.lookahead&&(a.match_length=a.lookahead)}if(a.match_length>=ja?(c=F._tr_tally(a,1,a.match_length-ja),a.lookahead-=a.match_length,a.strstart+=a.match_length,a.match_length=0):(c=F._tr_tally(a,0,a.window[a.strstart]),a.lookahead--,a.strstart++),c&&(h(a,!1),0===a.strm.avail_out))return ua}return a.insert=0,b===M?(h(a,!0),0===a.strm.avail_out?wa:xa):a.last_lit&&(h(a,!1),0===a.strm.avail_out)?ua:va}function r(a,b){for(var c;;){if(0===a.lookahead&&(m(a),0===a.lookahead)){if(b===J)return ua;break}if(a.match_length=0,c=F._tr_tally(a,0,a.window[a.strstart]),a.lookahead--,a.strstart++,c&&(h(a,!1),0===a.strm.avail_out))return ua}return a.insert=0,b===M?(h(a,!0),0===a.strm.avail_out?wa:xa):a.last_lit&&(h(a,!1),0===a.strm.avail_out)?ua:va}function s(a,b,c,d,e){this.good_length=a,this.max_lazy=b,this.nice_length=c,this.max_chain=d,this.func=e}function t(a){a.window_size=2*a.w_size,f(a.head),a.max_lazy_match=D[a.level].max_lazy,a.good_match=D[a.level].good_length,a.nice_match=D[a.level].nice_length,a.max_chain_length=D[a.level].max_chain,a.strstart=0,a.block_start=0,a.lookahead=0,a.insert=0,a.match_length=a.prev_length=ja-1,a.match_available=0,a.ins_h=0}function u(){this.strm=null,this.status=0,this.pending_buf=null,this.pending_buf_size=0,this.pending_out=0,this.pending=0,this.wrap=0,this.gzhead=null,this.gzindex=0,this.method=$,this.last_flush=-1,this.w_size=0,this.w_bits=0,this.w_mask=0,this.window=null,this.window_size=0,this.prev=null,this.head=null,this.ins_h=0,this.hash_size=0,this.hash_bits=0,this.hash_mask=0,this.hash_shift=0,this.block_start=0,this.match_length=0,this.prev_match=0,this.match_available=0,this.strstart=0,this.match_start=0,this.lookahead=0,this.prev_length=0,this.max_chain_length=0,this.max_lazy_match=0,this.level=0,this.strategy=0,this.good_match=0,this.nice_match=0,this.dyn_ltree=new E.Buf16(2*ha),this.dyn_dtree=new E.Buf16(2*(2*fa+1)),this.bl_tree=new E.Buf16(2*(2*ga+1)),f(this.dyn_ltree),f(this.dyn_dtree),f(this.bl_tree),this.l_desc=null,this.d_desc=null,this.bl_desc=null,this.bl_count=new E.Buf16(ia+1),this.heap=new E.Buf16(2*ea+1),f(this.heap),this.heap_len=0,this.heap_max=0,this.depth=new E.Buf16(2*ea+1),f(this.depth),this.l_buf=0,this.lit_bufsize=0,this.last_lit=0,this.d_buf=0,this.opt_len=0,this.static_len=0,this.matches=0,this.insert=0,this.bi_buf=0,this.bi_valid=0}function v(a){var b;return a&&a.state?(a.total_in=a.total_out=0,a.data_type=Z,b=a.state,b.pending=0,b.pending_out=0,b.wrap<0&&(b.wrap=-b.wrap),b.status=b.wrap?na:sa,a.adler=2===b.wrap?0:1,b.last_flush=J,F._tr_init(b),O):d(a,Q)}function w(a){var b=v(a);return b===O&&t(a.state),b}function x(a,b){return a&&a.state?2!==a.state.wrap?Q:(a.state.gzhead=b,O):Q}function y(a,b,c,e,f,g){if(!a)return Q;var h=1;if(b===T&&(b=6),0>e?(h=0,e=-e):e>15&&(h=2,e-=16),1>f||f>_||c!==$||8>e||e>15||0>b||b>9||0>g||g>X)return d(a,Q);8===e&&(e=9);var i=new u;return a.state=i,i.strm=a,i.wrap=h,i.gzhead=null,i.w_bits=e,i.w_size=1<<i.w_bits,i.w_mask=i.w_size-1,i.hash_bits=f+7,i.hash_size=1<<i.hash_bits,i.hash_mask=i.hash_size-1,i.hash_shift=~~((i.hash_bits+ja-1)/ja),i.window=new E.Buf8(2*i.w_size),i.head=new E.Buf16(i.hash_size),i.prev=new E.Buf16(i.w_size),i.lit_bufsize=1<<f+6,i.pending_buf_size=4*i.lit_bufsize,i.pending_buf=new E.Buf8(i.pending_buf_size),i.d_buf=i.lit_bufsize>>1,i.l_buf=3*i.lit_bufsize,i.level=b,i.strategy=g,i.method=c,w(a)}function z(a,b){return y(a,b,$,aa,ba,Y)}function A(a,b){var c,h,k,l;if(!a||!a.state||b>N||0>b)return a?d(a,Q):Q;if(h=a.state,!a.output||!a.input&&0!==a.avail_in||h.status===ta&&b!==M)return d(a,0===a.avail_out?S:Q);if(h.strm=a,c=h.last_flush,h.last_flush=b,h.status===na)if(2===h.wrap)a.adler=0,i(h,31),i(h,139),i(h,8),h.gzhead?(i(h,(h.gzhead.text?1:0)+(h.gzhead.hcrc?2:0)+(h.gzhead.extra?4:0)+(h.gzhead.name?8:0)+(h.gzhead.comment?16:0)),i(h,255&h.gzhead.time),i(h,h.gzhead.time>>8&255),i(h,h.gzhead.time>>16&255),i(h,h.gzhead.time>>24&255),i(h,9===h.level?2:h.strategy>=V||h.level<2?4:0),i(h,255&h.gzhead.os),h.gzhead.extra&&h.gzhead.extra.length&&(i(h,255&h.gzhead.extra.length),i(h,h.gzhead.extra.length>>8&255)),h.gzhead.hcrc&&(a.adler=H(a.adler,h.pending_buf,h.pending,0)),h.gzindex=0,h.status=oa):(i(h,0),i(h,0),i(h,0),i(h,0),i(h,0),i(h,9===h.level?2:h.strategy>=V||h.level<2?4:0),i(h,ya),h.status=sa);else{var m=$+(h.w_bits-8<<4)<<8,n=-1;n=h.strategy>=V||h.level<2?0:h.level<6?1:6===h.level?2:3,m|=n<<6,0!==h.strstart&&(m|=ma),m+=31-m%31,h.status=sa,j(h,m),0!==h.strstart&&(j(h,a.adler>>>16),j(h,65535&a.adler)),a.adler=1}if(h.status===oa)if(h.gzhead.extra){for(k=h.pending;h.gzindex<(65535&h.gzhead.extra.length)&&(h.pending!==h.pending_buf_size||(h.gzhead.hcrc&&h.pending>k&&(a.adler=H(a.adler,h.pending_buf,h.pending-k,k)),g(a),k=h.pending,h.pending!==h.pending_buf_size));)i(h,255&h.gzhead.extra[h.gzindex]),h.gzindex++;h.gzhead.hcrc&&h.pending>k&&(a.adler=H(a.adler,h.pending_buf,h.pending-k,k)),h.gzindex===h.gzhead.extra.length&&(h.gzindex=0,h.status=pa)}else h.status=pa;if(h.status===pa)if(h.gzhead.name){k=h.pending;do{if(h.pending===h.pending_buf_size&&(h.gzhead.hcrc&&h.pending>k&&(a.adler=H(a.adler,h.pending_buf,h.pending-k,k)),g(a),k=h.pending,h.pending===h.pending_buf_size)){l=1;break}l=h.gzindex<h.gzhead.name.length?255&h.gzhead.name.charCodeAt(h.gzindex++):0,i(h,l)}while(0!==l);h.gzhead.hcrc&&h.pending>k&&(a.adler=H(a.adler,h.pending_buf,h.pending-k,k)),0===l&&(h.gzindex=0,h.status=qa)}else h.status=qa;if(h.status===qa)if(h.gzhead.comment){k=h.pending;do{if(h.pending===h.pending_buf_size&&(h.gzhead.hcrc&&h.pending>k&&(a.adler=H(a.adler,h.pending_buf,h.pending-k,k)),g(a),k=h.pending,h.pending===h.pending_buf_size)){l=1;break}l=h.gzindex<h.gzhead.comment.length?255&h.gzhead.comment.charCodeAt(h.gzindex++):0,i(h,l)}while(0!==l);h.gzhead.hcrc&&h.pending>k&&(a.adler=H(a.adler,h.pending_buf,h.pending-k,k)),0===l&&(h.status=ra)}else h.status=ra;if(h.status===ra&&(h.gzhead.hcrc?(h.pending+2>h.pending_buf_size&&g(a),h.pending+2<=h.pending_buf_size&&(i(h,255&a.adler),i(h,a.adler>>8&255),a.adler=0,h.status=sa)):h.status=sa),0!==h.pending){if(g(a),0===a.avail_out)return h.last_flush=-1,O}else if(0===a.avail_in&&e(b)<=e(c)&&b!==M)return d(a,S);if(h.status===ta&&0!==a.avail_in)return d(a,S);if(0!==a.avail_in||0!==h.lookahead||b!==J&&h.status!==ta){var o=h.strategy===V?r(h,b):h.strategy===W?q(h,b):D[h.level].func(h,b);if(o!==wa&&o!==xa||(h.status=ta),o===ua||o===wa)return 0===a.avail_out&&(h.last_flush=-1),O;if(o===va&&(b===K?F._tr_align(h):b!==N&&(F._tr_stored_block(h,0,0,!1),b===L&&(f(h.head),0===h.lookahead&&(h.strstart=0,h.block_start=0,h.insert=0))),g(a),0===a.avail_out))return h.last_flush=-1,O}return b!==M?O:h.wrap<=0?P:(2===h.wrap?(i(h,255&a.adler),i(h,a.adler>>8&255),i(h,a.adler>>16&255),i(h,a.adler>>24&255),i(h,255&a.total_in),i(h,a.total_in>>8&255),i(h,a.total_in>>16&255),i(h,a.total_in>>24&255)):(j(h,a.adler>>>16),j(h,65535&a.adler)),g(a),h.wrap>0&&(h.wrap=-h.wrap),0!==h.pending?O:P)}function B(a){var b;return a&&a.state?(b=a.state.status,b!==na&&b!==oa&&b!==pa&&b!==qa&&b!==ra&&b!==sa&&b!==ta?d(a,Q):(a.state=null,b===sa?d(a,R):O)):Q}function C(a,b){var c,d,e,g,h,i,j,k,l=b.length;if(!a||!a.state)return Q;if(c=a.state,g=c.wrap,2===g||1===g&&c.status!==na||c.lookahead)return Q;for(1===g&&(a.adler=G(a.adler,b,l,0)),c.wrap=0,l>=c.w_size&&(0===g&&(f(c.head),c.strstart=0,c.block_start=0,c.insert=0),k=new E.Buf8(c.w_size),E.arraySet(k,b,l-c.w_size,c.w_size,0),b=k,l=c.w_size),h=a.avail_in,i=a.next_in,j=a.input,a.avail_in=l,a.next_in=0,a.input=b,m(c);c.lookahead>=ja;){d=c.strstart,e=c.lookahead-(ja-1);do c.ins_h=(c.ins_h<<c.hash_shift^c.window[d+ja-1])&c.hash_mask,c.prev[d&c.w_mask]=c.head[c.ins_h],c.head[c.ins_h]=d,d++;while(--e);c.strstart=d,c.lookahead=ja-1,m(c)}return c.strstart+=c.lookahead,c.block_start=c.strstart,c.insert=c.lookahead,c.lookahead=0,c.match_length=c.prev_length=ja-1,c.match_available=0,a.next_in=i,a.input=j,a.avail_in=h,c.wrap=g,O}var D,E=a("../utils/common"),F=a("./trees"),G=a("./adler32"),H=a("./crc32"),I=a("./messages"),J=0,K=1,L=3,M=4,N=5,O=0,P=1,Q=-2,R=-3,S=-5,T=-1,U=1,V=2,W=3,X=4,Y=0,Z=2,$=8,_=9,aa=15,ba=8,ca=29,da=256,ea=da+1+ca,fa=30,ga=19,ha=2*ea+1,ia=15,ja=3,ka=258,la=ka+ja+1,ma=32,na=42,oa=69,pa=73,qa=91,ra=103,sa=113,ta=666,ua=1,va=2,wa=3,xa=4,ya=3;D=[new s(0,0,0,0,n),new s(4,4,8,4,o),new s(4,5,16,8,o),new s(4,6,32,32,o),new s(4,4,16,16,p),new s(8,16,32,32,p),new s(8,16,128,128,p),new s(8,32,128,256,p),new s(32,128,258,1024,p),new s(32,258,258,4096,p)],c.deflateInit=z,c.deflateInit2=y,c.deflateReset=w,c.deflateResetKeep=v,c.deflateSetHeader=x,c.deflate=A,c.deflateEnd=B,c.deflateSetDictionary=C,c.deflateInfo="pako deflate (from Nodeca project)"},{"../utils/common":41,"./adler32":43,"./crc32":45,"./messages":51,"./trees":52}],47:[function(a,b,c){"use strict";function d(){this.text=0,this.time=0,this.xflags=0,this.os=0,this.extra=null,this.extra_len=0,this.name="",this.comment="",this.hcrc=0,this.done=!1}b.exports=d},{}],48:[function(a,b,c){"use strict";var d=30,e=12;b.exports=function(a,b){var c,f,g,h,i,j,k,l,m,n,o,p,q,r,s,t,u,v,w,x,y,z,A,B,C;c=a.state,f=a.next_in,B=a.input,g=f+(a.avail_in-5),h=a.next_out,C=a.output,i=h-(b-a.avail_out),j=h+(a.avail_out-257),k=c.dmax,l=c.wsize,m=c.whave,n=c.wnext,o=c.window,p=c.hold,q=c.bits,r=c.lencode,s=c.distcode,t=(1<<c.lenbits)-1,u=(1<<c.distbits)-1;a:do{15>q&&(p+=B[f++]<<q,q+=8,p+=B[f++]<<q,q+=8),v=r[p&t];b:for(;;){if(w=v>>>24,p>>>=w,q-=w,w=v>>>16&255,0===w)C[h++]=65535&v;else{if(!(16&w)){if(0===(64&w)){v=r[(65535&v)+(p&(1<<w)-1)];continue b}if(32&w){c.mode=e;break a}a.msg="invalid literal/length code",c.mode=d;break a}x=65535&v,w&=15,w&&(w>q&&(p+=B[f++]<<q,q+=8),x+=p&(1<<w)-1,p>>>=w,q-=w),15>q&&(p+=B[f++]<<q,q+=8,p+=B[f++]<<q,q+=8),v=s[p&u];c:for(;;){if(w=v>>>24,p>>>=w,q-=w,w=v>>>16&255,!(16&w)){if(0===(64&w)){v=s[(65535&v)+(p&(1<<w)-1)];continue c}a.msg="invalid distance code",c.mode=d;break a}if(y=65535&v,w&=15,w>q&&(p+=B[f++]<<q,q+=8,w>q&&(p+=B[f++]<<q,q+=8)),y+=p&(1<<w)-1,y>k){a.msg="invalid distance too far back",c.mode=d;break a}if(p>>>=w,q-=w,w=h-i,y>w){if(w=y-w,w>m&&c.sane){a.msg="invalid distance too far back",c.mode=d;break a}if(z=0,A=o,0===n){if(z+=l-w,x>w){x-=w;do C[h++]=o[z++];while(--w);z=h-y,A=C}}else if(w>n){if(z+=l+n-w,w-=n,x>w){x-=w;do C[h++]=o[z++];while(--w);if(z=0,x>n){w=n,x-=w;do C[h++]=o[z++];while(--w);z=h-y,A=C}}}else if(z+=n-w,x>w){x-=w;do C[h++]=o[z++];while(--w);z=h-y,A=C}for(;x>2;)C[h++]=A[z++],C[h++]=A[z++],C[h++]=A[z++],x-=3;x&&(C[h++]=A[z++],x>1&&(C[h++]=A[z++]))}else{z=h-y;do C[h++]=C[z++],C[h++]=C[z++],C[h++]=C[z++],x-=3;while(x>2);x&&(C[h++]=C[z++],x>1&&(C[h++]=C[z++]))}break}}break}}while(g>f&&j>h);x=q>>3,f-=x,q-=x<<3,p&=(1<<q)-1,a.next_in=f,a.next_out=h,a.avail_in=g>f?5+(g-f):5-(f-g),a.avail_out=j>h?257+(j-h):257-(h-j),c.hold=p,c.bits=q}},{}],49:[function(a,b,c){"use strict";function d(a){return(a>>>24&255)+(a>>>8&65280)+((65280&a)<<8)+((255&a)<<24)}function e(){this.mode=0,this.last=!1,this.wrap=0,this.havedict=!1,this.flags=0,this.dmax=0,this.check=0,this.total=0,this.head=null,this.wbits=0,this.wsize=0,this.whave=0,this.wnext=0,this.window=null,this.hold=0,this.bits=0,this.length=0,this.offset=0,this.extra=0,this.lencode=null,this.distcode=null,this.lenbits=0,this.distbits=0,this.ncode=0,this.nlen=0,this.ndist=0,this.have=0,this.next=null,this.lens=new s.Buf16(320),this.work=new s.Buf16(288),this.lendyn=null,this.distdyn=null,this.sane=0,this.back=0,this.was=0}function f(a){var b;return a&&a.state?(b=a.state,a.total_in=a.total_out=b.total=0,a.msg="",b.wrap&&(a.adler=1&b.wrap),b.mode=L,b.last=0,b.havedict=0,b.dmax=32768,b.head=null,b.hold=0,b.bits=0,b.lencode=b.lendyn=new s.Buf32(pa),b.distcode=b.distdyn=new s.Buf32(qa),b.sane=1,b.back=-1,D):G}function g(a){var b;return a&&a.state?(b=a.state,b.wsize=0,b.whave=0,b.wnext=0,f(a)):G}function h(a,b){var c,d;return a&&a.state?(d=a.state,0>b?(c=0,b=-b):(c=(b>>4)+1,48>b&&(b&=15)),b&&(8>b||b>15)?G:(null!==d.window&&d.wbits!==b&&(d.window=null),d.wrap=c,d.wbits=b,g(a))):G}function i(a,b){var c,d;return a?(d=new e,a.state=d,d.window=null,c=h(a,b),c!==D&&(a.state=null),c):G}function j(a){return i(a,sa)}function k(a){if(ta){var b;for(q=new s.Buf32(512),r=new s.Buf32(32),b=0;144>b;)a.lens[b++]=8;for(;256>b;)a.lens[b++]=9;for(;280>b;)a.lens[b++]=7;for(;288>b;)a.lens[b++]=8;for(w(y,a.lens,0,288,q,0,a.work,{bits:9}),b=0;32>b;)a.lens[b++]=5;w(z,a.lens,0,32,r,0,a.work,{bits:5}),ta=!1}a.lencode=q,a.lenbits=9,a.distcode=r,a.distbits=5}function l(a,b,c,d){var e,f=a.state;return null===f.window&&(f.wsize=1<<f.wbits,f.wnext=0,f.whave=0,f.window=new s.Buf8(f.wsize)),d>=f.wsize?(s.arraySet(f.window,b,c-f.wsize,f.wsize,0),f.wnext=0,f.whave=f.wsize):(e=f.wsize-f.wnext,e>d&&(e=d),s.arraySet(f.window,b,c-d,e,f.wnext),d-=e,d?(s.arraySet(f.window,b,c-d,d,0),f.wnext=d,f.whave=f.wsize):(f.wnext+=e,f.wnext===f.wsize&&(f.wnext=0),f.whave<f.wsize&&(f.whave+=e))),0}function m(a,b){var c,e,f,g,h,i,j,m,n,o,p,q,r,pa,qa,ra,sa,ta,ua,va,wa,xa,ya,za,Aa=0,Ba=new s.Buf8(4),Ca=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15];if(!a||!a.state||!a.output||!a.input&&0!==a.avail_in)return G;c=a.state,c.mode===W&&(c.mode=X),h=a.next_out,f=a.output,j=a.avail_out,g=a.next_in,e=a.input,i=a.avail_in,m=c.hold,n=c.bits,o=i,p=j,xa=D;a:for(;;)switch(c.mode){case L:if(0===c.wrap){c.mode=X;break}for(;16>n;){if(0===i)break a;i--,m+=e[g++]<<n,n+=8}if(2&c.wrap&&35615===m){c.check=0,Ba[0]=255&m,Ba[1]=m>>>8&255,c.check=u(c.check,Ba,2,0),m=0,n=0,c.mode=M;break}if(c.flags=0,c.head&&(c.head.done=!1),!(1&c.wrap)||(((255&m)<<8)+(m>>8))%31){a.msg="incorrect header check",c.mode=ma;break}if((15&m)!==K){a.msg="unknown compression method",c.mode=ma;break}if(m>>>=4,n-=4,wa=(15&m)+8,0===c.wbits)c.wbits=wa;else if(wa>c.wbits){a.msg="invalid window size",c.mode=ma;break}c.dmax=1<<wa,a.adler=c.check=1,c.mode=512&m?U:W,m=0,n=0;break;case M:for(;16>n;){if(0===i)break a;i--,m+=e[g++]<<n,n+=8}if(c.flags=m,(255&c.flags)!==K){a.msg="unknown compression method",c.mode=ma;break}if(57344&c.flags){a.msg="unknown header flags set",c.mode=ma;break}c.head&&(c.head.text=m>>8&1),512&c.flags&&(Ba[0]=255&m,Ba[1]=m>>>8&255,c.check=u(c.check,Ba,2,0)),m=0,n=0,c.mode=N;case N:for(;32>n;){if(0===i)break a;i--,m+=e[g++]<<n,n+=8}c.head&&(c.head.time=m),512&c.flags&&(Ba[0]=255&m,Ba[1]=m>>>8&255,Ba[2]=m>>>16&255,Ba[3]=m>>>24&255,c.check=u(c.check,Ba,4,0)),m=0,n=0,c.mode=O;case O:for(;16>n;){if(0===i)break a;i--,m+=e[g++]<<n,n+=8}c.head&&(c.head.xflags=255&m,c.head.os=m>>8),512&c.flags&&(Ba[0]=255&m,Ba[1]=m>>>8&255,c.check=u(c.check,Ba,2,0)),m=0,n=0,c.mode=P;case P:if(1024&c.flags){for(;16>n;){if(0===i)break a;i--,m+=e[g++]<<n,n+=8}c.length=m,c.head&&(c.head.extra_len=m),512&c.flags&&(Ba[0]=255&m,Ba[1]=m>>>8&255,c.check=u(c.check,Ba,2,0)),m=0,n=0}else c.head&&(c.head.extra=null);c.mode=Q;case Q:if(1024&c.flags&&(q=c.length,q>i&&(q=i),q&&(c.head&&(wa=c.head.extra_len-c.length,c.head.extra||(c.head.extra=new Array(c.head.extra_len)),s.arraySet(c.head.extra,e,g,q,wa)),512&c.flags&&(c.check=u(c.check,e,q,g)),i-=q,g+=q,c.length-=q),c.length))break a;c.length=0,c.mode=R;case R:if(2048&c.flags){if(0===i)break a;q=0;do wa=e[g+q++],c.head&&wa&&c.length<65536&&(c.head.name+=String.fromCharCode(wa));while(wa&&i>q);if(512&c.flags&&(c.check=u(c.check,e,q,g)),i-=q,g+=q,wa)break a}else c.head&&(c.head.name=null);c.length=0,c.mode=S;case S:if(4096&c.flags){if(0===i)break a;q=0;do wa=e[g+q++],c.head&&wa&&c.length<65536&&(c.head.comment+=String.fromCharCode(wa));while(wa&&i>q);if(512&c.flags&&(c.check=u(c.check,e,q,g)),i-=q,g+=q,wa)break a}else c.head&&(c.head.comment=null);c.mode=T;case T:if(512&c.flags){for(;16>n;){if(0===i)break a;i--,m+=e[g++]<<n,n+=8}if(m!==(65535&c.check)){a.msg="header crc mismatch",c.mode=ma;break}m=0,n=0}c.head&&(c.head.hcrc=c.flags>>9&1,c.head.done=!0),a.adler=c.check=0,c.mode=W;break;case U:for(;32>n;){if(0===i)break a;i--,m+=e[g++]<<n,n+=8}a.adler=c.check=d(m),m=0,n=0,c.mode=V;case V:if(0===c.havedict)return a.next_out=h,a.avail_out=j,a.next_in=g,a.avail_in=i,c.hold=m,c.bits=n,F;a.adler=c.check=1,c.mode=W;case W:if(b===B||b===C)break a;case X:if(c.last){m>>>=7&n,n-=7&n,c.mode=ja;break}for(;3>n;){if(0===i)break a;i--,m+=e[g++]<<n,n+=8}switch(c.last=1&m,m>>>=1,n-=1,3&m){case 0:c.mode=Y;break;case 1:if(k(c),c.mode=ca,b===C){m>>>=2,n-=2;break a}break;case 2:c.mode=_;break;case 3:a.msg="invalid block type",c.mode=ma}m>>>=2,n-=2;break;case Y:for(m>>>=7&n,n-=7&n;32>n;){if(0===i)break a;i--,m+=e[g++]<<n,n+=8}if((65535&m)!==(m>>>16^65535)){a.msg="invalid stored block lengths",c.mode=ma;break}if(c.length=65535&m,m=0,n=0,c.mode=Z,b===C)break a;case Z:c.mode=$;case $:if(q=c.length){if(q>i&&(q=i),q>j&&(q=j),0===q)break a;s.arraySet(f,e,g,q,h),i-=q,g+=q,j-=q,h+=q,c.length-=q;break}c.mode=W;break;case _:for(;14>n;){if(0===i)break a;i--,m+=e[g++]<<n,n+=8}if(c.nlen=(31&m)+257,m>>>=5,n-=5,c.ndist=(31&m)+1,m>>>=5,n-=5,c.ncode=(15&m)+4,m>>>=4,n-=4,c.nlen>286||c.ndist>30){a.msg="too many length or distance symbols",c.mode=ma;break}c.have=0,c.mode=aa;case aa:for(;c.have<c.ncode;){for(;3>n;){if(0===i)break a;i--,m+=e[g++]<<n,n+=8}c.lens[Ca[c.have++]]=7&m,m>>>=3,n-=3}for(;c.have<19;)c.lens[Ca[c.have++]]=0;if(c.lencode=c.lendyn,c.lenbits=7,ya={bits:c.lenbits},xa=w(x,c.lens,0,19,c.lencode,0,c.work,ya),c.lenbits=ya.bits,xa){a.msg="invalid code lengths set",c.mode=ma;break}c.have=0,c.mode=ba;case ba:for(;c.have<c.nlen+c.ndist;){for(;Aa=c.lencode[m&(1<<c.lenbits)-1],qa=Aa>>>24,ra=Aa>>>16&255,sa=65535&Aa,!(n>=qa);){if(0===i)break a;i--,m+=e[g++]<<n,n+=8}if(16>sa)m>>>=qa,n-=qa,c.lens[c.have++]=sa;else{if(16===sa){for(za=qa+2;za>n;){if(0===i)break a;i--,m+=e[g++]<<n,n+=8}if(m>>>=qa,n-=qa,0===c.have){a.msg="invalid bit length repeat",c.mode=ma;break}wa=c.lens[c.have-1],q=3+(3&m),m>>>=2,n-=2}else if(17===sa){for(za=qa+3;za>n;){if(0===i)break a;i--,m+=e[g++]<<n,n+=8}m>>>=qa,n-=qa,wa=0,q=3+(7&m),m>>>=3,n-=3}else{for(za=qa+7;za>n;){if(0===i)break a;i--,m+=e[g++]<<n,n+=8}m>>>=qa,n-=qa,wa=0,q=11+(127&m),m>>>=7,n-=7}if(c.have+q>c.nlen+c.ndist){a.msg="invalid bit length repeat",c.mode=ma;break}for(;q--;)c.lens[c.have++]=wa}}if(c.mode===ma)break;if(0===c.lens[256]){a.msg="invalid code -- missing end-of-block",c.mode=ma;break}if(c.lenbits=9,ya={bits:c.lenbits},xa=w(y,c.lens,0,c.nlen,c.lencode,0,c.work,ya),c.lenbits=ya.bits,xa){a.msg="invalid literal/lengths set",c.mode=ma;break}if(c.distbits=6,c.distcode=c.distdyn,ya={bits:c.distbits},xa=w(z,c.lens,c.nlen,c.ndist,c.distcode,0,c.work,ya),c.distbits=ya.bits,xa){a.msg="invalid distances set",c.mode=ma;break}if(c.mode=ca,b===C)break a;case ca:c.mode=da;case da:if(i>=6&&j>=258){a.next_out=h,a.avail_out=j,a.next_in=g,a.avail_in=i,c.hold=m,c.bits=n,v(a,p),h=a.next_out,f=a.output,j=a.avail_out,g=a.next_in,e=a.input,i=a.avail_in,m=c.hold,n=c.bits,c.mode===W&&(c.back=-1);break}for(c.back=0;Aa=c.lencode[m&(1<<c.lenbits)-1],qa=Aa>>>24,ra=Aa>>>16&255,sa=65535&Aa,!(n>=qa);){if(0===i)break a;i--,m+=e[g++]<<n,n+=8}if(ra&&0===(240&ra)){for(ta=qa,ua=ra,va=sa;Aa=c.lencode[va+((m&(1<<ta+ua)-1)>>ta)],qa=Aa>>>24,ra=Aa>>>16&255,sa=65535&Aa,!(n>=ta+qa);){if(0===i)break a;i--,m+=e[g++]<<n,n+=8}m>>>=ta,n-=ta,c.back+=ta}if(m>>>=qa,n-=qa,c.back+=qa,c.length=sa,0===ra){c.mode=ia;break}if(32&ra){c.back=-1,c.mode=W;break}if(64&ra){a.msg="invalid literal/length code",c.mode=ma;break}c.extra=15&ra,c.mode=ea;case ea:if(c.extra){for(za=c.extra;za>n;){if(0===i)break a;i--,m+=e[g++]<<n,n+=8}c.length+=m&(1<<c.extra)-1,m>>>=c.extra,n-=c.extra,c.back+=c.extra}c.was=c.length,c.mode=fa;case fa:for(;Aa=c.distcode[m&(1<<c.distbits)-1],qa=Aa>>>24,ra=Aa>>>16&255,sa=65535&Aa,!(n>=qa);){if(0===i)break a;i--,m+=e[g++]<<n,n+=8}if(0===(240&ra)){for(ta=qa,ua=ra,va=sa;Aa=c.distcode[va+((m&(1<<ta+ua)-1)>>ta)],qa=Aa>>>24,ra=Aa>>>16&255,sa=65535&Aa,!(n>=ta+qa);){if(0===i)break a;i--,m+=e[g++]<<n,n+=8}m>>>=ta,n-=ta,c.back+=ta}if(m>>>=qa,n-=qa,c.back+=qa,64&ra){a.msg="invalid distance code",c.mode=ma;break}c.offset=sa,c.extra=15&ra,c.mode=ga;case ga:if(c.extra){for(za=c.extra;za>n;){if(0===i)break a;i--,m+=e[g++]<<n,n+=8}c.offset+=m&(1<<c.extra)-1,m>>>=c.extra,n-=c.extra,c.back+=c.extra}if(c.offset>c.dmax){a.msg="invalid distance too far back",c.mode=ma;break}c.mode=ha;case ha:if(0===j)break a;if(q=p-j,c.offset>q){if(q=c.offset-q,q>c.whave&&c.sane){a.msg="invalid distance too far back",c.mode=ma;break}q>c.wnext?(q-=c.wnext,r=c.wsize-q):r=c.wnext-q,q>c.length&&(q=c.length),pa=c.window}else pa=f,r=h-c.offset,q=c.length;q>j&&(q=j),j-=q,c.length-=q;do f[h++]=pa[r++];while(--q);0===c.length&&(c.mode=da);break;case ia:if(0===j)break a;f[h++]=c.length,j--,c.mode=da;break;case ja:if(c.wrap){for(;32>n;){if(0===i)break a;i--,m|=e[g++]<<n,n+=8}if(p-=j,a.total_out+=p,c.total+=p,p&&(a.adler=c.check=c.flags?u(c.check,f,p,h-p):t(c.check,f,p,h-p)),p=j,(c.flags?m:d(m))!==c.check){a.msg="incorrect data check",c.mode=ma;break}m=0,n=0}c.mode=ka;case ka:if(c.wrap&&c.flags){for(;32>n;){if(0===i)break a;i--,m+=e[g++]<<n,n+=8}if(m!==(4294967295&c.total)){a.msg="incorrect length check",c.mode=ma;break}m=0,n=0}c.mode=la;case la:xa=E;break a;case ma:xa=H;break a;case na:return I;case oa:default:return G}return a.next_out=h,a.avail_out=j,a.next_in=g,a.avail_in=i,c.hold=m,c.bits=n,(c.wsize||p!==a.avail_out&&c.mode<ma&&(c.mode<ja||b!==A))&&l(a,a.output,a.next_out,p-a.avail_out)?(c.mode=na,I):(o-=a.avail_in,p-=a.avail_out,a.total_in+=o,a.total_out+=p,c.total+=p,c.wrap&&p&&(a.adler=c.check=c.flags?u(c.check,f,p,a.next_out-p):t(c.check,f,p,a.next_out-p)),a.data_type=c.bits+(c.last?64:0)+(c.mode===W?128:0)+(c.mode===ca||c.mode===Z?256:0),(0===o&&0===p||b===A)&&xa===D&&(xa=J),xa)}function n(a){if(!a||!a.state)return G;var b=a.state;return b.window&&(b.window=null),a.state=null,D}function o(a,b){var c;return a&&a.state?(c=a.state,0===(2&c.wrap)?G:(c.head=b,b.done=!1,D)):G}function p(a,b){var c,d,e,f=b.length;return a&&a.state?(c=a.state,0!==c.wrap&&c.mode!==V?G:c.mode===V&&(d=1,d=t(d,b,f,0),d!==c.check)?H:(e=l(a,b,f,f))?(c.mode=na,I):(c.havedict=1,D)):G}var q,r,s=a("../utils/common"),t=a("./adler32"),u=a("./crc32"),v=a("./inffast"),w=a("./inftrees"),x=0,y=1,z=2,A=4,B=5,C=6,D=0,E=1,F=2,G=-2,H=-3,I=-4,J=-5,K=8,L=1,M=2,N=3,O=4,P=5,Q=6,R=7,S=8,T=9,U=10,V=11,W=12,X=13,Y=14,Z=15,$=16,_=17,aa=18,ba=19,ca=20,da=21,ea=22,fa=23,ga=24,ha=25,ia=26,ja=27,ka=28,la=29,ma=30,na=31,oa=32,pa=852,qa=592,ra=15,sa=ra,ta=!0;c.inflateReset=g,c.inflateReset2=h,c.inflateResetKeep=f,c.inflateInit=j,c.inflateInit2=i,c.inflate=m,c.inflateEnd=n,c.inflateGetHeader=o,c.inflateSetDictionary=p,c.inflateInfo="pako inflate (from Nodeca project)"},{"../utils/common":41,"./adler32":43,"./crc32":45,"./inffast":48,"./inftrees":50}],50:[function(a,b,c){"use strict";var d=a("../utils/common"),e=15,f=852,g=592,h=0,i=1,j=2,k=[3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258,0,0],l=[16,16,16,16,16,16,16,16,17,17,17,17,18,18,18,18,19,19,19,19,20,20,20,20,21,21,21,21,16,72,78],m=[1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577,0,0],n=[16,16,16,16,17,17,18,18,19,19,20,20,21,21,22,22,23,23,24,24,25,25,26,26,27,27,28,28,29,29,64,64];b.exports=function(a,b,c,o,p,q,r,s){var t,u,v,w,x,y,z,A,B,C=s.bits,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=null,O=0,P=new d.Buf16(e+1),Q=new d.Buf16(e+1),R=null,S=0;for(D=0;e>=D;D++)P[D]=0;for(E=0;o>E;E++)P[b[c+E]]++;for(H=C,G=e;G>=1&&0===P[G];G--);if(H>G&&(H=G),0===G)return p[q++]=20971520,p[q++]=20971520,s.bits=1,0;for(F=1;G>F&&0===P[F];F++);for(F>H&&(H=F),K=1,D=1;e>=D;D++)if(K<<=1,K-=P[D],0>K)return-1;if(K>0&&(a===h||1!==G))return-1;for(Q[1]=0,D=1;e>D;D++)Q[D+1]=Q[D]+P[D];for(E=0;o>E;E++)0!==b[c+E]&&(r[Q[b[c+E]]++]=E);if(a===h?(N=R=r,y=19):a===i?(N=k,O-=257,R=l,S-=257,y=256):(N=m,R=n,y=-1),M=0,E=0,D=F,x=q,I=H,J=0,v=-1,L=1<<H,w=L-1,a===i&&L>f||a===j&&L>g)return 1;for(var T=0;;){T++,z=D-J,r[E]<y?(A=0,B=r[E]):r[E]>y?(A=R[S+r[E]],B=N[O+r[E]]):(A=96,B=0),t=1<<D-J,u=1<<I,F=u;do u-=t,p[x+(M>>J)+u]=z<<24|A<<16|B|0;while(0!==u);for(t=1<<D-1;M&t;)t>>=1;if(0!==t?(M&=t-1,M+=t):M=0,E++,0===--P[D]){if(D===G)break;D=b[c+r[E]]}if(D>H&&(M&w)!==v){for(0===J&&(J=H),x+=F,I=D-J,K=1<<I;G>I+J&&(K-=P[I+J],!(0>=K));)I++,K<<=1;if(L+=1<<I,a===i&&L>f||a===j&&L>g)return 1;v=M&w,p[v]=H<<24|I<<16|x-q|0}}return 0!==M&&(p[x+M]=D-J<<24|64<<16|0),s.bits=H,0}},{"../utils/common":41}],51:[function(a,b,c){"use strict";b.exports={2:"need dictionary",1:"stream end",0:"","-1":"file error","-2":"stream error","-3":"data error","-4":"insufficient memory","-5":"buffer error","-6":"incompatible version"}},{}],52:[function(a,b,c){"use strict";function d(a){for(var b=a.length;--b>=0;)a[b]=0}function e(a,b,c,d,e){this.static_tree=a,this.extra_bits=b,this.extra_base=c,this.elems=d,this.max_length=e,this.has_stree=a&&a.length}function f(a,b){this.dyn_tree=a,this.max_code=0,this.stat_desc=b}function g(a){return 256>a?ia[a]:ia[256+(a>>>7)]}function h(a,b){a.pending_buf[a.pending++]=255&b,a.pending_buf[a.pending++]=b>>>8&255}function i(a,b,c){a.bi_valid>X-c?(a.bi_buf|=b<<a.bi_valid&65535,h(a,a.bi_buf),a.bi_buf=b>>X-a.bi_valid,a.bi_valid+=c-X):(a.bi_buf|=b<<a.bi_valid&65535,a.bi_valid+=c)}function j(a,b,c){i(a,c[2*b],c[2*b+1])}function k(a,b){var c=0;do c|=1&a,a>>>=1,c<<=1;while(--b>0);return c>>>1}function l(a){16===a.bi_valid?(h(a,a.bi_buf),a.bi_buf=0,a.bi_valid=0):a.bi_valid>=8&&(a.pending_buf[a.pending++]=255&a.bi_buf,a.bi_buf>>=8,a.bi_valid-=8)}function m(a,b){var c,d,e,f,g,h,i=b.dyn_tree,j=b.max_code,k=b.stat_desc.static_tree,l=b.stat_desc.has_stree,m=b.stat_desc.extra_bits,n=b.stat_desc.extra_base,o=b.stat_desc.max_length,p=0;for(f=0;W>=f;f++)a.bl_count[f]=0;for(i[2*a.heap[a.heap_max]+1]=0,c=a.heap_max+1;V>c;c++)d=a.heap[c],f=i[2*i[2*d+1]+1]+1,f>o&&(f=o,p++),i[2*d+1]=f,d>j||(a.bl_count[f]++,g=0,d>=n&&(g=m[d-n]),h=i[2*d],a.opt_len+=h*(f+g),l&&(a.static_len+=h*(k[2*d+1]+g)));if(0!==p){do{for(f=o-1;0===a.bl_count[f];)f--;a.bl_count[f]--,a.bl_count[f+1]+=2,a.bl_count[o]--,p-=2}while(p>0);for(f=o;0!==f;f--)for(d=a.bl_count[f];0!==d;)e=a.heap[--c],e>j||(i[2*e+1]!==f&&(a.opt_len+=(f-i[2*e+1])*i[2*e],i[2*e+1]=f),d--)}}function n(a,b,c){var d,e,f=new Array(W+1),g=0;for(d=1;W>=d;d++)f[d]=g=g+c[d-1]<<1;for(e=0;b>=e;e++){var h=a[2*e+1];0!==h&&(a[2*e]=k(f[h]++,h))}}function o(){var a,b,c,d,f,g=new Array(W+1);for(c=0,d=0;Q-1>d;d++)for(ka[d]=c,a=0;a<1<<ba[d];a++)ja[c++]=d;for(ja[c-1]=d,f=0,d=0;16>d;d++)for(la[d]=f,a=0;a<1<<ca[d];a++)ia[f++]=d;for(f>>=7;T>d;d++)for(la[d]=f<<7,a=0;a<1<<ca[d]-7;a++)ia[256+f++]=d;for(b=0;W>=b;b++)g[b]=0;for(a=0;143>=a;)ga[2*a+1]=8,a++,g[8]++;for(;255>=a;)ga[2*a+1]=9,a++,g[9]++;for(;279>=a;)ga[2*a+1]=7,a++,g[7]++;for(;287>=a;)ga[2*a+1]=8,a++,g[8]++;for(n(ga,S+1,g),a=0;T>a;a++)ha[2*a+1]=5,ha[2*a]=k(a,5);ma=new e(ga,ba,R+1,S,W),na=new e(ha,ca,0,T,W),oa=new e(new Array(0),da,0,U,Y)}function p(a){var b;for(b=0;S>b;b++)a.dyn_ltree[2*b]=0;for(b=0;T>b;b++)a.dyn_dtree[2*b]=0;for(b=0;U>b;b++)a.bl_tree[2*b]=0;a.dyn_ltree[2*Z]=1,a.opt_len=a.static_len=0,a.last_lit=a.matches=0}function q(a){a.bi_valid>8?h(a,a.bi_buf):a.bi_valid>0&&(a.pending_buf[a.pending++]=a.bi_buf),a.bi_buf=0,a.bi_valid=0}function r(a,b,c,d){q(a),d&&(h(a,c),h(a,~c)),G.arraySet(a.pending_buf,a.window,b,c,a.pending),a.pending+=c}function s(a,b,c,d){var e=2*b,f=2*c;return a[e]<a[f]||a[e]===a[f]&&d[b]<=d[c]}function t(a,b,c){for(var d=a.heap[c],e=c<<1;e<=a.heap_len&&(e<a.heap_len&&s(b,a.heap[e+1],a.heap[e],a.depth)&&e++,!s(b,d,a.heap[e],a.depth));)a.heap[c]=a.heap[e],c=e,e<<=1;a.heap[c]=d}function u(a,b,c){var d,e,f,h,k=0;if(0!==a.last_lit)do d=a.pending_buf[a.d_buf+2*k]<<8|a.pending_buf[a.d_buf+2*k+1],e=a.pending_buf[a.l_buf+k],k++,0===d?j(a,e,b):(f=ja[e],j(a,f+R+1,b),h=ba[f],0!==h&&(e-=ka[f],i(a,e,h)),d--,f=g(d),j(a,f,c),h=ca[f],0!==h&&(d-=la[f],i(a,d,h)));while(k<a.last_lit);j(a,Z,b)}function v(a,b){var c,d,e,f=b.dyn_tree,g=b.stat_desc.static_tree,h=b.stat_desc.has_stree,i=b.stat_desc.elems,j=-1;for(a.heap_len=0,a.heap_max=V,c=0;i>c;c++)0!==f[2*c]?(a.heap[++a.heap_len]=j=c,a.depth[c]=0):f[2*c+1]=0;for(;a.heap_len<2;)e=a.heap[++a.heap_len]=2>j?++j:0,f[2*e]=1,a.depth[e]=0,a.opt_len--,h&&(a.static_len-=g[2*e+1]);for(b.max_code=j,c=a.heap_len>>1;c>=1;c--)t(a,f,c);e=i;do c=a.heap[1],a.heap[1]=a.heap[a.heap_len--],t(a,f,1),d=a.heap[1],a.heap[--a.heap_max]=c,a.heap[--a.heap_max]=d,f[2*e]=f[2*c]+f[2*d],a.depth[e]=(a.depth[c]>=a.depth[d]?a.depth[c]:a.depth[d])+1,f[2*c+1]=f[2*d+1]=e,a.heap[1]=e++,t(a,f,1);while(a.heap_len>=2);a.heap[--a.heap_max]=a.heap[1],m(a,b),n(f,j,a.bl_count)}function w(a,b,c){var d,e,f=-1,g=b[1],h=0,i=7,j=4;for(0===g&&(i=138,j=3),b[2*(c+1)+1]=65535,d=0;c>=d;d++)e=g,g=b[2*(d+1)+1],
++h<i&&e===g||(j>h?a.bl_tree[2*e]+=h:0!==e?(e!==f&&a.bl_tree[2*e]++,a.bl_tree[2*$]++):10>=h?a.bl_tree[2*_]++:a.bl_tree[2*aa]++,h=0,f=e,0===g?(i=138,j=3):e===g?(i=6,j=3):(i=7,j=4))}function x(a,b,c){var d,e,f=-1,g=b[1],h=0,k=7,l=4;for(0===g&&(k=138,l=3),d=0;c>=d;d++)if(e=g,g=b[2*(d+1)+1],!(++h<k&&e===g)){if(l>h){do j(a,e,a.bl_tree);while(0!==--h)}else 0!==e?(e!==f&&(j(a,e,a.bl_tree),h--),j(a,$,a.bl_tree),i(a,h-3,2)):10>=h?(j(a,_,a.bl_tree),i(a,h-3,3)):(j(a,aa,a.bl_tree),i(a,h-11,7));h=0,f=e,0===g?(k=138,l=3):e===g?(k=6,l=3):(k=7,l=4)}}function y(a){var b;for(w(a,a.dyn_ltree,a.l_desc.max_code),w(a,a.dyn_dtree,a.d_desc.max_code),v(a,a.bl_desc),b=U-1;b>=3&&0===a.bl_tree[2*ea[b]+1];b--);return a.opt_len+=3*(b+1)+5+5+4,b}function z(a,b,c,d){var e;for(i(a,b-257,5),i(a,c-1,5),i(a,d-4,4),e=0;d>e;e++)i(a,a.bl_tree[2*ea[e]+1],3);x(a,a.dyn_ltree,b-1),x(a,a.dyn_dtree,c-1)}function A(a){var b,c=4093624447;for(b=0;31>=b;b++,c>>>=1)if(1&c&&0!==a.dyn_ltree[2*b])return I;if(0!==a.dyn_ltree[18]||0!==a.dyn_ltree[20]||0!==a.dyn_ltree[26])return J;for(b=32;R>b;b++)if(0!==a.dyn_ltree[2*b])return J;return I}function B(a){pa||(o(),pa=!0),a.l_desc=new f(a.dyn_ltree,ma),a.d_desc=new f(a.dyn_dtree,na),a.bl_desc=new f(a.bl_tree,oa),a.bi_buf=0,a.bi_valid=0,p(a)}function C(a,b,c,d){i(a,(L<<1)+(d?1:0),3),r(a,b,c,!0)}function D(a){i(a,M<<1,3),j(a,Z,ga),l(a)}function E(a,b,c,d){var e,f,g=0;a.level>0?(a.strm.data_type===K&&(a.strm.data_type=A(a)),v(a,a.l_desc),v(a,a.d_desc),g=y(a),e=a.opt_len+3+7>>>3,f=a.static_len+3+7>>>3,e>=f&&(e=f)):e=f=c+5,e>=c+4&&-1!==b?C(a,b,c,d):a.strategy===H||f===e?(i(a,(M<<1)+(d?1:0),3),u(a,ga,ha)):(i(a,(N<<1)+(d?1:0),3),z(a,a.l_desc.max_code+1,a.d_desc.max_code+1,g+1),u(a,a.dyn_ltree,a.dyn_dtree)),p(a),d&&q(a)}function F(a,b,c){return a.pending_buf[a.d_buf+2*a.last_lit]=b>>>8&255,a.pending_buf[a.d_buf+2*a.last_lit+1]=255&b,a.pending_buf[a.l_buf+a.last_lit]=255&c,a.last_lit++,0===b?a.dyn_ltree[2*c]++:(a.matches++,b--,a.dyn_ltree[2*(ja[c]+R+1)]++,a.dyn_dtree[2*g(b)]++),a.last_lit===a.lit_bufsize-1}var G=a("../utils/common"),H=4,I=0,J=1,K=2,L=0,M=1,N=2,O=3,P=258,Q=29,R=256,S=R+1+Q,T=30,U=19,V=2*S+1,W=15,X=16,Y=7,Z=256,$=16,_=17,aa=18,ba=[0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0],ca=[0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13],da=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,3,7],ea=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15],fa=512,ga=new Array(2*(S+2));d(ga);var ha=new Array(2*T);d(ha);var ia=new Array(fa);d(ia);var ja=new Array(P-O+1);d(ja);var ka=new Array(Q);d(ka);var la=new Array(T);d(la);var ma,na,oa,pa=!1;c._tr_init=B,c._tr_stored_block=C,c._tr_flush_block=E,c._tr_tally=F,c._tr_align=D},{"../utils/common":41}],53:[function(a,b,c){"use strict";function d(){this.input=null,this.next_in=0,this.avail_in=0,this.total_in=0,this.output=null,this.next_out=0,this.avail_out=0,this.total_out=0,this.msg="",this.state=null,this.data_type=2,this.adler=0}b.exports=d},{}]},{},[10])(10)});

//loadImage
!function(a){"use strict";var b=function(a,c,d){var e,f,g=document.createElement("img");if(g.onerror=c,g.onload=function(){!f||d&&d.noRevoke||b.revokeObjectURL(f),c&&c(b.scale(g,d))},b.isInstanceOf("Blob",a)||b.isInstanceOf("File",a))e=f=b.createObjectURL(a),g._type=a.type;else{if("string"!=typeof a)return!1;e=a,d&&d.crossOrigin&&(g.crossOrigin=d.crossOrigin)}return e?(g.src=e,g):b.readFile(a,function(a){var b=a.target;b&&b.result?g.src=b.result:c&&c(a)})},c=window.createObjectURL&&window||window.URL&&URL.revokeObjectURL&&URL||window.webkitURL&&webkitURL;b.isInstanceOf=function(a,b){return Object.prototype.toString.call(b)==="[object "+a+"]"},b.transformCoordinates=function(){},b.getTransformedOptions=function(a,b){var c,d,e,f,g=b.aspectRatio;if(!g)return b;c={};for(d in b)b.hasOwnProperty(d)&&(c[d]=b[d]);return c.crop=!0,e=a.naturalWidth||a.width,f=a.naturalHeight||a.height,e/f>g?(c.maxWidth=f*g,c.maxHeight=f):(c.maxWidth=e,c.maxHeight=e/g),c},b.renderImageToCanvas=function(a,b,c,d,e,f,g,h,i,j){return a.getContext("2d").drawImage(b,c,d,e,f,g,h,i,j),a},b.hasCanvasOption=function(a){return a.canvas||a.crop||a.aspectRatio},b.scale=function(a,c){c=c||{};var d,e,f,g,h,i,j,k,l,m=document.createElement("canvas"),n=a.getContext||b.hasCanvasOption(c)&&m.getContext,o=a.naturalWidth||a.width,p=a.naturalHeight||a.height,q=o,r=p,s=function(){var a=Math.max((f||q)/q,(g||r)/r);a>1&&(q*=a,r*=a)},t=function(){var a=Math.min((d||q)/q,(e||r)/r);1>a&&(q*=a,r*=a)};return n&&(c=b.getTransformedOptions(a,c),j=c.left||0,k=c.top||0,c.sourceWidth?(h=c.sourceWidth,void 0!==c.right&&void 0===c.left&&(j=o-h-c.right)):h=o-j-(c.right||0),c.sourceHeight?(i=c.sourceHeight,void 0!==c.bottom&&void 0===c.top&&(k=p-i-c.bottom)):i=p-k-(c.bottom||0),q=h,r=i),d=c.maxWidth,e=c.maxHeight,f=c.minWidth,g=c.minHeight,n&&d&&e&&c.crop?(q=d,r=e,l=h/i-d/e,0>l?(i=e*h/d,void 0===c.top&&void 0===c.bottom&&(k=(p-i)/2)):l>0&&(h=d*i/e,void 0===c.left&&void 0===c.right&&(j=(o-h)/2))):((c.contain||c.cover)&&(f=d=d||f,g=e=e||g),c.cover?(t(),s()):(s(),t())),n?(m.width=q,m.height=r,b.transformCoordinates(m,c),b.renderImageToCanvas(m,a,j,k,h,i,0,0,q,r)):(a.width=q,a.height=r,a)},b.createObjectURL=function(a){return c?c.createObjectURL(a):!1},b.revokeObjectURL=function(a){return c?c.revokeObjectURL(a):!1},b.readFile=function(a,b,c){if(window.FileReader){var d=new FileReader;if(d.onload=d.onerror=b,c=c||"readAsDataURL",d[c])return d[c](a),d}return!1},"function"==typeof define&&define.amd?define(function(){return b}):a.loadImage=b}(window),function(a){"use strict";"function"==typeof define&&define.amd?define(["load-image"],a):a(window.loadImage)}(function(a){"use strict";if(window.navigator&&window.navigator.platform&&/iP(hone|od|ad)/.test(window.navigator.platform)){var b=a.renderImageToCanvas;a.detectSubsampling=function(a){var b,c;return a.width*a.height>1048576?(b=document.createElement("canvas"),b.width=b.height=1,c=b.getContext("2d"),c.drawImage(a,-a.width+1,0),0===c.getImageData(0,0,1,1).data[3]):!1},a.detectVerticalSquash=function(a,b){var c,d,e,f,g,h=a.naturalHeight||a.height,i=document.createElement("canvas"),j=i.getContext("2d");for(b&&(h/=2),i.width=1,i.height=h,j.drawImage(a,0,0),c=j.getImageData(0,0,1,h).data,d=0,e=h,f=h;f>d;)g=c[4*(f-1)+3],0===g?e=f:d=f,f=e+d>>1;return f/h||1},a.renderImageToCanvas=function(c,d,e,f,g,h,i,j,k,l){if("image/jpeg"===d._type){var m,n,o,p,q=c.getContext("2d"),r=document.createElement("canvas"),s=1024,t=r.getContext("2d");if(r.width=s,r.height=s,q.save(),m=a.detectSubsampling(d),m&&(e/=2,f/=2,g/=2,h/=2),n=a.detectVerticalSquash(d,m),m||1!==n){for(f*=n,k=Math.ceil(s*k/g),l=Math.ceil(s*l/h/n),j=0,p=0;h>p;){for(i=0,o=0;g>o;)t.clearRect(0,0,s,s),t.drawImage(d,e,f,g,h,-o,-p,g,h),q.drawImage(r,0,0,s,s,i,j,k,l),o+=s,i+=k;p+=s,j+=l}return q.restore(),c}}return b(c,d,e,f,g,h,i,j,k,l)}}}),function(a){"use strict";"function"==typeof define&&define.amd?define(["load-image"],a):a(window.loadImage)}(function(a){"use strict";var b=a.hasCanvasOption,c=a.transformCoordinates,d=a.getTransformedOptions;a.hasCanvasOption=function(c){return b.call(a,c)||c.orientation},a.transformCoordinates=function(b,d){c.call(a,b,d);var e=b.getContext("2d"),f=b.width,g=b.height,h=d.orientation;if(h&&!(h>8))switch(h>4&&(b.width=g,b.height=f),h){case 2:e.translate(f,0),e.scale(-1,1);break;case 3:e.translate(f,g),e.rotate(Math.PI);break;case 4:e.translate(0,g),e.scale(1,-1);break;case 5:e.rotate(.5*Math.PI),e.scale(1,-1);break;case 6:e.rotate(.5*Math.PI),e.translate(0,-g);break;case 7:e.rotate(.5*Math.PI),e.translate(f,-g),e.scale(-1,1);break;case 8:e.rotate(-.5*Math.PI),e.translate(-f,0)}},a.getTransformedOptions=function(b,c){var e,f,g=d.call(a,b,c),h=g.orientation;if(!h||h>8||1===h)return g;e={};for(f in g)g.hasOwnProperty(f)&&(e[f]=g[f]);switch(g.orientation){case 2:e.left=g.right,e.right=g.left;break;case 3:e.left=g.right,e.top=g.bottom,e.right=g.left,e.bottom=g.top;break;case 4:e.top=g.bottom,e.bottom=g.top;break;case 5:e.left=g.top,e.top=g.left,e.right=g.bottom,e.bottom=g.right;break;case 6:e.left=g.top,e.top=g.right,e.right=g.bottom,e.bottom=g.left;break;case 7:e.left=g.bottom,e.top=g.right,e.right=g.top,e.bottom=g.left;break;case 8:e.left=g.bottom,e.top=g.left,e.right=g.top,e.bottom=g.right}return g.orientation>4&&(e.maxWidth=g.maxHeight,e.maxHeight=g.maxWidth,e.minWidth=g.minHeight,e.minHeight=g.minWidth,e.sourceWidth=g.sourceHeight,e.sourceHeight=g.sourceWidth),e}}),function(a){"use strict";"function"==typeof define&&define.amd?define(["load-image"],a):a(window.loadImage)}(function(a){"use strict";var b=window.Blob&&(Blob.prototype.slice||Blob.prototype.webkitSlice||Blob.prototype.mozSlice);a.blobSlice=b&&function(){var a=this.slice||this.webkitSlice||this.mozSlice;return a.apply(this,arguments)},a.metaDataParsers={jpeg:{65505:[]}},a.parseMetaData=function(b,c,d){d=d||{};var e=this,f=d.maxMetaDataSize||262144,g={},h=!(window.DataView&&b&&b.size>=12&&"image/jpeg"===b.type&&a.blobSlice);(h||!a.readFile(a.blobSlice.call(b,0,f),function(b){if(b.target.error)return console.log(b.target.error),void c(g);var f,h,i,j,k=b.target.result,l=new DataView(k),m=2,n=l.byteLength-4,o=m;if(65496===l.getUint16(0)){for(;n>m&&(f=l.getUint16(m),f>=65504&&65519>=f||65534===f);){if(h=l.getUint16(m+2)+2,m+h>l.byteLength){console.log("Invalid meta data: Invalid segment size.");break}if(i=a.metaDataParsers.jpeg[f])for(j=0;j<i.length;j+=1)i[j].call(e,l,m,h,g,d);m+=h,o=m}!d.disableImageHead&&o>6&&(g.imageHead=k.slice?k.slice(0,o):new Uint8Array(k).subarray(0,o))}else console.log("Invalid JPEG file: Missing JPEG marker.");c(g)},"readAsArrayBuffer"))&&c(g)}}),function(a){"use strict";"function"==typeof define&&define.amd?define(["load-image","load-image-meta"],a):a(window.loadImage)}(function(a){"use strict";a.ExifMap=function(){return this},a.ExifMap.prototype.map={Orientation:274},a.ExifMap.prototype.get=function(a){return this[a]||this[this.map[a]]},a.getExifThumbnail=function(a,b,c){var d,e,f;if(!c||b+c>a.byteLength)return void console.log("Invalid Exif data: Invalid thumbnail data.");for(d=[],e=0;c>e;e+=1)f=a.getUint8(b+e),d.push((16>f?"0":"")+f.toString(16));return"data:image/jpeg,%"+d.join("%")},a.exifTagTypes={1:{getValue:function(a,b){return a.getUint8(b)},size:1},2:{getValue:function(a,b){return String.fromCharCode(a.getUint8(b))},size:1,ascii:!0},3:{getValue:function(a,b,c){return a.getUint16(b,c)},size:2},4:{getValue:function(a,b,c){return a.getUint32(b,c)},size:4},5:{getValue:function(a,b,c){return a.getUint32(b,c)/a.getUint32(b+4,c)},size:8},9:{getValue:function(a,b,c){return a.getInt32(b,c)},size:4},10:{getValue:function(a,b,c){return a.getInt32(b,c)/a.getInt32(b+4,c)},size:8}},a.exifTagTypes[7]=a.exifTagTypes[1],a.getExifValue=function(b,c,d,e,f,g){var h,i,j,k,l,m,n=a.exifTagTypes[e];if(!n)return void console.log("Invalid Exif data: Invalid tag type.");if(h=n.size*f,i=h>4?c+b.getUint32(d+8,g):d+8,i+h>b.byteLength)return void console.log("Invalid Exif data: Invalid data offset.");if(1===f)return n.getValue(b,i,g);for(j=[],k=0;f>k;k+=1)j[k]=n.getValue(b,i+k*n.size,g);if(n.ascii){for(l="",k=0;k<j.length&&(m=j[k],"\x00"!==m);k+=1)l+=m;return l}return j},a.parseExifTag=function(b,c,d,e,f){var g=b.getUint16(d,e);f.exif[g]=a.getExifValue(b,c,d,b.getUint16(d+2,e),b.getUint32(d+4,e),e)},a.parseExifTags=function(a,b,c,d,e){var f,g,h;if(c+6>a.byteLength)return void console.log("Invalid Exif data: Invalid directory offset.");if(f=a.getUint16(c,d),g=c+2+12*f,g+4>a.byteLength)return void console.log("Invalid Exif data: Invalid directory size.");for(h=0;f>h;h+=1)this.parseExifTag(a,b,c+2+12*h,d,e);return a.getUint32(g,d)},a.parseExifData=function(b,c,d,e,f){if(!f.disableExif){var g,h,i,j=c+10;if(1165519206===b.getUint32(c+4)){if(j+8>b.byteLength)return void console.log("Invalid Exif data: Invalid segment size.");if(0!==b.getUint16(c+8))return void console.log("Invalid Exif data: Missing byte alignment offset.");switch(b.getUint16(j)){case 18761:g=!0;break;case 19789:g=!1;break;default:return void console.log("Invalid Exif data: Invalid byte alignment marker.")}if(42!==b.getUint16(j+2,g))return void console.log("Invalid Exif data: Missing TIFF marker.");h=b.getUint32(j+4,g),e.exif=new a.ExifMap,h=a.parseExifTags(b,j,j+h,g,e),h&&!f.disableExifThumbnail&&(i={exif:{}},h=a.parseExifTags(b,j,j+h,g,i),i.exif[513]&&(e.exif.Thumbnail=a.getExifThumbnail(b,j+i.exif[513],i.exif[514]))),e.exif[34665]&&!f.disableExifSub&&a.parseExifTags(b,j,j+e.exif[34665],g,e),e.exif[34853]&&!f.disableExifGps&&a.parseExifTags(b,j,j+e.exif[34853],g,e)}}},a.metaDataParsers.jpeg[65505].push(a.parseExifData)}),function(a){"use strict";"function"==typeof define&&define.amd?define(["load-image","load-image-exif"],a):a(window.loadImage)}(function(a){"use strict";a.ExifMap.prototype.tags={256:"ImageWidth",257:"ImageHeight",34665:"ExifIFDPointer",34853:"GPSInfoIFDPointer",40965:"InteroperabilityIFDPointer",258:"BitsPerSample",259:"Compression",262:"PhotometricInterpretation",274:"Orientation",277:"SamplesPerPixel",284:"PlanarConfiguration",530:"YCbCrSubSampling",531:"YCbCrPositioning",282:"XResolution",283:"YResolution",296:"ResolutionUnit",273:"StripOffsets",278:"RowsPerStrip",279:"StripByteCounts",513:"JPEGInterchangeFormat",514:"JPEGInterchangeFormatLength",301:"TransferFunction",318:"WhitePoint",319:"PrimaryChromaticities",529:"YCbCrCoefficients",532:"ReferenceBlackWhite",306:"DateTime",270:"ImageDescription",271:"Make",272:"Model",305:"Software",315:"Artist",33432:"Copyright",36864:"ExifVersion",40960:"FlashpixVersion",40961:"ColorSpace",40962:"PixelXDimension",40963:"PixelYDimension",42240:"Gamma",37121:"ComponentsConfiguration",37122:"CompressedBitsPerPixel",37500:"MakerNote",37510:"UserComment",40964:"RelatedSoundFile",36867:"DateTimeOriginal",36868:"DateTimeDigitized",37520:"SubSecTime",37521:"SubSecTimeOriginal",37522:"SubSecTimeDigitized",33434:"ExposureTime",33437:"FNumber",34850:"ExposureProgram",34852:"SpectralSensitivity",34855:"PhotographicSensitivity",34856:"OECF",34864:"SensitivityType",34865:"StandardOutputSensitivity",34866:"RecommendedExposureIndex",34867:"ISOSpeed",34868:"ISOSpeedLatitudeyyy",34869:"ISOSpeedLatitudezzz",37377:"ShutterSpeedValue",37378:"ApertureValue",37379:"BrightnessValue",37380:"ExposureBias",37381:"MaxApertureValue",37382:"SubjectDistance",37383:"MeteringMode",37384:"LightSource",37385:"Flash",37396:"SubjectArea",37386:"FocalLength",41483:"FlashEnergy",41484:"SpatialFrequencyResponse",41486:"FocalPlaneXResolution",41487:"FocalPlaneYResolution",41488:"FocalPlaneResolutionUnit",41492:"SubjectLocation",41493:"ExposureIndex",41495:"SensingMethod",41728:"FileSource",41729:"SceneType",41730:"CFAPattern",41985:"CustomRendered",41986:"ExposureMode",41987:"WhiteBalance",41988:"DigitalZoomRatio",41989:"FocalLengthIn35mmFilm",41990:"SceneCaptureType",41991:"GainControl",41992:"Contrast",41993:"Saturation",41994:"Sharpness",41995:"DeviceSettingDescription",41996:"SubjectDistanceRange",42016:"ImageUniqueID",42032:"CameraOwnerName",42033:"BodySerialNumber",42034:"LensSpecification",42035:"LensMake",42036:"LensModel",42037:"LensSerialNumber",0:"GPSVersionID",1:"GPSLatitudeRef",2:"GPSLatitude",3:"GPSLongitudeRef",4:"GPSLongitude",5:"GPSAltitudeRef",6:"GPSAltitude",7:"GPSTimeStamp",8:"GPSSatellites",9:"GPSStatus",10:"GPSMeasureMode",11:"GPSDOP",12:"GPSSpeedRef",13:"GPSSpeed",14:"GPSTrackRef",15:"GPSTrack",16:"GPSImgDirectionRef",17:"GPSImgDirection",18:"GPSMapDatum",19:"GPSDestLatitudeRef",20:"GPSDestLatitude",21:"GPSDestLongitudeRef",22:"GPSDestLongitude",23:"GPSDestBearingRef",24:"GPSDestBearing",25:"GPSDestDistanceRef",26:"GPSDestDistance",27:"GPSProcessingMethod",28:"GPSAreaInformation",29:"GPSDateStamp",30:"GPSDifferential",31:"GPSHPositioningError"},a.ExifMap.prototype.stringValues={ExposureProgram:{0:"Undefined",1:"Manual",2:"Normal program",3:"Aperture priority",4:"Shutter priority",5:"Creative program",6:"Action program",7:"Portrait mode",8:"Landscape mode"},MeteringMode:{0:"Unknown",1:"Average",2:"CenterWeightedAverage",3:"Spot",4:"MultiSpot",5:"Pattern",6:"Partial",255:"Other"},LightSource:{0:"Unknown",1:"Daylight",2:"Fluorescent",3:"Tungsten (incandescent light)",4:"Flash",9:"Fine weather",10:"Cloudy weather",11:"Shade",12:"Daylight fluorescent (D 5700 - 7100K)",13:"Day white fluorescent (N 4600 - 5400K)",14:"Cool white fluorescent (W 3900 - 4500K)",15:"White fluorescent (WW 3200 - 3700K)",17:"Standard light A",18:"Standard light B",19:"Standard light C",20:"D55",21:"D65",22:"D75",23:"D50",24:"ISO studio tungsten",255:"Other"},Flash:{0:"Flash did not fire",1:"Flash fired",5:"Strobe return light not detected",7:"Strobe return light detected",9:"Flash fired, compulsory flash mode",13:"Flash fired, compulsory flash mode, return light not detected",15:"Flash fired, compulsory flash mode, return light detected",16:"Flash did not fire, compulsory flash mode",24:"Flash did not fire, auto mode",25:"Flash fired, auto mode",29:"Flash fired, auto mode, return light not detected",31:"Flash fired, auto mode, return light detected",32:"No flash function",65:"Flash fired, red-eye reduction mode",69:"Flash fired, red-eye reduction mode, return light not detected",71:"Flash fired, red-eye reduction mode, return light detected",73:"Flash fired, compulsory flash mode, red-eye reduction mode",77:"Flash fired, compulsory flash mode, red-eye reduction mode, return light not detected",79:"Flash fired, compulsory flash mode, red-eye reduction mode, return light detected",89:"Flash fired, auto mode, red-eye reduction mode",93:"Flash fired, auto mode, return light not detected, red-eye reduction mode",95:"Flash fired, auto mode, return light detected, red-eye reduction mode"},SensingMethod:{1:"Undefined",2:"One-chip color area sensor",3:"Two-chip color area sensor",4:"Three-chip color area sensor",5:"Color sequential area sensor",7:"Trilinear sensor",8:"Color sequential linear sensor"},SceneCaptureType:{0:"Standard",1:"Landscape",2:"Portrait",3:"Night scene"},SceneType:{1:"Directly photographed"},CustomRendered:{0:"Normal process",1:"Custom process"},WhiteBalance:{0:"Auto white balance",1:"Manual white balance"},GainControl:{0:"None",1:"Low gain up",2:"High gain up",3:"Low gain down",4:"High gain down"},Contrast:{0:"Normal",1:"Soft",2:"Hard"},Saturation:{0:"Normal",1:"Low saturation",2:"High saturation"},Sharpness:{0:"Normal",1:"Soft",2:"Hard"},SubjectDistanceRange:{0:"Unknown",1:"Macro",2:"Close view",3:"Distant view"},FileSource:{3:"DSC"},ComponentsConfiguration:{0:"",1:"Y",2:"Cb",3:"Cr",4:"R",5:"G",6:"B"},Orientation:{1:"top-left",2:"top-right",3:"bottom-right",4:"bottom-left",5:"left-top",6:"right-top",7:"right-bottom",8:"left-bottom"}},a.ExifMap.prototype.getText=function(a){var b=this.get(a);switch(a){case"LightSource":case"Flash":case"MeteringMode":case"ExposureProgram":case"SensingMethod":case"SceneCaptureType":case"SceneType":case"CustomRendered":case"WhiteBalance":case"GainControl":case"Contrast":case"Saturation":case"Sharpness":case"SubjectDistanceRange":case"FileSource":case"Orientation":return this.stringValues[a][b];case"ExifVersion":case"FlashpixVersion":return String.fromCharCode(b[0],b[1],b[2],b[3]);case"ComponentsConfiguration":return this.stringValues[a][b[0]]+this.stringValues[a][b[1]]+this.stringValues[a][b[2]]+this.stringValues[a][b[3]];case"GPSVersionID":return b[0]+"."+b[1]+"."+b[2]+"."+b[3]}return String(b)},function(a){var b,c=a.tags,d=a.map;for(b in c)c.hasOwnProperty(b)&&(d[c[b]]=b)}(a.ExifMap.prototype),a.ExifMap.prototype.getAll=function(){var a,b,c={};for(a in this)this.hasOwnProperty(a)&&(b=this.tags[a],b&&(c[b]=this.getText(b)));return c}});

//signaturePad 3.0.0-beta.3
class Point{constructor(t,e,i){this.x=t,this.y=e,this.time=i||Date.now()}distanceTo(t){return Math.sqrt(Math.pow(this.x-t.x,2)+Math.pow(this.y-t.y,2))}equals(t){return this.x===t.x&&this.y===t.y&&this.time===t.time}velocityFrom(t){return this.time!==t.time?this.distanceTo(t)/(this.time-t.time):0}}class Bezier{constructor(t,e,i,o,s,n){this.startPoint=t,this.control2=e,this.control1=i,this.endPoint=o,this.startWidth=s,this.endWidth=n}static fromPoints(t,e){const i=this.calculateControlPoints(t[0],t[1],t[2]).c2,o=this.calculateControlPoints(t[1],t[2],t[3]).c1;return new Bezier(t[1],i,o,t[2],e.start,e.end)}static calculateControlPoints(t,e,i){const o=t.x-e.x,s=t.y-e.y,n=e.x-i.x,h=e.y-i.y,r=(t.x+e.x)/2,a=(t.y+e.y)/2,c=(e.x+i.x)/2,l=(e.y+i.y)/2,d=Math.sqrt(o*o+s*s),u=Math.sqrt(n*n+h*h),v=u/(d+u),_=c+(r-c)*v,m=l+(a-l)*v,p=e.x-_,g=e.y-m;return{c1:new Point(r+p,a+g),c2:new Point(c+p,l+g)}}length(){let t,e,i=0;for(let o=0;o<=10;o+=1){const s=o/10,n=this.point(s,this.startPoint.x,this.control1.x,this.control2.x,this.endPoint.x),h=this.point(s,this.startPoint.y,this.control1.y,this.control2.y,this.endPoint.y);if(o>0){const o=n-t,s=h-e;i+=Math.sqrt(o*o+s*s)}t=n,e=h}return i}point(t,e,i,o,s){return e*(1-t)*(1-t)*(1-t)+3*i*(1-t)*(1-t)*t+3*o*(1-t)*t*t+s*t*t*t}}function throttle(t,e=250){let i,o,s,n=0,h=null;const r=()=>{n=Date.now(),h=null,i=t.apply(o,s),h||(o=null,s=[])};return function(...a){const c=Date.now(),l=e-(c-n);return o=this,s=a,l<=0||l>e?(h&&(clearTimeout(h),h=null),n=c,i=t.apply(o,s),h||(o=null,s=[])):h||(h=window.setTimeout(r,l)),i}}class SignaturePad{constructor(t,e={}){this.canvas=t,this.options=e,this._handleMouseDown=(t=>{1===t.which&&(this._mouseButtonDown=!0,this._strokeBegin(t))}),this._handleMouseMove=(t=>{this._mouseButtonDown&&this._strokeMoveUpdate(t)}),this._handleMouseUp=(t=>{1===t.which&&this._mouseButtonDown&&(this._mouseButtonDown=!1,this._strokeEnd(t))}),this._handleTouchStart=(t=>{if(t.preventDefault(),1===t.targetTouches.length){const e=t.changedTouches[0];this._strokeBegin(e)}}),this._handleTouchMove=(t=>{t.preventDefault();const e=t.targetTouches[0];this._strokeMoveUpdate(e)}),this._handleTouchEnd=(t=>{if(t.target===this.canvas){t.preventDefault();const e=t.changedTouches[0];this._strokeEnd(e)}}),this.velocityFilterWeight=e.velocityFilterWeight||.7,this.minWidth=e.minWidth||.5,this.maxWidth=e.maxWidth||2.5,this.throttle="throttle"in e?e.throttle:16,this.minDistance="minDistance"in e?e.minDistance:5,this.throttle?this._strokeMoveUpdate=throttle(SignaturePad.prototype._strokeUpdate,this.throttle):this._strokeMoveUpdate=SignaturePad.prototype._strokeUpdate,this.dotSize=e.dotSize||function(){return(this.minWidth+this.maxWidth)/2},this.penColor=e.penColor||"black",this.backgroundColor=e.backgroundColor||"rgba(0,0,0,0)",this.onBegin=e.onBegin,this.onEnd=e.onEnd,this._ctx=t.getContext("2d"),this.clear(),this.on()}clear(){const t=this._ctx,e=this.canvas;t.fillStyle=this.backgroundColor,t.clearRect(0,0,e.width,e.height),t.fillRect(0,0,e.width,e.height),this._data=[],this._reset(),this._isEmpty=!0}fromDataURL(t,e={},i){const o=new Image,s=e.ratio||window.devicePixelRatio||1,n=e.width||this.canvas.width/s,h=e.height||this.canvas.height/s;this._reset(),o.onload=(()=>{this._ctx.drawImage(o,0,0,n,h),i&&i()}),o.onerror=(t=>{i&&i(t)}),o.src=t,this._isEmpty=!1}toDataURL(t="image/png",e){switch(t){case"image/svg+xml":return this._toSVG();default:return this.canvas.toDataURL(t,e)}}on(){this.canvas.style.touchAction="none",this.canvas.style.msTouchAction="none",window.PointerEvent?this._handlePointerEvents():(this._handleMouseEvents(),"ontouchstart"in window&&this._handleTouchEvents())}off(){this.canvas.style.touchAction="auto",this.canvas.style.msTouchAction="auto",this.canvas.removeEventListener("pointerdown",this._handleMouseDown),this.canvas.removeEventListener("pointermove",this._handleMouseMove),document.removeEventListener("pointerup",this._handleMouseUp),this.canvas.removeEventListener("mousedown",this._handleMouseDown),this.canvas.removeEventListener("mousemove",this._handleMouseMove),document.removeEventListener("mouseup",this._handleMouseUp),this.canvas.removeEventListener("touchstart",this._handleTouchStart),this.canvas.removeEventListener("touchmove",this._handleTouchMove),this.canvas.removeEventListener("touchend",this._handleTouchEnd)}isEmpty(){return this._isEmpty}fromData(t){this.clear(),this._fromData(t,({color:t,curve:e})=>this._drawCurve({color:t,curve:e}),({color:t,point:e})=>this._drawDot({color:t,point:e})),this._data=t}toData(){return this._data}_strokeBegin(t){const e={color:this.penColor,points:[]};this._data.push(e),this._reset(),this._strokeUpdate(t),"function"==typeof this.onBegin&&this.onBegin(t)}_strokeUpdate(t){const e=t.clientX,i=t.clientY,o=this._createPoint(e,i),s=this._data[this._data.length-1],n=s.points,h=n.length>0&&n[n.length-1],r=!!h&&o.distanceTo(h)<=this.minDistance,a=s.color;if(!h||!h||!r){const t=this._addPoint(o);h?t&&this._drawCurve({color:a,curve:t}):this._drawDot({color:a,point:o}),n.push({time:o.time,x:o.x,y:o.y})}}_strokeEnd(t){this._strokeUpdate(t),"function"==typeof this.onEnd&&this.onEnd(t)}_handlePointerEvents(){this._mouseButtonDown=!1,this.canvas.addEventListener("pointerdown",this._handleMouseDown),this.canvas.addEventListener("pointermove",this._handleMouseMove),document.addEventListener("pointerup",this._handleMouseUp)}_handleMouseEvents(){this._mouseButtonDown=!1,this.canvas.addEventListener("mousedown",this._handleMouseDown),this.canvas.addEventListener("mousemove",this._handleMouseMove),document.addEventListener("mouseup",this._handleMouseUp)}_handleTouchEvents(){this.canvas.addEventListener("touchstart",this._handleTouchStart),this.canvas.addEventListener("touchmove",this._handleTouchMove),this.canvas.addEventListener("touchend",this._handleTouchEnd)}_reset(){this._lastPoints=[],this._lastVelocity=0,this._lastWidth=(this.minWidth+this.maxWidth)/2,this._ctx.fillStyle=this.penColor}_createPoint(t,e){const i=this.canvas.getBoundingClientRect();return new Point(t-i.left,e-i.top,(new Date).getTime())}_addPoint(t){const{_lastPoints:e}=this;if(e.push(t),e.length>2){3===e.length&&e.unshift(e[0]);const t=this._calculateCurveWidths(e[1],e[2]),i=Bezier.fromPoints(e,t);return e.shift(),i}return null}_calculateCurveWidths(t,e){const i=this.velocityFilterWeight*e.velocityFrom(t)+(1-this.velocityFilterWeight)*this._lastVelocity,o=this._strokeWidth(i),s={end:o,start:this._lastWidth};return this._lastVelocity=i,this._lastWidth=o,s}_strokeWidth(t){return Math.max(this.maxWidth/(t+1),this.minWidth)}_drawCurveSegment(t,e,i){const o=this._ctx;o.moveTo(t,e),o.arc(t,e,i,0,2*Math.PI,!1),this._isEmpty=!1}_drawCurve({color:t,curve:e}){const i=this._ctx,o=e.endWidth-e.startWidth,s=2*Math.floor(e.length());i.beginPath(),i.fillStyle=t;for(let t=0;t<s;t+=1){const i=t/s,n=i*i,h=n*i,r=1-i,a=r*r,c=a*r;let l=c*e.startPoint.x;l+=3*a*i*e.control1.x,l+=3*r*n*e.control2.x,l+=h*e.endPoint.x;let d=c*e.startPoint.y;d+=3*a*i*e.control1.y,d+=3*r*n*e.control2.y,d+=h*e.endPoint.y;const u=e.startWidth+h*o;this._drawCurveSegment(l,d,u)}i.closePath(),i.fill()}_drawDot({color:t,point:e}){const i=this._ctx,o="function"==typeof this.dotSize?this.dotSize():this.dotSize;i.beginPath(),this._drawCurveSegment(e.x,e.y,o),i.closePath(),i.fillStyle=t,i.fill()}_fromData(t,e,i){for(const o of t){const{color:t,points:s}=o;if(s.length>1)for(let i=0;i<s.length;i+=1){const o=s[i],n=new Point(o.x,o.y,o.time);this.penColor=t,0===i&&this._reset();const h=this._addPoint(n);h&&e({color:t,curve:h})}else this._reset(),i({color:t,point:s[0]})}}_toSVG(){const t=this._data,e=Math.max(window.devicePixelRatio||1,1),i=this.canvas.width/e,o=this.canvas.height/e,s=document.createElementNS("http://www.w3.org/2000/svg","svg");s.setAttribute("width",this.canvas.width.toString()),s.setAttribute("height",this.canvas.height.toString()),this._fromData(t,({color:t,curve:e})=>{const i=document.createElement("path");if(!(isNaN(e.control1.x)||isNaN(e.control1.y)||isNaN(e.control2.x)||isNaN(e.control2.y))){const o=`M ${e.startPoint.x.toFixed(3)},${e.startPoint.y.toFixed(3)} `+`C ${e.control1.x.toFixed(3)},${e.control1.y.toFixed(3)} `+`${e.control2.x.toFixed(3)},${e.control2.y.toFixed(3)} `+`${e.endPoint.x.toFixed(3)},${e.endPoint.y.toFixed(3)}`;i.setAttribute("d",o),i.setAttribute("stroke-width",(2.25*e.endWidth).toFixed(3)),i.setAttribute("stroke",t),i.setAttribute("fill","none"),i.setAttribute("stroke-linecap","round"),s.appendChild(i)}},({color:t,point:e})=>{const i=document.createElement("circle"),o="function"==typeof this.dotSize?this.dotSize():this.dotSize;i.setAttribute("r",o.toString()),i.setAttribute("cx",e.x.toString()),i.setAttribute("cy",e.y.toString()),i.setAttribute("fill",t),s.appendChild(i)});const n='<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"'+` viewBox="0 0 ${i} ${o}"`+` width="${i}"`+` height="${o}"`+">";let h=s.innerHTML;if(void 0===h){const t=document.createElement("dummy"),e=s.childNodes;t.innerHTML="";for(let i=0;i<e.length;i+=1)t.appendChild(e[i].cloneNode(!0));h=t.innerHTML}return"data:image/svg+xml;base64,"+btoa(n+h+"</svg>")}}export default SignaturePad;
