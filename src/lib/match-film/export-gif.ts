import { encode, type UnencodedFrame } from 'modern-gif';
import { drawFrame } from './draw-frame';
import type { MatchFilmData } from './types';

// 480px / 10fps keeps raw retained frames (~0.9 MB each) within a sane
// memory budget on mobile; the GIF is the compatibility fallback, not the
// flagship format.
const GIF_SIZE = 480;
const GIF_FPS = 10;

export async function exportMatchFilmGif(
	data: MatchFilmData,
	onProgress?: (ratio: number) => void
): Promise<Blob> {
	const canvas = document.createElement('canvas');
	canvas.width = GIF_SIZE;
	canvas.height = GIF_SIZE;
	const ctx = canvas.getContext('2d', { willReadFrequently: true });
	if (!ctx) throw new Error('Canvas 2D is unavailable.');

	const frameCount = Math.round(data.totalDuration * GIF_FPS);
	const frames: UnencodedFrame[] = [];

	ctx.scale(GIF_SIZE / 1080, GIF_SIZE / 1080);
	for (let frame = 0; frame < frameCount; frame++) {
		drawFrame(ctx, data, frame / GIF_FPS);
		const image = ctx.getImageData(0, 0, GIF_SIZE, GIF_SIZE);
		// getImageData always allocates a fresh ArrayBuffer; the cast only
		// satisfies the ArrayBufferLike-to-ArrayBuffer generic mismatch
		frames.push({
			data: image.data as unknown as UnencodedFrame['data'],
			delay: 1000 / GIF_FPS
		});
		onProgress?.((frame + 1) / frameCount);
	}

	return encode({
		format: 'blob',
		width: GIF_SIZE,
		height: GIF_SIZE,
		frames,
		maxColors: 255,
		dither: 'floyd-steinberg'
	});
}
