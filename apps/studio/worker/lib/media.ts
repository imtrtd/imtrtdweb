import { id } from "./http";

const ALLOWED = new Set([
	"image/jpeg",
	"image/png",
	"image/webp",
	"image/gif",
]);

const EXT: Record<string, string> = {
	"image/jpeg": "jpg",
	"image/png": "png",
	"image/webp": "webp",
	"image/gif": "gif",
};

export async function uploadMedia(
	bucket: R2Bucket,
	file: File,
): Promise<{ key: string; url: string; contentType: string }> {
	if (!ALLOWED.has(file.type)) {
		throw new Error("Допустимы только JPEG, PNG, WebP, GIF");
	}
	if (file.size > 5 * 1024 * 1024) {
		throw new Error("Файл больше 5MB");
	}

	const key = `cases/${id("img")}.${EXT[file.type] ?? "bin"}`;
	await bucket.put(key, await file.arrayBuffer(), {
		httpMetadata: { contentType: file.type },
	});

	return {
		key,
		url: `/api/media/${key}`,
		contentType: file.type,
	};
}

export async function getMedia(
	bucket: R2Bucket,
	key: string,
): Promise<Response | null> {
	const object = await bucket.get(key);
	if (!object) {
		return null;
	}

	const headers = new Headers();
	object.writeHttpMetadata(headers);
	headers.set("etag", object.httpEtag);
	headers.set("Cache-Control", "public, max-age=31536000, immutable");

	return new Response(object.body, { headers });
}
