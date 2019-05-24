import { Auth } from './auth.js'
import { Db } from './db.js'

export class Api {
	static get auth() {
		return Auth.authenticate();
	}

	static get version() {
		return 'v45.0';
	}

	static async batchRequest(options) {
		options = options || {};
		let batchSize = 25;
		let requests = options.batchRequests || options.requests || [];
		let response = { results: [] };
		let request = 0;
		while (request < requests.length) {
			response.results.push(...(((await Api.request({
				body: { batchRequests: requests.slice(request, request+=batchSize) },
				method: 'POST',
				path: '/composite/batch',
				syncInterval: options.syncInterval
			})) || {}).results || []));
		}
		return response;
	}

	static async createRequest(options) {
		options = (typeof(options) === 'string') ? { path: options } : (options || {});
		const path = options.path;
		const method = options.method || 'GET';
		const body = options.body || null;
		let auth;
		try {
			auth = await Api.auth;
		} catch(error) {
			await Auth.refresh();
			return Api.createRequest(options);
		}
		if (!(auth && auth.access_token && (auth.instance_url || auth.session_id))) {
			return;
		}
		let proxyUrl // = (auth.instance_url !== window.location.origin) && window.location.origin;
		let url = (path.startsWith('http') && path) || proxyUrl || auth.instance_url || '';
		url = url.endsWith('/') ? url.substr(0, url.length-1) : url;
		if (!path.startsWith('http')) {
			url = `${url}${(path.startsWith('/services/') && path) || `/services/data/${Api.version}${path}`}`;
		}
		let req = new Request(url, {
			method: method,
			body: (method === 'GET') ? null : JSON.stringify(body),
			headers: {
				'Authorization': `Bearer ${auth.access_token}`,
				'Cache-Control': 'no-store',
				'Content-Type': 'application/json',
				'Sforce-Query-Options': 'batchSize=2000',
				'Sync-Interval': isNaN(Number(options.syncInterval)) ? 60 : (Number(options.syncInterval) ? Number(Math.max(options.syncInterval, .01)) : 0), //minutes
				'Target-URL': auth.instance_url
			},
			mode: 'cors'
		});
		return req;
	}

	static dataUrl(blob) {
		return new Promise((resolve, reject) => {
			let reader = new FileReader();
			reader.onloadend = () => resolve(reader.result);
			reader.onerror = reject;
			reader.readAsDataURL(blob);
		});
	}

	static async request(options) {
		options = (typeof(options) === 'string') ? { path: options } : (options || {});
		let request = await this.createRequest(options);
		let response;
		try {
			response = await this.fetch(request);
		} catch(error) {
			options.retries = Math.floor(Math.abs(Number(options.retries) || 0)) + 1;
			if (!navigator.onLine || (options.retries > 5)) {
				return Promise.reject({ error: error });
			} else if (options.retries === 3) {
				await Auth.refresh();
			}
			return new Promise(resolve => setTimeout(() => Api.request(options).then(resolve), Math.pow(options.retries, 2) * 200));
		}
		if (!(response && response.ok)) {
			if (response && (response.status === 401)) {
				await Auth.refresh();
				return Api.request(options);
			}
			const errors = response && response.json && await response.json();
			if (errors) {
				console.log(errors);
			}
			if ((errors || []).find(error => error && (error.errorCode === 'REQUEST_LIMIT_EXCEEDED')) && (typeof(Modal) !== 'undefined')) {
				const message = CustomObject.getLabel('Mobile_Logs_API_Limit_Error');
				await new Modal({
					description: message,
					texture: 'alert',
					theme: 'error',
					title: message
				}).open();
			}
			return Promise.reject(errors ? Object.assign(response || {}, { errors: errors }) : response);
		}
		switch(response.status) {
			case 204:
				return;
		}
		const contentType = response.headers.get('content-type');
		const isJson = contentType && (contentType.indexOf('application/json') >= 0);
		if (isJson) {
			const json = await response.json();
			return (json !== 'offline') ? json : null;
		}
		let blob = await response.blob();
		return options.dataUrl ? Api.dataUrl(blob) : blob;
	}

	static async bulkInsert(options) {
		options = options || {};
		if (!((options.description || options.type) && Array.isArray(options.records) && (options.records.length > 0))) {
			return [];
		}
		let description = options.description || await Api.describe(options.type);
		let batchSize = options.batchSize || 200;
		if (options.records.length > batchSize) {
			let result = await Api.bulkInsert(Object.assign({}, options, { records: options.records.slice(0, batchSize) }));
			let success = (result || []).reduce((success, result) => success && result.success, true);
			if (!success) {
				return result;
			}
			return result.concat(await Api.bulkInsert(Object.assign({}, options, { records: options.records.slice(batchSize) })));
		}
		let processedRecords = options.records.map(record => Object.assign({
			attributes: { type: description.name }
		}, Api.saveFields(record, description)));
		return Api.request({
			body: { allOrNone: true, records: processedRecords },
			method: 'POST',
			path: '/composite/sobjects'
		});
	}

