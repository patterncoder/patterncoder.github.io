import { Api } from './api.js'
import { App } from './app.js'
import { Db } from './db.js'
import { GoogleAnalytics } from './googleAnalytics.js'

export class CustomObject {
	constructor(options) {
		(this.constructor.properties || []).forEach(p =>
			Object.defineProperty(this.constructor, p, {
				configurable: true,
				enumerable: true,
				get: () => this[`_${p}`],
				set: (newValue) => this[`_${p}`] = newValue,
				writeable: true
			})
		);
		Object.assign(this, options || {});
	}

	static get properties() {
		return [
			'labels'
		];
	}

	static get baseUrl() {
		return this._baseUrl = this._baseUrl || '../';
	}
	static set baseUrl(baseUrl) {
		this._baseUrl = baseUrl;
	}
	static get nullString() {
		return '&nbsp;--&nbsp;'
	}
	static get symbols() {
		return this._symbols = this._symbols || `${this.baseUrl}style/slds/icons/utility-sprite/svg/symbols.svg`;
	}
	static set symbols(symbols) {
		this._symbols = symbols;
	}
	static get trackingEnabled() {
		return navigator.onLine && (typeof(GoogleAnalytics) !== 'undefined');
	}

	static bind(elements, events, handler, element) {
		element = element || document.body;
		elements = (typeof(elements) === 'string') ? Array.from(element.querySelectorAll(elements)) : elements;
		if (elements && events && handler) {
			elements = Array.isArray(elements) ? elements : [ elements ];
			events = Array.isArray(events) ? events : [ events ];
			events.forEach(event => elements.forEach((element, index) => element.addEventListener(event, event => handler(event, index))));
		}
	}

	static capitalize(string) {
		return string && string.charAt(0).toUpperCase() + string.substr(1);
	}

	static chunk(options) {
		options = options || {};
		return (Array.isArray(options) ? options : (options.records || []))
			.reduce((result, record) => {
				if (!result[result.length-1] || (result[result.length-1].length >= ((options && options.size) || 100))) {
					result.push([]);
				}
				result[result.length-1].push(record);
				return result;
			}, []);
	}

