import { Api } from './api.js'
import { App } from './app.js'
import { CustomObject } from './customObject.js'
import { Editor } from './editor.js'
import { Geolocation } from './geolocation.js'
import { Header } from './header.js'
import { Icons } from './icons.js'
import { Nav } from './nav.js'

class Map extends CustomObject {
	static map(options) {
		return this.visualforceMap(options);
	}

	static staticMap(options) {
		options = options || {};
		const positionString = position => {
			if (Geolocation.valid(position)) {
				return [ position.latitude, position.longitude ].join(',');
			} else {
				return '';
			}
		};
		const paramString = (params, separators) => {
			separators = separators || [ '=', '&' ];
			return Object.keys(params || {})
				.filter(param => params[param])
				.map(param => [ param, encodeURIComponent(params[param]) ].join(separators[0]))
				.join(separators[1]);
		};
		const mapParams = {
			center: positionString(options.center),
			format: options.format,
			scale: options.scale,
			size: options.size || (App.isSmallScreen ? '340x240' : '992x360'),
			zoom: options.zoom
		};
		let mapUrl = `https://maps.googleapis.com/maps/api/staticmap?${paramString(mapParams)}`;
		const markers = (options.markers || []).concat(
			(options.objects || []).filter(o =>
				(o.BillingLatitude || o.gvp__Geolocation__Latitude__s) && (o.BillingLongitude || o.gvp__Geolocation__Longitude__s)
			)
			.map(o => Object.assign({
				position: {
					latitude: o.BillingLatitude || o.gvp__Geolocation__Latitude__s,
					longitude: o.BillingLongitude || o.gvp__Geolocation__Longitude__s
				}
			}))
		);
		if (markers.length > 0) {
			mapUrl += '&' + markers.map((marker, index) => {
				return paramString({
					markers: [
						paramString({
							color: marker.color || '0x006EB3',
							label: marker.label || index
						}, [ ':', '|' ]),
						positionString(marker.position)
					].join('|')
				});
			}).join('&');
		}
		return `<img class="map" src="${mapUrl}" />`;
	}

	static async visualforceMap(options) {
		Map.trackPageview('/VisualForce Map');
		options = options || {};
		let center = Geolocation.valid(options.center) ? JSON.stringify({
			latitude: options.center.latitude,
			longitude: options.center.longitude
		}) : '';
		let height = App.isSmallScreen ? 240 : 360;
		let width = App.isSmallScreen ? 340 : 992;
		let zoom = options.zoom || 13;
		let mapUrl = await App.secureUrl(
			`/apex/GoogleMapsMobileSearch?center=${center}&height=${height}px&width=${width}px&zoom=${zoom}&markers=${
				encodeURIComponent((options.markers || []).map(m => [
					[
						m.label,
						JSON.stringify({
							latitude: m.position.latitude,
							longitude: m.position.longitude
						})
					].join('|')
				])
					.concat((options.objects || []).map(o => [
						o.Name,
						JSON.stringify({
							latitude: o.BillingLatitude || o.gvp__Geolocation__Latitude__s,
							longitude: o.BillingLongitude || o.gvp__Geolocation__Longitude__s
						})
					].join('|'))).join('||')
				)
			}`
		);
		return `<iframe frameborder="0" class="map" height="${height}" width="${width}" src="${mapUrl}" scrolling="no"></iframe>`;
	}
}

