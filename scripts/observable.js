

export class ObserverList {
	constructor() {
		this._observerList = [];
	}

	getAll () {
		return this._observerList;
	}

	add(observer) {
		return this._observerList.push(observer);
	}

	removeAll() {
		this._observerList = [];
	}

	count() {
		return this._observerList.length;
	}

	get(index) {
		if(index > -1 && index < this.observerList.length) {
			return this._observerList[index];
		}
	}

}

export class Subject {
	constructor() {
		this._observers = new ObserverList();
		this._currentValue = null;
	}
	addObserver(observer) {
		this._observers.add(observer);
	}
	removeObserver(observer) { }

	setCurrentValue(value) {
		this._currentValue = value;
		this.notify(value);
		return this;
	}
	
	notify(newValue) {
		this.currentValue = newValue;
		for (const observer of this._observers.getAll()) {
			observer.update(newValue);
		}
	}
}