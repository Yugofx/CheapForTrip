const DEFAULT_SORT = { value: 'rating,desc' };

function debounce(fn, delay, immediate) {
	let timeout;
	return function() {
		const context = this, args = arguments;
		const later = function() {
			timeout = null;
			if (!immediate) fn.apply(context, args);
		};
		const callNow = immediate && !timeout;
		clearTimeout(timeout);
		timeout = setTimeout(later, delay);
		if (callNow) fn.apply(context, args);
	};
}

function request(method, url, query, body) {
	return new Promise((resolve, reject) => {
		loader.create({
			message: 'Мы ищем подходящие туры'
		}).show();
		const xhr = new XMLHttpRequest();
		if (query) {
			url = `${url}?${query}`;
		}

		xhr.open(method, url, true);
		xhr.onreadystatechange = function () {
			if (xhr.readyState === XMLHttpRequest.DONE) {
				if (xhr.status === 200) {
					resolve(xhr.response);
				} else {
					reject(xhr.response);
				}
				loader.hide();
			}
		};
		if (method === 'POST') {
			xhr.send(body);
		} else {
			xhr.send();
		}
	});
}

class EventEmitter {
	constructor() {
		this.channels = {};
	}

	notify(eventName, args) {
		if (!this.channels[eventName]) {
			this.channels[eventName] = [];
		}
		this.channels[eventName].forEach(listener => listener(args));
	}

	on(eventName, callback) {
		if (!this.channels[eventName]) {
			this.channels[eventName] = [];
		}
		this.channels[eventName].push(callback);
	}
}

class AbstractControl extends EventEmitter {
	constructor(name) {
		super();
		this.name = name;
	}

	reset() {}
	destroy() {}
	initControl() {}
	_registerEvents() {}
	_init() {
		this._registerEvents();
	}
}

class Filter extends EventEmitter {
	constructor(name, sort, options) {
		super();
		this.name = name;
		this.defaultOptions = options;
		this.sort = sort;
		this.group = document.querySelector(`[data-filter=${name}]`);
		this.resetBtn = this.group.querySelector('.reset');

		this.value = { sort_by: this.sort.value };
		this.controls = {};

		this.channels = {};

		this._init();
	}

	createControls() {
		const controlsContainers = [...this.group.querySelectorAll('[id]')];
		controlsContainers.forEach(element => {

			const name = element.id;
			const type = element.dataset.controlType;
			let control;
			if (type === 'range') {
				control = new Slider(name);
			} else {
				control = new FilterControl(name, element, type);
			}

			this.addControl(name, control);
		});
	}

	initControls(options) {
		Object.keys(options).forEach(key => {
			const control = this.controls[key];
			if (control) {
				control.initControl(options[key]);
			}
		});
	}

	addControl(name, control) {
		this.controls[name] = control;
	}

	_mapValue(name, value) {
		if (name === 'prices') {
			const keys = Object.keys(value);
			keys.forEach(key => {
				const fieldName = this.name + '_' + key;
				this.value[fieldName] = value[key];
				if (!value[key]) {
					delete this.value[fieldName];
				}
			});
		} else {
			const fieldName = this.name + '_' + name;

			if (Array.isArray(value)) {
				if (value.length) {
					this.value[fieldName] = value.join(',');
				} else {
					delete this.value[fieldName];
				}
			} else {
				if (value) {
					this.value[fieldName] = value;
				} else {
					delete this.value[fieldName];
				}
			}
		}
	}

	toQueryString(value) {
		return Object.keys(value).map(key => `${key}=${value[key]}`).join('&');
	}

	update(options) {
		Object.keys(this.controls).forEach(name => {
			this.controls[name].destroy();
			delete this.controls[name];
		});
		this.defaultOptions = options;
		this.createControls();
		this.initControls(this.defaultOptions);
		this.addControlsEvents();
		this.value = { sort_by: this.sort.value };
		this.notify('change', this.value);
	}

	reset() {
		Object.keys(this.controls).forEach(name => {
			this.controls[name]._reset();
		})
	}

