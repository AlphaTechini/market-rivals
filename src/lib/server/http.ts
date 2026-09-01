export async function readJson(request: Request): Promise<Record<string, unknown>> {
	try {
		const body: unknown = await request.json();
		if (!body || typeof body !== 'object' || Array.isArray(body)) return {};
		return body as Record<string, unknown>;
	} catch {
		return {};
	}
}

export function stringField(body: Record<string, unknown>, key: string): string | null {
	const value = body[key];
	return typeof value === 'string' ? value.trim() : null;
}

export function numberField(body: Record<string, unknown>, key: string): number | null {
	const value = body[key];
	if (typeof value === 'number') return Number.isFinite(value) ? value : null;
	if (typeof value !== 'string' || value.trim() === '') return null;
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : null;
}

export function isUuid(value: string): boolean {
	return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
