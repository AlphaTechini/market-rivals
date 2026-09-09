import { BufferTarget, CanvasSource, Mp4OutputFormat, Output, canEncodeVideo } from 'mediabunny';
import { drawFrame } from './draw-frame';
import { FILM_FPS, FILM_SIZE, type MatchFilmData } from './types';

export async function canExportMatchFilmMp4(): Promise<boolean> {
	try {
		return await canEncodeVideo('avc', { bitrate: 9_000_000 });
	} catch {
		return false;
	}
}

export async function exportMatchFilmMp4(
	data: MatchFilmData,
	onProgress?: (ratio: number) => void
): Promise<Blob> {
	if (!(await canExportMatchFilmMp4())) {
		throw new Error('This browser cannot encode MP4 video. Try the GIF export.');
	}

	const canvas = document.createElement('canvas');
	canvas.width = FILM_SIZE;
	canvas.height = FILM_SIZE;
	const ctx = canvas.getContext('2d');
	if (!ctx) throw new Error('Canvas 2D is unavailable.');

	const frameCount = Math.round(data.totalDuration * FILM_FPS);
	const output = new Output({
		format: new Mp4OutputFormat({ fastStart: 'in-memory' }),
		target: new BufferTarget()
	});
	const source = new CanvasSource(canvas, {
		codec: 'avc',
		bitrate: 9_000_000,
		keyFrameInterval: 2,
		latencyMode: 'quality'
	});
	output.addVideoTrack(source, { maximumPacketCount: Math.ceil((frameCount * 4) / 3) });

	for (let frame = 0; frame < frameCount; frame++) {
		drawFrame(ctx, data, frame / FILM_FPS);
		await source.add(frame / FILM_FPS, 1 / FILM_FPS);
		onProgress?.((frame + 1) / frameCount);
	}

	source.close();
	await output.finalize();

	const buffer = output.target instanceof BufferTarget ? output.target.buffer : null;
	if (!buffer) throw new Error('MP4 encoding produced no output.');
	return new Blob([buffer], { type: 'video/mp4' });
}