	controlListener(control) {
		this._mapValue(control.name, control.value);
		this.notify('change', this.value);
	}

	addControlsEvents() {
		Object.keys(this.controls).forEach(name => {
			const control = this.controls[name];
			const debouncedListener = debounce(this.controlListener.bind(this, control), 400, false);

			control.on('change', debouncedListener);
		});
	}

	_registerEvents() {
		this.addControlsEvents();

		this.sort.on('change', val => {
			this.value.sort_by = val;
			this.notify('change', this.value);
		});

		this.resetBtn.addEventListener('click', e => {
			this.reset();
		});
	}

	_init() {
		this.createControls();
		this.initControls(this.defaultOptions);
		this._registerEvents();
	}
}

class FilterControl extends AbstractControl {
	constructor(name, element, type) {
		super(name);
		this.container = element;
		this.type = type;
		this.value = null;

		this.inputs = [];

		this._init();
	}

	_getText(id, name) {
		if (this.name === 'line') {
			return `${id}-я линия`;
		}
		if (this.name === 'rating') {
			return `${id}+`;
		}
		if (this.name === 'stars') {
			if (id === 1) {
				return `1 звезда`
			} else if (id === 5 || id === 0) {
				return `${id} звезд`;
			} else {
				return `${id} звезды`;
			}
		}

		return name;
	}

	_createField(id, name) {
		const control = document.createElement('div');
		const label = document.createElement('label');
		const input = document.createElement('input');

		const text = this._getText(id, name);

		const labelText = document.createTextNode(text);

		control.className = this.type;

		input.name = this.name;
		input.type = this.type;
		input.value = id;

		label.appendChild(input);
		label.appendChild(labelText);

		control.appendChild(label);
		return control;
	}

	_appendFields(options) {
		const fragment = document.createDocumentFragment();
		options.forEach(opt => {
			const field = this._createField(opt.id, opt.name);
			field.addEventListener('change', this.listener.bind(this));
			fragment.appendChild(field);
		});
		this.container.appendChild(fragment);
		this.getInputs();
	}

	reset() {
		if (this.type === 'checkbox') {
			this.value = [];
		} else {
			this.value = '';
		}

		this.inputs.forEach(input => {
			if (this.type === 'checkbox' || this.type === 'radio') {
				input.checked = false;
			} else {
				input.кфц = '';
			}
		});
		this.notify('change');
	}

	initControl(options) {
		if (this.type === 'radio' || this.type === 'checkbox') {
			if (this.name !== 'wifi') {
				this._appendFields(options);
			} else {
				const all = options.map(opt => opt.id);
				const free = all.filter(id => /FREE/.test(id));
				const exists = all.filter(id => !(/NONE/.test(id)));

				const wifiOptions = [
					{ name: 'Все отели', id: all.join(',') },
					{ name: 'Есть Wi-Fi', id: exists.join(',') },
					{ name: 'Бесплатный Wi-Fi', id: free.join(',') },
				];

				this._appendFields(wifiOptions);
			}
		}
	}

	get eventName() {
		if (this.type === 'checkbox' || this.type === 'radio') {
			return 'change';
		} else {
			return 'input';
		}
	}

	getInputs() {
		this.inputs = [...this.container.querySelectorAll('input')];
		return this.inputs;
	}

	patchValue(input) {
		if (this.type === 'checkbox') {
			this._patchCheckboxValue(input);
		} else {
			this.value = input.value;
		}
	}

	_patchCheckboxValue(input) {
		if (!this.value) {
			this.value = [];
		}
		if (input.checked) {
			const valueAlreadyAdded = !!this.value.find(val => val === input.value);
			if (!valueAlreadyAdded) {
				return this.value.push(input.value);
			}
		} else {
			const addedValueIndex = this.value.findIndex(val => val === input.value);
			if (addedValueIndex > -1) {
				this.value.splice(addedValueIndex, 1);
			}
		}
	}

	destroy() {
		this.detachEvents();
		Object.keys(this.channels)
			.forEach(evtName => this.channels[evtName].length = 0);
		this.inputs = [];
		while (this.container.querySelector('[data-breakpoint] + *')) {
			this.container.querySelector('[data-breakpoint] + *').remove();
		}
		this.container = null;
	}