	static async compactLayout(type, recordType) {
		if (!type) {
			return [];
		}
		let compactLayouts = await Api.compactLayouts(type);
		const defaultLayoutId = compactLayouts && compactLayouts.defaultCompactLayoutId;
		let rtm = compactLayouts && (compactLayouts.recordTypeCompactLayoutMappings || []).find(
			(rtm) => recordType ? [rtm.recordTypeId, rtm.recordTypeName].includes(recordType) : rtm.compactLayoutId === defaultLayoutId
		);
		let compactLayout = compactLayouts && compactLayouts.compactLayouts && compactLayouts.compactLayouts[0];
		const brt = compactLayouts && compactLayouts.compactLayoutsByRecordType;
		try {
			compactLayout = rtm ? ((brt && brt.get(rtm.recordTypeId) || await Api.request(rtm.urls.compactLayout)) || compactLayout) : compactLayout;
		} catch(error) {}
		if (!compactLayout) {
			return [];
		}
		return compactLayout.fieldItems.reduce(
			(result, item) => result.concat(item.layoutComponents.reduce(
				(result, component) => result.concat((component.components || [component]).filter(
					component => component.type === 'Field').reduce(
						(result, component) => result.concat(Object.assign({}, component.details, {
							editableForNew: item.editableForNew,
							editableForUpdate: item.editableForUpdate,
							label: component.details.compoundFieldName ? component.details.label : item.label,
							required: item.required || !component.details.nillable,
							tabOrder: component.tabOrder
						})),
						[]
					)
				),
				[]
			)),
			[]
		).sort((a, b) => a.tabOrder - b.tabOrder);
	}

	static async compactLayouts(type, refresh) {
		try {
			let response = (!refresh && (await this.meta(type, 'compactLayouts'))) ||
				(await this.request({
					path: `/sobjects/${type}/describe/compactLayouts`,
					syncInterval: 0
				}));
			if (refresh && !response.compactLayouts) {
				// force caching of record type-specific compact layouts for offline use
				response.compactLayoutsByRecordType = ((await this.batchRequest({
					requests: response.recordTypeCompactLayoutMappings.map(rtm => Object.assign({
						method: 'GET',
						url: rtm.urls.compactLayout
					}))
				})).results || []).reduce((brt, result, index) => brt.set(
					response.recordTypeCompactLayoutMappings[index].recordTypeId, result && result.result
				), new Map());
			}
			return response;
		} catch(error) {
			return;
		}
	}

	static async defaults(type, refresh) {
		try {
			return (!refresh && (await this.meta(type, 'defaults'))) ||
				(await this.request({
					path: `/ui-api/record-defaults/create/${type}`,
					syncInterval: 0
				}));
		} catch(error) {
			return;
		}
	}

	static async describe(type, refresh) {
		try {
			return (!refresh && type && (await this.meta(type, 'description'))) ||
				(await this.request({
					path: type ? `/sobjects/${type}/describe` : '/sobjects',
					syncInterval: 0
				}));
		} catch(error) {
			return;
		}
	}

	static async fieldNamesWithUniqueAttribute(type) {
		const tableMetaData = await this.describe(type);
		const unique = tableMetaData.fields.filter(field => field.unique || field.type === "id" || field.nameField).map(field => field.name);
		return unique;
	}

	static async editLayout(type, recordType) {
		let layout = await Api.layout(type, recordType);
		if (!layout) {
			return [];
		}
		return layout.editLayoutSections.reduce(
			(result, section) => result.concat(section.layoutRows.reduce(
				(result, row) => result.concat(row.layoutItems.reduce(
					(result, item) => result.concat(item.layoutComponents.reduce(
						(result, component) => result.concat((component.components || [component]).filter(
							component => component.type === 'Field').reduce(
								(result, component) => result.concat(Object.assign({}, component.details, {
									editableForNew: item.editableForNew,
									editableForUpdate: item.editableForUpdate,
									label: component.details.compoundFieldName ? component.details.label : item.label,
									required: item.required || !component.details.nillable,
									section: { heading: section.heading, id: section.layoutSectionId },
									tabOrder: component.tabOrder
								})),
								[]
							)
						),
						[]
					)),
					[]
				)),
				[]
			)),
			[]
		).sort((a, b) => a.tabOrder - b.tabOrder);
	}

