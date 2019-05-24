import { CustomElement } from './customElement.js'

export class CustomList extends CustomElement {
	static get properties() {
		return CustomElement.properties.concat(['items']);
	}
}
