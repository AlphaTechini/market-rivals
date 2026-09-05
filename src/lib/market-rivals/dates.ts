export function defaultStartTime(): string {
	const date = new Date(Date.now() + 30 * 60 * 1000);
	date.setSeconds(0, 0);
	const pad = (value: number) => value.toString().padStart(2, '0');
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
