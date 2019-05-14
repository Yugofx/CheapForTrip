class AbstractControl {
	constructor({ selector }) {
		this._wrapper = document.querySelector(selector);
		if (!this._wrapper) {
			throw new ReferenceError(`Cannot find element with selector ${selector}`);
		}
		this._changed = null;
		this._control = this._wrapper.querySelector('input');
		this._resetButton = this._wrapper.querySelector('.reset-button');
		this._cache = null;
		this._list = null;
		this._value = null;
		this._outsideListener = null;
		this._tip = Tip.for(this._wrapper);

		this._init();
	}

	_changeState({ from, to }) {
		from && this._wrapper.classList.remove(from);
		to && this._wrapper.classList.add(to);
	}

	_getState(state) {
		return this._wrapper.classList.contains(`-${state}`);
	}

	_createList() {}

	_presentList() {
		if (this._list) {
			this._wrapper.appendChild(this._list);
		}
	}

	_destroyList() {
		if (this._list && this._list.parentNode === this._wrapper) {
			this._wrapper.removeChild(this._list);
		}
	}

	onItemClick() {
		this._resetButton.classList.add('-active');
		this._destroyList();
		this._list = null;
		document.removeEventListener('click', this._outsideListener.bind(this));
		this._outsideListener = null;
	}

	get value() {
		return this._value;
	}

	set value(value) {
		this.onChange();
		this._value = value;
	}

	get query() {
		return this._control.value || '';
	}

	set query(value) {
		this._control.value = value;
	}

	onInput() {}

	onChange() {
		if (!this._changed) {
			this._changed = true;
			this._changeState({ from: '-pristine', to: '-dirty' });
			if (!this._getState('focused') && !this.value) {
				this._tip.show({ level: 'error', message: 'Куда бы вы хотели полететь?' });
			}
		}
	}

	validate() {
		if (!this.value) {
			this._tip.show({ level: 'error', message: 'Куда бы вы хотели полететь?' });
			return false;
		}
		return true;
	}

	onFocus() {
		this._outsideListener = clickOutside(this._wrapper, this.close.bind(this));
		this._tip.destroy();
		this._changeState({ from: null, to: '-focused' });
	}

	close() {
		this._outsideListener = null;
		this._changeState({ from: '-focused', to: null });
		this._destroyList();
	}

	_initEvents() {
		this._control.addEventListener('focus', this.onFocus.bind(this));
		this._control.addEventListener('input', this.onInput.bind(this));
		this._resetButton.addEventListener('click', this._reset.bind(this));
	}

	_initState() {
		this._wrapper.classList.add('-pristine');
		this._changed = false;
	}

	_reset() {
		this.query = '';
		if (this.value) {
			this.value = '';
		}
		this._destroyList();
		this._list = this._cache;
		this._tip.destroy();
		this._resetButton.classList.remove('-active');
		this._control.focus();
	}

	_init() {
		this._initState();
		this._initEvents();
	}
}

class DestinationControl extends AbstractControl {
	constructor(data) {
		super(data);
	}

	_createList(items, cache = false) {
		if (items.length === 0) {
			this._list = null;
			return this._tip.show({ level: 'warn', message: 'Не найдено' });
		}
		this._tip.destroy();
		const fragment = Elba.fragment();
		for (let item of items) {
			let placeLabel = item.name_ru || item.name_en,
				countryLabel = item.country_name_ru || item.country_name_en;
			// Building list item
			Elba.from('li')
				.pushChildren(
					Elba.from('span').setText(placeLabel),
					countryLabel && ', ',
					countryLabel && Elba.from('span').setText(countryLabel),
				)
				.addClasses('list-item', cache ? `flag flag-${item.iso2.toLowerCase()}` : null)
				.setListener('click', this.onItemClick.bind(this, item))
				.insertIn(fragment);
		}
		this._list = Elba.from('ul')
			.addClasses('list')
			.pushChildren(fragment)
			.element;
		if (cache) {
			this._cache = this._list;
		}
	}

	onItemClick(item) {
		super.onItemClick();
		this.value = item.country_id ? [item.country_id, item.id] : [item.id];
		this.query = item.name_ru || item.name_en;
	}

	onFocus() {
		super.onFocus();
		if (!this._cache && !this._changed && !this.query) {
			this._request('', true);
		} else {
			if (this._list) {
				this._presentList();
			} else {
				this._request(this.query, false, 'Failed to get list');
			}
		}
	}

	onInput() {
		this._destroyList();
		if (!this.query) {
			this._reset();
			this._presentList();
			this._resetButton.classList.remove('-active');
		} else {
			this._resetButton.classList.add('-active');
			this._request(this.query, false, 'Failed to get list');
		}
	}

	_request(q, cache, error) {
		get('/destination.php', { q })
		.then(res => {
			this._destroyList();
			this._createList(res, cache);
			this._presentList();
		})
		.catch(err => {
			this._tip.show({ level: 'error', message: error || err });
		});
	}

	close() {
		super.close();
		if (this._changed && !this.value) {
			this._tip.show({ level: 'error', message: 'Куда бы вы хотели полететь?' });
		}
	}
}

class DepartureControl extends AbstractControl {
	static get DEPARTURE_LIST() {
		return [
			{ code: "Moscow", name: "Москва" },
			{ code: "St Petersburg", name: "Санкт-Петербург" },
			{ code: "Kazan", name: "Казань" },
			{ code: "Ekaterinburg", name: "Екатеринбург" },
			{ code: "Samara", name: "Самара" },
			{ code: "Nizhniy Novgorod", name: "Нижний Новгород" },
			{ code: "Krasnodar", name: "Краснодар" },
			{ code: "Rostov-na-Donu", name: "Ростов-на-Дону" },
			{ code: "Ufa", name: "Уфа" },
			{ code: "Novosibirsk", name: "Новосибирск" },
			{ code: "Perm", name: "Пермь" },
			{ code: "Tumen", name: "Тюмень" }
		]
	}

	constructor(el) {
		super(el);
		this._list = this._cache = this._createList(DepartureControl.DEPARTURE_LIST);
	}

	_createList(items) {
		const list = Elba.from('ul').addClasses('list');
		const fragment = Elba.fragment();
		for (let item of items) {
			fragment.pushChildren(
				Elba.from('li')
					.addClasses('list-item')
					.setText(item.name)
					.setListener('click', () => this.onItemClick(item))
			)
		}
		list.pushChildren(fragment);
		return list.element;
	}

	onItemClick(item) {
		super.onItemClick();
		this.value = item.code;
		this.query = item.name;
	}

	onFocus() {
		super.onFocus();
		this._presentList();
	}

	onInput() {
		this._destroyList();
		if (!this.query) {
			this._reset();
			this._presentList();
			this._resetButton.classList.remove('-active');
		} else {
			this._resetButton.classList.add('-active');
			const list = DepartureControl.DEPARTURE_LIST.filter(this._filterDeparture.bind(this));
			this._list = this._createList(list);
			this._presentList();
		}
	}

	_filterDeparture(item) {
		return normalise(item.name).includes(normalise(this.query));
	}
}