export class AccountsNearby extends CustomObject {
	constructor(options) {
		super(options);
		this.header = new Header({
			buttons: [],
			breadcrumbs: this.breadcrumbs || [],
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
				url: `${Map.getSymbols('custom')}#custom78`
			},
			menu: [],
			title: this.title || 'Accounts Nearby'
		});
		this.nav = this.nav || new Nav(this.element, { header: this.header });
		this.element = document.createElement('div');
		Api.labels().then(labels => {
			CustomObject.labels = labels;
			this.nav.replace(this.render(), Object.assign(this.header, {
				buttons: (this.nav.views.length > 1) ? [{ label: 'Back', value: 'back' }] : []
			}));
			this.refresh();
		});
	}

	bindEvents() {
		this.bind('.slds-tile', 'click', (event, index) => new Editor({
			element: this.nav.push(document.createElement('div'), { breadcrumbs: [] }),
			nav: this.nav,
			record: { Id: this.results[index].Id },
			type: 'Account'
		}));
		this.bind('.slds-dropdown-trigger_click', 'click', event => {
			event.preventDefault();
			event.stopPropagation();
			event.currentTarget.classList.toggle('slds-is-open');
		});
		this.bind('.menuitem-nearby-directions[role=menuitem]', 'click', event => {
			let latitude = event.currentTarget.getAttribute('data-latitude');
			let longitude = event.currentTarget.getAttribute('data-longitude');
			let url = `https://maps.google.com?saddr=${
				encodeURIComponent(`${this.currentLocation.latitude},${this.currentLocation.longitude}`)
			}&daddr=${
				encodeURIComponent(`${latitude},${longitude}`)
			}`;
			window.open(url, '_blank');
		});
	}

	async refresh() {
		AccountsNearby.trackPageview('/Accounts Nearby');
		try {
			let results = (await Geolocation.search({
				location: this.currentLocation = this.currentLocation || (await Geolocation.current()),
				maxDistance: 100
			})).filter(result => !(
				((result.BillingLatitude || result.gvp__Geolocation__Latitude__s) === this.currentLocation.latitude) &&
				((result.BillingLongitude || result.gvp__Geolocation__Longitude__s) === this.currentLocation.longitude)
			));
			this.render({
				map: await Map.map({
					center: this.currentLocation,
					markers: [{
						color: '0xC3272F',
						label: this.title || '*',
						position: this.currentLocation
					}],
					objects: results,
					zoom: 15
				}),
				results: results
			});
		} catch(error) {
			this.render({ error: error });
		}
	}

	render(options) {
		options = options || {};
		let error = options.error;
		let results = this.results = options.results;
		this.element.innerHTML = `
			<style>
				iframe.map, img.map {
					border: 0;
					margin-bottom: 1rem;
				}
				article.slds-tile {
					background-color: ${App.secondaryColor};
					border: 1px solid #dddbda;
					border-radius: .25rem;
					cursor: pointer;
					float: left;
					margin: 0 .5rem .5rem 0 !important;
					padding: 1em;
					width: 32%;
				}
				@media (max-width: 64em) {
					article.slds-tile {
						width: 48%;
					}
				}
				@media (max-width: 48em) {
					article.slds-tile {
						width: 96%;
					}
				}
			</style>
			<div class="accounts-nearby slds-scope slds-m-around_medium">
				${error ? this.getLabel('No_Position_Obtained') : results ?
					((results.length > 0) ? `
						${options.map || ''}
						${results.map((account, index) => `
							<article class="slds-tile slds-media slds-card__tile slds-hint-parent">
								<div class="slds-media__figure">
									<span class="slds-icon_container ${Icons.icon('Account').cssClass}" title="Description of icon when needed">
										<svg class="slds-icon slds-icon_small" aria-hidden="true">
											<use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="${Icons.icon('Account').url}" />
										</svg>
										<span class="slds-assistive-text">${account.Name} ${account.Distance.toFixed(1)} miles</span>
									</span>
								</div>
								<div class="slds-media__body">
									<div class="slds-grid slds-grid_align-spread slds-has-flexi-truncate">
										<h3 class="slds-tile__title slds-truncate">
											<a	data-record-id="${account.Id}"
												href="javascript:void(0);"
												title="${account.BillingLatitude || account.gvp__Geolocation__Latitude__s},${account.BillingLongitude || account.gvp__Geolocation__Longitude__s}"
											>${account.Name}</a> - ${account.Distance.toFixed(1)}mi
										</h3>
										<div class="slds-shrink-none slds-dropdown-trigger slds-dropdown-trigger_click">
											<button class="slds-button slds-button_icon slds-button_icon-border-filled slds-button_icon-x-small" aria-haspopup="true" title="More options">
												<svg class="slds-button__icon slds-button__icon_hint" aria-hidden="true">
													<use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="${AccountsNearby.symbols}#down" />
												</svg>
												<span class="slds-assistive-text">More options</span>
											</button>
											<div class="slds-dropdown slds-dropdown_right">
												<ul class="slds-dropdown__list" role="menu">
													<li class="slds-dropdown__item" role="presentation">
														<a 	class="menuitem-nearby-directions"
															data-latitude="${account.BillingLatitude || account.gvp__Geolocation__Latitude__s}"
															data-longitude="${account.BillingLongitude || account.gvp__Geolocation__Longitude__s}"
															href="javascript:void(0);"
															role="menuitem"
															tabindex="0"
														>
															<span class="slds-truncate" title="Directions">Directions</span>
														</a>
													</li>
												</ul>
											</div>
										</div>
									</div>
									<div class="slds-tile__detail">
										<dl class="slds-list_horizontal slds-wrap">
											<dd class="slds-item_detail slds-truncate">${account.BillingStreet || '-'}</dd>
										</dl>
										<dl class="slds-list_horizontal slds-wrap">
											<dd class="slds-item_detail slds-truncate">
												${account.BillingCity || '-'},
												&nbsp;${account.BillingState || '-'}
												&nbsp;${account.BillingPostalCode || '-'}
											</dd>
										</dl>
										<dl class="slds-list_horizontal slds-wrap">
											<dd class="slds-item_detail slds-truncate">${account.Phone || '-'}</dd>
										</dl>
									</div>
								</div>
							</article>
						`).join('\n')}

					` : this.getLabel('No_Records')) :
					this.getLabel('Geo_Search_Message')
				}
			</div>
		`;
		this.bindEvents();
		return this.element;
	}
}
