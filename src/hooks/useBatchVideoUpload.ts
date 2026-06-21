'use client';

import {useState, useRef, useCallback} from 'react';
import pLimit from 'p-limit';

export type VideoFileStatus = 'pending' | 'uploading' | 'merging' | 'analyzing' | 'completed' | 'error';

export interface VideoFileItem {
    id: string;
    file: File;
    status: VideoFileStatus;
    progress: number;
    items: AnalysisItem[];
    error?: string;
}

export interface AnalysisItem {
    id: string;
    room_name: string;
    item_name: string;
    description: string;
    condition: string;
    severity: string;
    elapsedSeconds: number;
    videoFileName?: string;
}

interface UseBatchVideoUploadOptions {
    chunkSize?: number;
    maxConcurrentChunks?: number;
    maxConcurrentFiles?: number;
}

function getFileExtension(file: File): string {
    const lastDot = file.name.lastIndexOf('.');
    if (lastDot === -1 || lastDot === 0) return 'mp4';
    return file.name.slice(lastDot + 1).toLowerCase();
}

export function useBatchVideoUpload(options: UseBatchVideoUploadOptions = {}) {
    const {chunkSize = 5 * 1024 * 1024, maxConcurrentChunks = 3, maxConcurrentFiles = 2} = options;
    const [files, setFiles] = useState<VideoFileItem[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const abortControllers = useRef<Map<string, AbortController>>(new Map());

    const updateFile = useCallback((id: string, updates: Partial<VideoFileItem>) => {
        setFiles(prev => prev.map(f => f.id === id ? {...f, ...updates} : f));
    }, []);

    const addFiles = useCallback((newFiles: File[]) => {
        const items: VideoFileItem[] = newFiles.map(file => ({
            id: crypto.randomUUID(),
            file,
            status: 'pending' as const,
            progress: 0,
            items: [],
        }));
        setFiles(prev => [...prev, ...items]);
        return items;
    }, []);

    const removeFile = useCallback((id: string) => {
        const controller = abortControllers.current.get(id);
        if (controller) {
            controller.abort();
            abortControllers.current.delete(id);
        }
        setFiles(prev => prev.filter(f => f.id !== id));
    }, []);

    const clearCompleted = useCallback(() => {
        setFiles(prev => prev.filter(f => f.status !== 'completed'));
    }, []);

    const uploadChunks = async (fileItem: VideoFileItem, signal: AbortSignal): Promise<string> => {
        const {file, id} = fileItem;
        const fileId = id;
        const totalChunks = Math.ceil(file.size / chunkSize);
        const limit = pLimit(maxConcurrentChunks);
        let uploadedChunks = 0;

        updateFile(id, {status: 'uploading', progress: 0});

        const tasks = [];
        for (let i = 0; i < totalChunks; i++) {
            const start = i * chunkSize;
            const end = Math.min(start + chunkSize, file.size);
            const chunk = file.slice(start, end);

            tasks.push(limit(async () => {
                if (signal.aborted) throw new DOMException('Aborted', 'AbortError');

                const formData = new FormData();
                formData.append('file_id', fileId);
                formData.append('chunk_index', i.toString());
                formData.append('total_chunks', totalChunks.toString());
                formData.append('file', chunk);

                const res = await fetch('/api/videos/upload-chunk', {
                    method: 'POST',
                    body: formData,
                    signal,
                });
                if (!res.ok) throw new Error(`Chunk ${i} upload failed`);

                uploadedChunks++;
                const progress = Math.round((uploadedChunks / totalChunks) * 90);
                updateFile(id, {progress});
            }));
        }

        await Promise.all(tasks);

        updateFile(id, {status: 'merging', progress: 92});

        const mergeRes = await fetch('/api/videos/merge-chunks', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                file_id: fileId,
                file_ext: getFileExtension(file),
                total_chunks: totalChunks,
            }),
            signal,
        });

        if (!mergeRes.ok) throw new Error('Chunk merge failed');

        const mergeData = await mergeRes.json();
        updateFile(id, {progress: 95});

        return mergeData.filePath;
    };

    const analyzeVideo = async (fileItem: VideoFileItem, filePath: string, signal: AbortSignal): Promise<AnalysisItem[]> => {
        updateFile(fileItem.id, {status: 'analyzing', progress: 96});

        const res = await fetch('/api/videos/analyze', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                filePath,
                mimeType: fileItem.file.type || 'video/mp4',
                fileName: fileItem.file.name,
            }),
            signal,
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Analysis failed');
        }

        const data = await res.json();
        return (data.items || []).map((item: any) => ({
            ...item,
            videoFileName: fileItem.file.name,
        }));
    };

    const processFile = async (fileItem: VideoFileItem) => {
        const controller = new AbortController();
        abortControllers.current.set(fileItem.id, controller);

        try {
            const filePath = await uploadChunks(fileItem, controller.signal);
            const items = await analyzeVideo(fileItem, filePath, controller.signal);

            updateFile(fileItem.id, {
                status: 'completed',
                progress: 100,
                items,
            });
        } catch (error: any) {
            if (error.name === 'AbortError') {
                updateFile(fileItem.id, {status: 'error', error: 'Cancelled'});
            } else {
                updateFile(fileItem.id, {status: 'error', error: error.message || 'Processing failed'});
            }
        } finally {
            abortControllers.current.delete(fileItem.id);
        }
    };

    const startProcessing = useCallback(async () => {
        setIsProcessing(true);
        const limit = pLimit(maxConcurrentFiles);
        const pendingFiles = files.filter(f => f.status === 'pending');

        const tasks = pendingFiles.map(fileItem =>
            limit(() => processFile(fileItem))
        );

        await Promise.allSettled(tasks);
        setIsProcessing(false);
    }, [files, maxConcurrentFiles]);

    const abortAll = useCallback(() => {
        abortControllers.current.forEach(c => c.abort());
        abortControllers.current.clear();
        setFiles(prev => prev.map(f =>
            f.status === 'uploading' || f.status === 'merging' || f.status === 'analyzing'
                ? {...f, status: 'error' as const, error: 'Cancelled'}
                : f
        ));
        setIsProcessing(false);
    }, []);

    const allItems = files.flatMap(f => f.items);
    const completedCount = files.filter(f => f.status === 'completed').length;
    const errorCount = files.filter(f => f.status === 'error').length;

    return {
        files,
        addFiles,
        removeFile,
        clearCompleted,
        startProcessing,
        abortAll,
        isProcessing,
        allItems,
        completedCount,
        errorCount,
    };
}
