class CalendarLeaf {
	constructor({ parent, value }) {
		this._parent = parent;
		this._value = value;

		this._htmlRef = null;
	}

	get value() {
		return this._value;
	}

	get element() {
		return this._htmlRef ? this._htmlRef.element : null;
	}

	select(value) {
		this._parent.select(value);
	}

	reset() {
		this._parent.reset();
	}
}

class CalendarComposite extends CalendarLeaf {
	constructor({ parent, value, children }) {
		super({ parent, value });
		this._children = this._initChildren(children);
	}

	_initChildren(children) {
		return [];
	}

	get children() {
		return this._children;
	}
}

class BaseCalendarEmitterMixin extends CalendarComposite {
	constructor(calendarData) {
		super(calendarData);
		this._listeners = {};
	}

	on(evtName, cb) {
		if (!this._listeners[evtName]) {
			this._listeners[evtName] = [];
		}
		this._listeners[evtName].push(cb);
	}

	off(evtName, cb) {
		if (!this._listeners[evtName]) {
			return;
		}
		this._listeners[evtName].filter(callback => callback !== cb);
	}

	emit(evtName, value) {
		if (!this._listeners[evtName]) {
			this._listeners[evtName] = [];
		}
		for (let evt of this._listeners[evtName]) {
			evt(value);
		}
	}
}

class Day extends CalendarLeaf {
	static create(value) {
		return Elba.from('li')
		.addClasses('y-calendar-cell')
		.setText(value || '');
	}

	constructor({ parent, value, inactive, selected, accent }) {
		super({ parent, value });

		this._htmlRef = Day.create(value);
		this._selected = selected;
		this._empty = !value;
		this._inactive = inactive;
		this._isHoliday = accent;

		this._init();
	}

	_setState(state, cssClass) {
		if (state) {
			this._htmlRef.addClasses(cssClass);
		} else {
			this._htmlRef.removeClasses(cssClass);
		}
	}

	get value() {
		return { day: this._value, ...this._parent.value };
	}

	mark() {
		this._setState(true, '-range-selected');
	}

	get empty() {
		return this._empty;
	}

	get inactive() {
		return this._inactive;
	}

	unmark() {
		this._setState(false, '-range-selected');
	}

	pick() {
		this._selected = true;
		this._setState(true, '-selected');
	}

	unpick() {
		this._selected = false;
		this._setState(false, '-selected');
	}

	select() {
		this._parent.select(this);
		this.pick();
	}

	reset() {
		this._parent.reset();
		this.unpick();
	}

	get isActive() {
		return !this._inactive;
	}

	toggle() {
		if (this._selected) {
			// this.reset();
			return;
		}
		this.select(this);
	}

	_initState() {
		this._setState(this._empty, '-empty');
		this._setState(this._inactive, '-inactive');
		this._setState(this._isHoliday, '-accent');
		this._setState(this._selected, '-selected');
	}

	_initListener() {
		this._htmlRef.setListener('click', () => this.toggle());
	}

	_init() {
		this._initState();
		this._initListener();
	}
}

class Week extends CalendarComposite {
	static create(cells = []) {
		return Elba.from('ul')
		.addClasses('y-calendar-row')
		.pushChildren(...cells)
	}

	constructor({ days, parent, value }) {
		super({ parent, value, children: days });
		this._htmlRef = Week.create(this._children.map(child => child.element));
	}

	_initChildren(days) {
		return days.map(d => new Day({
			parent: this,
			value: d.value,
			inactive: d.inactive || false,
			selected: d.selected || false,
			accent: d.accent || false,
		}));
	}

	get value() {
		return { week: this._value, ...this._parent.value };
	}

	get inactive() {
		return this._children.every(child => child.inactive);
	}

	find(day) {
		return this._children.find(child => child.value.day === day && child.isActive);
	}

	first() {
		return this._children.filter(child => !child.inactive)[0];
	}

	last() {
		return this._children
			.filter(child => !child.empty)
			.slice(-1)[0];
	}
}

class Month extends CalendarComposite {
	static create(title, weeks) {
		return Elba.from('div')
		.addClasses('y-calendar-block')
		.pushChildren(
			Elba.from('div').addClasses('y-calendar-title').setText(title),
			...weeks
		)
	}

	constructor({ title, year, month, weeks, parent }) {
		super({ parent, value: { year, month }, children: weeks });
		this._htmlRef = Month.create(title, this._children.map(child => child.element));
	}

	get value() {
		return { ...this._value };
	}

	find(date) {
		if (this.value.year !== date.getFullYear() || this.value.month !== date.getMonth()) {
			return null;
		}
		return this._children.reduce((acc, child) => acc || child.find(date.getDate()), null);
	}

