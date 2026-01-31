import { CopyObjectCommand, GetObjectCommandInput, PutObjectCommandInput, S3 } from '@aws-sdk/client-s3';
import { DeleteObjectCommand, GetObjectCommand, GetObjectCommandOutput, HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import moment from 'moment';
import { StorageEngine } from 'multer';
import path, { basename, join } from 'path';
import { Readable } from 'stream';
import { v4 as uuidv4 } from 'uuid';


import { S3StorageOptions, Storage, UploadedFile } from '../types';


export class S3Storage implements StorageEngine, Storage {

    private s3: S3;
    private fileNameFunction: (file: Express.Multer.File, req?: any) => string | Promise<string>;
    private fileDistFunction: (file: Express.Multer.File, req?: any) => string | Promise<string>;

    constructor(private options: S3StorageOptions) {
        this.fileNameFunction = options.fileName || ((file, _req) => {
            return `${uuidv4()}-${file.originalname}`;
        });

        this.fileDistFunction = options.fileDist || ((_file, _req) => {
            return path.join('uploads', moment().format('YYYY'), moment().format('MM'), moment().format('DD'));
        });

        this.s3 = new S3({
            ...(this.options ?? {}),
            credentials: {
                accessKeyId: this.options.accessKeyId,
                secretAccessKey: this.options.secretAccessKey,
            },
        });
    }

    _handleFile(
        req: any,
        file: Express.Multer.File,
        cb: (error?: any, info?: any) => void,
    ): void {
        // Collect file chunks to determine size
        const chunks: Uint8Array[] = [];
        file.stream.on('data', (chunk) => chunks.push(chunk));
        file.stream.on('end', () => {
            (async () => {
                const buffer = Buffer.concat(chunks);

                try {
                    const dist = await this.fileDistFunction(file, req);
                    const key = await this.fileNameFunction(file, req);
                    const filePath = join(dist, key);

                    const uploadedFile = await this.putFile(buffer, filePath, {
                        ContentType: file?.mimetype
                    });

                    const fileInfo: UploadedFile = {
                        ...uploadedFile,
                        fieldName: file.fieldname,
                        originalName: file.originalname,
                        mimetype: file.mimetype,
                    };
                    let transformData = fileInfo;

                    if (this.options?.transformUploadedFileObject) {
                        transformData = await this.options.transformUploadedFileObject(fileInfo);
                    }
                    cb(null, transformData);
                } catch (err) {
                    cb(err);
                }
            })().catch((err) => cb(err));
        });

        file.stream.on('error', (err) => cb(err));
    }

    _removeFile(
        _req: any,
        file: any,
        cb: (error: Error | null) => void,
    ): void {
        const params = {
            Bucket: this.options.bucket,
            Key: file.key,
        };

        this.s3
            .deleteObject(params)
            .then(() => cb(null))
            .catch((err) => cb(err));
    }

    getUrl(key: string) {
        if (this.options?.cloudFrontUrl) {
            return `${this.options.cloudFrontUrl}/${key}`;
        }
        return `https://${this.options.bucket}.s3.amazonaws.com/${key}`;
    }

    async getSignedUrl(key: string, objectConfig?: Partial<GetObjectCommandInput>): Promise<string> {
        if (key) {
            const url = await getSignedUrl(
                this.s3 as any,
                new GetObjectCommand({
                    Bucket: this.options.bucket,
                    Key: key,
                    ...(objectConfig && { ...objectConfig }),
                }),
            );
            return url;
        }
        return '';
    }

    async getFile(key: string): Promise<Buffer> {
        if (!key) {
            throw new Error('Key is required to fetch the file from S3.');
        }

        try {
            const command = new GetObjectCommand({
                Bucket: this.options.bucket,
                Key: key,
            });

            const data: GetObjectCommandOutput = await this.s3.send(command);

            if (!data.Body) {
                throw new Error('Empty response received from S3.');
            }

            // Handle both Buffer and Readable Stream responses
            if (data.Body instanceof Readable) {
                return await this.streamToBuffer(data.Body);
            }

            throw new Error('Unexpected data.Body type received from S3.');
        } catch (error) {
            console.error(`Error fetching file (${key}) from S3:`, error);
            throw error;
        }
    }


    async putFile(fileContent: Buffer, key: string, options?: Partial<PutObjectCommandInput>): Promise<any> {
        try {
            const fileName = basename(key);
            const fileKey = key || (Math.random() + 1).toString(36).substring(12);

            // Clean the filename of characters that break header syntax (quotes and backslashes)
            const safeAscii = fileName
                .replace(/[^\x20-\x7E]/g, '_') // Replace non-ASCII with underscores
                .replace(/["\\]/g, '_');        // Replace " and \ with underscores

            const encodedFileName = encodeURIComponent(fileName);


            // Upload the file
            const putParams = {
                Bucket: this.options.bucket,
                Key: fileKey,
                Body: fileContent,
                // Use the safeAscii for 'filename' and encoded for 'filename*'
                ContentDisposition: `inline; filename="${safeAscii}"; filename*=UTF-8''${encodedFileName}`,
                ...options,
            };

            await this.s3.send(new PutObjectCommand(putParams));

            // Fetch file metadata to get size
            const headParams = {
                Bucket: this.options.bucket,
                Key: fileKey,
            };

            const headObject = await this.s3.send(new HeadObjectCommand(headParams));
            const fileSize = headObject.ContentLength || 0;

            // Construct response object
            const fileData: UploadedFile = {
                originalName: fileName,
                fileName: fileName,
                size: fileSize,
                buffer: fileContent,
                fullPath: fileKey,
                key: fileKey,
                url: this.getUrl(fileKey),
            };
            return fileData;
        } catch (error) {
            console.error('Error uploading file to S3:', error);
            throw error;
        }
    }


    async deleteFile(key: string): Promise<void> {
        if (!key) {
            throw new Error('File key is required for deletion.');
        }

        try {
            const deleteParams = {
                Bucket: this.options.bucket,
                Key: key,
            };

            await this.s3.send(new DeleteObjectCommand(deleteParams));
        } catch (error) {
            console.error(`Error deleting file (${key}) from S3:`, error);
            throw error;
        }
    }


    private async streamToBuffer(stream: Readable): Promise<Buffer> {
        const chunks: Uint8Array[] = [];
        for await (const chunk of stream) {
            chunks.push(chunk);
        }
        return Buffer.concat(chunks);
    }

    async copyFile(oldKey: string, newKey: string): Promise<UploadedFile> {
        try {
            await this.s3.send(new CopyObjectCommand({
                Bucket: this.options.bucket,
                CopySource: `/${this.options.bucket}/${oldKey}`,
                Key: newKey,
            }));

            const headObject = await this.s3.send(new HeadObjectCommand({
                Bucket: this.options.bucket,
                Key: newKey,
            }));

            return {
                originalName: basename(newKey),
                size: headObject.ContentLength || 0,
                fileName: basename(newKey),
                key: newKey,
                fullPath: newKey,
                url: this.getUrl(newKey),
            };
        } catch (error) {
            console.error('Error copying file in S3:', error);
            throw error;
        }
    }


}