	static async fetch(request) {
		const serviceWorkerActive = navigator.serviceWorker && navigator.serviceWorker.controller;
		const cache = request && (request.method === 'GET') && !serviceWorkerActive &&
			window && window.caches && (await window.caches.open('GreatVines'));
		const storageEstimate = navigator && navigator.storage && navigator.storage.estimate && (await navigator.storage.estimate());
		const canCache = storageEstimate && ![undefined, null].includes(storageEstimate.quota) && ![undefined, null].includes(storageEstimate.usage) && ((storageEstimate.usage/storageEstimate.quota) <= .5);

		let response = null;
		if (navigator.onLine || serviceWorkerActive) {
			response = await window.fetch(request);
		}
		if (cache && canCache && response) {
			// online no service worker
			await cache.put(request, response.clone());
		} else if (cache && !response) {
			// offline no service worker
			return cache.match(request);
		}
		return response;
	}

	static async fieldset(type, searchString) {
		searchString = (searchString || '').toLowerCase();
		let fieldsets = await this.fieldsets(type);
		return fieldsets.filter(fieldset => (fieldset.name || '').toLowerCase().includes(searchString))[0];
	}

	static async fieldsets(type, refresh) {
		return (!refresh && (await this.meta(type, 'fieldsets'))) || this.request({
			path: `/services/apexrest/gvp/mobile/fieldsets/all/${type}`,
			syncInterval: 0
		});
	}

	static jsonp(u,cb) {var a=this.jsonp._c=(this.jsonp._c||0)+1,b='picojsonp_'+a,c=document,d=c.body,s=c.createElement('script');window[b]=function(){d.removeChild(s);cb.apply(cb,arguments);cb=c=d=s=null;};s.src=u.replace('{callback}',b);d.appendChild(s);};

	static async labels(refresh) {
		try {
			return (!refresh && (await this.meta('_labels', 'labels'))) ||
				(await this.request({
					path: '/services/apexrest/gvp/mobile/labels',
					syncInterval: 0
				})).reduce(
					(labels, label) => {
						labels[label.label.toLowerCase()] = label;
						return labels;
					}, {}
				);
		} catch(error) {
			return;
		}
	}

	static async layout(type, recordType) {
		let layouts = await Api.layouts(type);
		let rtm = layouts && layouts.recordTypeMappings.find(
			(rtm) => recordType ? [rtm.recordTypeId, rtm.name].includes(recordType) : rtm.defaultRecordTypeMapping
		);
		let layout = layouts && layouts.layouts && layouts.layouts[0];
		const brt = layouts && layouts.layoutsByRecordType;
		try {
			layout = rtm ? ((brt && brt.get(rtm.recordTypeId)) || (await Api.request(rtm.urls.layout)) || layout) : layout;
		} catch(error) {}
		return layout;
	}

	static async layoutRelatedLists(type, recordType) {
		let layout = await Api.layout(type, recordType);
		return (layout && layout.relatedLists) || [];
	}

	static async layouts(type, refresh) {
		try {
			let response = (!refresh && (await this.meta(type, 'layouts'))) ||
				(await this.request({
					path: `/sobjects/${type}/describe/layouts`,
					syncInterval: 0
				}));
			if (refresh && !response.layouts) {
				// force caching of record type-specific layouts for offline use
				response.layoutsByRecordType = ((await this.batchRequest({
					requests: response.recordTypeMappings.map(rtm => Object.assign({
						method: 'GET',
						url: rtm.urls.layout
					}))
				})).results || []).reduce((brt, result, index) => brt.set(
					response.recordTypeMappings[index].recordTypeId, result && result.result
				), new Map());
			}
			return response;
		} catch(error) {
			return;
		}
	}

	static lookupValues(objectName, fieldName, searchString, searchType, dependentFields) {
		switch((searchString || '').length) {
			case 0:
			case 1:
				searchType = 'Recent';
				break;
			default:
				searchType = searchType || 'Search' //Search, Recent, TypeAhead;
		}
		return this.request({
			path: [
				`/ui-api/lookups/${objectName}/${fieldName}`,
				`?searchType=${searchType}`,
				`&q=${encodeURIComponent(searchString)}`,
				dependentFields ? `&dependentFieldBindings=${Object.keys(dependentFields).map(f => encodeURIComponent(`${f}=${dependentFields[f]}`)).join(',')}` : ''
			].join(''),
			syncInterval: 0
		});
	}

	static async meta(type, key) {
		if (typeof(Db) !== 'undefined') {
			let meta = await Db._meta.get(type);
			return meta && meta[key];
		}
	}

	static prepBatchRequest(options) {
		options = options || {};
		let batchRequest = { method: options.method || 'GET' };
		if (options.queryString) {
			batchRequest.url = `${this.version}/query/?q=${encodeURIComponent(options.queryString)}`;
		}
		return batchRequest;
	}

