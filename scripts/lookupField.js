import { Api } from './api.js'
import { App } from './app.js'
import { Db } from './db.js'
import { Field } from './field.js'
import { Icons } from './icons.js';
import { List } from './list.js'
import { PopupEditor } from './popupEditor.js'

export class LookupField extends Field {
	constructor(options) {
		super(options);
		this.render();
		this.search();
	}

	get modified() {
		return this.list.modified;
	}
	get newIcon() {
		return Icons.icon('New');
	}
	get value() {
		return this._value;
	}
	set value(value) {
		let valueChanged = JSON.stringify(this.value) !== JSON.stringify(value);
		if (valueChanged) {
			let values = Array.isArray(value) ? value : [value];
			let ids = values.filter(v => v && ((typeof(v) === 'string') || (v.value === v.label))).map(v => v.value || v);
			((ids.length > 0) ?
				this.fetchDescription().then(() => (navigator.onLine ?
					Api.query(`
						Select
							Id, ${this.nameField}
						From ${this.referenceDescription.name}
						Where Id In (${ids.map(id => `'${id}'`).join(',')})
					`).then(result => Promise.resolve((result && result.records) || [])) :
					Db[this.referenceDescription.name].where('Id').anyOfIgnoreCase(ids).toArray()
				).then(records => Promise.resolve(values = values.map(value => {
					let record = records.filter(r => r.Id === (value.value || value))[0];
					return record ? { label: record[this.nameField], value: record.Id } : value;
				})))) : Promise.resolve(values)
			).then(values => {
				this._value = (values.length > 1) ? values : values[0];
				this.list.value = this.value;
				this.list.render();
				this.search((this.list.input && this.list.input.value) || (this.value && this.value.label) || '');
				if (this.handler) {
					this.handler('valueChange', this);
				}
			});
		}
	}

	bindEvents() {
		this.bind('.new-button .slds-button', 'click', async (event) => {
			if (this.showNewButton) {
				let result;
				if (this.showNewButton.handler) {
					result = await this.showNewButton.handler(event, field);
				} else if (this.nav && this.referenceTo && this.referenceTo.length > 0) {
					const type = this.referenceTo[0];
					result = await new Promise(async (resolve, reject) => {
						const editorOptions = {
							onPop: (popupEditor, options) => {
								const record = popupEditor.record;
								if (options.button !== 'close') {
									let name = record.Name;
									switch(record.attributes && record.attributes.type) {
										case 'Contact':
											name = `${record.FirstName ? `${record.FirstName} ` : ''}${record.LastName}`;
											break;
									}
									resolve({ label: name, value: record.Id || record.id });
								} else {
									resolve();
								}
							},
							saveAndNew: false,
							type: type,
						};
						if (App.isSmallScreen) {
							new PopupEditor(Object.assign(editorOptions, {
								element: this.nav.push(document.createElement('div'), {
									buttons: [
										{ label: this.getLabel('Back'), value: 'back' }
									]
								}),
								nav: this.nav
							}));
						} else {
							await PopupEditor.open(editorOptions);
						}
					});
				}
				this.value = result ? result : null;
			}
		});
	}

	async dependentFieldChangeHandler(field) {
		if (field === this) {
			return;
		}
		let referenceTo = await LookupField.referenceTo({ field: field });
		if (!referenceTo) {
			return;
		}
		let value = (field.value && field.value.value) || field.value;
		if (this.dependentFields && Object.keys(this.dependentFields).includes(field.name)) {
			this.dependentFields[field.name] = value;
			if (value && this.value) {
				let result = await Api.query(`
					Select ${field.name}
					From ${this.referenceDescription.name}
					Where Id = '${(this.value && this.value.value) || this.value}'
				`);
				result = ((result && result.records) || [])[0];
				if (value !== result[field.name]) {
					this.value = null;
				}
			}
			this.search((this.value && this.value.label) || '');
		}
	}

	async fetchDescription() {
		if (this.description) {
			return this.description;
		}
		let description;
		if (this.objectName) {
			description = await Api.describe(this.objectName);
			Object.assign(this, (description && description.fields.find(f => f.name === this.name)) || {});
			this.dependentFields = ((this.filteredLookupInfo || {}).controllingFields || [])
				.reduce((fields, fieldName) => {
					fields = fields || {};
					fields[fieldName] = undefined;
					return fields;
				}, null);
		}
		if (this.referenceTo) {
			this.referenceDescription = await Api.describe(Array.isArray(this.referenceTo) ? ((this.name === 'OwnerId') ? 'User' : this.referenceTo[0]) : this.referenceTo);
			this.nameField = this.referenceDescription && this.referenceDescription.fields && (this.referenceDescription.fields.find(field => field.nameField) || {}).name;
		}
		return this.description = description;
	}

