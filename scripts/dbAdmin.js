
import { Api } from './api.js'
import { CustomObject } from './customObject.js'
import { Db } from './db.js'

// handles ability to manage local database
// customer specific and not used anymore
export class DbAdmin extends CustomObject {
	constructor(options) {
		super(options);
		this.init();
	}

	bindEvents() {
		this.bind('.sync-now button', 'click', event => {
			this.spinner();
			Db.syncUnsyncedRecords().then(this.refresh.bind(this));
		});
	}

	async init() {
		this.element = this.element || document.body;
		await this.refresh();
	}

	async refresh() {
		this.spinner();
		let unsyncedRecords = await Db.unsyncedRecords();
		this.unsyncedRecords = [];
		for (let record of unsyncedRecords) {
			let group = this.unsyncedRecords.find(group => group.type === record.type);
			if (!group) {
				this.unsyncedRecords.push(group = {
					name: (await Api.describe(record.type)).labelPlural,
					type: record.type,
					records: []
				});
			}
			group.records.push(record.record);
		}
		this.unsyncedRecords.sort((a, b) => a.name.localeCompare(b.name));
		this.unsyncedRecordsCount = this.unsyncedRecords.reduce((count, type) => count + type.records.length, 0);
		this.render();
	}

	render() {
		this.element.innerHTML = `
			<style>
				.db-admin {
					margin: 1em;
					padding: 1em;
				}
				.db-admin .sync-now {
					font-size: larger;
					font-weight: bold;
					margin-bottom: 1em;
				}
				.db-admin ul {
					padding: 1em;
				}
			</style>
			<div class="db-admin">
				<h3 class="slds-text-heading--large">Db Admin</h3>
				<hr />
				${this.unsyncedRecordsCount ? `
					<div class="sync-now">
						<button>Sync Now</button>
					</div>
				` : ''}
				Unsynced Records: ${this.unsyncedRecordsCount}
				<ul>
					${this.unsyncedRecords.map(type => `
						<li>${type.name}: ${type.records.length}</li>
					`).join('\n')}
				<ul>
			</div>
		`;
		this.bindEvents();
	}
}
