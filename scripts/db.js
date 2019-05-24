import { Api } from './api.js'
import { App } from './app.js'
import { Log } from './log.js'

export class Db {
	static get db() {
		if (this._db) {
			return this._db;
		}
		this._db = new Dexie('GreatVines');
		this._db.version(1).stores({
			// meta-data
			_meta: 'key',

			// logging
			gvp__Mobile_Error__c: 'Id,gvp__User_Log__c,LastModifiedDate,_changedLocally,_localId',
			gvp__Mobile_Summary__c: 'Id,gvp__Model__c,gvp__User_Log__c,LastModifiedDate,_changedLocally,_localId',
			gvp__User_Log__c: 'Id,gvp__Device_Log_Id__c,LastModifiedDate,_changedLocally,_localId',

			Account: 'Id,BillingCity,BillingStreet,Name,LastModifiedDate,gvp__Territory__c,_changedLocally,_localId',
			Contact: 'Id,AccountId,Email,FirstName,LastName,Name,Phone,Title,_changedLocally,_localId',
			ContentDocument: 'Id,FileType,LastModifiedDate,LatestPublishedVersionId,_changedLocally,_localId',
			ContentDocumentLink: 'Id,ContentDocumentId,LinkedEntityId,_changedLocally,_localId',
			ContentNote: 'Id,FileType,LastModifiedDate,LastPublishedVersionId',
			ContentVersion: 'Id,ContentDocumentId,FileType,LastModifiedDate,PublishStatus,gvp__Brand__c,gvp__Label__c,gvp__Type__c,_changedLocally,_localId',
			CurrencyType: 'Id',
			EntitySubscription: 'Id,ParentId,SubscriberId,_changedLocally,_localId',
			Event: 'Id,WhatId,WhoId,EndDateTime,OwnerId,StartDateTime,gvp__Account__c,gvp__Related_Account_Call__c,_changedLocally,_localId',
			EmailMessage: 'Id,RelatedToId',
			gvp__Account_Call__c: 'Id,gvp__Account__c,gvp__Date_of_Call__c,gvp__Person_Contacted__c,_changedLocally,_localId',
			gvp__Account_Key__c: 'Id,gvp__Account__c,_changedLocally,_localId',
			gvp__Account_Team__c: 'Id,gvp__Account__c,gvp__Alternate_User_1__c,gvp__Manager_1__c,gvp__Manager_2__c,gvp__Manager_3__c,gvp__SalesPerson__c,gvp__Sales_Team_Division__c',
			gvp__Account_Objective__c: 'Id,gvp__Accomplish_by__c,gvp__Account__c,gvp__Account_Call__c,gvp__Description__c,gvp__Owner__c,gvp__Status__c,gvp__Type__c,_changedLocally,_localId',
			gvp__Analytics_Settings__c: 'Id,gvp__Geography_Key__c,gvp__Profile_Id__c',
			gvp__Brand__c: 'Id,Name',
			gvp__By_the_Glass__c: 'Id,gvp__Account__c,gvp__Account_Call__c,_changedLocally,_localId',
			gvp__Cocktail_Menu__c: 'Id,gvp__Account__c,gvp__Account_Call__c,_changedLocally,_localId',
			gvp__Company__c: 'Id,Name,gvp__Company_Key__c',
			gvp__Competitor__c: 'Id,Name',
			gvp__Dashboard_Filters_Settings__c: 'Id,gvp__Dashboard_Settings__c',
			gvp__Dashboard_Settings__c: 'Id,gvp__Analytics_Settings__c',
			gvp__Display__c: 'Id,gvp__Account__c,gvp__Account_Call__c,_changedLocally,_localId',
			gvp__Distributor_Meeting__c: 'Id,gvp__Account__c,gvp__Account_Call__c,gvp__Distributor__c,_changedLocally,_localId',
			gvp__Division__c: 'Id,Name,gvp__Company__c',
			gvp__Event__c: 'Id,gvp__Account__c,gvp__Account_Call__c,Location,Subject',
			gvp__Item__c: 'Id,Name,gvp__Label__c',
			gvp__Label__c: 'Id,Name,gvp__Brand__c',
			gvp__Objective_Creator_Template__c: 'Id,gvp__Account__c,gvp__Objective__c',
			gvp__Order_Commitment__c: 'Id,gvp__Account__c,gvp__Account_Call__c,_changedLocally,_localId',
			gvp__Planned_Spend__c: 'Id,gvp__Account__c,_changedLocally,_localId',
			gvp__POS_Material__c: 'Id',
			gvp__POS_Placement__c: 'Id,gvp__Account__c,gvp__Account_Call__c,_changedLocally,_localId',
			gvp__Presentation__c: 'Id,gvp__Account__c,gvp__Account_Call__c,_changedLocally,_localId',
			gvp__Product_Set__c: 'Id,Name',
			gvp__Product_Set_Member__c: 'Id,gvp__Product_Set__c',
			gvp__Program__c: 'Id,Name,gvp__End_Date__c,gvp__Start_Date__c',
			gvp__Region__c: 'Id,gvp__Division__c',
			gvp__Retail_Ad__c: 'Id,gvp__Account__c,gvp__Account_Call__c,_changedLocally,_localId',
			gvp__Sales_Order__c: 'Id,gvp__Account__c,gvp__Account_Call__c,gvp__Order_Date__c,gvp__Status__c,_changedLocally,_localId',
			gvp__Sales_Order_Item__c: 'Id,gvp__Sales_Order__c,_changedLocally,_localId',
			gvp__Sales_Orders__c: 'Id,gvp__Geography_Key__c',
			gvp__Sales_Team_Division__c: 'Id',
			gvp__Scan__c: 'Id,gvp__Account__c,gvp__Account_Visit__c,_changedLocally,_localId',
			gvp__Segment_Product_Set__c: 'Id,gvp__Account_Segment__c,gvp__Product_Set__c',
			gvp__Settings_Account_Buttons__c: 'Id,gvp__Geography_Key__c,gvp__Target_Device__c',
			gvp__Settings_Calendar__c: 'Id,gvp__Geography_Key__c',
			gvp__Settings_Home_Buttons__c: 'Id,gvp__Geography_Key__c,gvp__Target_Device__c',
			gvp__Settings_MegaCall__c: 'Id,gvp__RecordType__c',
			gvp__Settings_Mobile__c: 'Id,gvp__Geography_Key__c',
			gvp__Settings_Survey__c: 'Id,gvp__Geography_Key__c',
			gvp__Size__c: 'Id,Name',
			gvp__Staff_Incentive__c: 'Id,gvp__Account__c,gvp__Account_Call__c,_changedLocally,_localId',
			gvp__Staff_Training__c: 'Id,gvp__Account__c,gvp__Account_Call__c,_changedLocally,_localId',
			gvp__Survey__c: 'Id,RecordTypeId,gvp__Account__c,gvp__Account_Call__c,gvp__Alternate_User_1__c,gvp__Manager_1__c,gvp__Manager_2__c,gvp__Manager_3__c,gvp__Status__c,gvp__Survey_Period__c,gvp__Surveyed_by__c,_changedLocally,_localId',
			gvp__Survey_Answer__c: 'Id,gvp__Question__c,gvp__Survey__c,_changedLocally,_localId',
			gvp__Survey_Plan__c: 'Id,gvp__End_Date_of_Survey__c,gvp__Published__c,gvp__Start_Date_of_Survey__c',
			gvp__Survey_Plan_Question__c: 'Id,gvp__Survey_Plan__c',
			gvp__Territory__c: 'Id,Name,gvp__Region__c',
			gvp__Well__c: 'Id,gvp__Account__c,gvp__Account_Call__c,_changedLocally,_localId',
			gvp__Wine_List__c: 'Id,gvp__Account__c,gvp__Account_Call__c,_changedLocally,_localId',
			RecordType: 'Id,Name,[DeveloperName+SobjectType]',
			Task: 'Id,ActivityDate,OwnerId,Subject,Status,WhatId,WhoId,gvp__Account__c,gvp__Related_Account_Call__c,_changedLocally,_localId',
			User: 'Id'
		});
		this._db.version(2).stores({
			gvp__Invoice__c: 'Id,Name,_changedLocally,_localId'
		});
		this._db.version(3).stores({
			gvp__RAD__c: 'Id,Name,_changedLocally,_localId'
		});
		this._db.version(4).stores({
			gvp__RAD__c: null
		});
		this._db.version(5).stores({
			gvp__Account_Team__c: 'Id,gvp__Account__c,gvp__Alternate_User_1__c,gvp__Manager_1__c,gvp__Manager_2__c,gvp__Manager_3__c,gvp__SalesPerson__c,gvp__Sales_Team_Division__c,_changedLocally,_localId'
		});
		this._db.version(6).stores({
			gvp__Account_Call__c: 'Id,CreatedById,gvp__Account__c,gvp__Date_of_Call__c,gvp__Person_Contacted__c,_changedLocally,_localId',
			gvp__Account_Segment__c: 'Id',
			gvp__Sales_Sequence__c: 'Id',
			gvp__Sales_Sequence_Step__c: 'Id,gvp__Order_Number__c,gvp__Sales_Sequence__c',
			gvp__Sales_Sequence_Step_Status__c: 'Id,CreatedById,gvp__Account_Call__c,gvp__Sales_Sequence_Step__c,_changedLocally,_localId',
			Profile: 'Id'
		});
		this._db.on('populate', () => {
			console.log(`${this._db.name} db created`);
		}).on('versionchange', event => this.lastSynced = new Date(0));

		return this._db;
	}

	static get UNCHANGED() {
		return 0;
	}
	static get CHANGED() {
		return 1;
	}
	static get DELETED() {
		return 2;
	}
	static get isSyncing() {
		return this._isSyncing = this._isSyncing || false;
	}
	static set isSyncing(isSyncing) {
		this._isSyncing = isSyncing;
	}
	static get lastSynced() {
		return this._meta.get('_sync').then(response => (response && response.lastSynced) || new Date(0));
	}
	static set lastSynced(lastSynced) {
		this.update(this._meta, { key: '_sync', lastSynced: lastSynced })
			.then(() => this.nextSync)
			.then(nextSync => App.syncMessage(`${App.getLabel('Next_Sync')}: ${nextSync.toLocaleTimeString()}`));
	}
	static get nextId() {
		this._idCounter = (this._idCounter || 0) + 1;
		return `_${Date.now()}-${`0000${this._idCounter.toString(36)}`.slice(-3)}`;
	}
	static get nextSync() {
		return this.syncInterval ? this.lastSynced.then(
			lastSynced => (lastSynced.getTime() > 0) ?
				new Date(lastSynced.getTime() + (this.syncInterval * 60 * 1000)) :
				new Date()
		) : new Date(8640000000000000);
	}
	static get synced() {
		return this.syncInterval ? this.lastSynced.then(lastSynced => lastSynced.getTime() > 0) : Promise.resolve(false);
	}
	static get syncProgress() {
		return this._syncProgress = this._syncProgress || 0;
	}
	static set syncProgress(syncProgress) {
		this._syncProgress = syncProgress;
	}
	static get syncSuccessful() {
		return this._syncSuccessful = (this._syncSuccessful === false) ? false : true;
	}
	static set syncSuccessful(syncSuccessful) {
		this._syncSuccessful = syncSuccessful;
	}

	static async contentUrl(version, urlType) {
		if (typeof(version) === 'string') {
			return this.contentUrl(await this.ContentVersion.get(version));
		}
		return this.fileUrl(this.ContentVersion, 'VersionData', version, urlType);
	}

	static async fileUrl(table, field, record, urlType) {
		let url = record[field];
		let request = await Api.createRequest(url);
		if (window.caches && urlType) {
			let cache = await window.caches.open(table.name);
			let response = await cache.match(request.url);
			let blob = await response.blob();
			return (urlType === 'data') ? Api.dataUrl(blob) : URL.createObjectURL(blob);
		}
		return request.url;
	}

	static async changeId(table, oldId, newId) {
		let record = await table.get(oldId);
		await table.put(
			Object.assign(Dexie.deepClone(record), { Id: newId, _localId: oldId, _changedLocally: 0 })
		);
		await table.delete(oldId);
	}

	static async destroy() {
		try {
			await this.db.delete();
		} catch(error) {
			console.log(error);
		}
	}

	static async fetchById(table, id) {
		table = (typeof(table) === 'string') ? this.db[table] : table;
		return (await table.where('Id').equals(id).toArray())[0] || (await table.where('_localId').equals(id).toArray())[0];
	}

	static fetchFieldsets(description) {
		return description && !description.customSetting && description.name && ([
			'ContentDocument',
			'ContentDocumentLink',
			'ContentNote',
			'ContentVersion',
			'CurrencyType',
			'EmailMessage',
			'EntitySubscription',
			'gvp__Account_Segment__c',
			'gvp__Account_Team__c',
			'gvp__Analytics_Settings__c',
			'gvp__Brand__c',
			'gvp__Company__c',
			'gvp__Dashboard_Filters_Settings__c',
			'gvp__Dashboard_Settings__c',
			'gvp__Division__c',
			'gvp__Item__c',
			'gvp__Label__c',
			'gvp__Mobile_Error__c',
			'gvp__Mobile_Summary__c',
			'gvp__Objective_Creator_Template__c',
			'gvp__POS_Material__c',
			'gvp__Product_Set__c',
			'gvp__Region__c',
			'gvp__Sales_Order_Item__c',
			'gvp__Sales_Sequence__c',
			'gvp__Sales_Sequence_Step__c',
			'gvp__Sales_Sequence_Step_Status__c',
			'gvp__Sales_Team_Division__c',
			'gvp__Size__c',
			'gvp__Survey_Answer__c',
			'gvp__Territory__c',
			'gvp__User_Log__c',
			'Profile',
			'RecordType',
			'User'
		].indexOf(description.name) < 0)
	}

	static fetchLayouts(description) {
		return description && !description.customSetting && description.layoutable
			&& description.name && ![
				'ContentDocument',
				'EmailMessage',
				'Event',
				'Task'
			].includes(description.name);
	}

	static isLocalId(id) {
		return id && id.startsWith && id.startsWith('_');
	}

	static async preCache() {
		if ((typeof(App) !== 'undefined') && App.myLists) {
			console.log("Precaching start");
			await App.myLists.preCache();
			console.log("Precaching complete");
		}
	}

	static async recordCount(tables) {
		tables = Array.isArray(tables) ? tables : (tables ? [tables] : this.db.tables);
		let count = 0;
		for (let table of tables) {
			count += await table.count();
		}
		return count;
	}

	static async remove(table, records) {
		table = (typeof(table) === 'string') ? this.db[table] : table;
		records = (records ? (Array.isArray(records) ? records : [records]) : []);
		return table.bulkDelete(records.map(record => record.Id));
	}

	static async revert(table, recordId) {
		table = (typeof(table) === 'string') ? this.db[table] : table;
		recordId = (recordId && recordId.Id) || recordId;
		let originalRecord = table && recordId && (await table.get(recordId));
		originalRecord = originalRecord && originalRecord._original;
		if (originalRecord) {
			await table.put(originalRecord);
		}
		return originalRecord;
	}

	static async save(table, records) {
		table = (typeof(table) === 'string') ? this.db[table] : table;
		records = records ? (Array.isArray(records) ? records : [records]) : [];
		for (let record of records) {
			let originalRecord = record.Id && (await table.get(record.Id));
			if (originalRecord && !originalRecord._changedLocally) {
				record._original = originalRecord;
			}
		}
		records = records.map(
			record => {
				record._changedLocally = record._changedLocally || Db.CHANGED;
				record.Id = record.Id || this.nextId;
				return Object.assign({ attributes: { type: table.name } }, Object.keys(record).reduce((r, k) => {
					if (([undefined, null].indexOf(record[k]) >= 0) || (typeof(record[k]) !== 'object') || k.startsWith('_')) {
						r[k] = record[k];
					}
					return r;
				}, {}));
			}
		);
		await table.bulkPut(records);
		return records;
	}

	static async scheduleSync(minutes, syncNow) {
		this.syncTimer = window.clearTimeout(this.syncTimer);
		minutes = Math.max(10, minutes || 60);
		this.syncInterval = minutes;
		let minute = 60 * 1000;
		let finish = async syncNow => {
			this.syncTimer = this.syncTimer || window.setTimeout(() => this.scheduleSync(minutes, syncNow), minute);
			return await this.nextSync;
		}
		if (!navigator.onLine) {
			console.log('Syncing will resume when online');
			return finish(syncNow);
		}
		if (syncNow || (!this.isSyncing && ((this.syncTableProcessRecordsQueue || []).length === 0) && ((await this.nextSync).getTime() <= new Date().getTime()))) {
			await this.sync();
		}
		return finish();
	}

	static async sync(options) {
		options = options || {};
		this.isSyncing = true;
		this.syncSuccessful = true;
		let syncStart = new Date();
		this.syncProgress = 0;
		this.syncTableProcessRecordsQueue = [];
		App.syncMessage(App.getLabel('Syncing'));
		App.syncNotification(`${App.getLabel('Sync_Started')}: ${syncStart.toLocaleTimeString()}`);
		options = Object.assign({
			syncStart: new Date().getTime(),
			tables: this.db.tables.filter(table => [
				'_meta',
				'ContentDocumentLink',
				'gvp__Mobile_Error__c'
			].indexOf(table.name) < 0)
		}, options || {});
		let lastSynced = options.lastSynced || await this.lastSynced;
		await this.syncMeta();
		await this.syncUnsyncedRecords();
		for (let table of options.tables) {
			await this.syncTable({ table: table, logSummary: true });
			this.syncProgress += .4/options.tables.length;
		}
		await this.syncFiles({ field: 'VersionData', table: this.ContentVersion });
		await this.syncContentPreviews();
		await this.syncContentDocumentLinks();
		this.isSyncing = true;
		await this.syncUnsyncedRecords();
		await (this.lastSynced = navigator.onLine ? syncStart : lastSynced);
		this.isSyncing = false;
		let syncEnd = new Date();
		let syncDuration = Math.round((syncEnd.getTime() - options.syncStart) / 1000);
		this.syncProgress = 1;
		App.syncNotification(`${App.getLabel(`Sync_${this.syncSuccessful ? 'Completed' : 'Failed'}`)}: ${syncEnd.toLocaleTimeString()}`);
		if (navigator.onLine) {
			Log.userLog({ gvp__Sync_Duration_s__c: syncDuration });
		}
		await this.preCache();
	}