	listener(e) {
		this.patchValue(e.target);
		this.notify('change');
	}

	_registerEvents() {
		this.inputs.forEach(input =>
			input.addEventListener(this.eventName, this.listener.bind(this)));
	}

	detachEvents() {
		this.inputs.forEach(input =>
			input.removeEventListener(this.eventName, this.listener.bind(this)));
	}

	_init() {
		this.getInputs();
		super._init();
	}
}

class Sort extends EventEmitter {
	constructor(name, options) {
		super();
		this.host = document.querySelector(`[data-sort=${name}]`);

		this.value = options.value;

		this._init();
	}

	listener(e) {

		if (e.target.tagName.toLowerCase() !== 'button') {
			return;
		}

		const targetData = e.target.dataset.sort.split(':');
		const field = targetData[0];
		const action = targetData[1];

		const currentValue = this.value.split(',');
		const currentField = currentValue[0];
		const currentAction = currentValue[1];

		if (action === 'reverse') {
			if (currentField === field) {
				this.value = `${field},${currentAction === 'asc' ? 'desc' : 'asc'}`;
			} else {
				this.value = `${field},asc`;
			}
		} else {
			this.value = `${field},${action}`;
		}
		this.notify('change', this.value);
	}

	_registerEvents() {
		this.host.addEventListener('click', this.listener.bind(this));
	}

	_init() {
		this._registerEvents();
	}
}

class Catalog extends EventEmitter {
	static get VIEWPORT_HEIGHT() { return window.innerHeight }
	static get COL_COUNT() { return window.innerWidth >= 992 ? 3 : window.innerWidth >= 768 ? 2 : 1 }
	static get CART_HEIGHT() { return 360 }
	static get MAX_VIEWED_ROWS_COUNT() { return Math.ceil(this.VIEWPORT_HEIGHT / this.CART_HEIGHT) + 1 }

	constructor(root, data, filter) {
		super();
		this.root = document.querySelector(`.${root}`);
		this.data = data;
		this.requestId = '';

		this.filteredData = null;
		this.noDataPlaceholder = null;
		this.renderedRowsIndexes = [];
		this._init(filter);
	}

	_createCart(item) {
		const li = document.createElement('li');
		const container = document.createElement('div');
        const a = document.createElement('a');
		const img = document.createElement('img');
		const discount = document.createElement('div');
		const name = document.createElement('p');
		const city = document.createElement('span');
		const data = document.createElement('div');
		const distance = document.createElement('p');
		const price = document.createElement('p');

		// Set attributes
		li.className = ' col-md-4 col-sm-6 col-xs-12';
		container.className = 'item';
        a.className = 'partner';
        a.href = this._getLink(item.hotel);
        a.target = 'blank';
        a.title = item.hotel.name;
        a.rel = 'nofollow noopener';
		img.className = '-block';
		img.src = item.hotel.images[0]['x245x240'];
		img.alt = item.hotel.name;
		discount.className = 'item-label';
		name.className = 'text';
		city.className = '-small -a50';
		data.className = 'item-data -flex -align-center -jc-sp';
		distance.className = 'info-text -a50';
		price.className = 'info-text -big';

		// Create text nodes
		const textName = document.createTextNode(item.hotel.name);
		const textCity = document.createTextNode(` (${item.hotel.city})`);
		const textDistance = item.hotel.features.beach_distance ?
			document.createTextNode(`До моря: ${item.hotel.features.beach_distance} м`) :
			null;
		const textPrice = document.createTextNode(`${item.min_price} руб.`);

		const discountAmount = item.extras.previous_price ?
			((item.extras.previous_price - item.min_price) / item.extras.previous_price * 100).toFixed():
			'5';
		const textDiscount = document.createTextNode(`-${discountAmount || 5}%`);

		// Append text
		name.appendChild(textName);
		city.appendChild(textCity);
		textDistance && distance.appendChild(textDistance);
		price.appendChild(textPrice);
		discount.appendChild(textDiscount);

		// Append elements
		name.appendChild(city);

		textDistance && data.appendChild(distance);
		data.appendChild(price);

        a.appendChild(img);
		container.appendChild(name);
		container.appendChild(data);
		container.appendChild(discount);

        container.appendChild(a);

		li.appendChild(container);
		return li;
	}

