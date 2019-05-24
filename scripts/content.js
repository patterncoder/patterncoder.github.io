import { Api } from './api.js'
import { App } from './app.js'
import { CustomObject } from './customObject.js'
import { Header } from './header.js'
import { Icons } from './icons.js'
import { Nav } from './nav.js'
import { Tabs } from './tabs.js'

export class Content extends CustomObject {
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
								this.nav.pop();
								break;
						}
					break;
				}
			},
			icon: Icons.icon('ContentVersion'),
			menu: [],
			title: 'Content'
		});
		this.nav = this.nav || new Nav(this.element, { header: this.header });
		this.element = document.createElement('div');
		Api.labels().then(labels => {
			CustomObject.labels = labels;
			this.nav.replace(this.render(), Object.assign(this.header, {
				breadcrumbs: this.content ? this.nav.header.breadcrumbs : [],
				buttons: (this.nav.views.length > 1) ? [{ label: 'Back', value: 'back' }] : [],
				title: this.getLabel('Content')
			}));
			this.refresh(options);
		});
	}

	get fileExtension() {
		if (this.contentItem.FileExtension) {
			return this.contentItem.FileExtension;
		}
		const fileType = (this.contentItem && this.contentItem.FileType && this.contentItem.FileType.toLowerCase()) || 'unknown';
		return {
			BMP: 'bmp',
			CSV: 'txt',
			EXCEL: 'xls',
			EXCEL_M: 'xlsm',
			EXCEL_X: 'xlsx',
			EXE: 'exe',
			GIF: 'gif',
			JPG: 'jpg',
			JPEG: 'jpg',
			MOV: 'mov',
			MP4: 'mp4',
			PDF: 'pdf',
			PNG: 'png',
			POWER_POINT: 'ppt',
			POWER_POINT_X: 'pptx',
			TEXT: 'txt',
			UNKNOWN: '',
			WORD: 'doc',
			WORD_X: 'docx',
			XML: 'xml',
			ZIP: 'zip'
		}(fileType) || 'unknown';
	}

	get icon() {
		const fileType = (this.contentItem && this.contentItem.FileType && this.contentItem.FileType.toLowerCase()) || 'unknown';
		switch(fileType) {
			case 'bmp':
			case 'gif':
			case 'jpg':
			case 'png':
				return 'image';
			default:
				return fileType;
		}
	}

	bindEvents() {
		this.bind('.slds-tabs_mobile__item', 'click', (event, index) => {
			let newContent = this.content[index].content || this.content[index];
			while (newContent.length === 1) {
				newContent = newContent[0].content || newContent[0];
			}
			new Content({
				content: newContent,
				element: this.nav.push(document.createElement('div'), {
					breadcrumbs: this.nav.header.breadcrumbs.concat(this.content[index].groupLabel ? [this.content[index].groupLabel] : []),
				}),
				nav: this.nav
			})
		});
		this.bind('.slds-file__actions-menu, .slds-file.slds-file_card figure a', 'click', event => {
			let requestOptions = {
				dataUrl: false,
				syncInterval: 0,
				path: this.contentItem.VersionData || `/sobjects/ContentVersion/${this.contentItem.Id}/VersionData`
			};
			window.caches.open('ContentVersion')
				.then(cache =>
					Api.createRequest(requestOptions).then(request => cache.match(request))
				)
				.then(response => response ? response.blob() : Api.request(requestOptions))
				.then(blob => {
					let link = document.createElement('a');
					link.download = this.contentItem.Title;
					if (!link.download.endsWith(this.fileExtension)) {
						link.download += `.${this.fileExtension}`;
					}
					link.href = URL.createObjectURL(blob);
					link.click();
				});
		});
		this.bind('.slds-tabs_default__content.slds-show .slds-section', 'click', (event, index) => {
			event.stopPropagation();
			this.typeGroup = (this.productGroup || this.content[0]).content[index];
			this.refreshContentItem(this.typeGroup.content[0])
				.then(this.render.bind(this));
			this.render();
		});
		this.bind('.slds-tabs_default__content.slds-show .slds-section.slds-is-open .slds-section__content a', 'click', (event, index) => {
			event.stopPropagation();
			this.refreshContentItem(
				(this.typeGroup || (this.productGroup || this.content[0]).content[0])
					.content[index]
			).then(this.render.bind(this));
		});
	}

	countContent(content) {
		return content.content ? this.countContent(content.content) : (Array.isArray(content) ? content.reduce((count, content) => count + this.countContent(content), 0) : 1);
	}

	groupContent(content, groupBy) {
		return (content || []).reduce((groups, content) => {
			if (content.groupLabel && content.content) {
				content.content = this.groupContent(content.content, groupBy);
				groups.push(content);
				return groups;
			}
			let groupLabel = content[groupBy] || this.getLabel('General');
			let group = groups.filter(group => group.groupLabel === groupLabel)[0];
			if (!group) {
				groups.push({ groupLabel: groupLabel, content: [ content ] });
			} else {
				group.content.push(content);
			}
			return groups;
		}, []).sort((g1, g2) => g1.groupLabel.localeCompare(g2.groupLabel));
	}

	async refreshContentItem(content) {
		this.contentItem = content;
		const cache = await window.caches.open('ContentVersion');
		const previewRequestUrl = `/connect/files/${this.contentItem.ContentDocumentId}/previews/big-thumbnail`;
		let request = await Api.createRequest(previewRequestUrl);
		let response = cache && await cache.match(request);
		response = (response && await response.json()) || await Api.request(previewRequestUrl);
		let previewUrl = response && response.previewUrls && response.previewUrls[0] && response.previewUrls[0].previewUrl;
		if (previewUrl) {
			if (previewUrl.startsWith("http")) {
				let parsedUrl = new URL(previewUrl);
				let tempUrl = `/services/data/${Api.version}/connect/files/${this.contentItem.ContentDocumentId}/rendition?type=${parsedUrl.searchParams.get("rendition")}&page=0`;
				previewUrl = tempUrl;
			}
			const requestOptions = {
				dataUrl: true,
				syncInterval: 0,
				path: `${previewUrl}&ts=${new Date().getTime()}`
			};
			request = await Api.createRequest(requestOptions);
			response = (cache && await cache.match(request, { ignoreSearch: true }));
			response = response && await response.blob();
			this.contentItem.preview = (response && await Api.dataUrl(response)) || await Api.request(requestOptions);
		}
	}

	async refresh() {
		if (!this.content) {
			this.spinner();
			let content;
			if (navigator.onLine) {
				const description = await Api.describe('ContentVersion');
				let response = await Api.query(`
					Select ${description.fields.filter(field => field.type !== 'base64')
						.map(field => field.name).join(',')}
					From ${description.name}
					Where (IsLatest = True)
					And (FileType != 'SNOTE')
					And (RecordType.DeveloperName != 'Media')
					Order By LastModifiedDate Desc
				`);
				content = (response && response.records) || [];
			} else if (typeof(Db) !== 'undefined') {
				const mediaRecordType = await Media.recordType();
				content = await Db.ContentVersion
					.filter(version => (version.IsLatest !== false) && (version.FileType !== 'SNOTE') && !(mediaRecordType && (version.RecordTypeId === mediaRecordType.Id)))
					.reverse()
					.sortBy('LastModifiedDate');
			}
			this.content = ['gvp__Product_Name__c', 'gvp__Type__c'].reduce(this.groupContent.bind(this), content);
		}
		if (this.content.ContentDocumentId) {
			await this.refreshContentItem(this.content);
		} else if (
			!App.isSmallScreen &&
			this.content && this.content[0] &&
			this.content[0].content && this.content[0].content[0] &&
			this.content[0].content[0].content && this.content[0].content[0].content[0]
		) {
			await this.refreshContentItem(this.content[0].content[0].content[0]);
		}
		this.render();
	}

	renderContentItem(content) {
		return content ? `
			<div class="content-version">
				<div class="slds-file slds-file_card">
					<figure>
						<a href="javascript:void(0);" class="slds-file__crop">
							${content.preview ?
								`<img src="${content.preview}" alt="${content.Title}" />` :
								`<span class="slds-file__icon slds-icon_container" title="${content.Title}">
									<svg class="slds-icon slds-icon_large" aria-hidden="true">
										<use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="${Content.getSymbols('doctype')}#${this.icon}" />
									</svg>
									<span class="slds-assistive-text">${content.Title}</span>
								</span>`
							}
						</a>
						<figcaption class="slds-file__title slds-file__title_card slds-p-around_small">
							<div class="slds-media slds-media_small slds-media_center">
								<div class="slds-media__figure slds-line-height_reset">
									<span class="slds-icon_container" title="${content.FileType}">
										<svg class="slds-icon slds-icon-text-default slds-icon_small" aria-hidden="true">
											<use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="${Content.getSymbols('utility')}#file" />
										</svg>
										<span class="slds-assistive-text">${content.ContentType}</span>
									</span>
								</div>
								<div class="slds-media__body">
									<span class="slds-file__text slds-truncate" title="${content.Title}">${content.Title}</span>
								</div>
							</div>
						</figcaption>
					</figure>
					<div class="slds-file__actions-menu">
						<div class="slds-button-group" role="group">
							<button class="slds-button slds-button_icon slds-button_icon slds-button_icon-border-filled" title="Download">
								<svg class="slds-button__icon" aria-hidden="true">
									<use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="${Content.getSymbols('utility')}#download" />
								</svg>
								<span class="slds-assistive-text">Download</span>
							</button>
						</div>
					</div>
				</div>
			</div>
		` : '';
	}

	renderLargeScreen() {
		let element = document.createElement('div');
		element.innerHTML = `
			<style>
				.content .slds-tabs_default__content {
					display: inline-block;
					padding: 0;
					width: 45%;
				}
				.content .slds-tabs_default__content .slds-section__content {
					margin-top: 0;
					max-height: 200px;
					overflow: auto;
					padding: 0;
				}
				.content .slds-tabs_default__content .slds-section__content ul li a.selected {
					font-weight: bold;
				}
				.content-version {
					float: right;
					padding: 1em;
					width: 55%;
				}
			</style>
			<div class="tabs"></div>
			<div class="content"></div>
		`;
		let tabs = new Tabs({
			element: element.querySelector('.tabs'),
			handler: (event, tab, index) => {
				this.content.forEach(content => content.selected = false);
				tab.content.selected = true;
				this.productGroup = this.content[index];
				this.typeGroup = null;
				this.refreshContentItem(this.productGroup.content[0].content[0])
					.then(this.render.bind(this));
				this.render();
			},
			tabs: this.content.map((content, index) => Object.assign({
				badge: content.content ? `(${this.countContent(content)})` : '',
				content: content,
				label: `${content.groupLabel || content.Title}`,
				name: index,
				selected: this.content.filter(content => content.selected)[0] ? content.selected : (index === 0)
			})),
			type: 'default'
		});
		element.querySelector('.content').innerHTML += `
			${this.content.map((content, index) => `
				<div id="tab-default-${index}" class="slds-tabs_default__content ${((this.productGroup ? this.productGroup === content : index === 0) && 'slds-show') || 'slds-hide'}" role="tabpanel" aria-labelledby="tab-default-${index}__item">
					${(this.productGroup || this.content[0]).content.map((content, index) => `
						<div class="slds-section ${((this.typeGroup ? this.typeGroup === content : index === 0) && 'slds-is-open') || ''} slds-m-around_small">
							<h3 class="slds-section__title">
								<button aria-controls="expando-unique-id" aria-expanded="true" class="slds-button slds-section__title-action">
									<svg class="slds-section__title-action-icon slds-button__icon slds-button__icon_left" aria-hidden="true">
										<use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="${Content.getSymbols('utility')}#switch" />
									</svg>
									<span class="slds-truncate" title="${content.groupLabel}">${content.groupLabel} (${content.content.length})</span>
								</button>
							</h3>
							<div aria-hidden="${index === 0 ? 'false' : 'true'}" class="slds-section__content slds-m-around_small" id="expando-unique-id">
								<ul>
									${content.content.map(content => `
										<li>
											<a class="slds-tabs_default__link ${(this.contentItem && (content.Id === this.contentItem.Id)) ? 'selected' : ''}" href="javascript:void(0);" role="button">${content.Title}</a>
										</li>
									`).join('\n')}
								</ul>
							</div>
						</div>
					`).join('\n')}
				</div>
			`).join('\n')}
			${this.renderContentItem(this.contentItem)}
		`;
		return element;
	}

	renderSmallScreen() {
		let element = document.createElement('div');
		element.innerHTML = `
			<style>
				.content-version {
					background-image: url('${Content.getSymbols('utility')}#file');
					height: 80%;
					margin: 1rem auto;
					min-width: 360px;
				}
				.slds-file, .slds-file figure, .slds-file figure a {
					height: 100%;
				}
			</style>
			<ul class="slds-tabs_mobile">
				${this.content.map((content, index) => `
					<li class="slds-tabs_mobile__item">
						<div class="slds-tabs_mobile__title">
							<button class="slds-tabs_mobile__title-action slds-button slds-button_reset">
								<span class="slds-truncate" title="${content.groupLabel || content.Title} (${this.countContent(content)})">${content.groupLabel || content.Title} ${content.content ? `(${this.countContent(content)})` : ''}</span>
								<svg class="slds-icon slds-icon_small slds-icon-text-default" aria-hidden="true">
									<use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="${Content.getSymbols('utility')}#chevronright" />
								</svg>
							</button>
						</div>
					</li>
				`).join('\n')}
			</ul>
		`;
		return element;
	}

	render() {
		this.element.innerHTML = `
			<style>
				.content-version {
					background-image: url('${Content.getSymbols('utility')}#file');
					height: 80%;
					min-width: 360px;
					width: 60%;
				}
				.slds-file, .slds-file figure, .slds-file figure a {
					height: 100%;
				}
				.slds-file figure figcaption .slds-media {
					width: 100%;
				}
				.slds-file figure figcaption .slds-file__text {
					display: inline-block;
					max-width: 90%;
				}
				.slds-file__title.slds-file__title_card {
					z-index: initial;
				}
				.slds-file a:hover:before {
					z-index: 5000 !important;
				}
				.slds-file:not(.slds-file_loading) a:hover+.slds-file__title {
					z-index: 5000 !important;
				}
			</style>
			${Array.isArray(this.content) ? (
				(this.content.length === 0) ? this.getLabel('No_Records') : ''
			) : this.renderContentItem(this.content)}
		`;
		if (Array.isArray(this.content) && (this.content.length > 0)) {
			this.element.appendChild(App.isSmallScreen ? this.renderSmallScreen() : this.renderLargeScreen());
		}
		this.bindEvents();
		let selectedFile = this.element.querySelector(
			'.slds-tabs_default__content.slds-show .slds-section__content ul li a.selected'
		);
		if (selectedFile) {
			selectedFile.scrollIntoView();
		}
		return this.element;
	}
}