	static async syncContentDocumentLinks(options) {
		this.isSyncing = true;
		options = Object.assign({
			syncStart: new Date().getTime()
		}, options || {});
		await this.ContentDocumentLink.clear();
		let versions = await this.ContentVersion.toArray();
		let groups = [];
		while (versions.length > 0) {
			groups.push(versions.splice(0, 100));
		}
		for (let versions of groups) {
			let result = await Api.query(`
				Select
					Id,
					ContentDocumentId,
					LinkedEntityId
				From ContentDocumentLink
				Where ContentDocumentId In (${versions.map(version => `'${version.ContentDocumentId}'`).join(',')})
			`, { syncInterval: 0 });
			await this.ContentDocumentLink.bulkPut((result && result.records) || []);
		}
		this.isSyncing = false;
		console.log(`Synced Content Document Links (${Math.round((new Date().getTime() - options.syncStart) / 1000)} sec)`);
	}

	static async syncContentPreviews(options) {
		this.isSyncing = true;
		options = Object.assign({
			saveToDb: false,
			syncStart: new Date().getTime(),
			records: null
		}, options || {});
		let meta = await this._meta.get('ContentVersion');
		let description = meta && meta.description;
		App.syncMessage(`${App.getLabel('Syncing')}: ${description.labelPlural}`);
		let since = options.since || (meta && meta.lastSyncedFilePreviews) || await this.lastSynced || new Date(0);
		let versions = await this.ContentVersion.where('LastModifiedDate').aboveOrEqual(since.toISOString()).toArray();
		versions = versions.filter(version => version.IsLatest !== false);
		let cache = !options.saveToDb && !options.cache && window.caches && await caches.open('ContentVersion');
		let processed = 0;
		for (let version of versions) {
			await this.ContentVersion.put(Object.assign(version, {
				VersionPreview: `/connect/files/${version.ContentDocumentId}/previews/big-thumbnail`
			}));
			let requestOptions = {
				dataUrl: true,
				syncInterval: 0,
				path: version.VersionPreview
			};
			let request;
			let response;
			let previewUrl;
			const storageEstimate = navigator && navigator.storage && navigator.storage.estimate && (await navigator.storage.estimate());
			const canCache = storageEstimate && ![undefined, null].includes(storageEstimate.quota) && ![undefined, null].includes(storageEstimate.usage) && ((storageEstimate.usage/storageEstimate.quota) <= .5);
			if (options.saveToDb) {
				response = await Api.request(requestOptions);
				previewUrl = response && response.previewUrls && response.previewUrls[0] && response.previewUrls[0].previewUrl;
				await this.ContentVersion.put(Object.assign(version, { VersionPreview: previewUrl }));
			} else if (cache  && canCache) {
				request = await Api.createRequest(requestOptions);
				try { await cache.add(request) } catch(e) { console.log(e) };
				try {
					response = await cache.match(request);
					response = response && await response.json();
					previewUrl = response && response.previewUrls && response.previewUrls[0] && response.previewUrls[0].previewUrl;
					if (previewUrl) {
						request = await Api.createRequest(previewUrl);
						await cache.add(request);
					}
				} catch(e) {
					console.log(e);
				}
			}
			await this.update(this._meta, { key: 'ContentVersion', lastSyncedFilePreviews: new Date((version.LastModifiedDate || '').replace('+0000', 'Z') || 0) });
			processed++;
			if (((processed % 20) === 0) && (processed < versions.length)) {
				console.log(`Synced ${processed} of ${versions.length} Content Previews`);
			}
		}
		await this.update(this._meta, { key: 'ContentVersion', lastSyncedFilePreviews: meta.lastSynced });
		this.isSyncing = false;
		console.log(`Synced ${versions.length} Content Preview${(versions.length !== 1) ? 's' : ''} (${Math.round((new Date().getTime() - options.syncStart) / 1000)} sec)`);
	}

	static syncError(options) {
		options = options || {};
		if (this.isSyncing) {
			this.syncSuccessful = false;
		}
		if (navigator.onLine) {
			App.error(options);
		}
	}

	static async syncFiles(options) {
		this.isSyncing = true;
		options = Object.assign({
			field: 'VersionData',
			saveToDb: false,
			syncStart: new Date().getTime(),
			records: null,
			table: this.ContentVersion
		}, options || {});
		if (!(options.table && options.field)) {
			return Promise.reject();
		}
		let meta = await this._meta.get(options.table.name);
		let description = meta && meta.description;
		App.syncMessage(`${App.getLabel('Syncing')}: ${description.labelPlural}`);
		let since = options.since || (meta && meta.lastSyncedFiles) || await this.lastSynced || new Date(0);
		let records = await options.table.where('LastModifiedDate').aboveOrEqual(since.toISOString()).toArray();
		records = records.filter(record => record.IsLatest !== false);
		let cache = !options.saveToDb && !options.cache && window.caches && await caches.open(options.table.name);
		let processed = 0;
		for (let record of records) {
			record[options.field] = record[options.field] || `/sobjects/${options.table.name}/${record.Id}/${options.field}`;
			await options.table.put(record);
			let requestOptions = {
				dataUrl: true,
				syncInterval: 0,
				path: record[options.field]
			};
			const storageEstimate = navigator && navigator.storage && navigator.storage.estimate && (await navigator.storage.estimate());
			const canCache = storageEstimate && ![undefined, null].includes(storageEstimate.quota) && ![undefined, null].includes(storageEstimate.usage) && ((storageEstimate.usage/storageEstimate.quota) <= .5);
			if (options.saveToDb) {
				let result = await Api.request(requestOptions);
				record[options.field] = result;
				await options.table.put(record);
			} else if (cache && canCache) {
				let request = await Api.createRequest(requestOptions);
				await cache.add(request);
			}
			await this.update(this._meta, { key: options.table.name, lastSyncedFiles: new Date((record.LastModifiedDate || '').replace('+0000', 'Z') || 0) });
			processed++;
			if (((processed % 20) === 0) && (processed < records.length)) {
				console.log(`Synced ${processed} of ${records.length} ${description.labelPlural}`);
			}
			this.syncProgress += .1/records.length;
		}
		if (records.length == 0) {
			this.syncProgress += .1;
		}
		await this.update(this._meta, { key: options.table.name, lastSyncedFiles: meta.lastSynced });
		this.isSyncing = false;
		console.log(`Synced ${records.length} ${options.table.name} file${(records.length !== 1) ? 's' : ''} (${Math.round((new Date().getTime() - options.syncStart) / 1000)} sec)`);
	}

	static async syncMeta(options) {
		options = options || {};
		let tables = options.tables || this.db.tables.filter(table => !table.name.startsWith('_'));
		await this.update(this._meta, { key: '_labels', labels: await Api.labels(true) });
		const globalDescribe = await Api.describe(null, true);
		if (globalDescribe) {
			const globalSObjects = globalDescribe.sobjects.reduce((result, description) => {
				result.push(description.name);
				return result;
			}, []);
			tables = tables.filter(table => globalSObjects.includes(table.name))
		}
		let descriptions = (await Api.batchRequest({
			requests: tables.map(table => Object.assign({
				method: 'GET',
				url: `${Api.version}/sobjects/${table.name}/describe`
			})),
			syncInterval: 0
		})).results.reduce((descriptions, result, index) => {
			descriptions[tables[index].name] = result && result.result;
			return descriptions;
		}, {});
		for (let table of tables) {
			try {
				let description = descriptions[table.name];
				if (this.isSyncing) {
					App.syncMessage(`${App.getLabel('Syncing')}: ${description.labelPlural}`);
				}
				console.log(`Syncing meta data for ${description.label}`);
				let fetchFieldsets = this.fetchFieldsets(description);
				let fetchLayouts = this.fetchLayouts(description);
				await this.update(this._meta, {
					key: table.name,
					compactLayouts: fetchLayouts && await Api.compactLayouts(table.name, true),
					defaults: fetchLayouts && description.createable && await Api.defaults(table.name, true),
					description: description,
					fieldsets: fetchFieldsets && await Api.fieldsets(table.name, true),
					layouts: fetchLayouts && await Api.layouts(table.name, true)
				});
			} catch(error) {
				this.syncError(`Error fetching meta-data for ${table.name}`);
			}
			this.syncProgress += .4/tables.length;
		}
	}

	static syncSlice(options) {
		options = options || {};
		let now = (new Date()).getTime();
		let oneDay = 24 * 60 * 60 * 1000;
		let oneMonth = 30 * oneDay;
		let oneYear = 365 * oneDay;
		let sliceMap = {
			ContentVersion: oneMonth,
			Event: oneMonth,
			gvp__Account_Call__c: oneMonth,
			gvp__Account_Objective__c: oneMonth,
			gvp__By_the_Glass__c: oneMonth,
			gvp__Cocktail_Menu__c: oneMonth,
			gvp__Display__c: oneMonth,
			gvp__Distributor_Meeting__c: oneMonth,
			gvp__Event__c: oneMonth,
			gvp__Mobile_Error__c: oneMonth,
			gvp__Mobile_Summary__c: oneYear,
			gvp__Order_Commitment__c: oneMonth,
			gvp__POS_Placement__c: oneMonth,
			gvp__Presentation__c: oneMonth,
			gvp__Retail_Ad__c: oneMonth,
			gvp__Sales_Order__c: oneMonth,
			gvp__Sales_Order_Item__c: oneMonth,
			gvp__Scan__c: oneMonth,
			gvp__Staff_Incentive__c: oneMonth,
			gvp__Staff_Training__c: oneMonth,
			gvp__Survey__c: oneMonth,
			gvp__Survey_Answer__c: oneMonth,
			gvp__Wine_List__c: oneMonth,
			gvp__Well__c: oneMonth,
			Task: oneMonth
		};
		options.endTime = options.endTime || now;
		let earliestTime = () => {
			if (options.earliestTime) {
				return options.earliestTime;
			}
			let activityDateRange = (App.mobileSettings && App.mobileSettings.gvp__Activity_Date_Range__c) || 90;
			let activityDateRangeDate = activityDateRange && new Date(now - (activityDateRange * oneDay));
			return options.earliestTime = ((sliceMap[options.tableName] && activityDateRangeDate) || new Date(0)).getTime();
		}
		options.startTime = Math.max(options.startTime || options.startDate.getTime(), earliestTime());
		options.slices = options.slices || [options.startTime];
		if (options.slices.slice(-1)[0] >= options.endTime) {
			return options.slices.map(slice => new Date(slice))
				.map((slice, index, slices) => [slice, slices[index+1]])
				.filter(slice => slice[0] && slice[1]);
		}
		let slice = t => this.syncSlice(
			Object.assign(options, { slices: options.slices.concat(Math.min(options.slices.slice(-1)[0] + t, options.endTime)) })
		);
		return slice(sliceMap[options.tableName] || (100 * oneYear));
	}

	static async syncTable(options) {
		options = Object.assign({
			syncStart: new Date().getTime()
		}, options || {});
		if (!options.table) {
			return Promise.reject();
		}
		let syncStart = new Date();
		let meta = await this._meta.get(options.table.name);
		let description = options.description || (meta && meta.description);
		let since = options.since || (meta && meta.lastSynced) || new Date(0);
		if (!(description && description.name)) {
			return console.log(`Cannot find ${options.table.name}`);
		}
		if (this.isSyncing) {
			App.syncMessage(`${App.getLabel('Syncing')}: ${description.labelPlural}`);
		}
		let limit = ['EntitySubscription'].includes(description.name) ? 'LIMIT 1000' : '';
		if (!['CurrencyType', 'Profile', 'RecordType', 'User'].includes(description.name)) {
			let result = await Api.query(`
				Select Id From ${description.name} Where IsDeleted = True ${limit}
			`, { all: true, syncInterval: 0 });
			await options.table.bulkDelete(((result && result.records) || []).map(record => record.Id));
		}
		let recordCount = await options.table.count();
		let includeLastModifiedClause = description.fields.find(field => field.name === 'LastModifiedDate');
		for (let slice of this.syncSlice({ startDate: since, tableName: options.table.name })) {
			let lastModifiedClause = includeLastModifiedClause ?
				`Where (LastModifiedDate >= ${slice[0].toISOString()})
					And (LastModifiedDate <= ${slice[1].toISOString()})
				Order By LastModifiedDate Asc
				` : '';
			let result = await Api.query(`
				Select Id
				From ${description.name}
				${lastModifiedClause}
				${limit}
			`, {
				batchProcessor: async (records, processed, total) => {
					records = records || [];
					let lastBatch = (records.length + processed) >= total;
					this.syncTableProcessRecords({
						lastBatch,
						records: records,
						slice,
						type: options.table.name
					});
					if (!lastBatch) {
						console.log(`Synced ${records.length + processed} of ${total} ${description.labelPlural}`);
					} else {
						if (options.logSummary && !['gvp__Mobile_Error__c', 'gvp__Mobile_Summary__c', 'gvp__User_Log__c'].includes(options.table.name)) {
							Log.summary({
								gvp__Last_Sync__c: (new Date()).toISOString(),
								gvp__Model__c: options.table.name,
								gvp__Record_Count__c: recordCount += total,
								gvp__Sync_Duration_ms__c: new Date().getTime() - options.syncStart,
								gvp__Unsynced_Records__c: options.table.schema.indexes.map(index => index.keyPath).includes('_changedLocally') ?
									await options.table.where('_changedLocally').notEqual(Db.UNCHANGED).count() : 0
							});
						}
						console.log(`Synced ${total} ${description[(total !== 1) ? 'labelPlural' : 'label']}${(slice[0].getTime() > since.getTime()) ? ` from ${slice[0].toLocaleDateString()} to ${slice[1].toLocaleDateString()}` : '' } (${Math.round((new Date().getTime() - options.syncStart) / 1000)} sec)`);
					}
					return records;
				},
				syncInterval: 0
			});
		}
	}

	static async syncTableProcessRecords(options) {
		if ((this.syncTableProcessRecordsQueue = (this.syncTableProcessRecordsQueue || []).concat(options ? [options] : []).slice(0, 500)).length === 0) {
			return;
		}
		let process = () => {
			window.clearTimeout(this.syncTableProcessRecordsTimer);
			this.syncTableProcessRecordsTimer = window.setTimeout(() => this.syncTableProcessRecords(), 1000);
		}
		if (this.syncTableProcessingRecords) {
			return process();
		}
		this.syncTableProcessingRecords = true;
		options = this.syncTableProcessRecordsQueue.shift();
		if (!(navigator.onLine && options && options.records && options.type)) {
			return process(this.syncTableProcessingRecords = false);
		}
		let description = await Api.describe(options.type);
		let table = Db[options.type];
		let records = options.records;
		let recordIds = records.map(record => record.Id);
		if (recordIds.length > 0) {
			let fields = description.fields.filter(field => field.type !== 'base64')
				.map(field => field.name);
			try {
				records = await Api.request({
					body: {
						fields: fields,
						ids: recordIds
					},
					method: 'POST',
					path: `/composite/sobjects/${description.name}`
				});
			} catch(error) {}
		}
		const changedRecords = [];
		const existingRecords = await table.where('Id').anyOf(recordIds).toArray();
		const newRecords = [];
		records.forEach(record => {
			Object.keys(record).filter(key => record[key] === null).forEach(key => delete record[key]);
			if (existingRecords.length > 0) {
				let existingRecord = (existingRecords || []).find(r => r.Id === record.Id);
				if (existingRecord) {
					if (existingRecord._changedLocally) {
						record = Object.assign({}, existingRecord, { _original: record });
					} else if (existingRecord._localId) {
						record._localId = existingRecord._localId;
					}
					changedRecords.push(record);
				} else {
					newRecords.push(record);
				}
			}
		});
		if ((newRecords.length + changedRecords.length) === 0) {
			await table.bulkAdd(records);
		}
		if (newRecords.length > 0) {
			await table.bulkAdd(newRecords);
		}
		if (changedRecords.length > 0) {
			await table.bulkPut(changedRecords);
		}
		if (options.lastBatch && options.slice && options.slice[1]) {
			await this.update(this._meta, { key: table.name, lastSynced: options.slice[1] });
		} else if ((records.length > 0) && description.fields.find(field => field.name === 'LastModifiedDate')) {
			await this.update(this._meta, { key: table.name, lastSynced: new Date((records[records.length-1].LastModifiedDate || '').replace('+0000', 'Z') || 0) });
		}
		return process(this.syncTableProcessingRecords = false);
	}

