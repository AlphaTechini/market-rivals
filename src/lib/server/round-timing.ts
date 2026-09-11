const marketCutBufferMs = 60_000;

export function roundPickDeadline(locksAt: Date, marketExpiresAt: Date | null): Date {
	if (!marketExpiresAt) return locksAt;
	return new Date(Math.min(locksAt.getTime(), marketExpiresAt.getTime() - marketCutBufferMs));
}