	render() {
		this.element.innerHTML = `
			<style>
			.lookup-field {
				display: flex;
			}
			.lookup-field .list {
				flex: 1;
				width: 0;
			}
			.lookup-field .new-button {
				align-self: flex-start;
				margin-left: 1em;
				margin-right: 1em;
				margin-top: 3em;
			}
			</style>
			<div class="lookup-field">
				<div class="list"></div>
				${(this.showNewButton && !this.disabled && !this.readonly) ? this.renderNewButton() : ''}
			</div>
		`;
		this.list = new List({
			clearable: !this.readOnly,
			collapsed: true,
			collapsible: !this.disabled,
			element: this.element.querySelector('.lookup-field .list'),
			handler: (event, v) => {
				switch(event) {
					case 'inputChange':
						this.search(v);
						break;
					case 'valueChange':
						this.value = v.value;
						break;
					case 'labelClick':
						if (this.handler) {
							this.handler(event, this);
						}
						break;
				}
			},
			label: this.label,
			linkLabel: this.linkLabel,
			items: (this.lookupValues || []).map(lv => Object.assign({
				label: lv.Name || lv.name || lv.label,
				value: lv.Id || lv.id || lv.value
			})),
			multiselect: this.isSearch || this.multiselect,
			placeholder: this.isSearch ? this.getLabel('All') : this.getLabel(this.multiselect ? 'Choose_Generic' : 'Choose'),
			readOnly: this.readOnly,
			required: this.required,
			searchable: true,
			showEmpty: true,
			value: this.value
		});
		this.bindEvents();
		return this.element;
	}

	renderNewButton() {
		return `
			<div class="new-button slds-icon_container slds-icon_container_circle slds-icon-action-description">
				<button class="slds-button slds-button_icon slds-button_icon-inverse">
					<svg class="slds-button__icon slds-icon-text-info" aria-hidden="true">
						<use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="${this.newIcon.url}" />
					</svg>
					<span class="slds-assistive-text">${this.getLabel('Add_new')} ${this.label}</span>
				</button>
			</div>
		`;
	}

	async search(searchString) {
		searchString = searchString || '';
		await this.fetchDescription();
		if (!navigator.onLine) {
			return this.searchOffline(searchString);
		}
		if (this.objectName &&
			!['Event','Task', 'User'].includes(this.objectName) &&
			!['OwnerId', 'RecordTypeId'].includes(this.name) &&
			searchString && (searchString.length > 1)
		) {
			Api.lookupValues(
				this.objectName,
				this.name,
				searchString,
				'Search',
				this.dependentFields
			).then(result => {
				let lookupResults = Object.values(result.lookupResults)[0];
				this.list.items = lookupResults.records.map(record => Object.assign({
					label: record.fields.Name.displayValue || record.fields.Name.value,
					value: record.id
				})).sort((a,b) => a.label.localeCompare(b.label));
				this.list.render();
			});
			return;
		}
		if (!(this.nameField && this.referenceTo)) {
			return;
		}
		let dependentFields = Object.entries(this.dependentFields || {}).filter(([k,v]) => ![undefined, null, ''].includes(v));
		if (this.filteredLookupInfo && (Object.keys(dependentFields).length === 0)) {
			this.list.items = [];
			this.list.render();
			return;
		}
		Api.query(`Select
			Id,${this.nameField}
			${this.referenceDescription.fields.find(field => field.name === 'IsActive') ? ',IsActive' : ''}
			From ${this.referenceDescription.name}
			Where ${this.nameField} Like '%${searchString}%'
			${dependentFields.length ? `And ${
				dependentFields.map(
					([k,v]) => `(${k} = ${(typeof(v) === 'string') ? `'${v}'` : v})`
				).join(' And ')
			}` : ''}
			Order By ${this.nameField} ASC
			Limit 2000
		`).then(result => {
			this.list.items = result.records.filter(record => record.IsActive !== false)
				.filter(record => !(this.referenceDescription && (this.referenceDescription.name === 'RecordType')) ||
					(this.description.recordTypeInfos || []).find(recordType => recordType.active && recordType.available && (recordType.recordTypeId === record.Id))
				).map(record => Object.assign({
					label: record[this.nameField],
					value: record.Id
				}))
				.filter(item => !this.readOnly || (item.value === (this.value && this.value.value)))
				.slice(0, 20);
			this.list.render();
		});
	}

	async searchOffline(searchString) {
		searchString = searchString || '';
		await this.fetchDescription();
		let records = [];
		let table = this.referenceDescription && this.referenceDescription.name && Db[this.referenceDescription.name];
		let index = table && table.schema.indexes.find(index => index.keyPath === this.nameField);
		if (table && index) {
			records = (await table.where(this.nameField)
				.startsWithIgnoreCase(searchString)
				.sortBy(this.nameField)
			);
		} else if (table) {
			records = await table.toArray();
		}
		this.list.items = records.filter(record => record.IsActive !== false)
			.filter(record => !(this.referenceDescription && (this.referenceDescription.name === 'RecordType')) ||
				(this.description.recordTypeInfos || []).find(recordType => recordType.active && recordType.available && (recordType.recordTypeId === record.Id))
			).map(record => Object.assign({
				label: record[this.nameField],
				value: record.Id
			})).slice(0, 20);
		this.list.render();
	}
}
