function isNull(value) {
	return value === undefined || value === null;
}

function stringify(any) {
	if (typeof any === 'string') {
		return any;
	}
	return JSON.stringify(any);
}

function get(url, params) {
	return new Promise((resolve, reject) => {
		let query = Object.keys(params)
			.map(key => `${key}=${stringify(params[key])}`)
			.join('&');
		const xhr = new XMLHttpRequest();
		xhr.open('GET', `${url}?${query}`);
		xhr.onload = () => resolve(JSON.parse(xhr.response));
		xhr.error = () => reject(JSON.parse(xhr.response));
		xhr.send();
	});
}

function clickOutside(target, cb) {
	const listener = ((target, cb) => event => {
		let isClickedOutside = true;
		let node = event.target;
		while (node !== null) {
			if (node === target) {
				isClickedOutside = false;
				break;
			}
			node = node.parentNode;
		}
		if (isClickedOutside) {
			cb();
			document.removeEventListener('click', listener);
		}
	})(target, cb);
	document.addEventListener('click', listener);
	return listener;
}

function normalise(string) {
	return string.trim().toLowerCase();
}