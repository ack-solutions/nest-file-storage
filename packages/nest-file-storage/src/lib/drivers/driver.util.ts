/** Collect a Node readable stream into a single Buffer. */
export async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream as AsyncIterable<Buffer | string>) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
}

/** Remove any trailing slashes (for joining base/CDN URLs with keys). */
export function stripTrailingSlash(value: string): string {
    return value.replace(/\/+$/, '');
}
