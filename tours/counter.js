class Counter {
	static getLabelForm(labels, count) {
		const rest = count % 100;
		// 4 ... 20
		if (rest > 4 && rest < 21) {
			return labels[2] || labels[1];
		}
		// 1
		if (rest % 10 === 1) {
			return labels[0];
		}
		// 2-4
		if (rest % 10 > 1 && rest % 10 < 5) {
			return labels[1];
		}
		return labels[2] || labels[1];
	}

	static checkRanges(range) {
		if (!range) {
			throw new TypeError('You must provide ranges for counter');
		}
		if (typeof range.min !== 'number') {
			throw new TypeError('Min range is not a number');
		}
		if (typeof range.max !== 'number') {
			throw new TypeError('Max range is not a number');
		}
		if (range.min >= range.max) {
			throw new RangeError(`Min range of ${range.min} is more than max range of ${range.max}`);
		}
	}

	static checkValue(range, value) {
		if (!value) {
			console.warn('Value was not set. Fallback to range max');
			return range.max;
		}
		if (value >= range.min && value <= range.max) {
			return value;
		}
		throw new RangeError(`Provided value of ${value} is out of the range`);
	}

	constructor({ element, labels, value, range }) {
		Counter.checkRanges(range);
		this.labels = labels;
		this.range = range;
		this._value = Counter.checkValue(range, value);
		this._counterRef = Elba.of(element).addClasses('y-counter')
			.pushChildren(
				Elba.from('button')
					.addClasses('y-counter-controller')
					.setText('Toggle counter')
					.setListener('click', this.toggle.bind(this))
			)
			.setText(this.label);
		this._valueRef = Elba.from('div')
			.addClasses('y-counter-value')
			.setText(this.label);

		this._createControllers();
	}

	_createControllers() {
		this._counterRef.pushChildren(
			Elba.from('div').addClasses('y-counter-container').pushChildren(
				Elba.from('div').addClasses('y-counter-wrapper').pushChildren(
					Elba.from('button')
					.addClasses('y-counter-button')
					.setText('-')
					.setListener('click', this._decrement.bind(this)),
					this._valueRef,
					Elba.from('button')
					.addClasses('y-counter-button')
					.setText('+')
					.setListener('click', this._increment.bind(this)),
				)
			)
		);
	}

	get label() {
		return `${this._value} ${Counter.getLabelForm(this.labels, this._value)}`;
	}

	get value() {
		return this._value;
	}

	open() {
		clickOutside(this._counterRef.element, this.close.bind(this));
		this._counterRef.addClasses('-active');
	}

	close() {
		this._counterRef.removeClasses('-active');
	}

	toggle() {
		this._counterRef.hasClass('-active') ? this.close() : this.open();
	}

	_decrement() {
		const value = this._value <= this.range.min ? this.range.min : this._value - 1;
		if (this._value === value) {
			return;
		}
		this._value = value;
		this._updateView();
	}

	_increment() {
		const value = this._value >= this.range.max ? this.range.max : this._value + 1;
		if (this._value === value) {
			return;
		}
		this._value = value;
		this._updateView();
	}

	_updateView() {
		[this._counterRef, this._valueRef].forEach(elRef => {
			elRef.removeTextNodes().setText(this.label);
		});
	}
}

class RangedCounter extends Counter {
	constructor(counter, between) {
		super(counter);
		if (!between) {
			throw new TypeError('RangedCounter works only with between property set. If you want to use' +
				' plain counter, please utilise Counter class');
		}
		this._between = between;
		this._withRange = false;

		this._counterRef
			.switchToChild('.y-counter-container')
			.pushChildren(
				Elba.from('div')
					.addClasses('y-counter-checkbox')
					.pushChildren(
						Elba.from('label')
							.pushChildren(
								Elba.from('input')
									.setAttributes({ name: 'type', value: 'checkbox' })
									.setListener('change', this.toggleRange.bind(this)),
								Elba.from('span').setText(`± ${between} ночи`),
							)
					)
			);
		this._betweenRef = Elba.from('span').addClasses('y-counter-range').setText(`±${between}`);
	}

	toggleRange() {
		this._withRange ? this.removeRange() : this.addRange();
	}

	addRange() {
		this._withRange = true;
		this._counterRef.addClasses('-with-range');
		this._counterRef.pushChildren(this._betweenRef);
	}

	removeRange() {
		this._withRange = false;
		this._counterRef.removeClasses('-with-range');
		this._counterRef.removeChild(this._betweenRef);
	}

	get value() {
		const from = this._withRange ? this._value - this._between : this._value;
		const to = this._withRange ? this._value + this._between : this._value;
		return { from, to };
	}
}

class SeparatedCounter extends Counter {
	constructor(counter, { combinedLabels, limit }) {
		super(counter);
		this._additional = [];
		this._combinedLabels = combinedLabels;
		this._limit = limit;

		this._counterRef
			.switchToChild('.y-counter-container')
			.pushChildren(
				Elba.from('div')
					.addClasses('y-counter-addition-list')
					.pushChildren(this._createSelect())
			);
	}

	get combinedLabel() {
		if (this._additional && this._additional.length) {
			const total = this._value + this._additional.length;
			return `${total} ${Counter.getLabelForm(this._combinedLabels, total)}`;
		}
		return `${this._value} ${Counter.getLabelForm(this.labels, this._value)}`;
	}

	get value() {
		return {
			value: this._value,
			additional: this._additional && this._additional.length ? this._additional : null
		}
	}

	_updateView() {
		this._counterRef.removeTextNodes().setText(this.combinedLabel);
		this._valueRef.removeTextNodes().setText(this.label);
	}

	_createSelect() {
		return Elba.from('div')
			.addClasses('y-counter-additional-select')
			.setText('+ Добавить ребенка')
			.pushChildren(
				Elba.from('select')
				.pushChildren(...this._createOptions())
				.setListener('change', this._addToList.bind(this))
			);
	}

	_createOptions() {
		return [
			Elba.from('option')
			.setAttributes(
				{ name: 'selected', value: 'selected' },
				{ name: 'disabled', value: 'disabled' },
			)
			.setText('на момент окончания поездки')
		].concat(Array.from({ length: 17 }, (v, i) => Elba.from('option')
			.setAttributes({ name: 'value', value: i })
			.setText(`${i} ${Counter.getLabelForm(['год', 'года', 'лет'], i)}`)));
	}

	_createItem(value) {
		const text = `Ребенок ${value} ${Counter.getLabelForm(['год', 'года', 'лет'], value)}`;
		return Elba.from('div')
			.addClasses('y-counter-additional-value')
			.setText(text)
			.pushChildren(
				Elba.from('button')
				.addClasses('y-counter-addition-remove')
				.setText('Remove')
				.setListener('click', event => this._removeFromList(event, value))
			);
	}

	_addToList(event) {
		const { value } = event.target;
		this._additional.push(value);
		const item = event.target.parentNode;
		Elba.of(item.parentNode)
			.removeChild(item)
			.pushChildren(
				this._createItem(value),
				this._additional.length < this._limit && this._createSelect()
			);
		this._updateView();
	}

	_removeFromList(event, value) {
		event.stopPropagation();
		const idx = this._additional.indexOf(value);
		if (idx > -1) {
			const item = event.target.parentNode;
			Elba.of(item.parentNode)
			.removeChild(item)
			.pushChildren(this._additional.length === this._limit && this._createSelect());
			this._additional.splice(idx, 1);
			this._updateView();
		}
	}
}