	first() {
		return this._children.filter(child => !child.inactive)[0].first();
	}

	last() {
		return this._children[this._children.length - 1].last();
	}

	_initChildren(weeks) {
		return weeks.map(week => new Week({ days: week, parent: this, value: null }));
	}
}

class CalendarPresentation extends BaseCalendarEmitterMixin {
	static createHeader() {
		return Elba.from('div').addClasses('y-calendar-header')
		.pushChildren(
			Elba.from('div').addClasses('y-calendar-block')
			.pushChildren(
				Elba.from('ul').addClasses('y-calendar-row')
				.pushChildren(
					...['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс']
					.map((day, idx) => Elba.from('li')
						.addClasses('y-calendar-cell', idx > 4 && '-accent')
						.setText(day)
					)
				)
			)
		);
	}

	static create({ selector, months, withHeader }) {
		const el = document.querySelector(selector);
		if (!el) {
			throw new ReferenceError('Element with provided selector is not in the DOM tree yet');
		}
		return Elba.of(el)
		.addClasses(withHeader && '-header-space')
		.pushChildren(
			withHeader && CalendarPresentation.createHeader(),
			Elba.from('div')
			.addClasses('y-calendar-body')
			.pushChildren(...months)
		)
	}

	static get MONTHS() {
		return ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
			'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']
	}

	static createMonthScheme({ month, year }) {
		const today = new Date();
		const lastMonthDay = new Date(year, month + 1, 0).getDate();
		const monthDays = Array.from({ length: lastMonthDay }, (v, i) => i + 1);
		const weeks = [];
		while (monthDays.length > 0) {
			const firstInRow = new Date(year, month, monthDays[0]).getDay();
			let week;
			if (firstInRow === 1) {
				week = monthDays.splice(0, 7);
				while (week.length < 7) {
					week.push(null);
				}
			} else {
				week = monthDays.splice(0, (7 - firstInRow) % 7 + 1);
				while (week.length < 7) {
					week.unshift(null);
				}
			}
			weeks.push(week.map((d, idx) => {
				const todayStartTimestamp = new Date(
					today.getFullYear(),
					today.getMonth(),
					today.getDate() + 1
				).getTime();
				return {
					value: d,
					inactive: new Date(year, month, d).getTime() < todayStartTimestamp,
					accent: idx > 4
				};
			}));
		}
		return weeks;
	}

	constructor({ selector, length, withHeader, initial }) {
		super({ value: null, parent: null, children: length });
		this._selectedDay = null;
		this._htmlRef = CalendarPresentation.create({ selector, months: this._children.map(c => c.element), withHeader });
		this._opened = false;
		this._range = null;
		this._daysInRange = [];

		this._selectInitialDay(initial);
	}

	_selectInitialDay(initial) {
		if (typeof initial === 'string') {
			switch (initial) {
				case 'first':
					this._selectedDay = this.first();
					break;
				case 'last':
					this._selectedDay = this.last();
					break;
			}
		} else if (initial instanceof Date) {
			this._selectedDay = this.find(initial);
		}
		if (this._selectedDay) {
			this._selectedDay.select();
		}
	}

	_initChildren(length) {
		return Array.from({ length: this._defineMonthCount(length) }, (v, i) => {
			const now = new Date();
			const month = (now.getMonth() + i) % 12;
			const year = now.getFullYear() + parseInt((now.getMonth() + i) / 12);
			const weeks = CalendarPresentation.createMonthScheme({ year, month });
			return new Month({ parent: this, year, month, weeks, title: CalendarPresentation.MONTHS[month] });
		});
	}

	_defineMonthCount(length) {
		if (typeof length === 'number' && length > 0) {
			return length;
		}
		if (typeof length !== 'string') {
			throw new TypeError('Length property of Calendar should be either string or number greater than 0');
		}
		switch (length) {
			case 'year':
				return 13;
			case 'half-year':
				return 6;
			case 'quarter':
				return 3;
			case 'two years':
				return 25;
			default:
				throw TypeError('No such option available. Choose from "year", "half-year","quarter", or "two years"');
		}
	}

	find(date) {
		return this._children.reduce((acc, child) => acc || child.find(date), null);
	}

	findMany(dates) {
		return dates.map(date => this.find(date));
	}

	first() {
		return this._children[0].first();
	}

	last() {
		return this._children[this._children.length - 1].last();
	}

	get range() {
		return this._range;
	}

	select(day) {
		if (this._selectedDay) {
			this.reset();
		}
		this._selectedDay = day;
		this._value = new Date(
			this._selectedDay.value.year,
			this._selectedDay.value.month,
			this._selectedDay.value.day
		);
		this.pickValuesInRange();
		this.emit('change', this.value);
		this.close();
	}

	reset() {
		if (this._selectedDay) {
			this._selectedDay.unpick();
			this._unpickValuesInRange();
		}
		this._selectedDay = null;
		this._value = null;
		this.emit('change', this.value);
	}

	setRange(range) {
		this._range = range;
		this.pickValuesInRange();
	}

	clearRange() {
		this._range = null;
		this._unpickValuesInRange();
	}

	pickValuesInRange() {
		if (this._value) {
			if (this._range) {
				let i = -this._range;
				const dates = [];
				while (i <= this._range) {
					if (i === 0) {
						i++;
						continue;
					}
					dates.push(
						new Date(
							this._value.getFullYear(),
							this._value.getMonth(),
							this._value.getDate() + i++,
						)
					);
				}
				this._daysInRange = this.findMany(dates).filter(day => day instanceof Day);
			}
			this._daysInRange.forEach(day => day.mark());
		}
	}

	_unpickValuesInRange() {
		this._daysInRange.forEach(day => day.unmark());
		this._daysInRange = [];
	}

	open() {
		this._htmlRef.addClasses('-opened');
		this._opened = true;
	}

	close() {
		this._htmlRef.removeClasses('-opened');
		this._opened = false;
	}

	scrollTop(yOffset) {
		this._htmlRef.switchToChild('.y-calendar-body').element.scrollTop = yOffset;
	}

	get opened() {
		return this._opened;
	}
}

