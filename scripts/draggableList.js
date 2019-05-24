import { CustomList } from './customList.js'
import { Icons } from './icons.js'

// used in sales sequence editor
export class DraggableList extends CustomList {
	static get nextId() {
		this._idCounter = (this._idCounter || 0) + 1;
		return `_${Date.now()}-${`0000${this._idCounter.toString(36)}`.slice(-3)}`;
	}

	static get properties() {
		return CustomList.properties.concat(['type']);
	}

	get type() {
		return this._type || 'object';
	}
	set type(type) {
		this._type = type;
	}

	bindEvents() {
		(this.items || []).forEach(item => item.id = item.id || DraggableList.nextId);
		this.bind('ul', 'scroll', event => this.handler && this.handler('scroll', event));
		this.bind('ul li', 'click', (event, index) => this.handler && this.handler('choose', (this.items || [])[index]));
		this.bind('ul, ul li', ['drageenter', 'dragover'], event => {
			event.preventDefault();
			event.dataTransfer.dropEffect = (this.droppable === false) ? 'move' : 'copy';
		});
		this.bind('ul li', 'dragstart', (event, index) => {
			event.dataTransfer.setData(this.type, JSON.stringify(this.lastDraggedItem =  Object.assign({}, (this.items || [])[index], { listId: this.id })));
			event.dataTransfer.effectAllowed = 'all';
			this.dragProxy = event.srcElement.cloneNode(true);
			this.dragProxy.style.position = 'absolute';
			this.dragProxy.style.top = 0;
			this.dragProxy.style.right = 0;
			this.dragProxy.style.zIndex = -1;
			event.srcElement.parentNode.appendChild(this.dragProxy);
			event.dataTransfer.setDragImage(this.dragProxy, 0, 0);
		});
		this.bind('ul li', 'dragend', event => {
			if (!(this.droppable === false) && (event.dataTransfer.dropEffect === 'none')) {
				this.updateItems(this.dragFilter(this.lastDraggedItem));
				if (this.handler) {
					this.handler('remove', this.lastDraggedItem);
				}
			}
			if (this.dragProxy) {
				this.dragProxy.parentNode.removeChild(this.dragProxy);
			}
		});
		this.bind('ul.droppable', 'drop', event => {
			event.stopPropagation();
			this.dropItem();
		});
		this.bind('ul li.droppable', 'drop', (event, index) => {
			event.stopPropagation();
			this.dropItem(index);
		});
		this.bind('ul li.droppable', 'dragenter', (event, index) => {
			event.preventDefault();
			let lastDraggedItemId = this.lastDraggedItem && this.lastDraggedItem.id;
			if (((index === 0) && (this.items[index].draggable === false)) ||
				(this.items[index].id === lastDraggedItemId) ||
				((index > 0) && (this.items[index-1].id === lastDraggedItemId))
			) {
				return this.dropIndicate();
			}
			this.dropIndicate(event.srcElement);
		});
		this.bind('ul', 'dragenter', event => {
			event.preventDefault();
			this.dragCounter = (this.dragCounter || 0) + 1;
		});
		this.bind('ul', 'dragleave', event => {
			event.preventDefault();
			this.dragCounter = this.dragCounter ? this.dragCounter - 1 : 0;
			if (this.dragCounter <= 0) {
				this.dropIndicate();
			}
		});
	}

	dragFilter(draggedItem, items) {
		return (items || this.items || []).filter(item => item.id !== draggedItem.id);
	}

	dropIndicate(el) {
		if (!this.dropIndicator) {
			return;
		}
		let di = this.element.querySelector('.drop-indicator');
		if (!el) {
			return di && this.items.find(item => item.draggable !== false) && di.parentNode.removeChild(di);
		}
		if (!di) {
			di = document.createElement('li');
			di.classList.add('drop-indicator');
			di.innerHTML = this.dropLabel || this.getLabel('Drop_Indicator');
			di.addEventListener('drop', event => {
				event.stopPropagation();
				let index = Array.from(this.element.querySelectorAll('ul li.droppable')).indexOf(di.nextSibling);
				this.dropItem(index);
				di.remove();
			});
		}
		if (el === this.element.querySelector('ul')) {
			el.appendChild(di);
		} else {
			el.parentNode.insertBefore(di, el);
		}
	}

	dropItem(index) {
		index = ([undefined, null].indexOf(index) >= 0) ? -1 : index;
		this.dragCounter = 0;
		let droppedItem = this.droppedItem(event);
		if (!droppedItem) {
			return;
		}
		let items = this.items || [];
		if (index < 0) {
			index = items.length;
		}
		index = Math.max(0, Math.min(items.length, index));
		if ((items[Math.min(items.length-1, index)] || {}).draggable === false) {
			index = (index === 0) ? 1 : (index >= items.length) ? items.length-1 : index;
		}
		let existingItem = this.existingItem(droppedItem);
		this.updateItems(this.dragFilter(droppedItem, items.slice(0, index))
			.concat([droppedItem])
			.concat(this.dragFilter(droppedItem, items.slice(index))));
		if (this.handler) {
			this.handler(existingItem ? 'reorder' : 'drop', droppedItem);
		}
	}