	static async syncUnsyncedRecords(options) {
		options = options || {};
		let tables = (options.tables || this.db.tables).filter(
			table => table.schema.indexes.map(index => index.keyPath)
				.includes('_changedLocally')
		);
		let again = false;
		if (this.isSyncing && (tables.length > 0)) {
			App.syncMessage(`${App.getLabel('Syncing')}: ${App.getLabel('Mobile_Unsynced_Records')}`);
		}
		for (let table of tables) {
			let deleted = await table.where('_changedLocally').equals(Db.DELETED);
			let deletedRecords = await deleted.toArray();
			if (deletedRecords.length > 0) {
				let deleteResults = await Api.remove(deletedRecords.filter(record => !this.isLocalId(record.Id)), table.name);
				console.log(`Delete ${await deleted.delete()} records from ${table.name}`);
			}

			let description;
			let changed = await table.where('_changedLocally').equals(Db.CHANGED).toArray();
			if (changed.length === 0) {
				continue;
			}
			description = description || (options.descriptions && options.descriptions[table.name]) || ((await this._meta.get(table.name)) || {}).description || (await Api.describe(table.name));
			let changedWithoutUnsyncedDependencies = changed.filter(record => {
				return Object.keys(record).filter(key => {
					let field = description.fields.filter(field => field.name === key)[0];
					return field && (key !== 'Id') && this.isLocalId(record[key]);
				}).length === 0;
			});
			let changedProcessed = changedWithoutUnsyncedDependencies.map(record => {
				Object.keys(record).filter(key => {
					if (key === 'Id') {
						return false;
					}
					let field = description.fields.find(field => field.name === key);
					return !field || !(Db.isLocalId(record.Id) ? field.createable : field.updateable);
				}).forEach(key => delete record[key]);
				return record;
			});
			let changeResults = await Api.save(changedProcessed, table.name);
			for (let i=0; i < changeResults.length; i++) {
				let record = changedProcessed[i];
				let change = changeResults[i];
				if (change && change.success && change.id) {
					// new record
					await Db.changeId(table, record.Id, change.id);
					for (let t of tables) {
						for (let c of await t.where('_changedLocally').equals(Db.CHANGED).toArray()) {
							let updates = Object.keys(c).filter(key => c[key] === record.Id);
							if (updates.length > 0) {
								updates.forEach(key => c[key] = change.id);
								if (await t.update(c.Id, c)) {
									again = true;
								}
							}
						}
					}
				} else if (change && !change.success) {
					// failure
					let errorMessage = (change.errors && change.errors[0] && change.errors[0].message) || 'unknown sync error';
					if (['gvp__Mobile_Error__c', 'gvp__Mobile_Summary__c', 'gvp__User_Log__c'].includes(table.name)) {
						if (navigator.onLine) {
							console.log(errorMessage);
						}
					} else {
						this.syncError({ message: errorMessage, record: Object.assign({ attributes: { type: table.name } }, record, { _errors: change.errors }) });
						await table.update(record.Id, { _errors: change.errors });
					}
				} else {
					// existing record
					await table.update(record.Id, { _changedLocally: 0, _original: null });
				}
			}
			if ((changeResults.length > 0) && !this.isSyncing) {
				switch(table.name) {
					case 'ContentDocumentLink':
						await this.syncContentDocumentLinks();
						break;
					case 'gvp__Mobile_Error__c':
						break;
					default:
						await this.syncTable({ description: description, table: table });
						break;
				}
			}
		}
		if (again) {
			await this.syncUnsyncedRecords(options);
		}
	}

	static async unsyncedRecords(options) {
		options = options || {};
		if (typeof(options) === 'string') {
			options = { tables: [options] };
		}
		let tables = (options.tables || this.db.tables || []).filter(
			table => table.schema.indexes.map(index => index.keyPath)
				.includes('_changedLocally')
		);
		let unsynced = [];
		for (let table of tables) {
			try {
				unsynced = unsynced.concat((await (table.where('_changedLocally').above(0).toArray()) || []).map(record =>
					Object.assign({ type: table.name, record: record })
				));
			} catch(error) {
				console.log(error);
			}
		}
		return unsynced;
	}

	static async update(table, record) {
		table = (typeof(table) === 'string') ? this.db[table] : table;
		let key = table.schema.primKey.keyPath;
		let id = record && record[key];
		let current = await table.get(id);
		if (!this.isSyncing || this.syncSuccessful || (table.name !== '_meta')) {
			await table.put(Object.assign(current || {}, record));
		}
		return await table.get(id);
	}
}

