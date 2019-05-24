import { Api } from './api.js'
import { App } from './app.js'
import { Db } from './db.js'

export class Log {
	static get deviceLogId() {
		return this.user.then(user => `${navigator.platform || 'unknown'}-${(user && user.Id) || ''}`);
	}
	static get deviceModel() {
		return navigator.platform;
	}
	static get deviceName() {
		return navigator.platform;
	}
	static get severities() {
		return ['debug', 'info', 'notice', 'warn', 'error'];
	}
	static get user() {
		return Api.user();
	}

	static async log(log) {
		if ([undefined, null].includes(log)) {
			return;
		}
		let user = await this.user;
		let logLevel = (user && user.gvp__Log_Level__c) || 'info';
		if (this.severities.indexOf(logLevel) > this.severities.indexOf(log.severity || 'debug')) {
			return;
		}
		let details = {};
		try {
			details = JSON.stringify(log) || {};
		} catch(error) {
			details = {};
			console.log(error);
		}
		log = {
			gvp__Details__c: details,
			gvp__Details_Searchable__c: details && details.substring(0, 255),
			gvp__Event__c: log.event,
			gvp__Location__c: log.location,
			gvp__Logged__c: new Date().toISOString(),
			gvp__Metrics__c: JSON.stringify(log.metrics),
			gvp__Raw__c: details,
			gvp__Raw_Searchable__c: details && details.substring(0, 255),
			gvp__Severity__c: log.severity || 'debug',
			gvp__SID__c: log.sid,
			gvp__Tags__c: JSON.stringify(log.tags),
			gvp__User_Log__c: await this.userLog()
		};
		return log.gvp__User_log__c ? this.save(log, 'gvp__Mobile_Error__c', true) : null;
	}

	static async save(record, type, sync) {
		if (typeof(Db) !== 'undefined') {
			try {
				let dbSaveResult = await Db.save(type, record);
				if (sync && navigator.onLine) {
					await Db.syncUnsyncedRecords({ tables: [Db[type]] });
				}
				return dbSaveResult;
			} catch(error) {
				console.log(error);
			}
		}
		if (navigator.onLine) {
			try {
				return Api.save(record, type);
			} catch(error) {
				console.log(error);
			}
		}
	}

	static async summary(log) {
		if ([undefined, null].includes(log)) {
			return;
		}
		log.gvp__User_Log__c = await this.userLog();
		let summary;
		if (typeof(Db) !== 'undefined') {
			try {
				summary = (await Db.gvp__Mobile_Summary__c
					.where('gvp__Model__c')
					.equals(log.gvp__Model__c)
					.and(summary => summary.gvp__User_Log__c === log.gvp__User_Log__c)
					.first()
				);
			} catch(error) {
				console.log(error);
			}
		}
		if (!summary && navigator.onLine) {
			let response = await Api.query(`
				Select Id
				From gvp__Mobile_Summary__c
				Where (gvp__Model__c = '${log.gvp__Model__c}')
				And (gvp__User_Log__c = '${log.gvp__User_Log__c}')
				Order By LastModifiedDate Desc
				Limit 1
			`);
			summary = ((response && response.records) || [])[0];
		}
		Object.assign((summary = summary || {}), log);
		return log.gvp__User_Log__c ? this.save(summary, 'gvp__Mobile_Summary__c', false) : null;
	}

	static async userLog(log) {
		if (this.fetchingUserLog) {
			return new Promise(resolve => setTimeout(() => this.userLog(log).then(resolve), 100));
		} else {
			this.fetchingUserLog = true;
		}
		let deviceLogId = await this.deviceLogId;
		let user = await this.user;
		if (!(deviceLogId && user)) {
			this.fetchingUserLog = false;
			return;
		}
		let userLog;
		if (typeof(Db) !== 'undefined') {
			try {
				userLog = (await Db.gvp__User_Log__c
					.where('gvp__Device_Log_Id__c')
					.equals(deviceLogId)
					.reverse()
					.sortBy('LastModifiedDate'))[0];
			} catch(error) {
				console.log(error);
			}
		}
		if (!userLog && navigator.onLine) {
			let response = await Api.query(`
				Select Id
				From gvp__User_Log__c
				Where gvp__Device_Log_Id__c Like '${deviceLogId}'
				Order By LastModifiedDate Desc
				Limit 1
			`);
			userLog = ((response && response.records) || [])[0];
		}
		userLog = Object.assign((userLog || {
			gvp__Device_Log_Id__c: deviceLogId,
			gvp__User__c: user.Id
		}), {
			gvp__Device_Model__c: this.deviceModel,
			gvp__Device_Name__c: this.deviceName,
			gvp__GV_Mobile_Last_Full_Sync__c: (typeof(Db) !== 'undefined') ? (await Db.lastSynced).toISOString() : null,
			gvp__GV_Mobile_Version__c: App.version
		}, (log || {}));
		let saveResult;
		try {
			saveResult = await this.save(userLog, 'gvp__User_Log__c', log);
		} catch(error) {
			console.log(error);
		}
		let userLogId = (saveResult && saveResult[0] && (saveResult[0].Id || saveResult[0].id)) || userLog.Id;
		this.fetchingUserLog = false;
		return userLogId;
	}
}