	droppedItem(event) {
		let droppedItem = JSON.parse(event.dataTransfer.getData(this.type));
		if (!droppedItem) {
			return;
		}
		droppedItem.id = (droppedItem.listId !== this.id) ? DraggableList.nextId : droppedItem.id;
		return droppedItem;
	}

	existingItem(draggedItem) {
		return (this.items || []).find(item => item.id === draggedItem.id);
	}

	render() {
		const oldScrollTop = (this.element.querySelector('ul') || {}).scrollTop || 0;
		this.element.id = this.id;
		this.element.classList.add('draggable-list');
		this.element.innerHTML = `
			<style>
				#${this.element.id}.draggable-list {
					background-color: ${this.backgroundColor || 'white'};
				}
				#${this.element.id}.draggable-list ul {
					border: ${(this.border !== false) ? '1px solid' : '0'};
					display: inline-block;
					list-style: none;
					margin: .5em;
					max-height: 100%;
					${(this.draggable !== false) ? `
					min-height: 200px;
					min-width: 300px;
					` : ''}
					overflow: auto;
					padding: ${(this.border !== false) ? '1em' : '1em 0'};
				}
				#${this.element.id}.draggable-list ul li {
					cursor: pointer;
					display: ${this.inline ? 'inline-' : ''}block;
					font-size: larger;
					font-weight: ${this.bold ? 'bold' : 'normal'};
					height: 54px;
					margin: ${(this.border !== false) ? '.5em' : '.5em 0'};
					max-width: 100%;
					padding: ${(this.border !== false) ? '1em' : '1em 0'};
					text-align: ${this.align || 'left'};
					vertical-align: middle;
					width: 260px;
				}
				#${this.element.id}.draggable-list ul li.selected {
					border: 3px solid lightblue !important;
					padding: .5em !important;
				}
				#${this.element.id}.draggable-list ul li.required {
					border-left: 5px solid red !important;
				}
				#${this.element.id}.draggable-list ul li .indicate-more {
					margin-top: .2rem;
				}
				#${this.element.id}.draggable-list li.delete {
					background-color: #e6717c;
					color: white;
					font-size: 15px;
					font-weight: bold;
					height: 50px;
					list-style: none;
					padding: .5em;
					vertical-align: middle;
				}
				#${this.element.id}.draggable-list li.drop-indicator {
					background-color: lightgray;
					border: none;
					color: black;
					font-style: italic;
					height: 50px;
					list-style: none;
					padding: 1em;
					text-align: center;
					vertical-align: middle;
				}
			</style>
			<ul class="${(this.droppable !== false) ? 'droppable' : ''}">
			${(this.items || []).map((item, index) => `
				<li class="${(this.droppable !== false) ? 'droppable' : ''}${item.required ? ' required' : ''}${item.selected ? ' selected' : ''}" draggable="${(item.draggable !== false) && (this.draggable !== false)}" style="background-color:${item.backgroundColor || ((index % 2) ? App.secondaryColor : App.primaryColor)};border:${item.border || 'none'};color:${item.color || ((index % 2) ? App.primaryColor : App.secondaryColor)};${item.border ? 'padding:.75em' : ''}">
					${item.icon ? `
						<span class="slds-icon_container">
							<svg class="slds-icon ${item.icon.cssClass || ''}" aria-hidden="true">
								<use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="${item.icon.url}" />
							</svg>
							<span class="slds-assistive-text">${item.label}</span>
						</span>
					` : ''}
					${item.label}
					${item.indicateMore ? `
						<span class="indicate-more slds-icon_container slds-float--right">
							<svg class="slds-button__icon" aria-hidden="true">
								<use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="${DraggableList.getSymbols('utility')}#chevronright" />
							</svg>
							<span class="slds-assistive-text">${this.getLabel('More')}</span>
						</span>
					`: ''}
				</li>
			`).join('\n')}
			</ul>
			${this.deleteArea && (this.deleteIcon = this.deleteIcon || Icons.icon('Delete')) ? `
				<li class="delete droppable" draggable="false">
					<span class="slds-icon_container">
						<svg class="slds-icon" aria-hidden="true">
							<use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="${this.deleteIcon.url}" />
						</svg>
						<span class="slds-assistive-text">${this.getLabel('Delete')}</span>
					</span>
					${this.deleteLabel || this.getLabel('Delete')}
				</li>
			` : ''}
		`;
		this.bindEvents();
		let selectedItem = this.element.querySelector('ul li.selected');
		if (selectedItem) {
			selectedItem.scrollIntoView({ block: 'nearest' });
		} else if (oldScrollTop) {
			this.element.querySelector('ul').scrollTop = oldScrollTop;
		}
		if (!this.items || (this.items.length === 0)) {
			this.dropIndicate(this.element.querySelector('ul'));
		}
		return this.element;
	}

	updateItems(items) {
		this.items = items;
		this.modified = true;
		this.render();
	}
}