// Dexie ES 2.0.4
var keys=Object.keys;var isArray=Array.isArray;var _global=typeof self!=="undefined"?self:typeof window!=="undefined"?window:global;function extend(obj,extension){if(typeof extension!=="object")return obj;keys(extension).forEach(function(key){obj[key]=extension[key]});return obj}var getProto=Object.getPrototypeOf;var _hasOwn={}.hasOwnProperty;function hasOwn(obj,prop){return _hasOwn.call(obj,prop)}function props(proto,extension){if(typeof extension==="function")extension=extension(getProto(proto));keys(extension).forEach(function(key){setProp(proto,key,extension[key])})}var defineProperty=Object.defineProperty;function setProp(obj,prop,functionOrGetSet,options){defineProperty(obj,prop,extend(functionOrGetSet&&hasOwn(functionOrGetSet,"get")&&typeof functionOrGetSet.get==="function"?{get:functionOrGetSet.get,set:functionOrGetSet.set,configurable:true}:{value:functionOrGetSet,configurable:true,writable:true},options))}function derive(Child){return{from:function(Parent){Child.prototype=Object.create(Parent.prototype);setProp(Child.prototype,"constructor",Child);return{extend:props.bind(null,Child.prototype)}}}}var getOwnPropertyDescriptor=Object.getOwnPropertyDescriptor;function getPropertyDescriptor(obj,prop){var pd=getOwnPropertyDescriptor(obj,prop),proto;return pd||(proto=getProto(obj))&&getPropertyDescriptor(proto,prop)}var _slice=[].slice;function slice(args,start,end){return _slice.call(args,start,end)}function override(origFunc,overridedFactory){return overridedFactory(origFunc)}function assert(b){if(!b)throw new Error("Assertion Failed")}function asap(fn){if(_global.setImmediate)setImmediate(fn);else setTimeout(fn,0)}function arrayToObject(array,extractor){return array.reduce(function(result,item,i){var nameAndValue=extractor(item,i);if(nameAndValue)result[nameAndValue[0]]=nameAndValue[1];return result},{})}function trycatcher(fn,reject){return function(){try{fn.apply(this,arguments)}catch(e){reject(e)}}}function tryCatch(fn,onerror,args){try{fn.apply(null,args)}catch(ex){onerror&&onerror(ex)}}function getByKeyPath(obj,keyPath){if(hasOwn(obj,keyPath))return obj[keyPath];if(!keyPath)return obj;if(typeof keyPath!=="string"){var rv=[];for(var i=0,l=keyPath.length;i<l;++i){var val=getByKeyPath(obj,keyPath[i]);rv.push(val)}return rv}var period=keyPath.indexOf(".");if(period!==-1){var innerObj=obj[keyPath.substr(0,period)];return innerObj===undefined?undefined:getByKeyPath(innerObj,keyPath.substr(period+1))}return undefined}function setByKeyPath(obj,keyPath,value){if(!obj||keyPath===undefined)return;if("isFrozen"in Object&&Object.isFrozen(obj))return;if(typeof keyPath!=="string"&&"length"in keyPath){assert(typeof value!=="string"&&"length"in value);for(var i=0,l=keyPath.length;i<l;++i){setByKeyPath(obj,keyPath[i],value[i])}}else{var period=keyPath.indexOf(".");if(period!==-1){var currentKeyPath=keyPath.substr(0,period);var remainingKeyPath=keyPath.substr(period+1);if(remainingKeyPath==="")if(value===undefined)delete obj[currentKeyPath];else obj[currentKeyPath]=value;else{var innerObj=obj[currentKeyPath];if(!innerObj)innerObj=obj[currentKeyPath]={};setByKeyPath(innerObj,remainingKeyPath,value)}}else{if(value===undefined)delete obj[keyPath];else obj[keyPath]=value}}}function delByKeyPath(obj,keyPath){if(typeof keyPath==="string")setByKeyPath(obj,keyPath,undefined);else if("length"in keyPath)[].map.call(keyPath,function(kp){setByKeyPath(obj,kp,undefined)})}function shallowClone(obj){var rv={};for(var m in obj){if(hasOwn(obj,m))rv[m]=obj[m]}return rv}var concat=[].concat;function flatten(a){return concat.apply([],a)}var intrinsicTypes="Boolean,String,Date,RegExp,Blob,File,FileList,ArrayBuffer,DataView,Uint8ClampedArray,ImageData,Map,Set".split(",").concat(flatten([8,16,32,64].map(function(num){return["Int","Uint","Float"].map(function(t){return t+num+"Array"})}))).filter(function(t){return _global[t]}).map(function(t){return _global[t]});function deepClone(any){if(!any||typeof any!=="object")return any;var rv;if(isArray(any)){rv=[];for(var i=0,l=any.length;i<l;++i){rv.push(deepClone(any[i]))}}else if(intrinsicTypes.indexOf(any.constructor)>=0){rv=any}else{rv=any.constructor?Object.create(any.constructor.prototype):{};for(var prop in any){if(hasOwn(any,prop)){rv[prop]=deepClone(any[prop])}}}return rv}function getObjectDiff(a,b,rv,prfx){rv=rv||{};prfx=prfx||"";keys(a).forEach(function(prop){if(!hasOwn(b,prop))rv[prfx+prop]=undefined;else{var ap=a[prop],bp=b[prop];if(typeof ap==="object"&&typeof bp==="object"&&ap&&bp&&""+ap.constructor===""+bp.constructor)getObjectDiff(ap,bp,rv,prfx+prop+".");else if(ap!==bp)rv[prfx+prop]=b[prop]}});keys(b).forEach(function(prop){if(!hasOwn(a,prop)){rv[prfx+prop]=b[prop]}});return rv}var iteratorSymbol=typeof Symbol!=="undefined"&&Symbol.iterator;var getIteratorOf=iteratorSymbol?function(x){var i;return x!=null&&(i=x[iteratorSymbol])&&i.apply(x)}:function(){return null};var NO_CHAR_ARRAY={};function getArrayOf(arrayLike){var i,a,x,it;if(arguments.length===1){if(isArray(arrayLike))return arrayLike.slice();if(this===NO_CHAR_ARRAY&&typeof arrayLike==="string")return[arrayLike];if(it=getIteratorOf(arrayLike)){a=[];while(x=it.next(),!x.done)a.push(x.value);return a}if(arrayLike==null)return[arrayLike];i=arrayLike.length;if(typeof i==="number"){a=new Array(i);while(i--)a[i]=arrayLike[i];return a}return[arrayLike]}i=arguments.length;a=new Array(i);while(i--)a[i]=arguments[i];return a}var debug=typeof location!=="undefined"&&/^(http|https):\/\/(localhost|127\.0\.0\.1)/.test(location.href);function setDebug(value,filter){debug=value;libraryFilter=filter}var libraryFilter=function(){return true};var NEEDS_THROW_FOR_STACK=!new Error("").stack;function getErrorWithStack(){"use strict";if(NEEDS_THROW_FOR_STACK)try{getErrorWithStack.arguments;throw new Error}catch(e){return e}return new Error}function prettyStack(exception,numIgnoredFrames){var stack=exception.stack;if(!stack)return"";numIgnoredFrames=numIgnoredFrames||0;if(stack.indexOf(exception.name)===0)numIgnoredFrames+=(exception.name+exception.message).split("\n").length;return stack.split("\n").slice(numIgnoredFrames).filter(libraryFilter).map(function(frame){return"\n"+frame}).join("")}function deprecated(what,fn){return function(){console.warn(what+" is deprecated. See https://github.com/dfahlander/Dexie.js/wiki/Deprecations. "+prettyStack(getErrorWithStack(),1));return fn.apply(this,arguments)}}var dexieErrorNames=["Modify","Bulk","OpenFailed","VersionChange","Schema","Upgrade","InvalidTable","MissingAPI","NoSuchDatabase","InvalidArgument","SubTransaction","Unsupported","Internal","DatabaseClosed","PrematureCommit","ForeignAwait"];var idbDomErrorNames=["Unknown","Constraint","Data","TransactionInactive","ReadOnly","Version","NotFound","InvalidState","InvalidAccess","Abort","Timeout","QuotaExceeded","Syntax","DataClone"];var errorList=dexieErrorNames.concat(idbDomErrorNames);var defaultTexts={VersionChanged:"Database version changed by other database connection",DatabaseClosed:"Database has been closed",Abort:"Transaction aborted",TransactionInactive:"Transaction has already completed or failed"};function DexieError(name,msg){this._e=getErrorWithStack();this.name=name;this.message=msg}derive(DexieError).from(Error).extend({stack:{get:function(){return this._stack||(this._stack=this.name+": "+this.message+prettyStack(this._e,2))}},toString:function(){return this.name+": "+this.message}});function getMultiErrorMessage(msg,failures){return msg+". Errors: "+failures.map(function(f){return f.toString()}).filter(function(v,i,s){return s.indexOf(v)===i}).join("\n")}function ModifyError(msg,failures,successCount,failedKeys){this._e=getErrorWithStack();this.failures=failures;this.failedKeys=failedKeys;this.successCount=successCount}derive(ModifyError).from(DexieError);function BulkError(msg,failures){this._e=getErrorWithStack();this.name="BulkError";this.failures=failures;this.message=getMultiErrorMessage(msg,failures)}derive(BulkError).from(DexieError);var errnames=errorList.reduce(function(obj,name){return obj[name]=name+"Error",obj},{});var BaseException=DexieError;var exceptions=errorList.reduce(function(obj,name){var fullName=name+"Error";function DexieError(msgOrInner,inner){this._e=getErrorWithStack();this.name=fullName;if(!msgOrInner){this.message=defaultTexts[name]||fullName;this.inner=null}else if(typeof msgOrInner==="string"){this.message=msgOrInner;this.inner=inner||null}else if(typeof msgOrInner==="object"){this.message=msgOrInner.name+" "+msgOrInner.message;this.inner=msgOrInner}}derive(DexieError).from(BaseException);obj[name]=DexieError;return obj},{});exceptions.Syntax=SyntaxError;exceptions.Type=TypeError;exceptions.Range=RangeError;var exceptionMap=idbDomErrorNames.reduce(function(obj,name){obj[name+"Error"]=exceptions[name];return obj},{});function mapError(domError,message){if(!domError||domError instanceof DexieError||domError instanceof TypeError||domError instanceof SyntaxError||!domError.name||!exceptionMap[domError.name])return domError;var rv=new exceptionMap[domError.name](message||domError.message,domError);if("stack"in domError){setProp(rv,"stack",{get:function(){return this.inner.stack}})}return rv}var fullNameExceptions=errorList.reduce(function(obj,name){if(["Syntax","Type","Range"].indexOf(name)===-1)obj[name+"Error"]=exceptions[name];return obj},{});fullNameExceptions.ModifyError=ModifyError;fullNameExceptions.DexieError=DexieError;fullNameExceptions.BulkError=BulkError;function nop(){}function mirror(val){return val}function pureFunctionChain(f1,f2){if(f1==null||f1===mirror)return f2;return function(val){return f2(f1(val))}}function callBoth(on1,on2){return function(){on1.apply(this,arguments);on2.apply(this,arguments)}}function hookCreatingChain(f1,f2){if(f1===nop)return f2;return function(){var res=f1.apply(this,arguments);if(res!==undefined)arguments[0]=res;var onsuccess=this.onsuccess,onerror=this.onerror;this.onsuccess=null;this.onerror=null;var res2=f2.apply(this,arguments);if(onsuccess)this.onsuccess=this.onsuccess?callBoth(onsuccess,this.onsuccess):onsuccess;if(onerror)this.onerror=this.onerror?callBoth(onerror,this.onerror):onerror;return res2!==undefined?res2:res}}function hookDeletingChain(f1,f2){if(f1===nop)return f2;return function(){f1.apply(this,arguments);var onsuccess=this.onsuccess,onerror=this.onerror;this.onsuccess=this.onerror=null;f2.apply(this,arguments);if(onsuccess)this.onsuccess=this.onsuccess?callBoth(onsuccess,this.onsuccess):onsuccess;if(onerror)this.onerror=this.onerror?callBoth(onerror,this.onerror):onerror}}function hookUpdatingChain(f1,f2){if(f1===nop)return f2;return function(modifications){var res=f1.apply(this,arguments);extend(modifications,res);var onsuccess=this.onsuccess,onerror=this.onerror;this.onsuccess=null;this.onerror=null;var res2=f2.apply(this,arguments);if(onsuccess)this.onsuccess=this.onsuccess?callBoth(onsuccess,this.onsuccess):onsuccess;if(onerror)this.onerror=this.onerror?callBoth(onerror,this.onerror):onerror;return res===undefined?res2===undefined?undefined:res2:extend(res,res2)}}function reverseStoppableEventChain(f1,f2){if(f1===nop)return f2;return function(){if(f2.apply(this,arguments)===false)return false;return f1.apply(this,arguments)}}function promisableChain(f1,f2){if(f1===nop)return f2;return function(){var res=f1.apply(this,arguments);if(res&&typeof res.then==="function"){var thiz=this,i=arguments.length,args=new Array(i);while(i--)args[i]=arguments[i];return res.then(function(){return f2.apply(thiz,args)})}return f2.apply(this,arguments)}}var INTERNAL={};var LONG_STACKS_CLIP_LIMIT=100;var MAX_LONG_STACKS=20;var ZONE_ECHO_LIMIT=7;var nativePromiseInstanceAndProto=function(){try{return new Function("let F=async ()=>{},p=F();return [p,Object.getPrototypeOf(p),Promise.resolve(),F.constructor];")()}catch(e){var P=_global.Promise;return P?[P.resolve(),P.prototype,P.resolve()]:[]}}();var resolvedNativePromise=nativePromiseInstanceAndProto[0];var nativePromiseProto=nativePromiseInstanceAndProto[1];var resolvedGlobalPromise=nativePromiseInstanceAndProto[2];var nativePromiseThen=nativePromiseProto&&nativePromiseProto.then;var NativePromise=resolvedNativePromise&&resolvedNativePromise.constructor;var AsyncFunction=nativePromiseInstanceAndProto[3];var patchGlobalPromise=!!resolvedGlobalPromise;var stack_being_generated=false;var schedulePhysicalTick=resolvedGlobalPromise?function(){resolvedGlobalPromise.then(physicalTick)}:_global.setImmediate?setImmediate.bind(null,physicalTick):_global.MutationObserver?function(){var hiddenDiv=document.createElement("div");new MutationObserver(function(){physicalTick();hiddenDiv=null}).observe(hiddenDiv,{attributes:true});hiddenDiv.setAttribute("i","1")}:function(){setTimeout(physicalTick,0)};var asap$1=function(callback,args){microtickQueue.push([callback,args]);if(needsNewPhysicalTick){schedulePhysicalTick();needsNewPhysicalTick=false}};var isOutsideMicroTick=true;var needsNewPhysicalTick=true;var unhandledErrors=[];var rejectingErrors=[];var currentFulfiller=null;var rejectionMapper=mirror;var globalPSD={id:"global",global:true,ref:0,unhandleds:[],onunhandled:globalError,pgp:false,env:{},finalize:function(){this.unhandleds.forEach(function(uh){try{globalError(uh[0],uh[1])}catch(e){}})}};var PSD=globalPSD;var microtickQueue=[];var numScheduledCalls=0;var tickFinalizers=[];function Promise(fn){if(typeof this!=="object")throw new TypeError("Promises must be constructed via new");this._listeners=[];this.onuncatched=nop;this._lib=false;var psd=this._PSD=PSD;if(debug){this._stackHolder=getErrorWithStack();this._prev=null;this._numPrev=0}if(typeof fn!=="function"){if(fn!==INTERNAL)throw new TypeError("Not a function");this._state=arguments[1];this._value=arguments[2];if(this._state===false)handleRejection(this,this._value);return}this._state=null;this._value=null;++psd.ref;executePromiseTask(this,fn)}var thenProp={get:function(){var psd=PSD,microTaskId=totalEchoes;function then(onFulfilled,onRejected){var _this=this;var possibleAwait=!psd.global&&(psd!==PSD||microTaskId!==totalEchoes);if(possibleAwait)decrementExpectedAwaits();var rv=new Promise(function(resolve,reject){propagateToListener(_this,new Listener(nativeAwaitCompatibleWrap(onFulfilled,psd,possibleAwait),nativeAwaitCompatibleWrap(onRejected,psd,possibleAwait),resolve,reject,psd))});debug&&linkToPreviousPromise(rv,this);return rv}then.prototype=INTERNAL;return then},set:function(value){setProp(this,"then",value&&value.prototype===INTERNAL?thenProp:{get:function(){return value},set:thenProp.set})}};props(Promise.prototype,{then:thenProp,_then:function(onFulfilled,onRejected){propagateToListener(this,new Listener(null,null,onFulfilled,onRejected,PSD))},catch:function(onRejected){if(arguments.length===1)return this.then(null,onRejected);var type=arguments[0],handler=arguments[1];return typeof type==="function"?this.then(null,function(err){return err instanceof type?handler(err):PromiseReject(err)}):this.then(null,function(err){return err&&err.name===type?handler(err):PromiseReject(err)})},finally:function(onFinally){return this.then(function(value){onFinally();return value},function(err){onFinally();return PromiseReject(err)})},stack:{get:function(){if(this._stack)return this._stack;try{stack_being_generated=true;var stacks=getStack(this,[],MAX_LONG_STACKS);var stack=stacks.join("\nFrom previous: ");if(this._state!==null)this._stack=stack;return stack}finally{stack_being_generated=false}}},timeout:function(ms,msg){var _this=this;return ms<Infinity?new Promise(function(resolve,reject){var handle=setTimeout(function(){return reject(new exceptions.Timeout(msg))},ms);_this.then(resolve,reject).finally(clearTimeout.bind(null,handle))}):this}});if(typeof Symbol!=="undefined"&&Symbol.toStringTag)setProp(Promise.prototype,Symbol.toStringTag,"Promise");globalPSD.env=snapShot();function Listener(onFulfilled,onRejected,resolve,reject,zone){this.onFulfilled=typeof onFulfilled==="function"?onFulfilled:null;this.onRejected=typeof onRejected==="function"?onRejected:null;this.resolve=resolve;this.reject=reject;this.psd=zone}props(Promise,{all:function(){var values=getArrayOf.apply(null,arguments).map(onPossibleParallellAsync);return new Promise(function(resolve,reject){if(values.length===0)resolve([]);var remaining=values.length;values.forEach(function(a,i){return Promise.resolve(a).then(function(x){values[i]=x;if(!--remaining)resolve(values)},reject)})})},resolve:function(value){if(value instanceof Promise)return value;if(value&&typeof value.then==="function")return new Promise(function(resolve,reject){value.then(resolve,reject)});var rv=new Promise(INTERNAL,true,value);linkToPreviousPromise(rv,currentFulfiller);return rv},reject:PromiseReject,race:function(){var values=getArrayOf.apply(null,arguments).map(onPossibleParallellAsync);return new Promise(function(resolve,reject){values.map(function(value){return Promise.resolve(value).then(resolve,reject)})})},PSD:{get:function(){return PSD},set:function(value){return PSD=value}},newPSD:newScope,usePSD:usePSD,scheduler:{get:function(){return asap$1},set:function(value){asap$1=value}},rejectionMapper:{get:function(){return rejectionMapper},set:function(value){rejectionMapper=value}},follow:function(fn,zoneProps){return new Promise(function(resolve,reject){return newScope(function(resolve,reject){var psd=PSD;psd.unhandleds=[];psd.onunhandled=reject;psd.finalize=callBoth(function(){var _this=this;run_at_end_of_this_or_next_physical_tick(function(){_this.unhandleds.length===0?resolve():reject(_this.unhandleds[0])})},psd.finalize);fn()},zoneProps,resolve,reject)})}});function executePromiseTask(promise,fn){try{fn(function(value){if(promise._state!==null)return;if(value===promise)throw new TypeError("A promise cannot be resolved with itself.");var shouldExecuteTick=promise._lib&&beginMicroTickScope();if(value&&typeof value.then==="function"){executePromiseTask(promise,function(resolve,reject){value instanceof Promise?value._then(resolve,reject):value.then(resolve,reject)})}else{promise._state=true;promise._value=value;propagateAllListeners(promise)}if(shouldExecuteTick)endMicroTickScope()},handleRejection.bind(null,promise))}catch(ex){handleRejection(promise,ex)}}function handleRejection(promise,reason){rejectingErrors.push(reason);if(promise._state!==null)return;var shouldExecuteTick=promise._lib&&beginMicroTickScope();reason=rejectionMapper(reason);promise._state=false;promise._value=reason;debug&&reason!==null&&typeof reason==="object"&&!reason._promise&&tryCatch(function(){var origProp=getPropertyDescriptor(reason,"stack");reason._promise=promise;setProp(reason,"stack",{get:function(){return stack_being_generated?origProp&&(origProp.get?origProp.get.apply(reason):origProp.value):promise.stack}})});addPossiblyUnhandledError(promise);propagateAllListeners(promise);if(shouldExecuteTick)endMicroTickScope()}function propagateAllListeners(promise){var listeners=promise._listeners;promise._listeners=[];for(var i=0,len=listeners.length;i<len;++i){propagateToListener(promise,listeners[i])}var psd=promise._PSD;--psd.ref||psd.finalize();if(numScheduledCalls===0){++numScheduledCalls;asap$1(function(){if(--numScheduledCalls===0)finalizePhysicalTick()},[])}}function propagateToListener(promise,listener){if(promise._state===null){promise._listeners.push(listener);return}var cb=promise._state?listener.onFulfilled:listener.onRejected;if(cb===null){return(promise._state?listener.resolve:listener.reject)(promise._value)}++listener.psd.ref;++numScheduledCalls;asap$1(callListener,[cb,promise,listener])}function callListener(cb,promise,listener){try{currentFulfiller=promise;var ret,value=promise._value;if(promise._state){ret=cb(value)}else{if(rejectingErrors.length)rejectingErrors=[];ret=cb(value);if(rejectingErrors.indexOf(value)===-1)markErrorAsHandled(promise)}listener.resolve(ret)}catch(e){listener.reject(e)}finally{currentFulfiller=null;if(--numScheduledCalls===0)finalizePhysicalTick();--listener.psd.ref||listener.psd.finalize()}}function getStack(promise,stacks,limit){if(stacks.length===limit)return stacks;var stack="";if(promise._state===false){var failure=promise._value,errorName,message;if(failure!=null){errorName=failure.name||"Error";message=failure.message||failure;stack=prettyStack(failure,0)}else{errorName=failure;message=""}stacks.push(errorName+(message?": "+message:"")+stack)}if(debug){stack=prettyStack(promise._stackHolder,2);if(stack&&stacks.indexOf(stack)===-1)stacks.push(stack);if(promise._prev)getStack(promise._prev,stacks,limit)}return stacks}function linkToPreviousPromise(promise,prev){var numPrev=prev?prev._numPrev+1:0;if(numPrev<LONG_STACKS_CLIP_LIMIT){promise._prev=prev;promise._numPrev=numPrev}}function physicalTick(){beginMicroTickScope()&&endMicroTickScope()}function beginMicroTickScope(){var wasRootExec=isOutsideMicroTick;isOutsideMicroTick=false;needsNewPhysicalTick=false;return wasRootExec}function endMicroTickScope(){var callbacks,i,l;do{while(microtickQueue.length>0){callbacks=microtickQueue;microtickQueue=[];l=callbacks.length;for(i=0;i<l;++i){var item=callbacks[i];item[0].apply(null,item[1])}}}while(microtickQueue.length>0);isOutsideMicroTick=true;needsNewPhysicalTick=true}function finalizePhysicalTick(){var unhandledErrs=unhandledErrors;unhandledErrors=[];unhandledErrs.forEach(function(p){p._PSD.onunhandled.call(null,p._value,p)});var finalizers=tickFinalizers.slice(0);var i=finalizers.length;while(i)finalizers[--i]()}function run_at_end_of_this_or_next_physical_tick(fn){function finalizer(){fn();tickFinalizers.splice(tickFinalizers.indexOf(finalizer),1)}tickFinalizers.push(finalizer);++numScheduledCalls;asap$1(function(){if(--numScheduledCalls===0)finalizePhysicalTick()},[])}function addPossiblyUnhandledError(promise){if(!unhandledErrors.some(function(p){return p._value===promise._value}))unhandledErrors.push(promise)}function markErrorAsHandled(promise){var i=unhandledErrors.length;while(i)if(unhandledErrors[--i]._value===promise._value){unhandledErrors.splice(i,1);return}}function PromiseReject(reason){return new Promise(INTERNAL,false,reason)}function wrap(fn,errorCatcher){var psd=PSD;return function(){var wasRootExec=beginMicroTickScope(),outerScope=PSD;try{switchToZone(psd,true);return fn.apply(this,arguments)}catch(e){errorCatcher&&errorCatcher(e)}finally{switchToZone(outerScope,false);if(wasRootExec)endMicroTickScope()}}}var task={awaits:0,echoes:0,id:0};var taskCounter=0;var zoneStack=[];var zoneEchoes=0;var totalEchoes=0;var zone_id_counter=0;function newScope(fn,props$$1,a1,a2){var parent=PSD,psd=Object.create(parent);psd.parent=parent;psd.ref=0;psd.global=false;psd.id=++zone_id_counter;var globalEnv=globalPSD.env;psd.env=patchGlobalPromise?{Promise:Promise,PromiseProp:{value:Promise,configurable:true,writable:true},all:Promise.all,race:Promise.race,resolve:Promise.resolve,reject:Promise.reject,nthen:getPatchedPromiseThen(globalEnv.nthen,psd),gthen:getPatchedPromiseThen(globalEnv.gthen,psd)}:{};if(props$$1)extend(psd,props$$1);++parent.ref;psd.finalize=function(){--this.parent.ref||this.parent.finalize()};var rv=usePSD(psd,fn,a1,a2);if(psd.ref===0)psd.finalize();return rv}function incrementExpectedAwaits(){if(!task.id)task.id=++taskCounter;++task.awaits;task.echoes+=ZONE_ECHO_LIMIT;return task.id}function decrementExpectedAwaits(sourceTaskId){if(!task.awaits||sourceTaskId&&sourceTaskId!==task.id)return;if(--task.awaits===0)task.id=0;task.echoes=task.awaits*ZONE_ECHO_LIMIT}function onPossibleParallellAsync(possiblePromise){if(task.echoes&&possiblePromise&&possiblePromise.constructor===NativePromise){incrementExpectedAwaits();return possiblePromise.then(function(x){decrementExpectedAwaits();return x},function(e){decrementExpectedAwaits();return rejection(e)})}return possiblePromise}function zoneEnterEcho(targetZone){++totalEchoes;if(!task.echoes||--task.echoes===0){task.echoes=task.id=0}zoneStack.push(PSD);switchToZone(targetZone,true)}function zoneLeaveEcho(){var zone=zoneStack[zoneStack.length-1];zoneStack.pop();switchToZone(zone,false)}function switchToZone(targetZone,bEnteringZone){var currentZone=PSD;if(bEnteringZone?task.echoes&&(!zoneEchoes++||targetZone!==PSD):zoneEchoes&&(!--zoneEchoes||targetZone!==PSD)){enqueueNativeMicroTask(bEnteringZone?zoneEnterEcho.bind(null,targetZone):zoneLeaveEcho)}if(targetZone===PSD)return;PSD=targetZone;if(currentZone===globalPSD)globalPSD.env=snapShot();if(patchGlobalPromise){var GlobalPromise=globalPSD.env.Promise;var targetEnv=targetZone.env;nativePromiseProto.then=targetEnv.nthen;GlobalPromise.prototype.then=targetEnv.gthen;if(currentZone.global||targetZone.global){Object.defineProperty(_global,"Promise",targetEnv.PromiseProp);GlobalPromise.all=targetEnv.all;GlobalPromise.race=targetEnv.race;GlobalPromise.resolve=targetEnv.resolve;GlobalPromise.reject=targetEnv.reject}}}function snapShot(){var GlobalPromise=_global.Promise;return patchGlobalPromise?{Promise:GlobalPromise,PromiseProp:Object.getOwnPropertyDescriptor(_global,"Promise"),all:GlobalPromise.all,race:GlobalPromise.race,resolve:GlobalPromise.resolve,reject:GlobalPromise.reject,nthen:nativePromiseProto.then,gthen:GlobalPromise.prototype.then}:{}}function usePSD(psd,fn,a1,a2,a3){var outerScope=PSD;try{switchToZone(psd,true);return fn(a1,a2,a3)}finally{switchToZone(outerScope,false)}}function enqueueNativeMicroTask(job){nativePromiseThen.call(resolvedNativePromise,job)}function nativeAwaitCompatibleWrap(fn,zone,possibleAwait){return typeof fn!=="function"?fn:function(){var outerZone=PSD;if(possibleAwait)incrementExpectedAwaits();switchToZone(zone,true);try{return fn.apply(this,arguments)}finally{switchToZone(outerZone,false)}}}function getPatchedPromiseThen(origThen,zone){return function(onResolved,onRejected){return origThen.call(this,nativeAwaitCompatibleWrap(onResolved,zone,false),nativeAwaitCompatibleWrap(onRejected,zone,false))}}var UNHANDLEDREJECTION="unhandledrejection";function globalError(err,promise){var rv;try{rv=promise.onuncatched(err)}catch(e){}if(rv!==false)try{var event,eventData={promise:promise,reason:err};if(_global.document&&document.createEvent){event=document.createEvent("Event");event.initEvent(UNHANDLEDREJECTION,true,true);extend(event,eventData)}else if(_global.CustomEvent){event=new CustomEvent(UNHANDLEDREJECTION,{detail:eventData});extend(event,eventData)}if(event&&_global.dispatchEvent){dispatchEvent(event);if(!_global.PromiseRejectionEvent&&_global.onunhandledrejection)try{_global.onunhandledrejection(event)}catch(_){}}if(!event.defaultPrevented){console.warn("Unhandled rejection: "+(err.stack||err))}}catch(e){}}var rejection=Promise.reject;function Events(ctx){var evs={};var rv=function(eventName,subscriber){if(subscriber){var i=arguments.length,args=new Array(i-1);while(--i)args[i-1]=arguments[i];evs[eventName].subscribe.apply(null,args);return ctx}else if(typeof eventName==="string"){return evs[eventName]}};rv.addEventType=add;for(var i=1,l=arguments.length;i<l;++i){add(arguments[i])}return rv;function add(eventName,chainFunction,defaultFunction){if(typeof eventName==="object")return addConfiguredEvents(eventName);if(!chainFunction)chainFunction=reverseStoppableEventChain;if(!defaultFunction)defaultFunction=nop;var context={subscribers:[],fire:defaultFunction,subscribe:function(cb){if(context.subscribers.indexOf(cb)===-1){context.subscribers.push(cb);context.fire=chainFunction(context.fire,cb)}},unsubscribe:function(cb){context.subscribers=context.subscribers.filter(function(fn){return fn!==cb});context.fire=context.subscribers.reduce(chainFunction,defaultFunction)}};evs[eventName]=rv[eventName]=context;return context}function addConfiguredEvents(cfg){keys(cfg).forEach(function(eventName){var args=cfg[eventName];if(isArray(args)){add(eventName,cfg[eventName][0],cfg[eventName][1])}else if(args==="asap"){var context=add(eventName,mirror,function fire(){var i=arguments.length,args=new Array(i);while(i--)args[i]=arguments[i];context.subscribers.forEach(function(fn){asap(function fireEvent(){fn.apply(null,args)})})})}else throw new exceptions.InvalidArgument("Invalid event config")})}}var DEXIE_VERSION="{version}";var maxString=String.fromCharCode(65535);var maxKey=function(){try{IDBKeyRange.only([[]]);return[[]]}catch(e){return maxString}}();var minKey=-Infinity;var INVALID_KEY_ARGUMENT="Invalid key provided. Keys must be of type string, number, Date or Array<string | number | Date>.";var STRING_EXPECTED="String expected.";var connections=[];var isIEOrEdge=typeof navigator!=="undefined"&&/(MSIE|Trident|Edge)/.test(navigator.userAgent);var hasIEDeleteObjectStoreBug=isIEOrEdge;var hangsOnDeleteLargeKeyRange=isIEOrEdge;var dexieStackFrameFilter=function(frame){return!/(dexie\.js|dexie\.min\.js)/.test(frame)};var dbNamesDB;setDebug(debug,dexieStackFrameFilter);function Dexie(dbName,options){var deps=Dexie.dependencies;var opts=extend({addons:Dexie.addons,autoOpen:true,indexedDB:deps.indexedDB,IDBKeyRange:deps.IDBKeyRange},options);var addons=opts.addons,autoOpen=opts.autoOpen,indexedDB=opts.indexedDB,IDBKeyRange=opts.IDBKeyRange;var globalSchema=this._dbSchema={};var versions=[];var dbStoreNames=[];var allTables={};var idbdb=null;var dbOpenError=null;var isBeingOpened=false;var onReadyBeingFired=null;var openComplete=false;var READONLY="readonly",READWRITE="readwrite";var db=this;var dbReadyResolve,dbReadyPromise=new Promise(function(resolve){dbReadyResolve=resolve}),cancelOpen,openCanceller=new Promise(function(_,reject){cancelOpen=reject});var autoSchema=true;var hasNativeGetDatabaseNames=!!getNativeGetDatabaseNamesFn(indexedDB),hasGetAll;function init(){db.on("versionchange",function(ev){if(ev.newVersion>0)console.warn("Another connection wants to upgrade database '"+db.name+"'. Closing db now to resume the upgrade.");else console.warn("Another connection wants to delete database '"+db.name+"'. Closing db now to resume the delete request.");db.close()});db.on("blocked",function(ev){if(!ev.newVersion||ev.newVersion<ev.oldVersion)console.warn("Dexie.delete('"+db.name+"') was blocked");else console.warn("Upgrade '"+db.name+"' blocked by other connection holding version "+ev.oldVersion/10)})}this.version=function(versionNumber){if(idbdb||isBeingOpened)throw new exceptions.Schema("Cannot add version when database is open");this.verno=Math.max(this.verno,versionNumber);var versionInstance=versions.filter(function(v){return v._cfg.version===versionNumber})[0];if(versionInstance)return versionInstance;versionInstance=new Version(versionNumber);versions.push(versionInstance);versions.sort(lowerVersionFirst);autoSchema=false;return versionInstance};function Version(versionNumber){this._cfg={version:versionNumber,storesSource:null,dbschema:{},tables:{},contentUpgrade:null};this.stores({})}extend(Version.prototype,{stores:function(stores){this._cfg.storesSource=this._cfg.storesSource?extend(this._cfg.storesSource,stores):stores;var storesSpec={};versions.forEach(function(version){extend(storesSpec,version._cfg.storesSource)});var dbschema=this._cfg.dbschema={};this._parseStoresSpec(storesSpec,dbschema);globalSchema=db._dbSchema=dbschema;removeTablesApi([allTables,db,Transaction.prototype]);setApiOnPlace([allTables,db,Transaction.prototype,this._cfg.tables],keys(dbschema),dbschema);dbStoreNames=keys(dbschema);return this},upgrade:function(upgradeFunction){this._cfg.contentUpgrade=upgradeFunction;return this},_parseStoresSpec:function(stores,outSchema){keys(stores).forEach(function(tableName){if(stores[tableName]!==null){var instanceTemplate={};var indexes=parseIndexSyntax(stores[tableName]);var primKey=indexes.shift();if(primKey.multi)throw new exceptions.Schema("Primary key cannot be multi-valued");if(primKey.keyPath)setByKeyPath(instanceTemplate,primKey.keyPath,primKey.auto?0:primKey.keyPath);indexes.forEach(function(idx){if(idx.auto)throw new exceptions.Schema("Only primary key can be marked as autoIncrement (++)");if(!idx.keyPath)throw new exceptions.Schema("Index must have a name and cannot be an empty string");setByKeyPath(instanceTemplate,idx.keyPath,idx.compound?idx.keyPath.map(function(){return""}):"")});outSchema[tableName]=new TableSchema(tableName,primKey,indexes,instanceTemplate)}})}});function runUpgraders(oldVersion,idbtrans,reject){var trans=db._createTransaction(READWRITE,dbStoreNames,globalSchema);trans.create(idbtrans);trans._completion.catch(reject);var rejectTransaction=trans._reject.bind(trans);newScope(function(){PSD.trans=trans;if(oldVersion===0){keys(globalSchema).forEach(function(tableName){createTable(idbtrans,tableName,globalSchema[tableName].primKey,globalSchema[tableName].indexes)});Promise.follow(function(){return db.on.populate.fire(trans)}).catch(rejectTransaction)}else updateTablesAndIndexes(oldVersion,trans,idbtrans).catch(rejectTransaction)})}function updateTablesAndIndexes(oldVersion,trans,idbtrans){var queue=[];var oldVersionStruct=versions.filter(function(version){return version._cfg.version===oldVersion})[0];if(!oldVersionStruct)throw new exceptions.Upgrade("Dexie specification of currently installed DB version is missing");globalSchema=db._dbSchema=oldVersionStruct._cfg.dbschema;var anyContentUpgraderHasRun=false;var versToRun=versions.filter(function(v){return v._cfg.version>oldVersion});versToRun.forEach(function(version){queue.push(function(){var oldSchema=globalSchema;var newSchema=version._cfg.dbschema;adjustToExistingIndexNames(oldSchema,idbtrans);adjustToExistingIndexNames(newSchema,idbtrans);globalSchema=db._dbSchema=newSchema;var diff=getSchemaDiff(oldSchema,newSchema);diff.add.forEach(function(tuple){createTable(idbtrans,tuple[0],tuple[1].primKey,tuple[1].indexes)});diff.change.forEach(function(change){if(change.recreate){throw new exceptions.Upgrade("Not yet support for changing primary key")}else{var store=idbtrans.objectStore(change.name);change.add.forEach(function(idx){addIndex(store,idx)});change.change.forEach(function(idx){store.deleteIndex(idx.name);addIndex(store,idx)});change.del.forEach(function(idxName){store.deleteIndex(idxName)})}});if(version._cfg.contentUpgrade){anyContentUpgraderHasRun=true;return Promise.follow(function(){version._cfg.contentUpgrade(trans)})}});queue.push(function(idbtrans){if(!anyContentUpgraderHasRun||!hasIEDeleteObjectStoreBug){var newSchema=version._cfg.dbschema;deleteRemovedTables(newSchema,idbtrans)}})});function runQueue(){return queue.length?Promise.resolve(queue.shift()(trans.idbtrans)).then(runQueue):Promise.resolve()}return runQueue().then(function(){createMissingTables(globalSchema,idbtrans)})}function getSchemaDiff(oldSchema,newSchema){var diff={del:[],add:[],change:[]};for(var table in oldSchema){if(!newSchema[table])diff.del.push(table)}for(table in newSchema){var oldDef=oldSchema[table],newDef=newSchema[table];if(!oldDef){diff.add.push([table,newDef])}else{var change={name:table,def:newDef,recreate:false,del:[],add:[],change:[]};if(oldDef.primKey.src!==newDef.primKey.src){change.recreate=true;diff.change.push(change)}else{var oldIndexes=oldDef.idxByName;var newIndexes=newDef.idxByName;for(var idxName in oldIndexes){if(!newIndexes[idxName])change.del.push(idxName)}for(idxName in newIndexes){var oldIdx=oldIndexes[idxName],newIdx=newIndexes[idxName];if(!oldIdx)change.add.push(newIdx);else if(oldIdx.src!==newIdx.src)change.change.push(newIdx)}if(change.del.length>0||change.add.length>0||change.change.length>0){diff.change.push(change)}}}}return diff}function createTable(idbtrans,tableName,primKey,indexes){var store=idbtrans.db.createObjectStore(tableName,primKey.keyPath?{keyPath:primKey.keyPath,autoIncrement:primKey.auto}:{autoIncrement:primKey.auto});indexes.forEach(function(idx){addIndex(store,idx)});return store}function createMissingTables(newSchema,idbtrans){keys(newSchema).forEach(function(tableName){if(!idbtrans.db.objectStoreNames.contains(tableName)){createTable(idbtrans,tableName,newSchema[tableName].primKey,newSchema[tableName].indexes)}})}function deleteRemovedTables(newSchema,idbtrans){for(var i=0;i<idbtrans.db.objectStoreNames.length;++i){var storeName=idbtrans.db.objectStoreNames[i];if(newSchema[storeName]==null){idbtrans.db.deleteObjectStore(storeName)}}}function addIndex(store,idx){store.createIndex(idx.name,idx.keyPath,{unique:idx.unique,multiEntry:idx.multi})}this._allTables=allTables;this._createTransaction=function(mode,storeNames,dbschema,parentTransaction){return new Transaction(mode,storeNames,dbschema,parentTransaction)};function tempTransaction(mode,storeNames,fn){if(!openComplete&&!PSD.letThrough){if(!isBeingOpened){if(!autoOpen)return rejection(new exceptions.DatabaseClosed);db.open().catch(nop)}return dbReadyPromise.then(function(){return tempTransaction(mode,storeNames,fn)})}else{var trans=db._createTransaction(mode,storeNames,globalSchema);try{trans.create()}catch(ex){return rejection(ex)}return trans._promise(mode,function(resolve,reject){return newScope(function(){PSD.trans=trans;return fn(resolve,reject,trans)})}).then(function(result){return trans._completion.then(function(){return result})})}}this._whenReady=function(fn){return openComplete||PSD.letThrough?fn():new Promise(function(resolve,reject){if(!isBeingOpened){if(!autoOpen){reject(new exceptions.DatabaseClosed);return}db.open().catch(nop)}dbReadyPromise.then(resolve,reject)}).then(fn)};this.verno=0;this.open=function(){if(isBeingOpened||idbdb)return dbReadyPromise.then(function(){return dbOpenError?rejection(dbOpenError):db});debug&&(openCanceller._stackHolder=getErrorWithStack());isBeingOpened=true;dbOpenError=null;openComplete=false;var resolveDbReady=dbReadyResolve,upgradeTransaction=null;return Promise.race([openCanceller,new Promise(function(resolve,reject){if(!indexedDB)throw new exceptions.MissingAPI("indexedDB API not found. If using IE10+, make sure to run your code on a server URL "+"(not locally). If using old Safari versions, make sure to include indexedDB polyfill.");var req=autoSchema?indexedDB.open(dbName):indexedDB.open(dbName,Math.round(db.verno*10));if(!req)throw new exceptions.MissingAPI("IndexedDB API not available");req.onerror=eventRejectHandler(reject);req.onblocked=wrap(fireOnBlocked);req.onupgradeneeded=wrap(function(e){upgradeTransaction=req.transaction;if(autoSchema&&!db._allowEmptyDB){req.onerror=preventDefault;upgradeTransaction.abort();req.result.close();var delreq=indexedDB.deleteDatabase(dbName);delreq.onsuccess=delreq.onerror=wrap(function(){reject(new exceptions.NoSuchDatabase("Database "+dbName+" doesnt exist"))})}else{upgradeTransaction.onerror=eventRejectHandler(reject);var oldVer=e.oldVersion>Math.pow(2,62)?0:e.oldVersion;runUpgraders(oldVer/10,upgradeTransaction,reject,req)}},reject);req.onsuccess=wrap(function(){upgradeTransaction=null;idbdb=req.result;connections.push(db);if(autoSchema)readGlobalSchema();else if(idbdb.objectStoreNames.length>0){try{adjustToExistingIndexNames(globalSchema,idbdb.transaction(safariMultiStoreFix(idbdb.objectStoreNames),READONLY))}catch(e){}}idbdb.onversionchange=wrap(function(ev){db._vcFired=true;db.on("versionchange").fire(ev)});if(!hasNativeGetDatabaseNames&&dbName!=="__dbnames"){dbNamesDB.dbnames.put({name:dbName}).catch(nop)}resolve()},reject)})]).then(function(){onReadyBeingFired=[];return Promise.resolve(Dexie.vip(db.on.ready.fire)).then(function fireRemainders(){if(onReadyBeingFired.length>0){var remainders=onReadyBeingFired.reduce(promisableChain,nop);onReadyBeingFired=[];return Promise.resolve(Dexie.vip(remainders)).then(fireRemainders)}})}).finally(function(){onReadyBeingFired=null}).then(function(){isBeingOpened=false;return db}).catch(function(err){try{upgradeTransaction&&upgradeTransaction.abort()}catch(e){}isBeingOpened=false;db.close();dbOpenError=err;return rejection(dbOpenError)}).finally(function(){openComplete=true;resolveDbReady()})};this.close=function(){var idx=connections.indexOf(db);if(idx>=0)connections.splice(idx,1);if(idbdb){try{idbdb.close()}catch(e){}idbdb=null}autoOpen=false;dbOpenError=new exceptions.DatabaseClosed;if(isBeingOpened)cancelOpen(dbOpenError);dbReadyPromise=new Promise(function(resolve){dbReadyResolve=resolve});openCanceller=new Promise(function(_,reject){cancelOpen=reject})};this.delete=function(){var hasArguments=arguments.length>0;return new Promise(function(resolve,reject){if(hasArguments)throw new exceptions.InvalidArgument("Arguments not allowed in db.delete()");if(isBeingOpened){dbReadyPromise.then(doDelete)}else{doDelete()}function doDelete(){db.close();var req=indexedDB.deleteDatabase(dbName);req.onsuccess=wrap(function(){if(!hasNativeGetDatabaseNames){dbNamesDB.dbnames.delete(dbName).catch(nop)}resolve()});req.onerror=eventRejectHandler(reject);req.onblocked=fireOnBlocked}})};this.backendDB=function(){return idbdb};this.isOpen=function(){return idbdb!==null};this.hasBeenClosed=function(){return dbOpenError&&dbOpenError instanceof exceptions.DatabaseClosed};this.hasFailed=function(){return dbOpenError!==null};this.dynamicallyOpened=function(){return autoSchema};this.name=dbName;props(this,{tables:{get:function(){return keys(allTables).map(function(name){return allTables[name]})}}});this.on=Events(this,"populate","blocked","versionchange",{ready:[promisableChain,nop]});this.on.ready.subscribe=override(this.on.ready.subscribe,function(subscribe){return function(subscriber,bSticky){Dexie.vip(function(){if(openComplete){if(!dbOpenError)Promise.resolve().then(subscriber);if(bSticky)subscribe(subscriber)}else if(onReadyBeingFired){onReadyBeingFired.push(subscriber);if(bSticky)subscribe(subscriber)}else{subscribe(subscriber);if(!bSticky)subscribe(function unsubscribe(){db.on.ready.unsubscribe(subscriber);db.on.ready.unsubscribe(unsubscribe)})}})}});this.transaction=function(){var args=extractTransactionArgs.apply(this,arguments);return this._transaction.apply(this,args)};function extractTransactionArgs(mode,_tableArgs_,scopeFunc){var i=arguments.length;if(i<2)throw new exceptions.InvalidArgument("Too few arguments");var args=new Array(i-1);while(--i)args[i-1]=arguments[i];scopeFunc=args.pop();var tables=flatten(args);return[mode,tables,scopeFunc]}this._transaction=function(mode,tables,scopeFunc){var parentTransaction=PSD.trans;if(!parentTransaction||parentTransaction.db!==db||mode.indexOf("!")!==-1)parentTransaction=null;var onlyIfCompatible=mode.indexOf("?")!==-1;mode=mode.replace("!","").replace("?","");try{var storeNames=tables.map(function(table){var storeName=table instanceof Table?table.name:table;if(typeof storeName!=="string")throw new TypeError("Invalid table argument to Dexie.transaction(). Only Table or String are allowed");return storeName});if(mode=="r"||mode==READONLY)mode=READONLY;else if(mode=="rw"||mode==READWRITE)mode=READWRITE;else throw new exceptions.InvalidArgument("Invalid transaction mode: "+mode);if(parentTransaction){if(parentTransaction.mode===READONLY&&mode===READWRITE){if(onlyIfCompatible){parentTransaction=null}else throw new exceptions.SubTransaction("Cannot enter a sub-transaction with READWRITE mode when parent transaction is READONLY")}if(parentTransaction){storeNames.forEach(function(storeName){if(parentTransaction&&parentTransaction.storeNames.indexOf(storeName)===-1){if(onlyIfCompatible){parentTransaction=null}else throw new exceptions.SubTransaction("Table "+storeName+" not included in parent transaction.")}})}if(onlyIfCompatible&&parentTransaction&&!parentTransaction.active){parentTransaction=null}}}catch(e){return parentTransaction?parentTransaction._promise(null,function(_,reject){reject(e)}):rejection(e)}return parentTransaction?parentTransaction._promise(mode,enterTransactionScope,"lock"):PSD.trans?usePSD(PSD.transless,function(){return db._whenReady(enterTransactionScope)}):db._whenReady(enterTransactionScope);function enterTransactionScope(){return Promise.resolve().then(function(){var transless=PSD.transless||PSD;var trans=db._createTransaction(mode,storeNames,globalSchema,parentTransaction);var zoneProps={trans:trans,transless:transless};if(parentTransaction){trans.idbtrans=parentTransaction.idbtrans}else{trans.create()}if(scopeFunc.constructor===AsyncFunction){incrementExpectedAwaits()}var returnValue;var promiseFollowed=Promise.follow(function(){returnValue=scopeFunc.call(trans,trans);if(returnValue){if(returnValue.constructor===NativePromise){var decrementor=decrementExpectedAwaits.bind(null,null);returnValue.then(decrementor,decrementor)}else if(typeof returnValue.next==="function"&&typeof returnValue.throw==="function"){returnValue=awaitIterator(returnValue)}}},zoneProps);return(returnValue&&typeof returnValue.then==="function"?Promise.resolve(returnValue).then(function(x){return trans.active?x:rejection(new exceptions.PrematureCommit("Transaction committed too early. See http://bit.ly/2kdckMn"))}):promiseFollowed.then(function(){return returnValue})).then(function(x){if(parentTransaction)trans._resolve();return trans._completion.then(function(){return x})}).catch(function(e){trans._reject(e);return rejection(e)})})}};this.table=function(tableName){if(!hasOwn(allTables,tableName)){throw new exceptions.InvalidTable("Table "+tableName+" does not exist")}return allTables[tableName]};function Table(name,tableSchema,optionalTrans){this.name=name;this.schema=tableSchema;this._tx=optionalTrans;this.hook=allTables[name]?allTables[name].hook:Events(null,{creating:[hookCreatingChain,nop],reading:[pureFunctionChain,mirror],updating:[hookUpdatingChain,nop],deleting:[hookDeletingChain,nop]})}function BulkErrorHandlerCatchAll(errorList,done,supportHooks){return(supportHooks?hookedEventRejectHandler:eventRejectHandler)(function(e){errorList.push(e);done&&done()})}function bulkDelete(idbstore,trans,keysOrTuples,hasDeleteHook,deletingHook){return new Promise(function(resolve,reject){var len=keysOrTuples.length,lastItem=len-1;if(len===0)return resolve();if(!hasDeleteHook){for(var i=0;i<len;++i){var req=idbstore.delete(keysOrTuples[i]);req.onerror=eventRejectHandler(reject);if(i===lastItem)req.onsuccess=wrap(function(){return resolve()})}}else{var hookCtx,errorHandler=hookedEventRejectHandler(reject),successHandler=hookedEventSuccessHandler(null);tryCatch(function(){for(var i=0;i<len;++i){hookCtx={onsuccess:null,onerror:null};var tuple=keysOrTuples[i];deletingHook.call(hookCtx,tuple[0],tuple[1],trans);var req=idbstore.delete(tuple[0]);req._hookCtx=hookCtx;req.onerror=errorHandler;if(i===lastItem)req.onsuccess=hookedEventSuccessHandler(resolve);else req.onsuccess=successHandler}},function(err){hookCtx.onerror&&hookCtx.onerror(err);throw err})}})}props(Table.prototype,{_trans:function getTransaction(mode,fn,writeLocked){var trans=this._tx||PSD.trans;return trans&&trans.db===db?trans===PSD.trans?trans._promise(mode,fn,writeLocked):newScope(function(){return trans._promise(mode,fn,writeLocked)},{trans:trans,transless:PSD.transless||PSD}):tempTransaction(mode,[this.name],fn)},_idbstore:function getIDBObjectStore(mode,fn,writeLocked){var tableName=this.name;function supplyIdbStore(resolve,reject,trans){if(trans.storeNames.indexOf(tableName)===-1)throw new exceptions.NotFound("Table"+tableName+" not part of transaction");return fn(resolve,reject,trans.idbtrans.objectStore(tableName),trans)}return this._trans(mode,supplyIdbStore,writeLocked)},get:function(keyOrCrit,cb){if(keyOrCrit&&keyOrCrit.constructor===Object)return this.where(keyOrCrit).first(cb);var self=this;return this._idbstore(READONLY,function(resolve,reject,idbstore){var req=idbstore.get(keyOrCrit);req.onerror=eventRejectHandler(reject);req.onsuccess=wrap(function(){resolve(self.hook.reading.fire(req.result))},reject)}).then(cb)},where:function(indexOrCrit){if(typeof indexOrCrit==="string")return new WhereClause(this,indexOrCrit);if(isArray(indexOrCrit))return new WhereClause(this,"["+indexOrCrit.join("+")+"]");var keyPaths=keys(indexOrCrit);if(keyPaths.length===1)return this.where(keyPaths[0]).equals(indexOrCrit[keyPaths[0]]);var compoundIndex=this.schema.indexes.concat(this.schema.primKey).filter(function(ix){return ix.compound&&keyPaths.every(function(keyPath){return ix.keyPath.indexOf(keyPath)>=0})&&ix.keyPath.every(function(keyPath){return keyPaths.indexOf(keyPath)>=0})})[0];if(compoundIndex&&maxKey!==maxString)return this.where(compoundIndex.name).equals(compoundIndex.keyPath.map(function(kp){return indexOrCrit[kp]}));if(!compoundIndex)console.warn("The query "+JSON.stringify(indexOrCrit)+" on "+this.name+" would benefit of a "+("compound index ["+keyPaths.join("+")+"]"));var idxByName=this.schema.idxByName;var simpleIndex=keyPaths.reduce(function(r,keyPath){return[r[0]||idxByName[keyPath],r[0]||!idxByName[keyPath]?combine(r[1],function(x){return""+getByKeyPath(x,keyPath)==""+indexOrCrit[keyPath]}):r[1]]},[null,null]);var idx=simpleIndex[0];return idx?this.where(idx.name).equals(indexOrCrit[idx.keyPath]).filter(simpleIndex[1]):compoundIndex?this.filter(simpleIndex[1]):this.where(keyPaths).equals("")},count:function(cb){return this.toCollection().count(cb)},offset:function(offset){return this.toCollection().offset(offset)},limit:function(numRows){return this.toCollection().limit(numRows)},reverse:function(){return this.toCollection().reverse()},filter:function(filterFunction){return this.toCollection().and(filterFunction)},each:function(fn){return this.toCollection().each(fn)},toArray:function(cb){return this.toCollection().toArray(cb)},orderBy:function(index){return new Collection(new WhereClause(this,isArray(index)?"["+index.join("+")+"]":index))},toCollection:function(){return new Collection(new WhereClause(this))},mapToClass:function(constructor,structure){this.schema.mappedClass=constructor;var instanceTemplate=Object.create(constructor.prototype);if(structure){applyStructure(instanceTemplate,structure)}this.schema.instanceTemplate=instanceTemplate;var readHook=function(obj){if(!obj)return obj;var res=Object.create(constructor.prototype);for(var m in obj)if(hasOwn(obj,m))try{res[m]=obj[m]}catch(_){}return res};if(this.schema.readHook){this.hook.reading.unsubscribe(this.schema.readHook)}this.schema.readHook=readHook;this.hook("reading",readHook);return constructor},defineClass:function(structure){return this.mapToClass(Dexie.defineClass(structure),structure)},bulkDelete:function(keys$$1){if(this.hook.deleting.fire===nop){return this._idbstore(READWRITE,function(resolve,reject,idbstore,trans){resolve(bulkDelete(idbstore,trans,keys$$1,false,nop))})}else{return this.where(":id").anyOf(keys$$1).delete().then(function(){})}},bulkPut:function(objects,keys$$1){var _this=this;return this._idbstore(READWRITE,function(resolve,reject,idbstore){if(!idbstore.keyPath&&!_this.schema.primKey.auto&&!keys$$1)throw new exceptions.InvalidArgument("bulkPut() with non-inbound keys requires keys array in second argument");if(idbstore.keyPath&&keys$$1)throw new exceptions.InvalidArgument("bulkPut(): keys argument invalid on tables with inbound keys");if(keys$$1&&keys$$1.length!==objects.length)throw new exceptions.InvalidArgument("Arguments objects and keys must have the same length");if(objects.length===0)return resolve();var done=function(result){if(errorList.length===0)resolve(result);else reject(new BulkError(_this.name+".bulkPut(): "+errorList.length+" of "+numObjs+" operations failed",errorList))};var req,errorList=[],errorHandler,numObjs=objects.length,table=_this;if(_this.hook.creating.fire===nop&&_this.hook.updating.fire===nop){errorHandler=BulkErrorHandlerCatchAll(errorList);for(var i=0,l=objects.length;i<l;++i){req=keys$$1?idbstore.put(objects[i],keys$$1[i]):idbstore.put(objects[i]);req.onerror=errorHandler}req.onerror=BulkErrorHandlerCatchAll(errorList,done);req.onsuccess=eventSuccessHandler(done)}else{var effectiveKeys=keys$$1||idbstore.keyPath&&objects.map(function(o){return getByKeyPath(o,idbstore.keyPath)});var objectLookup=effectiveKeys&&arrayToObject(effectiveKeys,function(key,i){return key!=null&&[key,objects[i]]});var promise=!effectiveKeys?table.bulkAdd(objects):table.where(":id").anyOf(effectiveKeys.filter(function(key){return key!=null})).modify(function(){this.value=objectLookup[this.primKey];objectLookup[this.primKey]=null}).catch(ModifyError,function(e){errorList=e.failures}).then(function(){var objsToAdd=[],keysToAdd=keys$$1&&[];for(var i=effectiveKeys.length-1;i>=0;--i){var key=effectiveKeys[i];if(key==null||objectLookup[key]){objsToAdd.push(objects[i]);keys$$1&&keysToAdd.push(key);if(key!=null)objectLookup[key]=null}}objsToAdd.reverse();keys$$1&&keysToAdd.reverse();return table.bulkAdd(objsToAdd,keysToAdd)}).then(function(lastAddedKey){var lastEffectiveKey=effectiveKeys[effectiveKeys.length-1];return lastEffectiveKey!=null?lastEffectiveKey:lastAddedKey});promise.then(done).catch(BulkError,function(e){errorList=errorList.concat(e.failures);done()}).catch(reject)}},"locked")},bulkAdd:function(objects,keys$$1){var self=this,creatingHook=this.hook.creating.fire;return this._idbstore(READWRITE,function(resolve,reject,idbstore,trans){if(!idbstore.keyPath&&!self.schema.primKey.auto&&!keys$$1)throw new exceptions.InvalidArgument("bulkAdd() with non-inbound keys requires keys array in second argument");if(idbstore.keyPath&&keys$$1)throw new exceptions.InvalidArgument("bulkAdd(): keys argument invalid on tables with inbound keys");if(keys$$1&&keys$$1.length!==objects.length)throw new exceptions.InvalidArgument("Arguments objects and keys must have the same length");if(objects.length===0)return resolve();function done(result){if(errorList.length===0)resolve(result);else reject(new BulkError(self.name+".bulkAdd(): "+errorList.length+" of "+numObjs+" operations failed",errorList))}var req,errorList=[],errorHandler,successHandler,numObjs=objects.length;if(creatingHook!==nop){var keyPath=idbstore.keyPath,hookCtx;errorHandler=BulkErrorHandlerCatchAll(errorList,null,true);successHandler=hookedEventSuccessHandler(null);tryCatch(function(){for(var i=0,l=objects.length;i<l;++i){hookCtx={onerror:null,onsuccess:null};var key=keys$$1&&keys$$1[i];var obj=objects[i],effectiveKey=keys$$1?key:keyPath?getByKeyPath(obj,keyPath):undefined,keyToUse=creatingHook.call(hookCtx,effectiveKey,obj,trans);if(effectiveKey==null&&keyToUse!=null){if(keyPath){obj=deepClone(obj);setByKeyPath(obj,keyPath,keyToUse)}else{key=keyToUse}}req=key!=null?idbstore.add(obj,key):idbstore.add(obj);req._hookCtx=hookCtx;if(i<l-1){req.onerror=errorHandler;if(hookCtx.onsuccess)req.onsuccess=successHandler}}},function(err){hookCtx.onerror&&hookCtx.onerror(err);throw err});req.onerror=BulkErrorHandlerCatchAll(errorList,done,true);req.onsuccess=hookedEventSuccessHandler(done)}else{errorHandler=BulkErrorHandlerCatchAll(errorList);for(var i=0,l=objects.length;i<l;++i){req=keys$$1?idbstore.add(objects[i],keys$$1[i]):idbstore.add(objects[i]);req.onerror=errorHandler}req.onerror=BulkErrorHandlerCatchAll(errorList,done);req.onsuccess=eventSuccessHandler(done)}})},add:function(obj,key){var creatingHook=this.hook.creating.fire;return this._idbstore(READWRITE,function(resolve,reject,idbstore,trans){var hookCtx={onsuccess:null,onerror:null};if(creatingHook!==nop){var effectiveKey=key!=null?key:idbstore.keyPath?getByKeyPath(obj,idbstore.keyPath):undefined;var keyToUse=creatingHook.call(hookCtx,effectiveKey,obj,trans);if(effectiveKey==null&&keyToUse!=null){if(idbstore.keyPath)setByKeyPath(obj,idbstore.keyPath,keyToUse);else key=keyToUse}}try{var req=key!=null?idbstore.add(obj,key):idbstore.add(obj);req._hookCtx=hookCtx;req.onerror=hookedEventRejectHandler(reject);req.onsuccess=hookedEventSuccessHandler(function(result){var keyPath=idbstore.keyPath;if(keyPath)setByKeyPath(obj,keyPath,result);resolve(result)})}catch(e){if(hookCtx.onerror)hookCtx.onerror(e);throw e}})},put:function(obj,key){var _this=this;var creatingHook=this.hook.creating.fire,updatingHook=this.hook.updating.fire;if(creatingHook!==nop||updatingHook!==nop){var keyPath=this.schema.primKey.keyPath;var effectiveKey=key!==undefined?key:keyPath&&getByKeyPath(obj,keyPath);if(effectiveKey==null)return this.add(obj);obj=deepClone(obj);return this._trans(READWRITE,function(){return _this.where(":id").equals(effectiveKey).modify(function(){this.value=obj}).then(function(count){return count===0?_this.add(obj,key):effectiveKey})},"locked")}else{return this._idbstore(READWRITE,function(resolve,reject,idbstore){var req=key!==undefined?idbstore.put(obj,key):idbstore.put(obj);req.onerror=eventRejectHandler(reject);req.onsuccess=wrap(function(ev){var keyPath=idbstore.keyPath;if(keyPath)setByKeyPath(obj,keyPath,ev.target.result);resolve(req.result)})})}},delete:function(key){if(this.hook.deleting.subscribers.length){return this.where(":id").equals(key).delete()}else{return this._idbstore(READWRITE,function(resolve,reject,idbstore){var req=idbstore.delete(key);req.onerror=eventRejectHandler(reject);req.onsuccess=wrap(function(){resolve(req.result)})})}},clear:function(){if(this.hook.deleting.subscribers.length){return this.toCollection().delete()}else{return this._idbstore(READWRITE,function(resolve,reject,idbstore){var req=idbstore.clear();req.onerror=eventRejectHandler(reject);req.onsuccess=wrap(function(){resolve(req.result)})})}},update:function(keyOrObject,modifications){if(typeof modifications!=="object"||isArray(modifications))throw new exceptions.InvalidArgument("Modifications must be an object.");if(typeof keyOrObject==="object"&&!isArray(keyOrObject)){keys(modifications).forEach(function(keyPath){setByKeyPath(keyOrObject,keyPath,modifications[keyPath])});var key=getByKeyPath(keyOrObject,this.schema.primKey.keyPath);if(key===undefined)return rejection(new exceptions.InvalidArgument("Given object does not contain its primary key"));return this.where(":id").equals(key).modify(modifications)}else{return this.where(":id").equals(keyOrObject).modify(modifications)}}});function Transaction(mode,storeNames,dbschema,parent){var _this=this;this.db=db;this.mode=mode;this.storeNames=storeNames;this.idbtrans=null;this.on=Events(this,"complete","error","abort");this.parent=parent||null;this.active=true;this._reculock=0;this._blockedFuncs=[];this._resolve=null;this._reject=null;this._waitingFor=null;this._waitingQueue=null;this._spinCount=0;this._completion=new Promise(function(resolve,reject){_this._resolve=resolve;_this._reject=reject});this._completion.then(function(){_this.active=false;_this.on.complete.fire()},function(e){var wasActive=_this.active;_this.active=false;_this.on.error.fire(e);_this.parent?_this.parent._reject(e):wasActive&&_this.idbtrans&&_this.idbtrans.abort();return rejection(e)})}props(Transaction.prototype,{_lock:function(){assert(!PSD.global);++this._reculock;if(this._reculock===1&&!PSD.global)PSD.lockOwnerFor=this;return this},_unlock:function(){assert(!PSD.global);if(--this._reculock===0){if(!PSD.global)PSD.lockOwnerFor=null;while(this._blockedFuncs.length>0&&!this._locked()){var fnAndPSD=this._blockedFuncs.shift();try{usePSD(fnAndPSD[1],fnAndPSD[0])}catch(e){}}}return this},_locked:function(){return this._reculock&&PSD.lockOwnerFor!==this},create:function(idbtrans){var _this=this;if(!this.mode)return this;assert(!this.idbtrans);if(!idbtrans&&!idbdb){switch(dbOpenError&&dbOpenError.name){case"DatabaseClosedError":throw new exceptions.DatabaseClosed(dbOpenError);case"MissingAPIError":throw new exceptions.MissingAPI(dbOpenError.message,dbOpenError);default:throw new exceptions.OpenFailed(dbOpenError)}}if(!this.active)throw new exceptions.TransactionInactive;assert(this._completion._state===null);idbtrans=this.idbtrans=idbtrans||idbdb.transaction(safariMultiStoreFix(this.storeNames),this.mode);idbtrans.onerror=wrap(function(ev){preventDefault(ev);_this._reject(idbtrans.error)});idbtrans.onabort=wrap(function(ev){preventDefault(ev);_this.active&&_this._reject(new exceptions.Abort(idbtrans.error));_this.active=false;_this.on("abort").fire(ev)});idbtrans.oncomplete=wrap(function(){_this.active=false;_this._resolve()});return this},_promise:function(mode,fn,bWriteLock){var _this=this;if(mode===READWRITE&&this.mode!==READWRITE)return rejection(new exceptions.ReadOnly("Transaction is readonly"));if(!this.active)return rejection(new exceptions.TransactionInactive);if(this._locked()){return new Promise(function(resolve,reject){_this._blockedFuncs.push([function(){_this._promise(mode,fn,bWriteLock).then(resolve,reject)},PSD])})}else if(bWriteLock){return newScope(function(){var p=new Promise(function(resolve,reject){_this._lock();var rv=fn(resolve,reject,_this);if(rv&&rv.then)rv.then(resolve,reject)});p.finally(function(){return _this._unlock()});p._lib=true;return p})}else{var p=new Promise(function(resolve,reject){var rv=fn(resolve,reject,_this);if(rv&&rv.then)rv.then(resolve,reject)});p._lib=true;return p}},_root:function(){return this.parent?this.parent._root():this},waitFor:function(promise){var root=this._root();promise=Promise.resolve(promise);if(root._waitingFor){root._waitingFor=root._waitingFor.then(function(){return promise})}else{root._waitingFor=promise;root._waitingQueue=[];var store=root.idbtrans.objectStore(root.storeNames[0]);(function spin(){++root._spinCount;while(root._waitingQueue.length)root._waitingQueue.shift()();if(root._waitingFor)store.get(-Infinity).onsuccess=spin})()}var currentWaitPromise=root._waitingFor;return new Promise(function(resolve,reject){promise.then(function(res){return root._waitingQueue.push(wrap(resolve.bind(null,res)))},function(err){return root._waitingQueue.push(wrap(reject.bind(null,err)))}).finally(function(){if(root._waitingFor===currentWaitPromise){root._waitingFor=null}})})},abort:function(){this.active&&this._reject(new exceptions.Abort);this.active=false},tables:{get:deprecated("Transaction.tables",function(){return allTables})},table:function(name){var table=db.table(name);return new Table(name,table.schema,this)}});function WhereClause(table,index,orCollection){this._ctx={table:table,index:index===":id"?null:index,or:orCollection}}props(WhereClause.prototype,function(){function fail(collectionOrWhereClause,err,T){var collection=collectionOrWhereClause instanceof WhereClause?new Collection(collectionOrWhereClause):collectionOrWhereClause;collection._ctx.error=T?new T(err):new TypeError(err);return collection}function emptyCollection(whereClause){return new Collection(whereClause,function(){return IDBKeyRange.only("")}).limit(0)}function upperFactory(dir){return dir==="next"?function(s){return s.toUpperCase()}:function(s){return s.toLowerCase()}}function lowerFactory(dir){return dir==="next"?function(s){return s.toLowerCase()}:function(s){return s.toUpperCase()}}function nextCasing(key,lowerKey,upperNeedle,lowerNeedle,cmp,dir){var length=Math.min(key.length,lowerNeedle.length);var llp=-1;for(var i=0;i<length;++i){var lwrKeyChar=lowerKey[i];if(lwrKeyChar!==lowerNeedle[i]){if(cmp(key[i],upperNeedle[i])<0)return key.substr(0,i)+upperNeedle[i]+upperNeedle.substr(i+1);if(cmp(key[i],lowerNeedle[i])<0)return key.substr(0,i)+lowerNeedle[i]+upperNeedle.substr(i+1);if(llp>=0)return key.substr(0,llp)+lowerKey[llp]+upperNeedle.substr(llp+1);return null}if(cmp(key[i],lwrKeyChar)<0)llp=i}if(length<lowerNeedle.length&&dir==="next")return key+upperNeedle.substr(key.length);if(length<key.length&&dir==="prev")return key.substr(0,upperNeedle.length);return llp<0?null:key.substr(0,llp)+lowerNeedle[llp]+upperNeedle.substr(llp+1)}function addIgnoreCaseAlgorithm(whereClause,match,needles,suffix){var upper,lower,compare,upperNeedles,lowerNeedles,direction,nextKeySuffix,needlesLen=needles.length;if(!needles.every(function(s){return typeof s==="string"})){return fail(whereClause,STRING_EXPECTED)}function initDirection(dir){upper=upperFactory(dir);lower=lowerFactory(dir);compare=dir==="next"?simpleCompare:simpleCompareReverse;var needleBounds=needles.map(function(needle){return{lower:lower(needle),upper:upper(needle)}}).sort(function(a,b){return compare(a.lower,b.lower)});upperNeedles=needleBounds.map(function(nb){return nb.upper});lowerNeedles=needleBounds.map(function(nb){return nb.lower});direction=dir;nextKeySuffix=dir==="next"?"":suffix}initDirection("next");var c=new Collection(whereClause,function(){return IDBKeyRange.bound(upperNeedles[0],lowerNeedles[needlesLen-1]+suffix)});c._ondirectionchange=function(direction){initDirection(direction)};var firstPossibleNeedle=0;c._addAlgorithm(function(cursor,advance,resolve){var key=cursor.key;if(typeof key!=="string")return false;var lowerKey=lower(key);if(match(lowerKey,lowerNeedles,firstPossibleNeedle)){return true}else{var lowestPossibleCasing=null;for(var i=firstPossibleNeedle;i<needlesLen;++i){var casing=nextCasing(key,lowerKey,upperNeedles[i],lowerNeedles[i],compare,direction);if(casing===null&&lowestPossibleCasing===null)firstPossibleNeedle=i+1;else if(lowestPossibleCasing===null||compare(lowestPossibleCasing,casing)>0){lowestPossibleCasing=casing}}if(lowestPossibleCasing!==null){advance(function(){cursor.continue(lowestPossibleCasing+nextKeySuffix)})}else{advance(resolve)}return false}});return c}return{between:function(lower,upper,includeLower,includeUpper){includeLower=includeLower!==false;includeUpper=includeUpper===true;try{if(cmp(lower,upper)>0||cmp(lower,upper)===0&&(includeLower||includeUpper)&&!(includeLower&&includeUpper))return emptyCollection(this);return new Collection(this,function(){return IDBKeyRange.bound(lower,upper,!includeLower,!includeUpper)})}catch(e){return fail(this,INVALID_KEY_ARGUMENT)}},equals:function(value){return new Collection(this,function(){return IDBKeyRange.only(value)})},above:function(value){return new Collection(this,function(){return IDBKeyRange.lowerBound(value,true)})},aboveOrEqual:function(value){return new Collection(this,function(){return IDBKeyRange.lowerBound(value)})},below:function(value){return new Collection(this,function(){return IDBKeyRange.upperBound(value,true)})},belowOrEqual:function(value){return new Collection(this,function(){return IDBKeyRange.upperBound(value)})},startsWith:function(str){if(typeof str!=="string")return fail(this,STRING_EXPECTED);return this.between(str,str+maxString,true,true)},startsWithIgnoreCase:function(str){if(str==="")return this.startsWith(str);return addIgnoreCaseAlgorithm(this,function(x,a){return x.indexOf(a[0])===0},[str],maxString)},equalsIgnoreCase:function(str){return addIgnoreCaseAlgorithm(this,function(x,a){return x===a[0]},[str],"")},anyOfIgnoreCase:function(){var set=getArrayOf.apply(NO_CHAR_ARRAY,arguments);if(set.length===0)return emptyCollection(this);return addIgnoreCaseAlgorithm(this,function(x,a){return a.indexOf(x)!==-1},set,"")},startsWithAnyOfIgnoreCase:function(){var set=getArrayOf.apply(NO_CHAR_ARRAY,arguments);if(set.length===0)return emptyCollection(this);return addIgnoreCaseAlgorithm(this,function(x,a){return a.some(function(n){return x.indexOf(n)===0})},set,maxString)},anyOf:function(){var set=getArrayOf.apply(NO_CHAR_ARRAY,arguments);var compare=ascending;try{set.sort(compare)}catch(e){return fail(this,INVALID_KEY_ARGUMENT)}if(set.length===0)return emptyCollection(this);var c=new Collection(this,function(){return IDBKeyRange.bound(set[0],set[set.length-1])});c._ondirectionchange=function(direction){compare=direction==="next"?ascending:descending;set.sort(compare)};var i=0;c._addAlgorithm(function(cursor,advance,resolve){var key=cursor.key;while(compare(key,set[i])>0){++i;if(i===set.length){advance(resolve);return false}}if(compare(key,set[i])===0){return true}else{advance(function(){cursor.continue(set[i])});return false}});return c},notEqual:function(value){return this.inAnyRange([[minKey,value],[value,maxKey]],{includeLowers:false,includeUppers:false})},noneOf:function(){var set=getArrayOf.apply(NO_CHAR_ARRAY,arguments);if(set.length===0)return new Collection(this);try{set.sort(ascending)}catch(e){return fail(this,INVALID_KEY_ARGUMENT)}var ranges=set.reduce(function(res,val){return res?res.concat([[res[res.length-1][1],val]]):[[minKey,val]]},null);ranges.push([set[set.length-1],maxKey]);return this.inAnyRange(ranges,{includeLowers:false,includeUppers:false})},inAnyRange:function(ranges,options){if(ranges.length===0)return emptyCollection(this);if(!ranges.every(function(range){return range[0]!==undefined&&range[1]!==undefined&&ascending(range[0],range[1])<=0})){return fail(this,"First argument to inAnyRange() must be an Array of two-value Arrays [lower,upper] where upper must not be lower than lower",exceptions.InvalidArgument)}var includeLowers=!options||options.includeLowers!==false;var includeUppers=options&&options.includeUppers===true;function addRange(ranges,newRange){for(var i=0,l=ranges.length;i<l;++i){var range=ranges[i];if(cmp(newRange[0],range[1])<0&&cmp(newRange[1],range[0])>0){range[0]=min(range[0],newRange[0]);range[1]=max(range[1],newRange[1]);break}}if(i===l)ranges.push(newRange);return ranges}var sortDirection=ascending;function rangeSorter(a,b){return sortDirection(a[0],b[0])}var set;try{set=ranges.reduce(addRange,[]);set.sort(rangeSorter)}catch(ex){return fail(this,INVALID_KEY_ARGUMENT)}var i=0;var keyIsBeyondCurrentEntry=includeUppers?function(key){return ascending(key,set[i][1])>0}:function(key){return ascending(key,set[i][1])>=0};var keyIsBeforeCurrentEntry=includeLowers?function(key){return descending(key,set[i][0])>0}:function(key){return descending(key,set[i][0])>=0};function keyWithinCurrentRange(key){return!keyIsBeyondCurrentEntry(key)&&!keyIsBeforeCurrentEntry(key)}var checkKey=keyIsBeyondCurrentEntry;var c=new Collection(this,function(){return IDBKeyRange.bound(set[0][0],set[set.length-1][1],!includeLowers,!includeUppers)});c._ondirectionchange=function(direction){if(direction==="next"){checkKey=keyIsBeyondCurrentEntry;sortDirection=ascending}else{checkKey=keyIsBeforeCurrentEntry;sortDirection=descending}set.sort(rangeSorter)};c._addAlgorithm(function(cursor,advance,resolve){var key=cursor.key;while(checkKey(key)){++i;if(i===set.length){advance(resolve);return false}}if(keyWithinCurrentRange(key)){return true}else if(cmp(key,set[i][1])===0||cmp(key,set[i][0])===0){return false}else{advance(function(){if(sortDirection===ascending)cursor.continue(set[i][0]);else cursor.continue(set[i][1])});return false}});return c},startsWithAnyOf:function(){var set=getArrayOf.apply(NO_CHAR_ARRAY,arguments);if(!set.every(function(s){return typeof s==="string"})){return fail(this,"startsWithAnyOf() only works with strings")}if(set.length===0)return emptyCollection(this);return this.inAnyRange(set.map(function(str){return[str,str+maxString]}))}}});function Collection(whereClause,keyRangeGenerator){var keyRange=null,error=null;if(keyRangeGenerator)try{keyRange=keyRangeGenerator()}catch(ex){error=ex}var whereCtx=whereClause._ctx,table=whereCtx.table;this._ctx={table:table,index:whereCtx.index,isPrimKey:!whereCtx.index||table.schema.primKey.keyPath&&whereCtx.index===table.schema.primKey.name,range:keyRange,keysOnly:false,dir:"next",unique:"",algorithm:null,filter:null,replayFilter:null,justLimit:true,isMatch:null,offset:0,limit:Infinity,error:error,or:whereCtx.or,valueMapper:table.hook.reading.fire}}function isPlainKeyRange(ctx,ignoreLimitFilter){return!(ctx.filter||ctx.algorithm||ctx.or)&&(ignoreLimitFilter?ctx.justLimit:!ctx.replayFilter)}props(Collection.prototype,function(){function addFilter(ctx,fn){ctx.filter=combine(ctx.filter,fn)}function addReplayFilter(ctx,factory,isLimitFilter){var curr=ctx.replayFilter;ctx.replayFilter=curr?function(){return combine(curr(),factory())}:factory;ctx.justLimit=isLimitFilter&&!curr}function addMatchFilter(ctx,fn){ctx.isMatch=combine(ctx.isMatch,fn)}function getIndexOrStore(ctx,store){if(ctx.isPrimKey)return store;var indexSpec=ctx.table.schema.idxByName[ctx.index];if(!indexSpec)throw new exceptions.Schema("KeyPath "+ctx.index+" on object store "+store.name+" is not indexed");return store.index(indexSpec.name)}function openCursor(ctx,store){var idxOrStore=getIndexOrStore(ctx,store);return ctx.keysOnly&&"openKeyCursor"in idxOrStore?idxOrStore.openKeyCursor(ctx.range||null,ctx.dir+ctx.unique):idxOrStore.openCursor(ctx.range||null,ctx.dir+ctx.unique)}function iter(ctx,fn,resolve,reject,idbstore){var filter=ctx.replayFilter?combine(ctx.filter,ctx.replayFilter()):ctx.filter;if(!ctx.or){iterate(openCursor(ctx,idbstore),combine(ctx.algorithm,filter),fn,resolve,reject,!ctx.keysOnly&&ctx.valueMapper)}else(function(){var set={};var resolved=0;function resolveboth(){if(++resolved===2)resolve()}function union(item,cursor,advance){if(!filter||filter(cursor,advance,resolveboth,reject)){var primaryKey=cursor.primaryKey;var key=""+primaryKey;if(key==="[object ArrayBuffer]")key=""+new Uint8Array(primaryKey);if(!hasOwn(set,key)){set[key]=true;fn(item,cursor,advance)}}}ctx.or._iterate(union,resolveboth,reject,idbstore);iterate(openCursor(ctx,idbstore),ctx.algorithm,union,resolveboth,reject,!ctx.keysOnly&&ctx.valueMapper)})()}return{_read:function(fn,cb){var ctx=this._ctx;return ctx.error?ctx.table._trans(null,rejection.bind(null,ctx.error)):ctx.table._idbstore(READONLY,fn).then(cb)},_write:function(fn){var ctx=this._ctx;return ctx.error?ctx.table._trans(null,rejection.bind(null,ctx.error)):ctx.table._idbstore(READWRITE,fn,"locked")},_addAlgorithm:function(fn){var ctx=this._ctx;ctx.algorithm=combine(ctx.algorithm,fn)},_iterate:function(fn,resolve,reject,idbstore){return iter(this._ctx,fn,resolve,reject,idbstore)},clone:function(props$$1){var rv=Object.create(this.constructor.prototype),ctx=Object.create(this._ctx);if(props$$1)extend(ctx,props$$1);rv._ctx=ctx;return rv},raw:function(){this._ctx.valueMapper=null;return this},each:function(fn){var ctx=this._ctx;return this._read(function(resolve,reject,idbstore){iter(ctx,fn,resolve,reject,idbstore)})},count:function(cb){var ctx=this._ctx;if(isPlainKeyRange(ctx,true)){return this._read(function(resolve,reject,idbstore){var idx=getIndexOrStore(ctx,idbstore);var req=ctx.range?idx.count(ctx.range):idx.count();req.onerror=eventRejectHandler(reject);req.onsuccess=function(e){resolve(Math.min(e.target.result,ctx.limit))}},cb)}else{var count=0;return this._read(function(resolve,reject,idbstore){iter(ctx,function(){++count;return false},function(){resolve(count)},reject,idbstore)},cb)}},sortBy:function(keyPath,cb){var parts=keyPath.split(".").reverse(),lastPart=parts[0],lastIndex=parts.length-1;function getval(obj,i){if(i)return getval(obj[parts[i]],i-1);return obj[lastPart]}var order=this._ctx.dir==="next"?1:-1;function sorter(a,b){var aVal=getval(a,lastIndex),bVal=getval(b,lastIndex);return aVal<bVal?-order:aVal>bVal?order:0}return this.toArray(function(a){return a.sort(sorter)}).then(cb)},toArray:function(cb){var ctx=this._ctx;return this._read(function(resolve,reject,idbstore){if(hasGetAll&&ctx.dir==="next"&&isPlainKeyRange(ctx,true)&&ctx.limit>0){var readingHook=ctx.table.hook.reading.fire;var idxOrStore=getIndexOrStore(ctx,idbstore);var req=ctx.limit<Infinity?idxOrStore.getAll(ctx.range,ctx.limit):idxOrStore.getAll(ctx.range);req.onerror=eventRejectHandler(reject);req.onsuccess=readingHook===mirror?eventSuccessHandler(resolve):eventSuccessHandler(function(res){try{resolve(res.map(readingHook))}catch(e){reject(e)}})}else{var a=[];iter(ctx,function(item){a.push(item)},function arrayComplete(){resolve(a)},reject,idbstore)}},cb)},offset:function(offset){var ctx=this._ctx;if(offset<=0)return this;ctx.offset+=offset;if(isPlainKeyRange(ctx)){addReplayFilter(ctx,function(){var offsetLeft=offset;return function(cursor,advance){if(offsetLeft===0)return true;if(offsetLeft===1){--offsetLeft;return false}advance(function(){cursor.advance(offsetLeft);offsetLeft=0});return false}})}else{addReplayFilter(ctx,function(){var offsetLeft=offset;return function(){return--offsetLeft<0}})}return this},limit:function(numRows){this._ctx.limit=Math.min(this._ctx.limit,numRows);addReplayFilter(this._ctx,function(){var rowsLeft=numRows;return function(cursor,advance,resolve){if(--rowsLeft<=0)advance(resolve);return rowsLeft>=0}},true);return this},until:function(filterFunction,bIncludeStopEntry){addFilter(this._ctx,function(cursor,advance,resolve){if(filterFunction(cursor.value)){advance(resolve);return bIncludeStopEntry}else{return true}});return this},first:function(cb){return this.limit(1).toArray(function(a){return a[0]}).then(cb)},last:function(cb){return this.reverse().first(cb)},filter:function(filterFunction){addFilter(this._ctx,function(cursor){return filterFunction(cursor.value)});addMatchFilter(this._ctx,filterFunction);return this},and:function(filterFunction){return this.filter(filterFunction)},or:function(indexName){return new WhereClause(this._ctx.table,indexName,this)},reverse:function(){this._ctx.dir=this._ctx.dir==="prev"?"next":"prev";if(this._ondirectionchange)this._ondirectionchange(this._ctx.dir);return this},desc:function(){return this.reverse()},eachKey:function(cb){var ctx=this._ctx;ctx.keysOnly=!ctx.isMatch;return this.each(function(val,cursor){cb(cursor.key,cursor)})},eachUniqueKey:function(cb){this._ctx.unique="unique";return this.eachKey(cb)},eachPrimaryKey:function(cb){var ctx=this._ctx;ctx.keysOnly=!ctx.isMatch;return this.each(function(val,cursor){cb(cursor.primaryKey,cursor)})},keys:function(cb){var ctx=this._ctx;ctx.keysOnly=!ctx.isMatch;var a=[];return this.each(function(item,cursor){a.push(cursor.key)}).then(function(){return a}).then(cb)},primaryKeys:function(cb){var ctx=this._ctx;if(hasGetAll&&ctx.dir==="next"&&isPlainKeyRange(ctx,true)&&ctx.limit>0){return this._read(function(resolve,reject,idbstore){var idxOrStore=getIndexOrStore(ctx,idbstore);var req=ctx.limit<Infinity?idxOrStore.getAllKeys(ctx.range,ctx.limit):idxOrStore.getAllKeys(ctx.range);req.onerror=eventRejectHandler(reject);req.onsuccess=eventSuccessHandler(resolve)}).then(cb)}ctx.keysOnly=!ctx.isMatch;var a=[];return this.each(function(item,cursor){a.push(cursor.primaryKey)}).then(function(){return a}).then(cb)},uniqueKeys:function(cb){this._ctx.unique="unique";return this.keys(cb)},firstKey:function(cb){return this.limit(1).keys(function(a){return a[0]}).then(cb)},lastKey:function(cb){return this.reverse().firstKey(cb)},distinct:function(){var ctx=this._ctx,idx=ctx.index&&ctx.table.schema.idxByName[ctx.index];if(!idx||!idx.multi)return this;var set={};addFilter(this._ctx,function(cursor){var strKey=cursor.primaryKey.toString();var found=hasOwn(set,strKey);set[strKey]=true;return!found});return this},modify:function(changes){var self=this,ctx=this._ctx,hook=ctx.table.hook,updatingHook=hook.updating.fire,deletingHook=hook.deleting.fire;return this._write(function(resolve,reject,idbstore,trans){var modifyer;if(typeof changes==="function"){if(updatingHook===nop&&deletingHook===nop){modifyer=changes}else{modifyer=function(item){var origItem=deepClone(item);if(changes.call(this,item,this)===false)return false;if(!hasOwn(this,"value")){deletingHook.call(this,this.primKey,item,trans)}else{var objectDiff=getObjectDiff(origItem,this.value);var additionalChanges=updatingHook.call(this,objectDiff,this.primKey,origItem,trans);if(additionalChanges){item=this.value;keys(additionalChanges).forEach(function(keyPath){setByKeyPath(item,keyPath,additionalChanges[keyPath])})}}}}}else if(updatingHook===nop){var keyPaths=keys(changes);var numKeys=keyPaths.length;modifyer=function(item){var anythingModified=false;for(var i=0;i<numKeys;++i){var keyPath=keyPaths[i],val=changes[keyPath];if(getByKeyPath(item,keyPath)!==val){setByKeyPath(item,keyPath,val);anythingModified=true}}return anythingModified}}else{var origChanges=changes;changes=shallowClone(origChanges);modifyer=function(item){var anythingModified=false;var additionalChanges=updatingHook.call(this,changes,this.primKey,deepClone(item),trans);if(additionalChanges)extend(changes,additionalChanges);keys(changes).forEach(function(keyPath){var val=changes[keyPath];if(getByKeyPath(item,keyPath)!==val){setByKeyPath(item,keyPath,val);anythingModified=true}});if(additionalChanges)changes=shallowClone(origChanges);return anythingModified}}var count=0;var successCount=0;var iterationComplete=false;var failures=[];var failKeys=[];var currentKey=null;function modifyItem(item,cursor){currentKey=cursor.primaryKey;var thisContext={primKey:cursor.primaryKey,value:item,onsuccess:null,onerror:null};function onerror(e){failures.push(e);failKeys.push(thisContext.primKey);checkFinished();return true}if(modifyer.call(thisContext,item,thisContext)!==false){var bDelete=!hasOwn(thisContext,"value");++count;tryCatch(function(){var req=bDelete?cursor.delete():cursor.update(thisContext.value);req._hookCtx=thisContext;req.onerror=hookedEventRejectHandler(onerror);req.onsuccess=hookedEventSuccessHandler(function(){++successCount;checkFinished()})},onerror)}else if(thisContext.onsuccess){thisContext.onsuccess(thisContext.value)}}function doReject(e){if(e){failures.push(e);failKeys.push(currentKey)}return reject(new ModifyError("Error modifying one or more objects",failures,successCount,failKeys))}function checkFinished(){if(iterationComplete&&successCount+failures.length===count){if(failures.length>0)doReject();else resolve(successCount)}}self.clone().raw()._iterate(modifyItem,function(){iterationComplete=true;checkFinished()},doReject,idbstore)})},delete:function(){var _this=this;var ctx=this._ctx,range=ctx.range,deletingHook=ctx.table.hook.deleting.fire,hasDeleteHook=deletingHook!==nop;if(!hasDeleteHook&&isPlainKeyRange(ctx)&&(ctx.isPrimKey&&!hangsOnDeleteLargeKeyRange||!range)){return this._write(function(resolve,reject,idbstore){var onerror=eventRejectHandler(reject),countReq=range?idbstore.count(range):idbstore.count();countReq.onerror=onerror;countReq.onsuccess=function(){var count=countReq.result;tryCatch(function(){var delReq=range?idbstore.delete(range):idbstore.clear();delReq.onerror=onerror;delReq.onsuccess=function(){return resolve(count)}},function(err){return reject(err)})}})}var CHUNKSIZE=hasDeleteHook?2e3:1e4;return this._write(function(resolve,reject,idbstore,trans){var totalCount=0;var collection=_this.clone({keysOnly:!ctx.isMatch&&!hasDeleteHook}).distinct().limit(CHUNKSIZE).raw();var keysOrTuples=[];var nextChunk=function(){return collection.each(hasDeleteHook?function(val,cursor){keysOrTuples.push([cursor.primaryKey,cursor.value])}:function(val,cursor){keysOrTuples.push(cursor.primaryKey)}).then(function(){hasDeleteHook?keysOrTuples.sort(function(a,b){return ascending(a[0],b[0])}):keysOrTuples.sort(ascending);return bulkDelete(idbstore,trans,keysOrTuples,hasDeleteHook,deletingHook)}).then(function(){var count=keysOrTuples.length;totalCount+=count;keysOrTuples=[];return count<CHUNKSIZE?totalCount:nextChunk()})};resolve(nextChunk())})}}});function lowerVersionFirst(a,b){return a._cfg.version-b._cfg.version}function setApiOnPlace(objs,tableNames,dbschema){tableNames.forEach(function(tableName){var schema=dbschema[tableName];objs.forEach(function(obj){if(!(tableName in obj)){if(obj===Transaction.prototype||obj instanceof Transaction){setProp(obj,tableName,{get:function(){return this.table(tableName)}})}else{obj[tableName]=new Table(tableName,schema)}}})})}function removeTablesApi(objs){objs.forEach(function(obj){for(var key in obj){if(obj[key]instanceof Table)delete obj[key]}})}function iterate(req,filter,fn,resolve,reject,valueMapper){var mappedFn=valueMapper?function(x,c,a){return fn(valueMapper(x),c,a)}:fn;var wrappedFn=wrap(mappedFn,reject);if(!req.onerror)req.onerror=eventRejectHandler(reject);if(filter){req.onsuccess=trycatcher(function filter_record(){var cursor=req.result;if(cursor){var c=function(){cursor.continue()};if(filter(cursor,function(advancer){c=advancer},resolve,reject))wrappedFn(cursor.value,cursor,function(advancer){c=advancer});c()}else{resolve()}},reject)}else{req.onsuccess=trycatcher(function filter_record(){var cursor=req.result;if(cursor){var c=function(){cursor.continue()};wrappedFn(cursor.value,cursor,function(advancer){c=advancer});c()}else{resolve()}},reject)}}function parseIndexSyntax(indexes){var rv=[];indexes.split(",").forEach(function(index){index=index.trim();var name=index.replace(/([&*]|\+\+)/g,"");var keyPath=/^\[/.test(name)?name.match(/^\[(.*)\]$/)[1].split("+"):name;rv.push(new IndexSpec(name,keyPath||null,/\&/.test(index),/\*/.test(index),/\+\+/.test(index),isArray(keyPath),/\./.test(index)))});return rv}function cmp(key1,key2){return indexedDB.cmp(key1,key2)}function min(a,b){return cmp(a,b)<0?a:b}function max(a,b){return cmp(a,b)>0?a:b}function ascending(a,b){return indexedDB.cmp(a,b)}function descending(a,b){return indexedDB.cmp(b,a)}function simpleCompare(a,b){return a<b?-1:a===b?0:1}function simpleCompareReverse(a,b){return a>b?-1:a===b?0:1}function combine(filter1,filter2){return filter1?filter2?function(){return filter1.apply(this,arguments)&&filter2.apply(this,arguments)}:filter1:filter2}function readGlobalSchema(){db.verno=idbdb.version/10;db._dbSchema=globalSchema={};dbStoreNames=slice(idbdb.objectStoreNames,0);if(dbStoreNames.length===0)return;var trans=idbdb.transaction(safariMultiStoreFix(dbStoreNames),"readonly");dbStoreNames.forEach(function(storeName){var store=trans.objectStore(storeName),keyPath=store.keyPath,dotted=keyPath&&typeof keyPath==="string"&&keyPath.indexOf(".")!==-1;var primKey=new IndexSpec(keyPath,keyPath||"",false,false,!!store.autoIncrement,keyPath&&typeof keyPath!=="string",dotted);var indexes=[];for(var j=0;j<store.indexNames.length;++j){var idbindex=store.index(store.indexNames[j]);keyPath=idbindex.keyPath;dotted=keyPath&&typeof keyPath==="string"&&keyPath.indexOf(".")!==-1;var index=new IndexSpec(idbindex.name,keyPath,!!idbindex.unique,!!idbindex.multiEntry,false,keyPath&&typeof keyPath!=="string",dotted);indexes.push(index)}globalSchema[storeName]=new TableSchema(storeName,primKey,indexes,{})});setApiOnPlace([allTables],keys(globalSchema),globalSchema)}function adjustToExistingIndexNames(schema,idbtrans){var storeNames=idbtrans.db.objectStoreNames;for(var i=0;i<storeNames.length;++i){var storeName=storeNames[i];var store=idbtrans.objectStore(storeName);hasGetAll="getAll"in store;for(var j=0;j<store.indexNames.length;++j){var indexName=store.indexNames[j];var keyPath=store.index(indexName).keyPath;var dexieName=typeof keyPath==="string"?keyPath:"["+slice(keyPath).join("+")+"]";if(schema[storeName]){var indexSpec=schema[storeName].idxByName[dexieName];if(indexSpec)indexSpec.name=indexName}}}if(/Safari/.test(navigator.userAgent)&&!/(Chrome\/|Edge\/)/.test(navigator.userAgent)&&_global.WorkerGlobalScope&&_global instanceof _global.WorkerGlobalScope&&[].concat(navigator.userAgent.match(/Safari\/(\d*)/))[1]<604){hasGetAll=false}}function fireOnBlocked(ev){db.on("blocked").fire(ev);connections.filter(function(c){return c.name===db.name&&c!==db&&!c._vcFired}).map(function(c){return c.on("versionchange").fire(ev)})}extend(this,{Collection:Collection,Table:Table,Transaction:Transaction,Version:Version,WhereClause:WhereClause});init();addons.forEach(function(fn){fn(db)})}function parseType(type){if(typeof type==="function"){return new type}else if(isArray(type)){return[parseType(type[0])]}else if(type&&typeof type==="object"){var rv={};applyStructure(rv,type);return rv}else{return type}}function applyStructure(obj,structure){keys(structure).forEach(function(member){var value=parseType(structure[member]);obj[member]=value});return obj}function hookedEventSuccessHandler(resolve){return wrap(function(event){var req=event.target,ctx=req._hookCtx,result=ctx.value||req.result,hookSuccessHandler=ctx&&ctx.onsuccess;hookSuccessHandler&&hookSuccessHandler(result);resolve&&resolve(result)},resolve)}function eventRejectHandler(reject){return wrap(function(event){preventDefault(event);reject(event.target.error);return false})}function eventSuccessHandler(resolve){return wrap(function(event){resolve(event.target.result)})}function hookedEventRejectHandler(reject){return wrap(function(event){var req=event.target,err=req.error,ctx=req._hookCtx,hookErrorHandler=ctx&&ctx.onerror;hookErrorHandler&&hookErrorHandler(err);preventDefault(event);reject(err);return false})}function preventDefault(event){if(event.stopPropagation)event.stopPropagation();if(event.preventDefault)event.preventDefault()}function awaitIterator(iterator){var callNext=function(result){return iterator.next(result)},doThrow=function(error){return iterator.throw(error)},onSuccess=step(callNext),onError=step(doThrow);function step(getNext){return function(val){var next=getNext(val),value=next.value;return next.done?value:!value||typeof value.then!=="function"?isArray(value)?Promise.all(value).then(onSuccess,onError):onSuccess(value):value.then(onSuccess,onError)}}return step(callNext)()}function IndexSpec(name,keyPath,unique,multi,auto,compound,dotted){this.name=name;this.keyPath=keyPath;this.unique=unique;this.multi=multi;this.auto=auto;this.compound=compound;this.dotted=dotted;var keyPathSrc=typeof keyPath==="string"?keyPath:keyPath&&"["+[].join.call(keyPath,"+")+"]";this.src=(unique?"&":"")+(multi?"*":"")+(auto?"++":"")+keyPathSrc}function TableSchema(name,primKey,indexes,instanceTemplate){this.name=name;this.primKey=primKey||new IndexSpec;this.indexes=indexes||[new IndexSpec];this.instanceTemplate=instanceTemplate;this.mappedClass=null;this.idxByName=arrayToObject(indexes,function(index){return[index.name,index]})}function safariMultiStoreFix(storeNames){return storeNames.length===1?storeNames[0]:storeNames}function getNativeGetDatabaseNamesFn(indexedDB){var fn=indexedDB&&(indexedDB.getDatabaseNames||indexedDB.webkitGetDatabaseNames);return fn&&fn.bind(indexedDB)}props(Dexie,fullNameExceptions);props(Dexie,{delete:function(databaseName){var db=new Dexie(databaseName),promise=db.delete();promise.onblocked=function(fn){db.on("blocked",fn);return this};return promise},exists:function(name){return new Dexie(name).open().then(function(db){db.close();return true}).catch(Dexie.NoSuchDatabaseError,function(){return false})},getDatabaseNames:function(cb){var getDatabaseNames=getNativeGetDatabaseNamesFn(Dexie.dependencies.indexedDB);return getDatabaseNames?new Promise(function(resolve,reject){var req=getDatabaseNames();req.onsuccess=function(event){resolve(slice(event.target.result,0))};req.onerror=eventRejectHandler(reject)}).then(cb):dbNamesDB.dbnames.toCollection().primaryKeys(cb)},defineClass:function(){function Class(properties){if(properties)extend(this,properties)}return Class},applyStructure:applyStructure,ignoreTransaction:function(scopeFunc){return PSD.trans?usePSD(PSD.transless,scopeFunc):scopeFunc()},vip:function(fn){return newScope(function(){PSD.letThrough=true;return fn()})},async:function(generatorFn){return function(){try{var rv=awaitIterator(generatorFn.apply(this,arguments));if(!rv||typeof rv.then!=="function")return Promise.resolve(rv);return rv}catch(e){return rejection(e)}}},spawn:function(generatorFn,args,thiz){try{var rv=awaitIterator(generatorFn.apply(thiz,args||[]));if(!rv||typeof rv.then!=="function")return Promise.resolve(rv);return rv}catch(e){return rejection(e)}},currentTransaction:{get:function(){return PSD.trans||null}},waitFor:function(promiseOrFunction,optionalTimeout){var promise=Promise.resolve(typeof promiseOrFunction==="function"?Dexie.ignoreTransaction(promiseOrFunction):promiseOrFunction).timeout(optionalTimeout||6e4);return PSD.trans?PSD.trans.waitFor(promise):promise},Promise:Promise,debug:{get:function(){return debug},set:function(value){setDebug(value,value==="dexie"?function(){return true}:dexieStackFrameFilter)}},derive:derive,extend:extend,props:props,override:override,Events:Events,getByKeyPath:getByKeyPath,setByKeyPath:setByKeyPath,delByKeyPath:delByKeyPath,shallowClone:shallowClone,deepClone:deepClone,getObjectDiff:getObjectDiff,asap:asap,maxKey:maxKey,minKey:minKey,addons:[],connections:connections,MultiModifyError:exceptions.Modify,errnames:errnames,IndexSpec:IndexSpec,TableSchema:TableSchema,dependencies:function(){try{return{indexedDB:_global.indexedDB||_global.mozIndexedDB||_global.webkitIndexedDB||_global.msIndexedDB,IDBKeyRange:_global.IDBKeyRange||_global.webkitIDBKeyRange}}catch(e){return{indexedDB:null,IDBKeyRange:null}}}(),semVer:DEXIE_VERSION,version:DEXIE_VERSION.split(".").map(function(n){return parseInt(n)}).reduce(function(p,c,i){return p+c/Math.pow(10,i*2)}),default:Dexie,Dexie:Dexie});Promise.rejectionMapper=mapError;dbNamesDB=new Dexie("__dbnames");dbNamesDB.version(1).stores({dbnames:"name"});(function(){var DBNAMES="Dexie.DatabaseNames";try{if(typeof localStorage!==undefined&&_global.document!==undefined){JSON.parse(localStorage.getItem(DBNAMES)||"[]").forEach(function(name){return dbNamesDB.dbnames.put({name:name}).catch(nop)});localStorage.removeItem(DBNAMES)}}catch(_e){}})();export default Dexie;

(Db.db.tables || []).forEach(table =>
	Object.defineProperty(Db, table.name, {
		configurable: true,
		enumerable: true,
		get: () => Db.db[table.name],
		set: (newValue) => console.log(`${table.name} cannot be set`),
		writeable: false
	})
);

if (window) {
	window.gvp = window.gvp || {};
	window.gvp.Db = Db;
}
