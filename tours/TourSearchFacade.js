class TourSearchFacade {
	constructor({ destination, departure, calendar, nights, persons }) {
		this.destination = destination;
		this.from_city = departure;
		this.start_date = calendar;
		this.nights = nights;
		this.persons = persons;
	}

	getRawValue() {
		const [to_country, to_city] = isNull(this.destination.value) ? [null, null] : this.destination.value;
		const { date, range } = this.start_date.value;
		let kids, kids_ages;
		if (!isNull(this.persons.value.additional)) {
			const { additional } = this.persons.value;
			kids = additional.length;
			kids_ages = additional.join(',');
		}
		return {
			to_country,
			to_city,
			from_city: this.from_city.value,
			start_date: date,
			flex_date: range,
			nights: this.nights.value,
			adults: this.persons.value.value,
			kids,
			kids_ages,
		}
	}

	getParamsObject() {
		const raw = this.getRawValue();
		for (let key in raw) {
			if (isNull(raw[key])) {
				delete raw[key];
			}
		}
		return raw;
	}

	getParams() {
		const params = this.getParamsObject();
		return Object.keys(params)
			.map(key => `${key}=${stringify(params[key])}`)
			.join('&');
	}

	validate() {
		return this.destination.validate();
	}
}

const calendarOptions = {
	selector: '.y-calendar-input',
	calendar: {
		selector: '.y-calendar',
		length: 'year',
		withHeader: true,
		initial: 'first',
	},
	pattern: 'DD.MM.YYYY',
	placeholder: ' Дата выезда',
	buttons: ['open']
};

const nightsOptions = {
	element: document.querySelector('.days-counter'),
	value: 7,
	range: { min: 2, max: 15 },
	labels: ['день', 'дня', 'дней'],
};

const personsOptions = [
	{
		element: document.querySelector('.person-counter'),
		value: 2,
		range: { min: 1, max: 4 },
		labels: ['взрослый', 'взрослых'],
	},
	{ combinedLabels: ['человек', 'человека', 'человек'], limit: 3 },
];

const facade = new TourSearchFacade({
	destination: new DestinationControl({ selector: '.destination' }),
	departure: new DepartureControl({ selector: '.departure' }),
	calendar: new CalendarController(calendarOptions),
	nights: new RangedCounter(nightsOptions, 2),
	persons: new SeparatedCounter(...personsOptions),
});

Elba.of(document.querySelector('.send'))
	.setListener('click', () => {
		if (facade.validate()) {
			// TODO: send request to backend
			get('/tours.php', facade.getParamsObject())
			// 	.then(console.log).catch(console.log);
		}
	});

// TODO: decide, whether it is a part of calendar controller
const rangeBtn = document.querySelector('.range-button');
rangeBtn.addEventListener('click', function() {
	if (this.classList.contains('-active')) {
		this.classList.remove('-active');
		facade.start_date.clearRange();
	} else {
		this.classList.add('-active');
		facade.start_date.setRange(2);
	}
});