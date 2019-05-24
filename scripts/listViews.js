import { Api } from './api.js'
import { App } from './app.js'
import { CustomList } from './customList.js'
import { CustomObject } from './customObject.js'
import { Db } from './db.js'
import { Header } from './header.js'
import { List } from './list.js'
import { ListView } from './listView.js'
import { Nav } from './nav.js'
import { Tabs } from './tabs.js'

export class ListViews extends CustomList {
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
			icon: {
				cssClass: 'slds-icon-standard-account',
				url: `${ListViews.getSymbols('custom')}#custom62`
			},
			menu: [],
			title: 'My Lists'
		});
		this.nav = this.nav || new Nav(this.element, { header: this.header });
		this.element = document.createElement('div');
		Api.labels().then(labels => {
			CustomObject.labels = labels;
			this.nav.replace(this.render(), Object.assign(this.header, {
				buttons: (this.nav.views.length > 1) ? [{ label: 'Back', value: 'back' }] : [],
				title: this.getLabel('My_Lists')
			}));
			this.refresh();
		});
	}

	activate(item) {
		this.items.forEach(item => item.active = false);
		item.active = true;
		this.updateTabs();
		let activeListView = this.element.querySelector('.listviews > div.active')
		if (activeListView) {
			activeListView.classList.remove('active');
		}
		this.element.querySelector(`.listviews > div[data-item="${item.number}"]`).classList.add('active');
		item.listViewSelect.value = item.listViewSelect.value || item.listViewSelect.items[0];
		item.listViewSelect.render();
	}

	bindEvents() {
	}

	async preCache() {
		for (let item of this.items) {
			console.log("Precaching ListViews for " + item.name);
			try {
				for (let listView of item.listViews) {
					await ListView.preCache({ listView: listView });
				}
			} catch (error) {
				console.log(error);
			}
		}
	}

	async refresh() {
		for (let item of this.items) {
			item.number = this.items.indexOf(item);
			if (!item.description) {
				try {
					item.description = await Api.describe(item.name);
				} catch(error) {}
				if (item.description && item.description.queryable) {
					this.render();
				} else {
					this.items.splice(item.number, 1);
					return this.refresh();
				}
			}
		}
		for (let item of this.items) {
			item.listViews = [];
			if (item.favorites) {
				item.favorites.forEach(fav => item.listViews.push({ id: fav.target, label: fav.name, mru: fav.target === fav.objectType }));
			} else {
				try {
					let result;
					while (!(result && result.done)) {
						result = await Api.request(result ? result.nextRecordsUrl : `/sobjects/${item.name}/listviews`);
						item.listViews.push(...((result && result.listviews) || []));
					}
				} catch(error) {
					console.log(error);
				}
				item.listViews.sort((v1, v2) => v1.label.localeCompare(v2.label));
			}
		}
		this.render();
		if ((this.items.length > 0) && this.items.filter(item => item.active).length === 0) {
			this.activate(this.items[0]);
		}
	}

	refreshActiveListView() {
		let item = this.items.filter(item => item.active)[0];
		if (!item) {
			return;
		}
		let list = item.listViewSelect;
		if (!(list && list.handler)) {
			return;
		}
		list.handler('valueChange', list);
	}

	render() {
		this.element.classList.add('slds-scope');
		this.element.innerHTML = `
			<style>
				.listviews div[data-item] {
					display: none;
				}
				.listviews div[data-item].active {
					display: block;
				}
			</style>
			<div class="tabs"></div>
			<div class="listviews">
				${this.items.map((item, index) => `
					<div class="${item.active ? 'active' : ''}" data-item="${item.number}">
						<div class="views"></div>
						<div class="view"></div>
					</div>
				`).join('\n')}
			</div>
		`;
		this.items.forEach(item => {
			let listViews = (item.listViews || []).map(view => Object.assign({
				id: view.id,
				label: view.label,
				value: view.id,
				type: item.description.name,
				mru: view.mru
			}));
			let listViewSelect = new List({
				clearable: false,
				collapsed: true,
				collapsible: true,
				element: this.element.querySelector(`div[data-item="${item.number}"] div.views`),
				handler: (event, list) => {
					switch(event) {
						case 'valueChange':
							if (list && list.value) {
								item.listView = new ListView({
									description: item.description,
									element: this.element.querySelector(`div[data-item="${item.number}"] div.view`),
									id: list.value.id,
									label: list.value.label,
									nav: this.nav,
									type: list.value.type,
									mru: list.value.mru
								});
								this.updateRecentLists(item);
							}
							break;
					}
				},
				items: listViews,
				placeholder: item.description && item.description.labelPlural,
			});
			item.listViewSelect = listViewSelect;
		});
		this.updateTabs();
		this.bindEvents();
		return this.element;
	}

	async updateRecentLists(item) {
		if (!item.active || (typeof(Db) === 'undefined')) {
			return;
		}
		let recentListsAndSearches = [{
			id: item.listView.id,
			label: item.listView.label,
			type: item.listView.type
		}].concat(
			((await Db._meta.get('_recentListsAndSearches') || {}).recentListsAndSearches || [])
				.filter(recent => recent.id !== item.listView.id)
		).slice(0, 10);
		await Db.update(Db._meta, { key: '_recentListsAndSearches', recentListsAndSearches: recentListsAndSearches });
		if (typeof(App) !== 'undefined') {
			App.globalNav.header.updateRecentLists();
		}
	}

	updateTabs() {
		this.tabs = new Tabs({
			element: this.element.querySelector('.tabs'),
			handler: (event, tab) => this.activate(tab.item),
			tabs: this.items.map(item => Object.assign({
				item: item,
				label: (item && item.description && item.description.labelPlural) || '',
				name: item.number,
				selected: item.active
			}))
		});
	}
}