	_getLink(hotelData) {
		let basicURI = `http://localhost:8000/${hotelData.link}?hotel_ids=${hotelData.id}`;
        return this.requestId ? `${basicURI}&request_id=${this.requestId}` : basicURI;
	}

	_clearList() {
		while (this.root.querySelector('li')) {
			this.root.querySelector('li').remove();
		}
	}

	_setMaxHeight() {
		const rowsCount = Math.ceil(this.filteredData.length / Catalog.COL_COUNT);
		this.root.style.height = rowsCount ? `${Catalog.CART_HEIGHT * rowsCount}px` : '400px';
	}

	_getDiffObject(rowsToRender) {
		const add = this.renderedRowsIndexes
		.reduce((arr, idx) => arr.filter(i => i !== idx), rowsToRender);
		const remove = rowsToRender
		.reduce((arr, idx) => arr.filter(i => i !== idx), this.renderedRowsIndexes);
		return { add, remove };
	}

	setData(hotels, requestId) {
		this.data = hotels;
		this.requestId = requestId;
	}

	getData() {
		return this.data;
	}

	updateRenderedRows(offset, reset = false) {
		const rowsToRender = [];
		let diff;
		if (offset >= 0) {
			for (let i = 0; i < Catalog.MAX_VIEWED_ROWS_COUNT + 1; i++) {
				rowsToRender.push(i);
			}
			diff = this._getDiffObject(rowsToRender);

			if (!reset && (diff.add.length || diff.remove.length)) {
				this._addRows(diff.add);
				this._removeRows(diff.remove);
			}
			this.renderedRowsIndexes = rowsToRender;
		} else {
			offset = Math.abs(offset);
			const firstInViewRowIndex = Math.ceil(offset / Catalog.CART_HEIGHT);
			let startIndex = firstInViewRowIndex - 1;
			let endIndex = firstInViewRowIndex + Catalog.MAX_VIEWED_ROWS_COUNT + 1;
			if (startIndex <= 0) {
				startIndex = 0;
			}
			for (let i = startIndex; i < endIndex; i++) {
				rowsToRender.push(i);
			}
			diff = this._getDiffObject(rowsToRender);

			if (diff.add.length || diff.remove.length) {
				this._addRows(diff.add);
				this._removeRows(diff.remove);
			}
			this.renderedRowsIndexes = rowsToRender;
		}
	}

	// Only use on global data object change or filter change
	reset(filter) {
		window.scrollTo(0, 0);
		this._clearList();
		this.renderedRowsIndexes.length = 0;
		this.filteredData = this.getFilteredData(filter);
		this.updateRenderedRows(this.topOffset, true);
		this._setMaxHeight();
		this._addRows(this.renderedRowsIndexes);
	}

	_addRows(rows) {
		let chunk;
		if (this.data.length) {
			if (this.filteredData.length) {
				chunk = this.createList(rows, this.filteredData);
			} else {
				chunk = this.noDataPlaceholder;
			}
		} else {
			return;
		}

		this.root.appendChild(chunk);
	}

	_removeRows(rows) {
		rows.forEach(idx => {
			[...this.root.querySelectorAll('li')].forEach((el, index) => {
				if (parseInt(el.style.top) === idx * Catalog.CART_HEIGHT) {
					el.remove();
				}
			});
		});
	}

	get topOffset() {
		return this.root.getBoundingClientRect().top;
	}

	createList(renderedRowsIndexes, data) {
		const fragment = document.createDocumentFragment();

		data.forEach((item, index) => {
			// Check if element is a part of a rendered row
			const rowIndex = Math.floor(index / Catalog.COL_COUNT);
			if (renderedRowsIndexes.indexOf(rowIndex) === -1) {
				return;
			}

			const cart = this._createCart(item);
			cart.style.top = `${rowIndex * Catalog.CART_HEIGHT}px`;
			fragment.appendChild(cart);
		});
		return fragment;
	}

