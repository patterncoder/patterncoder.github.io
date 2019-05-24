class PhotoBrowser extends HTMLElement {
	constructor(mode) {
		super();
		this._rootElement = this.attachShadow({ mode: 'open' });
		this._rootElement.innerHTML = `
			<style type="text/css">
				.content {
					display: flex;
					flex-direction: column;
					height: 100%;
					width: 100%;
				}

				.filters-container {
					display: flex;
					flex: none;
					flex-direction: column;
					height: 1.5em;
					min-height: 42px;
					overflow-y: scroll;
				}
				.filters-container.expanded {
					flex: 2 1;
					height: auto;
				}
				.filters-container .header {
					cursor: pointer;
					display: flex;
					flex: none;
					flex-direction: row;
					height: 42px;
				}
				.filters-container .header > * {
					cursor: pointer;
					flex: 1;
					text-align: center;
				}
				.filters-container .header > *:first-child {
					flex: none;
				}
				.filters-container .header > *:last-child {
					flex: none;
				}
				.filters-container .filters {
					flex: 1;
					overflow-y: scroll;
				}
				.filter {
					float: left;
					padding: .5em;
				}
				.filter-label {
					display: block;
					font-family: monospace;
					margin-bottom: .5em;
					text-transform: uppercase;
				}
				.filter-item {
					display: block;
				}

				.photos {
					flex: 1 2;
					overflow-y: scroll;
				}
				.photos .image {
					background-position: 50% 50%;
					background-repeat: no-repeat;
					background-size: cover;
					cursor: pointer;
					display: inline-block;
					height: 100px;
					width: 100px;
				}
				.photo {
					background-color: white;
					display: flex;
					flex-direction: column;
					height: 100%;
					left: 0;
					position: fixed;
					top: 0;
					width: 100%;
					z-index: 2;
				}
				.photo.hidden {
					display: none;
					text-align: center;
				}
				.photo header {
					flex: 0;
					margin: .5em;
				}
				.photo article {
					display: flex;
					flex: 1;
					flex-direction: column;
					text-align: center;
					overflow-y: scroll;
				}
				.photo article img {
					flex: 1;
					max-height: 100%;
					max-width: 100%;
					object-fit: contain;
					object-position: 50% 0;
				}
			</style>
			<div class="content">
				<div class="filters-container">
					<div class="header">
						<span class="title">Photo Browser</span>
						<span class="filter-status">
							<span class="num-filters">0</span>
							filters
						</span>
						<span>
							<button role="search">Apply Changes</button>
						</span>
					</div>
					<div class="filters"></div>
				</div>
				<div class="photos">
					<header>
				</div>
				<div class="photo hidden">
					<header>
						<button role="back">Back</button>
					</header>
					<article>
						<img />
					</article>
				</div>
			</div>
		`;
		this._contentElement = this._rootElement.querySelector('.content');
		this._filtersContainerElement = this._contentElement.querySelector('.filters-container');
		this._filtersHeaderElement = this._filtersContainerElement.querySelector('.header');
		this._filtersHeaderElement.querySelector('.filter-status').addEventListener('click', this.filtersHideShow.bind(this));
		this._filtersHeaderElement.querySelector('.title').addEventListener('click', this.filtersHideShow.bind(this));
		this._filtersHeaderElement.querySelector('button[role="search"]').addEventListener('click', () => {
			this._filtersContainerElement.classList.remove('expanded');
			this.getPhotos();
		});
		this._filtersElement = this._filtersContainerElement.querySelector('.filters');
		this._photosElement = this._contentElement.querySelector('.photos');
		this._photoElement = this._contentElement.querySelector('.photo');
		this._photoImageElement = this._photoElement.querySelector('img');
		this._photoElement.querySelector('button[role="back"]').addEventListener(
			'click', () => this._photoElement.classList.toggle('hidden')
		);
	}

	connectedCallback() {
		this.render();
	}

	static get observedAttributes() {
		return [ 'maxHeight' ];
	}

	attributeChangedCallback(name, oldValue, newValue, namespaceURI) {
		this.render();
	}

	get filters() {
		return this._filters || [];
	}
	set filters(newValue) {
		this._filters = newValue;
		this.renderFilters();
		this.getPhotos();
	}
	get maxHeight() {
		return this.getAttribute('max-height');
	}
	get photo() {
		return this._photo;
	}
	set photo(newValue) {
		this._photo = newValue;
		this.renderPhoto();
	}
	get photos() {
		return this._photos || [];
	}
	set photos(newValue) {
		this._photos = newValue;
		this.renderPhotos();
	}

	filtersHideShow() {
		this._filtersContainerElement.classList.toggle('expanded');
	}

	getPhotos() {
		this.raiseEvent('getPhotos', this.selectedFilters());
	}

	raiseEvent(event, detail) {
		this.dispatchEvent(new CustomEvent(event, { detail: detail }));
	}

	render() {
		this.renderFilters();
		this.renderPhotos();
		this._contentElement.style.maxHeight = (this.maxHeight + 'px').replace('pxpx', 'px');
	}

	renderFilters() {
		this._filtersElement.innerHTML = `
			${this.filters.map((filter) => `
				<div class="filter" name="${filter.name}">
					<label class="filter-label">${filter.label}</label>
					${filter.items.map((item) => `
						<label class="filter-item">
							<input type="checkbox" value="${item.value}" ${item.selected ? 'checked' : ''} />
							${item.label}
						</label>
					`).join('\n')}
				</div>
			`).join('\n')}
		`;
		let updateNumFilters = () =>
			this._filtersHeaderElement.querySelector('.filter-status .num-filters')
				.innerHTML = this.selectedFilters()
					.reduce((total, filter) => total + filter.values.length, 0);
		Array.from(this._filtersElement.querySelectorAll('.filter input[type="checkbox"]')).map(
			(checkbox) => checkbox.addEventListener('click', updateNumFilters)
		);
		updateNumFilters();
	}

	renderPhoto() {
		this._photoImageElement.src = this.photo.imageUrl;
		this._photoImageElement.title = this.photo.label;
		this._photoElement.classList.toggle('hidden');
	}

	renderPhotos() {
		this._photosElement.innerHTML = `
			${this.photos.map((photo) =>
				`<div
					class="image"
					style="background-image:url('${photo.imageUrl}')"
					data-image="${photo.imageUrl}"
				></div>`
			).join('\n')}
		`;
		Array.from(this._photosElement.querySelectorAll('.image')).forEach(
			(el, index) => el.addEventListener('click', () => this.photo = this.photos[index])
		);
	}

	selectedFilters() {
		return Array.from(this._filtersElement.querySelectorAll('.filter'))
			.map((filterElement) => {
				return {
					name: filterElement.getAttribute('name'),
					values: Array.from(filterElement.querySelectorAll('input:checked'))
						.map((checkbox) => checkbox.value)
				};
			});
	}
}

customElements.define('gvp-photo-browser', PhotoBrowser);
