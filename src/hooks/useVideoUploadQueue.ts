'use client';

import {useState, useRef, useCallback} from 'react';
import pLimit from 'p-limit';
import {apiPost} from '@/lib/api';
import {arrayMove} from "@dnd-kit/sortable";

// ─── Types ────────────────────────────────────────────────────────────────────

export type UploadFileStatus = 'pending' | 'uploading' | 'merging' | 'saving' | 'completed' | 'error';

export interface UploadFileItem {
    id: string;
    file: File;
    status: UploadFileStatus;
    progress: number;
    url?: string;
    error?: string;
    file_index: number;
}

interface MergerdVideo {
    name: string,
    path: string,
    url: string,

    [key: string]: any
}

interface UseVideoUploadQueueOptions {
    chunkSize?: number;
    maxConcurrentFiles?: number;
    maxConcurrentChunks?: number;
    saveDir?: string;
    autoRemoveCompleted?: boolean;
    onFileCompleted?: (item: UploadFileItem, video: MergerdVideo) => void | Promise<void>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getFileExtension(file: File): string {
    const lastDot = file.name.lastIndexOf('.');
    if (lastDot === -1 || lastDot === 0) return 'mp4';
    return file.name.slice(lastDot + 1).toLowerCase();
}

export function formatFileSize(bytes: number): string {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useVideoUploadQueue(options: UseVideoUploadQueueOptions = {}) {
    const {
        chunkSize = 5 * 1024 * 1024,
        maxConcurrentFiles = 5,
        maxConcurrentChunks = 3,
        saveDir = 'videos',
        autoRemoveCompleted = false,
        onFileCompleted,
    } = options;

    const [files, setFiles] = useState<UploadFileItem[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const abortControllers = useRef<Map<string, AbortController>>(new Map());

    const updateFile = useCallback((id: string, updates: Partial<UploadFileItem>) => {
        setFiles(prev => prev.map(f => f.id === id ? {...f, ...updates} : f));
    }, []);

    // ── Add files to queue ────────────────────────────────────────────────────

    const addFiles = useCallback((fileList: FileList | File[]) => {
        const videoFiles = Array.from(fileList).filter(f => f.type.startsWith('video/'));
        if (videoFiles.length === 0) return;

        const items: UploadFileItem[] = videoFiles.map((file, index) => ({
            id: crypto.randomUUID(),
            file,
            status: 'pending' as const,
            progress: 0,
            file_index: index,
        }));
        setFiles(prev => [...prev, ...items]);
    }, []);

    // ── Remove / cancel a single file ─────────────────────────────────────────

    const removeFile = useCallback((fileId: string) => {
        const controller = abortControllers.current.get(fileId);
        if (controller) {
            controller.abort();
            abortControllers.current.delete(fileId);
        }
        setFiles(prev => prev.filter(f => f.id !== fileId));
    }, []);

    // ── Reset a failed file back to pending ───────────────────────────────────

    const retryFile = useCallback((fileId: string) => {
        setFiles(prev => prev.map(f =>
            f.id === fileId ? {...f, status: 'pending' as const, progress: 0, error: undefined} : f
        ));
    }, []);

    // ── Clear completed files from list ───────────────────────────────────────

    const clearCompleted = useCallback(() => {
        setFiles(prev => prev.filter(f => f.status !== 'completed'));
    }, []);

    // ── Reorder files ─────────────────────────────────────────────────────────

    const reorderFiles = useCallback((oldIndex: number, newIndex: number) => {
        setFiles(prev => arrayMove(prev, oldIndex, newIndex));
    }, []);

    // ── Clear all files ───────────────────────────────────────────────────────

    const clearAll = useCallback(() => {
        abortControllers.current.forEach(c => c.abort());
        abortControllers.current.clear();
        setFiles([]);
        setIsUploading(false);
    }, []);

    // ── Upload a single file (chunk → merge → save) ──────────────────────────

    const uploadSingleFile = async (item: UploadFileItem) => {
        const controller = new AbortController();
        abortControllers.current.set(item.id, controller);

        const fileId = item.id;
        const totalChunks = Math.ceil(item.file.size / chunkSize);
        const chunkLimit = pLimit(maxConcurrentChunks);
        let uploadedChunks = 0;

        updateFile(item.id, {status: 'uploading', progress: 0});

        // 1. Upload all chunks concurrently
        const chunkTasks = [];
        for (let i = 0; i < totalChunks; i++) {
            const start = i * chunkSize;
            const end = Math.min(start + chunkSize, item.file.size);
            const chunk = item.file.slice(start, end);

            chunkTasks.push(chunkLimit(async () => {
                if (controller.signal.aborted) throw new DOMException('Aborted', 'AbortError');

                const formData = new FormData();
                formData.append('file_id', fileId);
                formData.append('chunk_index', i.toString());
                formData.append('total_chunks', totalChunks.toString());
                formData.append('file', chunk);

                await apiPost('/file/chunk/part', formData, {signal: controller.signal});

                uploadedChunks++;
                const progress = Math.round((uploadedChunks / totalChunks) * 85);
                updateFile(item.id, {progress});
            }));
        }

        await Promise.all(chunkTasks);

        // 2. Merge chunks on server
        updateFile(item.id, {status: 'merging', progress: 88});

        const mergeResponse = await apiPost('/file/chunk/merge', {
            file_id: fileId,
            file_ext: getFileExtension(item.file),
            save_dir: saveDir,
        }, {signal: controller.signal});

        // 3. Callback for saving to remote (e.g. associate with inspection)
        updateFile(item.id, {status: 'saving', progress: 93});

        const serverUrl = mergeResponse.url || mergeResponse.path || mergeResponse.data?.url || mergeResponse.data?.path || '';

        if (onFileCompleted) {
            await onFileCompleted({...item, url: serverUrl}, mergeResponse);
        }

        abortControllers.current.delete(item.id);

        if (autoRemoveCompleted) {
            setFiles(prev => prev.filter(f => f.id !== item.id));
        } else {
            updateFile(item.id, {status: 'completed', progress: 100, url: serverUrl});
        }
    };

    // ── Start batch upload ────────────────────────────────────────────────────

    const startUpload = useCallback(async () => {
        const pendingFiles = files.filter(f => f.status === 'pending');
        if (pendingFiles.length === 0) return;

        setIsUploading(true);
        const fileLimit = pLimit(maxConcurrentFiles);

        const tasks = pendingFiles.map((item, index) =>
            fileLimit(async () => {
                try {
                    await uploadSingleFile({...item, file_index: index});
                } catch (error: any) {
                    const errorMsg = error.name === 'AbortError' ? 'Cancelled' : (error.message || 'Upload failed');
                    updateFile(item.id, {status: 'error', error: errorMsg});
                }
            })
        );

        await Promise.allSettled(tasks);
        setIsUploading(false);
    }, [files, maxConcurrentFiles]);

    // ── Abort all uploads ─────────────────────────────────────────────────────

    const abortAll = useCallback(() => {
        abortControllers.current.forEach(c => c.abort());
        abortControllers.current.clear();
        setFiles(prev => prev.map(f =>
            f.status === 'uploading' || f.status === 'merging' || f.status === 'saving'
                ? {...f, status: 'error' as const, error: 'Cancelled'}
                : f
        ));
        setIsUploading(false);
    }, []);

    // ── Computed values ───────────────────────────────────────────────────────

    const pendingCount = files.filter(f => f.status === 'pending').length;
    const completedCount = files.filter(f => f.status === 'completed').length;
    const errorCount = files.filter(f => f.status === 'error').length;
    const activeCount = files.filter(f => f.status === 'uploading' || f.status === 'merging' || f.status === 'saving').length;
    const totalSize = files.reduce((sum, f) => sum + f.file.size, 0);
    const hasFiles = files.length > 0;

    return {
        files,
        addFiles,
        removeFile,
        retryFile,
        reorderFiles,
        clearCompleted,
        clearAll,
        startUpload,
        abortAll,
        isUploading,
        pendingCount,
        completedCount,
        errorCount,
        activeCount,
        totalSize,
        hasFiles,
    };
}