	static dateToUTC(date) {
		date = new Date(date);
		return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds());
	}

	static displayValue(value, type, showTime) {
		value = this.getText(value);
		if ([undefined, null, ''].includes(value)) {
			return this.nullString;
		}
		let locale = undefined;
		switch(type) {
			case 'boolean':
				return [true, 'true'].includes((value || '').toLowerCase()) ? '&#10004;' : '&nbsp;';
			case 'currency':
				locale = { name: 'en-US',  options: { style: 'currency', currency: 'USD' } };
				return Number(value).toLocaleString(locale.name, locale.options || {});
			case 'currencyLong':
				locale = { name: 'en-US',  options: { style: 'currency', currency: 'USD', minimumFractionDigits: 4 } };
				return Number(value).toLocaleString(locale.name, locale.options || {});
			case 'date':
				if (value && (value !== this.nullString)) {
					value = this.dateToUTC(value);
				}
				locale = { name: 'en-US', options: { year: 'numeric', month: '2-digit', day: '2-digit' } };
				return value.toLocaleDateString(locale.name, locale.options || {});
			case 'dateLong':
				if (value && (value !== this.nullString)) {
					value = new Date(value.replace('+0000', 'Z'));
				}
				locale = { name: 'en-US', options: { year: 'numeric', month: 'short', day: '2-digit' } };
				return value.toLocaleDateString(locale.name, locale.options || {});
			case 'datetime':
				if (value && (value !== this.nullString)) {
					value = new Date(value.replace('+0000', 'Z'));
				}
				if (showTime === false) {
					value = new Date(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());
				}
				locale =  (showTime === false) ?
					{ name: 'en-US', options: { year: 'numeric', month: '2-digit', day: '2-digit' } } :
					{ name: 'en-US', options: { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' } };
				return value.toLocaleDateString(locale.name, locale.options || {});
			case 'time':
				if (value && (value !== this.nullString)) {
					value = this.dateToUTC(value);
				}
				locale = { name: 'en-US', options: { hour: '2-digit', minute: '2-digit', second: '2-digit' } };
				return value.toLocaleDateString(locale.name, locale.options || {});
			default:
				return value.toLocaleString();
		}
	}

	static async fetchSettings(options) {
		options = options || {};
		options.defaultSettings = [undefined].includes(options.defaultSettings) ? {} : options.defaultSettings; // null added to .includes?
		options.minimumScore = options.minimumScore || 1;
		let settings = await (navigator.onLine ? Api.fetchAll(options.type) : Db[options.type].toArray());
		if (settings.length === 0) {
			return options.defaultSettings;
		}
		if ((options.onlyOne !== false) && (options.all !== true) && (settings.length === 1)) {
			return settings[0];
		}
		settings = settings.map(setting => {
			let score = options.criteria.reduce((score, [key, value], index, array) => {
				if ([undefined, null, ''].includes(setting[key])) {
					return score + 1;
				} else if (setting[key] === value) {
					return score + Math.pow(2, (array.length - index));
				} else {
					return score - Math.pow(2, array.length+1);
				}
				return score;
			}, 0);
			return { setting: setting, score: score };
		})
			.filter(setting => setting.score >= options.minimumScore)
			.sort((a, b) => b.score - a.score)
			.map(setting => setting.setting);
		return ((options.all === true) ? settings : settings[0]) || options.defaultSettings;
	}

	static getLabel(label) {
		return label ? ((this.labels || {})[label.toLowerCase()] || { value: label }).value : '';
	}

	static async getRecord(options) {
		options = options || {};
		if (!(options.id && (options.description || options.type))) {
			return;
		}
		let description = options.description || await Api.describe(options.type);
		let id = options.id;
		let type = description && description.name;
		if (!(id && type)) {
			return;
		}
		if (navigator.onLine && !Db.isLocalId(id)) {
			let result = await Api.query(`
				Select ${description.fields.filter(field => field.type !== 'base64')
					.map(field => field.name).join(',')}
				From ${type}
				Where Id = '${id}'
			`);
			return result && result.records && result.records[0];
		}
		return await Db[type].where('Id').equals(id).first();
	}

	static getReferenceIds(options) {
		options = options || {};
		return (options.description && options.description.fields || [])
			.filter(field => (field.referenceTo || []).find(refField => (options.referenceFields || []).includes(refField)))
			.map(field => options.record[field.name])
			.concat(options.seedIds)
			.filter((id, index, ids) => id && (ids.indexOf(id) === index));
	}

	static getSymbols(category) {
		return this.symbols.replace('utility-sprite', category ? `${category}-sprite` : 'utility-sprite');
	}

	static getText(value) {
		if ([null, undefined].indexOf(value) >= 0) {
			return value;
		}
		let txt = document.createElement('textarea');
		txt.innerHTML = value;
		let el = document.createElement('div');
		el.appendChild(document.createTextNode(txt.value));
		return el.innerHTML.replace(/\"/g, '&quot;');
	}

	static initializeTracking(trackingID) {
		if (this.trackingEnabled) {
			GoogleAnalytics.initialize(trackingID);
		}
	}

	static normalizeColumns(columns, description) {
		if (App.isSmallScreen) {
			const nameField = (description.fields || []).find(f => f.nameField);
			if (nameField) {
				const index = columns.findIndex(field => field.fieldApiName === nameField.name);
				if (index > 0) {
					columns.splice(0, 0, columns.splice(index, 1)[0]);
				} else if (index < 0) {
					columns.splice(0, 0, { fieldApiName: nameField.name, label: nameField.label, sortable: nameField.sortable, sort: 'ascending' });
				}
			}
		}
		return columns;
	}

	static async normalizeRecord(context, record) {
		const normalizedRecord = { id: record.Id, apiName: context.type, fields: {} };
		for(const fieldName of context.queryFields) {
			let value = record[fieldName];
			let field = (context.description.fields || []).find(field => field.name === fieldName);
			let displayValue = value;
			if (field) {
				if (field.referenceTo.length > 0) {
					displayValue = await CustomObject.referenceDisplayValue({ field: field, value: value });
					if (displayValue) {
						const referenceTo = await this.referenceTo({ field: field, value: value });
						value = { apiName: referenceTo, id: value, fields: { Name: { value: displayValue } } };
						const column = context.columns.find(column => column.fieldApiName === fieldName);
						if (column && !column.fieldApiName.endsWith('.Name')) {
							column.fieldApiName = column.fieldApiName + '.Name';
						}
					}
				} else {
					const type = context.description.fields.find(field => field.name === fieldName).type || 'string';
					displayValue = value ? CustomObject.displayValue(value, type, !(
						record &&
						record.IsAllDayEvent &&
						['StartDateTime', 'EndDateTime'].includes(field.name)
					)) : value;
				}
			}
			normalizedRecord.fields[fieldName] = { value: value, displayValue: displayValue };
		};
		return normalizedRecord;
	}

	static parseArgs(args) {
		args = args || [
			window.location.search.substr(1),
			window.location.hash.substr(1)
		].join('&') || '';
		let nvps = args.split('&');
		return nvps.reduce((parsedArgs, nvp) => {
			let parts = nvp.split('=');
			if ((parts.length === 2) && parts[0]) {
				parsedArgs[parts[0]] = unescape(parts[1]);
			}
			return parsedArgs;
		}, {});
	}

	static async referenceDisplayValue(options) {
		options = options || {};
		const referenceTo = await this.referenceTo({ field: options.field, value: options.value });
		if (!(referenceTo && options.value)) {
			return this.displayValue('');
		}
		let referenceDescription = await Api.describe(referenceTo);
		if (!referenceDescription) {
			return;
		}
		let nameField = (referenceDescription.fields || []).find(f => f.nameField);
		if (!nameField) {
			return;
		}
		let record;
		if (navigator.onLine) {
			let response = await Api.query(`Select Id,${nameField.name} From ${referenceTo} Where Id = '${options.value}'`);
			record = response && response.records && response.records[0];
		} else if ((typeof(Db) !== 'undefined') && Db[referenceTo]) {
			record = await Db.fetchById(referenceTo, options.value);
		}
		return record[nameField.name];
	}

	static async referenceTo(options) {
		options = options || {};
		let result;
		if (!options.field) {
			return result;
		}
		if (options.field.name) {
			result = options.field.referenceTo;
		} else if (options.type) {
			let description = await Api.describe(options.type);
			let field = ((description && description.fields) || []).find(field => field.name === options.field);
			result = field && field.referenceTo;
		}
		if (result && (result.length > 1) && (typeof(Db) !== 'undefined') &&
			options.value && (typeof(options.value) === 'string') && (options.value.length >= 3)
		) {
			let keyPrefix = options.value.substr(0, 3);
			const tables = Db.db.tables.filter(table => !(table.name.startsWith('_') || ['ContentNote', 'CurrencyType'].includes(table.name)));
			for (let table of (tables || [])) {
				let description = await Api.describe(table.name);
				if ((description && description.keyPrefix) === keyPrefix) {
					return description.name;
				}
			}
		}
		return result && result[0];
	}

	static async remove(options) {
		if (!options.record || !options.type) {
			return;
		}
		if (Array.isArray(options.record)) {
			const results = [];
			const errors = [];
			for (const record of options.record) {
				try {
					results.push(await this.remove({ record: record, type: options.type }));
				} catch(error) {
					errors.push(error);
				}
			}
			if (errors.length > 0) {
				throw errors;
			}
			return results;
		}
		const isLocalId = options.record.Id.startsWith('_');
		if (navigator.onLine) {
			if (!isLocalId) {
				await Api.remove(options.record, options.type);
			}
			return await Db.remove(options.type, options.record);
		} else if (typeof (Db) !== 'undefined') {
			if (isLocalId) {
				return await Db.remove(options.type, options.record);
			}
			options.record._changedLocally = Db.DELETED;
			return await Db.save(Db[options.type], options.record);
		}
	}

	static sort(a, b, sortBy) {
		const sortField = sortBy ? sortBy.fieldApiName : 'LastModifiedDate';
		const isAscending = sortBy ? sortBy.isAscending : true;
		const name = sortBy ? sortBy.name : undefined;

		let valueA = a[sortField];
		let valueB = b[sortField];
		if (!valueA) {
			return isAscending ? 1 : -1;
		}
		if (!valueB) {
			return isAscending ? -1 : 1;
		}
		if (typeof valueA === 'object' || valueA instanceof Object) {
			valueA = valueA[name];
			valueB = valueB[name];
		}
		if (new Date(valueA) !== "Invalid Date" && !isNaN(new Date(valueA))) {
			valueA = new Date(valueA).getTime();
			valueB = new Date(valueB).getTime();
		}
		if (typeof valueA === 'string' || valueA instanceof String) {
			return isAscending ? valueA.localeCompare(valueB) : valueB.localeCompare(valueA);
		}
		return isAscending ? valueA - valueB : valueB - valueA;
	}

	static async saveRecords(options) {
		options = options || {};
		let result;
		if (!options.onlineOnly && (typeof(Db) !== 'undefined')) {
			try {
				result = await Db.save(options.description.name, options.records);
			} catch(error) {
				console.log(result = error);
			}
		} else {
			try {
				result = await Api.save(options.records, options.description.name, options.description);
			} catch(error) {
				App.error((result = error) && error.errors && error.errors[0] && error.errors[0].message);
			}
		}
		result = Array.isArray(result) ? result : [result];
		return result.map(result => Object.assign({ id: result && (result.success !== false) && (result.id || result.Id) }, result));
	}

	static spinner(options) {
		options = options || {};
		let parent = options.element || document.body;
		let element = Array.from(parent.querySelectorAll('.slds-spinner')).filter(
			element => element && (element.parentNode.parentNode === parent)
		)[0];
		if (element) {
			return element.parentNode.parentNode.removeChild(element.parentNode);
		}
		element = document.createElement('div');
		if (options.blockInput) {
			Object.entries({
				backgroundColor: 'gray',
				height: '100%',
				left: 0,
				opacity: .5,
				position: 'absolute',
				top: 0,
				width: '100%',
				zIndex: 110000
			}).forEach(([key, value]) => element.style[key] = value);
		}
		element.innerHTML = `
			<div class="slds-spinner slds-spinner_${options.size || 'medium'} ${options.blockInput ? 'slds-spinner_inverse' : ''}" role="status">
				<div class="slds-spinner_container">
					<span class="slds-assistive-text">${CustomObject.getLabel(options.label || 'Loading')}</span>
					<div class="slds-spinner__dot-a"></div>
					<div class="slds-spinner__dot-b"></div>
				</div>
			</div>
		`;
		return parent.appendChild(element);
	}

	static trackPageview(path) {
		if (this.trackingEnabled) {
			GoogleAnalytics.pageview(path);
		}
	}

	bind(elements, events, handler, element) {
		element = element || this.element;
		CustomObject.bind(elements, events, handler, element);
	}

	capitalize(string) {
		return CustomObject.capitalize(string);
	}

	chunk(options) {
		return CustomObject.chunk(options);
	}

	async setDefaults(options) {
		options = options || {};
		const type = options.type || this.type;
		if (!type) {
			return;
		}
		let record = options.record || this.record || {};
		this.defaults = await Api.defaults(type);
		if (this.defaults) {
			record = Object.keys(this.defaults.record.fields).reduce((record, key) => {
				if ([undefined, null].includes(record[key]) &&
					![undefined, null].includes(this.defaults.record.fields[key].value) &&
					(typeof(this.defaults.record.fields[key].value) !== 'object')
				) {
					record[key] = this.defaults.record.fields[key].value;
				}
				return record;
			}, record);
		}
		return record;
	}

	getLabel(label) {
		return CustomObject.getLabel(label);
	}

	async getRecord() {
		if (!(this.description && this.record)) {
			return;
		}
		let id = this.record.Id || this.record.id;
		let type = this.description.name;
		if (!(id && type)) {
			return;
		}
		return this.record = ((await CustomObject.getRecord({ description: this.description, id: id })) || this.record);
	}

	async fetchChildInfo(description) {
		description = description || this.description;
		let activityRelationship = description.childRelationships.filter(cr => cr.childSObject === 'LookedUpFromActivity')[0];
		if (activityRelationship) {
			['Event', 'Task'].forEach(
				o => description.childRelationships.push(
					Object.assign({}, activityRelationship, { childSObject: o })
				)
			);
		}
		description.childRelationships = description.childRelationships.filter(
			cr => cr.childSObject !== 'LookedUpFromActivity'
		);
		description.childRelationships = description.childRelationships.filter(cr =>
			cr.childSObject &&
			(cr.childSObject !== description.name) &&
			cr.field &&
			cr.field.endsWith('__c') &&
			cr.relationshipName
		);
		for (let cr of description.childRelationships) {
			cr.description = await Api.describe(cr.childSObject);
		}
		description.childRelationships = description.childRelationships.filter(
			cr => cr.description && cr.description.queryable
		);
		for (let cr of description.childRelationships) {
			try {
				cr.layout = await Api.editLayout(cr.childSObject);
				let crFieldset = await Api.fieldset(cr.childSObject, 'mobile');
				cr.childFields = ((crFieldset && crFieldset.fields) || []).map(field => field.name);
			} catch(error) {
				console.log(error);
			}
		}
		description.childRelationships.sort((a, b) => a.description.label.localeCompare(b.description.label));
		return description.childRelationships;
	}

	async referenceTo(options) {
		return CustomObject.referenceTo(options);
	}

	async remove() {
		return CustomObject.remove({ record: this.record, type: this.type });
	}

	async saveRecords(options) {
		return CustomObject.saveRecords(Object.assign({ onlineOnly: this.onlineOnly }, options));
	}

	spinner(options) {
		options = options || {};
		options.element = options.element || this.element;
		return CustomObject.spinner(options);
	}

	toObject() {
		return Object.getOwnPropertyNames(this)
			.filter((prop) => typeof(this[prop]) !== 'function')
			.reduce(
				(o, prop) => {
					o[prop] = this[prop];
					return o;
				}, {}
			);
	}
}