	getFilteredData(filter) {
		return this.data.filter(item => {
			if (filter.filter_hotel_name) {
				const re = new RegExp(filter.filter_hotel_name, 'i');
				const passes = re.test(item.hotel.name.toLowerCase());
				if (!passes) {
					return false;
				}
			}
			if (filter.filter_rating) {
				if (item.hotel.rating < +filter.filter_rating) {
					return false;
				}
			}
			if (filter.filter_stars) {
				const stars = filter.filter_stars.split(',');
				if (stars.indexOf('' + item.hotel.stars) === -1) {
					return false;
				}
			}
			if (filter.filter_price_min) {
				if (+filter.filter_price_min > item.min_price) {
					return false;
				}
			}
			if (filter.filter_price_max) {
				if (+filter.filter_price_max < item.min_price) {
					return false;
				}
			}
			if (filter.filter_line) {
				const lines = filter.filter_line.split(',');
				if (lines.indexOf('' + item.hotel.features.line) === -1) {
					return false;
				}
			}
			if (filter.filter_meals) {
				const meals = filter.filter_meals.split(',');
				const pansions = Object.keys(item.pansion_prices);
				if (!meals.some(meal => pansions.indexOf(meal) > -1)) {
					return false;
				}
			}
			if (filter.filter_regions) {
				const regions = filter.filter_regions.split(',');
				if (regions.indexOf('' + item.hotel.place_id) === -1) {
					return false;
				}
			}
			if (filter.filter_wifi) {
				const wifi = filter.filter_wifi.split(',');
				if (wifi.indexOf(item.hotel.features.wi_fi) === -1) {
					return false;
				}
			}
			if (filter.filter_operators) {
				const operators = filter.filter_operators.split(',');
				if (!operators.some(operator => item.operators.indexOf(+operator) > -1)) {
					return false;
				}
			}
			return true;
		}).sort((a, b) => {
			if (filter.sort_by === 'price,asc') {
				if (a.min_price < b.min_price) {
					return -1;
				}
				if (a.min_price > b.min_price) {
					return 1;
				}
				return 0;
			}
			if (filter.sort_by === 'price,desc') {
				if (a.min_price > b.min_price) {
					return -1;
				}
				if (a.min_price < b.min_price) {
					return 1;
				}
				return 0;
			}
			if (filter.sort_by === 'rating,desc') {
				if (a.hotel.rating > b.hotel.rating) {
					return -1;
				}
				if (a.hotel.rating < b.hotel.rating) {
					return 1;
				}
				return 0;
			}
		});
	}

	_registerEvents() {
		document.addEventListener('scroll', e => this.updateRenderedRows(this.topOffset, false));
	}

	_createNoDataPlaceholder() {
		this.noDataPlaceholder = document.createElement('li');
		const img = document.createElement('img');
		const heading = document.createElement('h1');
		const p = document.createElement('p');
		const button = document.createElement('button');

		this.noDataPlaceholder.setAttribute('class', '-no-data');
		img.setAttribute('src', 'https://cdn.level.travel/assets/search_page/no-results-found-1a090668cadbdd775653a5f6beb2469a2ea7e9f324c09af787f8cd047d0b41eb.svg');
		button.setAttribute('class', 'btn btn-primary');
		button.setAttribute('type', 'button');

		const headingText = document.createTextNode('Под такие фильтры не попал ни один тур');
		const text = document.createTextNode('Под ваши фильтры не подошло ни одного предложения.\nПоищите на другие даты или просто сбросьте фильтр');
		const buttonText = document.createTextNode('Сбросить фильтры');

		heading.appendChild(headingText);
		p.appendChild(text);
		button.appendChild(buttonText);

		button.addEventListener('click', e => this.notify('reset'));

		this.noDataPlaceholder.appendChild(img);
		this.noDataPlaceholder.appendChild(heading);
		this.noDataPlaceholder.appendChild(p);
		this.noDataPlaceholder.appendChild(button);
	}

