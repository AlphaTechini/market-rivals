// Avatars must be CORS-fetched before canvas use, otherwise the canvas
// taints and every export path (getImageData, captureStream) throws.
export async function loadAvatarBitmap(url: string | null): Promise<ImageBitmap | null> {
	if (!url) return null;
	try {
		const response = await fetch(url, { mode: 'cors' });
		if (!response.ok) return null;
		const blob = await response.blob();
		return await createImageBitmap(blob);
	} catch {
		return null;
	}
}
