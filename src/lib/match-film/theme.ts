export const THEME = {
	bg: '#090c10',
	panel: '#11161c',
	panelEdge: '#2b333d',
	silver: '#eef2f5',
	muted: '#8f9aa6',
	green: '#29c779',
	red: '#f05252',
	blue: '#9fc7e8',
	fontStack: 'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif'
} as const;

export function font(weight: number, size: number): string {
	return `${weight} ${size}px ${THEME.fontStack}`;
}
