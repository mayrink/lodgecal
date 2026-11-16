function sortableValue(cell) {
	const raw = (cell.dataset?.sortValue ?? cell.textContent ?? '').replace(/\s+/g, ' ').trim();
	if (!raw) return { kind: 'empty', value: '' };
	if (/^\d{4}-\d{2}-\d{2}$/.test(raw) || /^\d{2}-\d{2}$/.test(raw)) {
		return { kind: 'date', value: raw };
	}

	const numericValue = Number(raw.replaceAll(',', ''));
	if (raw && Number.isFinite(numericValue)) return { kind: 'number', value: numericValue };
	return { kind: 'text', value: raw };
}

function compareCells(left, right) {
	const leftValue = sortableValue(left);
	const rightValue = sortableValue(right);

	if (leftValue.kind === 'empty') return rightValue.kind === 'empty' ? 0 : 1;
	if (rightValue.kind === 'empty') return -1;
	if (leftValue.kind === rightValue.kind && leftValue.kind === 'number') {
		return leftValue.value - rightValue.value;
	}
	if (leftValue.kind === rightValue.kind && leftValue.kind === 'date') {
		return leftValue.value.localeCompare(rightValue.value);
	}
	return String(leftValue.value).localeCompare(String(rightValue.value), undefined, {
		numeric: true,
		sensitivity: 'base'
	});
}

export function sortableTable(table) {
	const headers = Array.from(table.tHead?.rows ?? []).flatMap((row) => Array.from(row.cells));
	const cleanups = [];

	for (const [columnIndex, header] of headers.entries()) {
		if (header.classList.contains('actions-column') || !header.textContent.trim()) continue;

		const label = header.textContent.trim();
		const button = document.createElement('button');
		button.className = 'sort-button';
		button.type = 'button';
		while (header.firstChild) button.append(header.firstChild);
		header.append(button);
		header.setAttribute('aria-sort', 'none');

		const onClick = () => {
			const direction = header.getAttribute('aria-sort') === 'ascending' ? -1 : 1;
			for (const otherHeader of headers) {
				if (otherHeader !== header) otherHeader.setAttribute('aria-sort', 'none');
			}
			header.setAttribute('aria-sort', direction === 1 ? 'ascending' : 'descending');

			for (const body of table.tBodies) {
				const rows = Array.from(body.rows);
				const sortableRows = rows.filter((row) => row.cells[columnIndex]?.colSpan === 1);
				const fixedRows = rows.filter((row) => row.cells[columnIndex]?.colSpan !== 1);
			sortableRows.sort((left, right) => direction * compareCells(left.cells[columnIndex], right.cells[columnIndex]));
				body.append(...sortableRows, ...fixedRows);
			}
		};

		button.addEventListener('click', onClick);
		button.setAttribute('aria-label', `Sort by ${label}`);
		cleanups.push(() => button.removeEventListener('click', onClick));
	}

	return { destroy: () => cleanups.forEach((cleanup) => cleanup()) };
}