class CalendarController {
	static create(selector) {
		const el = document.querySelector(selector);
		if (!el) {
			throw new ReferenceError(`No element found for selector "${selector}"`);
		}
		return Elba.of(el);
	}

	static formatter(pattern) {
		return function(value) {
			if (!(value instanceof Date)) {
				return null;
			}
			// DD-MM-YYYY
			if (!pattern) {
				return `${value.getDate()}-${value.getMonth() + 1}-${value.getFullYear()}`;
			}
			switch(pattern) {
				case 'DD.MM.YYYY':
					const day = value.getDate();
					const month = value.getMonth() + 1;
					const year = value.getFullYear();
					return `${day < 10 ? '0' + day : day}.${month < 10 ? '0' + month : month}.${year}`;
			}
		}
	}

	constructor({ selector, calendar, placeholder, buttons, pattern }) {
		this._calendar = new CalendarPresentation(calendar);
		this._panelRef = CalendarController.create(selector);
		this._valueRef = Elba.from('div').addClasses('y-calendar-value');
		this._formatter = CalendarController.formatter(pattern);

		this._initPlaceholder(placeholder);
		this._initValue();
		this._initButtons(buttons);
		this._init();
	}

	reset() {
		if (this._calendar.value) {
			this.open();
			this._calendar.reset();
			this._calendar.scrollTop(0);
		}
	}

	_initValue() {
		if (this._calendar.value) {
			this.setValue(this._calendar.value);
		}
	}

	open() {
		clickOutside(this._panelRef.element, this.close.bind(this));
		this._calendar.open();
	}

	close() {
		this._calendar.close();
	}

	setRange(range) {
		this._calendar.setRange(range);
	}

	clearRange() {
		this._calendar.clearRange();
	}

	get value() {
		return {
			date: this._formatter(this._calendar.value),
			range: this._calendar.range,
		}
	}

	clearValue() {
		this._panelRef
			.removeChild(this._valueRef.removeTextNodes())
			.switchToChild('.y-calendar-reset')
			.removeClasses('-active');
	}

	setValue(value) {
		this._panelRef
			.unshiftChildren(this._valueRef.setText(this._formatter(value)))
			.switchToChild('.y-calendar-reset')
			.addClasses('-active');
	}

	_initPlaceholder(placeholder) {
		if (placeholder) {
			this._panelRef.unshiftChildren(
				Elba.from('div').addClasses('y-calendar-placeholder').setText(placeholder)
			);
		}
	}

	_initButtons(buttons = []) {
		if (buttons.length) {
			this._panelRef.pushChildren(
				...buttons.map(btn => Elba.from('button')
				.addClasses(`y-calendar-${btn}`)
				.setText(btn))
			);
		}
	}

	_initListeners() {
		this._calendar.on('change', value => value ? this.setValue(value) : this.clearValue());
		this._panelRef
			.switchToChild('.y-calendar-reset')
			.setListener('click', () => this.reset());
		this._panelRef
			.switchToChild('.y-calendar-open')
			.setListener('click', () => this._calendar.opened ? this.close() : this.open());
	}

	_init() {
		this._initListeners();
	}
}