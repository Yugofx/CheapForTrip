class Tip {
	static for(element) {
		return new Tip(element);
	}

	static window() {
		const div = document.createElement('div');
		div.setAttribute('class', 'tip-window');
		return div;
	}

	constructor(element) {
		this._element = element;
		this._visible = false;
		this._window = Tip.window();
		this._messageNode = document.createTextNode('');
		this._prevMessage = null;
	}

	show({ level, message }) {
		if (this._prevMessage === message) {
			return;
		}
		this.destroy();
		this._prevMessage = message;
		this._window.classList.add(`-${level}`);
		this._messageNode = document.createTextNode(message);
		this._window.appendChild(this._messageNode);
		this._element.appendChild(this._window);
	}

	destroy() {
		if (this._window.parentNode === this._element) {
			this._prevMessage = null;
			this._resetType();
			this._window.removeChild(this._messageNode);
			this._element.removeChild(this._window);
		}
	}

	_resetType() {
		this._window.className = 'tip-window';
	}

	get visible() {
		return this._visible;
	}
}