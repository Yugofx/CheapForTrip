class Elba {
	static of(el) {
		return new Elba(el);
	}

	static from(tag) {
		return new Elba(document.createElement(tag));
	}

	static fragment() {
		return new Elba(document.createDocumentFragment());
	}

	static right(el) {
		return new ElbaRight(el);
	}

	static left(el) {
		return new ElbaLeft(el);
	}

	static fromNullable(el) {
		return el === null ? Elba.left(el) : Elba.right(el);
	}

	constructor(el) {
		this._element = el;
	}

	get element() {
		return this._element;
	}

	// Basic functor
	map(f) {
		return Elba.of(f(this._element));
	}

	// Applied functors
	addClasses(...classes) {
		return this.map(el => {
			for (let cl of classes) {
				if (typeof cl === 'string') {
					cl.split(' ').forEach(clazz => el.classList.add(clazz));
				}
			}
			return el;
		});
	}

	removeClasses(...classes) {
		return this.map(el => {
			for (let cl of classes) {
				if (typeof cl === 'string') {
					cl.split(' ').forEach(clazz => el.classList.remove(clazz));
				}
			}
			return el;
		})
	}

	pushChildren(...children) {
		return this.map(el => {
			for (let child of children) {
				if (child) {
					if (typeof child === 'string') {
						el.appendChild(document.createTextNode(child));
					} else if (child instanceof Elba) {
						el.appendChild(child.element);
					} else {
						el.appendChild(child);
					}
				}
			}
			return el;
		});
	}

	unshiftChildren(...children) {
		return this.map(el => {
			for (let child of children.reverse()) {
				if (child) {
					if (typeof child === 'string') {
						el.insertBefore(document.createTextNode(child), el.firstChild);
					} else if (child instanceof Elba) {
						el.insertBefore(child.element, el.firstChild);
					} else {
						el.insertBefore(child, el.firstChild);
					}
				}
			}
			return el;
		});
	}

	removeChild(child) {
		return this.map(el => {
			if (child) {
				if (child instanceof Elba) {
					el.removeChild(child.element);
				} else {
					el.removeChild(child);
				}
			}
			return el;
		});
	}

	setAttributes(...attrs) {
		return this.map(el => {
			if (attrs.length) {
				for (let attr of attrs) {
					el.setAttribute(attr.name, attr.value);
				}
			}
			return el;
		});
	}

	removeAttributes(...attrs) {
		return this.map(el => {
			if (attrs.length) {
				for (let attr of attrs) {
					el.removeAttribute(attr);
				}
			}
			return el;
		});
	}

	switchToChild(selector) {
		const el = this._element.querySelector(selector);
		return Elba.fromNullable(el);
	}

	setText(string) {
		return this.map(el => {
			if (string) {
				el.appendChild(document.createTextNode(string));
			}
			return el;
		});
	}

	removeTextNodes() {
		return this.map(el => {
			for (let i = 0, child; !!(child = el.childNodes[i]); i++) {
				if (child.nodeType === document.TEXT_NODE) {
					el.removeChild(child);
				}
			}
			return el;
		});
	}

	setListener(event, cb) {
		return this.map(el => {
			el.addEventListener(event, cb);
			return el;
		});
	}

	insertIn(parent) {
		return this.map(el => {
			if (parent instanceof Elba) {
				parent.element.appendChild(el);
			} else {
				parent.appendChild(el);
			}
			return el;
		});
	}

	hasClass(token) {
		return this.element.classList.contains(token);
	}

	chain(f) {
		return f(this._element);
	}
}

class ElbaRight extends Elba {}

class ElbaLeft extends Elba {
	get element() {
		throw new ReferenceError('Cannot extract element from ElbaLeft(element)');
	}

	map(_) {
		return this;
	}

	chain(_) {
		return null;
	}
}
