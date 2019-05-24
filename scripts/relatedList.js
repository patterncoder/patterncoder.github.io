import { Api } from './api.js'
import { App } from './app.js'
import { CustomObject } from './customObject.js'
import { Db } from './db.js'
import { Editor } from './editor.js'
import { Icons } from './icons.js'
import { Modal } from './modal.js'
import { RecordView } from './recordView.js'
import { Toast } from './toast.js'

export class RelatedList extends CustomObject {
	constructor(options) {
		super(options);
		this.init();
	}

	get description() {
		return this._description || {};
	}
	set description(description) {
		this._description = description;
	}

	get icon() {
		return Icons.icon(this.type);
	}

	static get properties() {
		return [
			'buttonsLayout',
			'columnsLayout',
			'element',
			'label',
			'name',
			'nav',
			'parent',
			'parentId',
			'parentRelationShipField',
			'parentType',
			'type'
		];
	}

	addOrEditRecord(options) {
		options = options || {};
		return new Editor({
			parent: this.parent,
			parentId: this.parentId,
			parentRelationshipField: this.parentRelationshipField,
			parentType: this.type,
			element: this.nav.push(document.createElement('div'), {
				buttons: []
			}),
			nav: this.nav,
			record: options.Id ? options : null,
			type: options.type ? options.type : this.type,
			onPop: () => this.refresh()
		});
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
					console.log(error);
					return;
				}
			}
			const sortedRecords = options.records.slice(0, limit).sort((a,b) => RelatedList.sort(a, b, this.sortBy));
			return Object.assign(options.result, { records: sortedRecords });
		} else {
			try {
				let fields = this.columnsLayout.reduce((allFields, columnLayout) => {
					allFields += (allFields.length > 0 ? ',' : '') + columnLayout.fieldApiName;
					return allFields;
				}, '');
				if (!fields.includes('LastModifiedDate') &&
					this.description.fields.find(field => field.name === 'LastModifiedDate')
				) {
					fields += ',LastModifiedDate';
				}
				let description;
				let ids;
				let response;
				switch(this.type) {
					case 'AttachedContentDocument':
						description = await Api.describe('ContentDocument');
						response = await Api.query(`
							Select ContentDocumentId
							From ContentDocumentLink
							Where LinkedEntityId = '${this.parentId}'
						`);
						ids = ((response && response.records) || []).map(record => record.ContentDocumentId);
						if (ids.length === 0) {
							return response;
						}
						return Api.query(`
							Select ${description.fields.map(field => field.name).join(',')}
							From ${description.name}
							Where (FileType != 'SNOTE')
							And (Id IN (${ids.map(id => `'${id}'`).join(',')}))
						`);
					case 'AttachedContentNote':
						description = await Api.describe('ContentNote');
						response = await Api.query(`
							Select ContentDocumentId
							From ContentDocumentLink
							Where LinkedEntityId = '${this.parentId}'
						`);
						ids = ((response && response.records) || []).map(record => record.ContentDocumentId);
						if (ids.length === 0) {
							return response;
						}
						return Api.query(`
							Select ${description.fields.map(field => field.name).join(',')}
							From ${description.name}
							Where (FileType = 'SNOTE')
							And (Id IN (${ids.map(id => `'${id}'`).join(',')}))
						`);
					case 'CombinedAttachment':
						description = await Api.describe('Attachment');
						return await Api.query(`
							Select ${description.fields.map(field => field.name).join(',')}
							From ${description.name}
							Where ParentId = '${this.parentId}'
						`);
					default:
						return this.fetchApi({ result: await Api.request(`/sobjects/${this.parentType}/${this.parentId}/${this.name}?fields=${fields}`), limit: limit });
				}
			} catch (error) {
				console.log(error);
			}
		}
	}

	async fetchDb(options) {
		options = options || {};
		try {
			const sortField = this.sortBy ? this.sortBy.fieldApiName.replace('__r', '__c') : 'LastModifiedDate';
			let contentDocumentLinks;
			let dbRecords;
			const type = options.type || this.type;
			switch(type) {
				case 'AttachedContentDocument':
					contentDocumentLinks = await Db.ContentDocumentLink
						.where('LinkedEntityId')
						.equals(this.parentId)
						.toArray();
					dbRecords = await Db.ContentDocument
						.where('Id')
						.anyOf(contentDocumentLinks.map(o => o.ContentDocumentId))
						.and(o => o.FileType !== 'SNOTE')
						.and(o => o._changedLocally !== Db.DELETED)
						.sortBy(sortField);
					break;
				case 'AttachedContentNote':
					contentDocumentLinks = await Db.ContentDocumentLink
						.where('LinkedEntityId')
						.equals(this.parentId)
						.toArray();
					dbRecords = await Db.ContentNote
						.where('Id')
						.anyOf(contentDocumentLinks.map(o => o.ContentDocumentId))
						.and(o => o.FileType === 'SNOTE')
						.and(o => o._changedLocally !== Db.DELETED)
						.sortBy(sortField);
					break;
				default:
					if (Db[type] && Db[type].schema.indexes.find(index => index.keyPath === this.parentRelationshipField)) {
						dbRecords = await Db[type]
							.where(this.parentRelationshipField)
							.equals(this.parentId)
							.and(o => o._changedLocally !== Db.DELETED)
							.sortBy(sortField);
					} else {
						return await this.fetchApi(options)
					}
					break;
			}
			if (dbRecords) {
				if ([true, false].includes(options.open)) {
					dbRecords = dbRecords.filter(record => {
						if ([true, false].includes(record.IsClosed)) {
							return (record.IsClosed === !options.open)
						}
						const isFuture = (new Date(record.EndDateTime || 0)).getTime() >= (new Date()).getTime();
						const isPast = !isFuture;
						return options.open ? isFuture : isPast;
					});
				}
				if (this.sortBy && this.sortBy.isAscending !== true) {
					dbRecords = dbRecords.reverse();
				}
				const records = [];
				for (const dbRecord of dbRecords) {
					const record = { attributes: Object.assign({ Id: dbRecord.Id }, dbRecord.attributes) };
					for (const columnLayout of this.columnsLayout) {
						if (['ContentDocumentId', 'Id', undefined, null].indexOf(columnLayout.lookupId) < 0) {
							const lookupId = columnLayout.lookupId.split('.')[0];
							const field = this.description.fields.find(field => field.name === lookupId || field.relationshipName === lookupId);
							const referenceTo = await RelatedList.referenceTo({ field: field });
							if (referenceTo) {
								let id = dbRecord[columnLayout.lookupId];
								const parts = columnLayout.fieldApiName.split('.');
								record[parts[0]] = null;
								if (id) {
									const childRecord = await Db[referenceTo].where('Id').equals(id).first();
									if (childRecord) {
										const field = { value: {fields: {}}};
										field[parts[1]] = childRecord[parts[1]];
										field.value.fields[parts[1]] = { value: childRecord[parts[1]], displayValue: null };
										field.value.apiName = childRecord.attributes.type;
										field.value.id = id;
										record[parts[0]] = field;
									}
								}
							}
						} else {
							record[columnLayout.fieldApiName] = dbRecord[columnLayout.fieldApiName];
						}
					}
					records.push(record);
				}
				return { records: records };
			}
		} catch (error) {
			console.log(error);
		}
	}

	async init() {
		const header = {
			icon: this.icon,
			title: this.nav.header.title,
			buttons: [{ icon: `${RelatedList.getSymbols('utility')}#back`, label: this.getLabel('Cancel'), value: 'cancel' }],
			handler: (event, detail) => {
				switch (event) {
					case 'action':
						switch (detail.value) {
							case 'cancel':
								this.nav.pop();
								break;
							case 'new':
								this.addOrEditRecord();
								break;
						}
						break;
					case 'breadcrumb':
						let n = this.nav.header.breadcrumbs.length - this.nav.header.breadcrumbs.findIndex(element => element === detail);
						while(n-- > 1) {
							this.nav.pop();
						}
						break;
				}
			}
		};
		this.description = await Api.describe(this.type);
		if (this.description.layoutable && this.buttonsLayout.reduce((hasNew, bl) => hasNew ||
			bl.name.toLowerCase().includes('new') ||
			(bl.icons || []).reduce((hasNew, icon) => hasNew || icon.url.toLowerCase().includes('new'), false),
			false
		)) {
			header.buttons.push({ icon: Icons.icon('New'), label: this.getLabel('new'), value: 'new' });
		}
		this.columns = this.columnsLayout.reduce((allColumns, layout) => {
			const parts = layout.fieldApiName.split('.');
			allColumns.push({ fieldApiName: layout.fieldApiName, name: parts[1], label: layout.label, sortable: layout.sortable, sort: 'ascending' });
			return allColumns;
		}, []);
		this.columns = RelatedList.normalizeColumns(this.columns, this.description);
		this.nav.replace(this.render(), Object.assign(header, {
			breadcrumbs: this.nav.header.breadcrumbs.concat(this.description.labelPlural),
			onPop: this.onPop ? this.onPop : null
		}));
		await this.refresh();
	}

	async refresh() {
		this.spinner();
		let result;
		if (this.type === 'ActivityHistory') {
			this.parentRelationshipField = 'WhatId';
			result = await this.fetchDb({ open: false, type: 'Event' });
			result.records = result.records.concat((await this.fetchDb({ open: false, type: 'Task' })).records);
		} else if (this.type === 'OpenActivity') {
			this.parentRelationshipField = 'WhatId';
			result = await this.fetchDb({ open: true, type: 'Event' });
			result.records = result.records.concat((await this.fetchDb({ open: true, type: 'Task' })).records)
		} else if (navigator.onLine) {
			result = await this.fetchApi();
		} else {
			result = await this.fetchDb();
		}
		if (result) {
			this.items = result.records.map(record => {
				return {
					Id: (record.attributes && record.attributes.Id) ||
						(record.attributes.url && record.attributes.url.split('/').slice(-1)[0]),
					type: record.attributes ? record.attributes.type : '',
					fields: this.columnsLayout.reduce((remapped, layout) => {
						const parts = layout.fieldApiName.split('.');
						if (['ContentDocumentId', 'Id', undefined, null].indexOf(layout.lookupId) < 0) {
							let field = {
								displayValue: parts.reduce((value, field) => record[value] ? record[value][field] : null),
								value: record[parts[0]] ? record[parts[0]].value : null
							};
							if (!field.value) {
								field = { value: field.displayValue, displayValue: null };
							}
							remapped[parts[0]] = field;
						} else {
							remapped[parts[0]] = { value: record[layout.fieldApiName], displayValue: null };
						}
						return remapped;
					}, {})
				};
			});
			RelatedList.trackPageview(`/RelatedList/${this.description.name}`);
			this.render();
		}
	}

	async remove(Id) {
		if (!(await Modal.confirm({ title: `${this.getLabel('Delete')} ${this.description.label}` }))) {
			return;
		}
		try {
			this.spinner({ blockInput: true });
			await RelatedList.remove({ record: { Id: Id }, type: this.type });
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

	render() {
		this.recordView = new RecordView({
			element: this.element,
			displayFormat: App.isSmallScreen ? 'tiles' : 'table',
			description: this.description,
			icon: this.icon,
			columns: this.columns,
			items: this.items,
			menus: [{label: `${this.getLabel('Delete')} ${(this.description && this.description.label)}`, action: 'delete', className: 'menuitem-delete'}],
			handler: (event, detail) => {
				switch(event) {
					case 'delete':
						this.remove((detail && detail.Id) || (detail && detail.id) || detail);
						break;
					case 'select':
						this.addOrEditRecord(detail);
						break;
					case 'sort':
						this.sortBy = detail;
						this.refresh();
						break;
				}
			},
			sortBy: this.sortBy
		});
		return this.element;
	}
}