	static async query(queryString, options) {
		options = options || {};
		if (options.sObject) {
			let description = await Api.describe(options.sObject);
			if (!(description && description.queryable)) {
				return { records: [], totalSize: 0 };
			}
		}
		const self = this;
		let records = [];
		let processed = 0;
		const exec = async url => {
			let response;
			try {
				response = await self.request(Object.assign({ path: url }, options));
			} catch(error) {
				response = { done: true, error: error, records: [], totalSize: records.length };
			}
			response = response || { done: true, records: records, totalSize: records.length };
			records.push(...((options.batchProcessor ?
				(await options.batchProcessor(response.records, processed, response.totalSize)) :
				response.records
			) || []));
			// avoid out of memory errors by limiting in memory storage to 10k records
			records = records.slice(0, 10000);
			processed += (response.records || []).length;
			if (response.done || !response.nextRecordsUrl) {
				return Object.assign({}, response, {
					records: records, totalSize: records.length
				});
			} else {
				return exec(response.nextRecordsUrl);
			}
		};
		return exec(`/query${options.all ? 'All' : ''}/?q=${encodeURIComponent(queryString)}`);
	}

	static async remove(records, type) {
		if (Array.isArray(records)) {
			let results = [];
			for (let record of records) {
				try {
					results.push(await this.remove(record, type));
				} catch(error) {
					results.push(error);
				}
			}
			return results;
		}
		const record = records;
		const id = record && record.Id;
		type = (record && record.attributes && record.attributes.type) || type;
		return id && !id.startsWith('_') && type && await Api.request({ path: `/sobjects/${type}/${id}`, method: 'DELETE' });
	}

	static async save(records, type, description) {
		description = description || await Api.describe(type);
		if (Array.isArray(records)) {
			let results = [];
			// TODO: add bulk insert method
			for (let record of records) {
				try {
					results.push(await this.save(record, type, description));
				} catch(error) {
					results.push(error);
				}
			}
			return results;
		}
		const record = records;
		let id = record && record.Id;
		type = (record && record.attributes && record.attributes.type) || type;
		if (!record || !type) {
			return;
		}
		if (record.ContentDocumentId) {
			let result = await Api.query(`Select ContentDocumentId From ContentVersion Where Id = '${record.ContentDocumentId}' Order By LastModifiedDate Desc`);
			record.ContentDocumentId = (result && result.records && result.records[0] && result.records[0].ContentDocumentId) || record.ContentDocumentId;
		}
		const localId = typeof(Db) !== 'undefined' && Db.isLocalId(id) ? true : undefined;
		if (type === 'ContentVersion' && typeof(localId) === 'undefined') {
			const field = description.fields.find(field => field.name === 'VersionData');
			field.updateable = false;
		}
		let requestOptions = { path: `/sobjects/${type}`, method: 'POST', body: Api.saveFields(record, description) };
		if (localId) {
			try {
				let table = Db[type];
				let result = table && await Db.fetchById(table, id);
				id = (result && result.Id) || id;
			} catch(error) {
				console.log(error);
			}
		}
		if (id && !id.startsWith('_')) {
			//update
			return Api.request(Object.assign(requestOptions, { path: `/sobjects/${type}/${id}?_HttpMethod=PATCH` }));
		} else {
			//insert
			return Api.request(requestOptions);
		}
	}

	static saveFields(record, description) {
		if (!(record && description)) {
			return;
		}
		let processedRecord = Object.assign({}, record);
		Object.keys(processedRecord).filter(key => {
			if (key === 'Id') {
				return true;
			}
			let field = description.fields.find(field => field.name === key);
			return !field || !((record.Id && ((typeof(Db) === 'undefined') || !Db.isLocalId(record.Id))) ? field.updateable : field.createable);
		}).forEach(key => delete processedRecord[key]);
		return processedRecord;
	}

	static async user(userId) {
		let auth = await this.auth;
		userId = userId || auth.user_id;
		if (userId) {
			let description = await Api.describe('User');
			if (!description) {
				return;
			}
			let response = await Api.query(`
				Select ${description.fields.filter(field => field.type !== 'base64')
					.map(field => field.name).join(',')}
				From User
				Where Id = '${userId}'
			`);
			return response && response.records && response.records[0];
		}
	}

	static async fetchAll(type) {
		let description = await Api.describe(type);
		let response = description && await Api.query(`
			Select ${description.fields.map(field => field.name).join(',')}
			From ${description.name}
		`);
		return (response && response.records) || [];
	}
}

if (window) {
	window.gvp = window.gvp || {};
	window.gvp.Api = Api;
}