	_init(filter) {
		this._createNoDataPlaceholder();
		this._registerEvents();
		this.filteredData = this.getFilteredData(filter);
		this.updateRenderedRows(this.topOffset, true);
		this._setMaxHeight();
		this._addRows(this.renderedRowsIndexes);
	}
}

class Loader {
	constructor(selector) {
		this._elements = { root: document.querySelector(`.${selector}`) };
		this._elements.message = this._elements.root.querySelector('.message');

		this.timer = null;
		this._isPresent = false;
	}

	_clearText() {
		const text = this._elements.message.childNodes[0];
		if (text) {
			this._elements.message.removeChild(text);
		}
	}

	_setText(message = 'Применяем параметры поиска') {
		const textNode = document.createTextNode(message);
		this._elements.message.appendChild(textNode);
	}

	create(options = {}) {
		this._clearText();
		this._setText(options.message);

		return this;
	}

	show(dismissDelay) {
		this._elements.root.classList.add('-show');
		if (dismissDelay) {
			if (this.timer) {
				clearTimeout(this.timer);
				this.timer = null;
			}
			this.timer = setTimeout(() => this.hide(), dismissDelay);
		}
		this._isPresent = true;
	}

	hide() {
		this._elements.root.classList.remove('-show');
		this._isPresent = false;
	}
}

class Slider extends AbstractControl {
	constructor(id) {
		super(id);
		this.slider = document.getElementById(id);
		this.value = {};

		this._init();
	}

	initControl(options) {
		this.slider.noUiSlider.updateOptions({
			range: {
				max: options.max,
				min: options.min
			},
			start: [options.min, options.max]
		}, true);
	}

	patchValue() {
		const sliderValue = this.slider.noUiSlider.get();
		this.value.price_min = +sliderValue[0];
		this.value.price_max = +sliderValue[1];
		this.notify('change');
	}

	reset() {
		const noUiSlider = this.slider.noUiSlider;
		noUiSlider.updateOptions({
			start: [noUiSlider.options.range.min, noUiSlider.options.range.max]
		}, true);
		this.patchValue();
	}

	destroy() {
		this.slider.noUiSlider.destroy();
	}

	_registerEvents() {
		this.slider.noUiSlider.on('change', this.patchValue.bind(this));
	}

	get format() {
		return wNumb({decimal: 0, thousand: ' '});
	}

	_init() {
		if (!this.slider.noUiSlider) {
			var dollarPrefixFormat = wNumb({prefix: '$', decimals: 0});
			noUiSlider.create(this.slider, {
				start: [0, 0],
				range: {
					min: 0,
					max: 1000000
				},
				step: 10000,
				tooltips: [dollarPrefixFormat, dollarPrefixFormat],
				
			});
			super._init();
		}
	}
}

const sort = new Sort('host', DEFAULT_SORT);
const group = new Filter('filter', sort, {});
const catalog = new Catalog('list', [], group.value);
const loader = new Loader('preloader');

request('GET', 'data.php')
	.then(response => {
		let data;
		try {
			data = JSON.parse(response);
		} catch(e) {
			data = { hotels: [], filters: {} };
		}
		if (data.success) {
            catalog.setData(data.hotels, data.main && data.main.request_id || null);
            group.update(data.filters);
		}
    })
	.catch(error => console.log(error));

group.on('change', v => {
	catalog.reset(v);
	// request('GET', 'filter.php', group.toQueryString(v))
	// 	.then(response => {
	// 		const data = JSON.parse(response);
	//
	// 		catalog.data = data.hotels;
	// 		catalog.render(group.value);
	// 	})
	// 	.catch(error => console.log(error));
});

catalog.on('reset', () => group.reset());

LTApi.CONFIG.api_key = 'b7846cf4232ae3d7ce573fe28a89245b';
LTApi.CONFIG.public_url = 'http://localhost:8080';
LTApi.CONFIG.public_host = 'localhost:8080';

const widget = new LTApi.Widgets.Search({
    place: '#widget',
    params  : {
        aflt : 'CheapForTrip'
    }
});

widget.on('enqueue', data => console.log(data));
