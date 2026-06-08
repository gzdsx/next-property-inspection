'use client';

import React, {useState, useEffect, useRef, useCallback} from 'react';
import {
    Button,
    Tag,
    Progress,
    App,
} from 'antd';
import {
    UploadOutlined,
    CloseOutlined,
    PauseCircleOutlined,
    PlayCircleOutlined,
} from '@ant-design/icons';

export interface UploadTask {
    uid: string;
    file: File;
    status: 'pending' | 'uploading' | 'success' | 'error';
    progress: number;
    errorMsg?: string;
}

interface BatchUploaderProps {
    uploadUrl: string;
    maxConcurrent?: number;
    fieldName?: string;
    i18n: {
        selectFiles: string;
        uploadError: string;
        uploadComplete: string;
        uploaded: string;
        pending: string;
        pause: string;
        resume: string;
        dragHint: string;
        uploadStats: (params: { total: number; uploading: number; pending: number; success: number; error: number }) => string;
    };
    onComplete?: () => void;
}

function formatFileSize(size: number) {
    if (!size) return '-';
    if (size < 1024) return size + ' B';
    if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB';
    return (size / (1024 * 1024)).toFixed(1) + ' MB';
}

export default function BatchUploader({
    uploadUrl,
    maxConcurrent = 5,
    fieldName = 'file',
    i18n,
    onComplete,
}: BatchUploaderProps) {
    const {message} = App.useApp();
    const [uploadTasks, setUploadTasks] = useState<UploadTask[]>([]);
    const [isPaused, setIsPaused] = useState(false);
    const isPausedRef = useRef(false);
    const uploadTasksRef = useRef<UploadTask[]>([]);
    const completedNotifiedRef = useRef(false);
    const activeUploadsRef = useRef(0);
    const processingRef = useRef(false);

    // Keep refs in sync
    useEffect(() => {
        uploadTasksRef.current = uploadTasks;
    }, [uploadTasks]);
    useEffect(() => {
        isPausedRef.current = isPaused;
    }, [isPaused]);

    const updateTask = useCallback((uid: string, updates: Partial<UploadTask>) => {
        setUploadTasks(prev => prev.map(task => task.uid === uid ? {...task, ...updates} : task));
    }, []);

    const uploadSingleFile = useCallback(async (task: UploadTask) => {
        updateTask(task.uid, {status: 'uploading', progress: 0});
        activeUploadsRef.current++;

        try {
            const session = await import('next-auth/react').then(({getSession}) => getSession());

            await new Promise<void>((resolve) => {
                const xhr = new XMLHttpRequest();
                const formData = new FormData();
                formData.append(fieldName, task.file);

                xhr.open('POST', uploadUrl);

                const token = (session as any)?.accessToken;
                if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

                xhr.upload.onprogress = (e) => {
                    if (e.lengthComputable) {
                        const pct = Math.round((e.loaded / e.total) * 100);
                        updateTask(task.uid, {progress: pct});
                    }
                };

                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        updateTask(task.uid, {status: 'success', progress: 100});
                        resolve();
                    } else {
                        let errMsg = i18n.uploadError;
                        try {
                            const resp = JSON.parse(xhr.responseText);
                            errMsg = resp.message || errMsg;
                        } catch {}
                        updateTask(task.uid, {status: 'error', errorMsg: errMsg});
                        resolve();
                    }
                };

                xhr.onerror = () => {
                    updateTask(task.uid, {status: 'error', errorMsg: i18n.uploadError});
                    resolve();
                };

                xhr.send(formData);
            });
        } catch {
            updateTask(task.uid, {status: 'error', errorMsg: i18n.uploadError});
        } finally {
            activeUploadsRef.current--;
            processQueue();
        }
    }, [updateTask, uploadUrl, fieldName, i18n.uploadError]);

    const processQueue = useCallback(() => {
        if (processingRef.current) return;
        processingRef.current = true;

        try {
            const tasks = uploadTasksRef.current;
            if (isPausedRef.current) return;

            const pending = tasks.filter(t => t.status === 'pending');
            const slotsAvailable = maxConcurrent - activeUploadsRef.current;

            for (let i = 0; i < Math.min(slotsAvailable, pending.length); i++) {
                uploadSingleFile(pending[i]);
            }
        } finally {
            processingRef.current = false;
        }
    }, [uploadSingleFile, maxConcurrent]);

    // Trigger processing when tasks change or pause state changes
    useEffect(() => {
        if (!isPaused && uploadTasks.some(t => t.status === 'pending')) {
            setTimeout(() => processQueue(), 0);
        }
        // Check if all done — reset queue and show upload area again
        if (uploadTasks.length > 0 && uploadTasks.every(t => t.status === 'success' || t.status === 'error')) {
            if (!completedNotifiedRef.current) {
                completedNotifiedRef.current = true;
                message.success(i18n.uploadComplete);
                onComplete?.();
                // Reset after a short delay so user can see the final status
                setTimeout(() => {
                    setUploadTasks([]);
                    completedNotifiedRef.current = false;
                }, 800);
            }
        }
    }, [uploadTasks, isPaused]);

    const addFiles = (files: File[]) => {
        const newTasks: UploadTask[] = files.map(file => ({
            uid: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            file,
            status: 'pending' as const,
            progress: 0,
        }));
        setUploadTasks(prev => [...prev, ...newTasks]);
        setIsPaused(false);
        completedNotifiedRef.current = false;
    };

    const removeTask = (uid: string) => {
        setUploadTasks(prev => prev.filter(t => t.uid !== uid));
    };

    // --- Drag & Drop ---
    const [isDragOver, setIsDragOver] = useState(false);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) addFiles(files);
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 0) addFiles(files);
        e.target.value = '';
    };

    const hasTasks = uploadTasks.length > 0;
    const pendingCount = uploadTasks.filter(t => t.status === 'pending').length;
    const uploadingCount = uploadTasks.filter(t => t.status === 'uploading').length;
    const successCount = uploadTasks.filter(t => t.status === 'success').length;
    const errorCount = uploadTasks.filter(t => t.status === 'error').length;

    return (
        <div>
            {!hasTasks && (
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.multiple = true;
                        input.onchange = (e) => handleFileInput(e as any);
                        input.click();
                    }}
                    style={{
                        border: `2px dashed ${isDragOver ? '#1677ff' : '#d9d9d9'}`,
                        borderRadius: 8,
                        padding: '48px 24px',
                        textAlign: 'center',
                        cursor: 'pointer',
                        backgroundColor: isDragOver ? '#f0f5ff' : '#fafafa',
                        transition: 'all 0.3s',
                    }}
                >
                    <UploadOutlined style={{fontSize: 40, color: '#1677ff'}}/>
                    <div style={{marginTop: 12, fontSize: 16, color: '#666'}}>
                        {i18n.selectFiles}
                    </div>
                    <div style={{marginTop: 4, fontSize: 13, color: '#999'}}>
                        {i18n.dragHint}
                    </div>
                </div>
            )}

            {hasTasks && (
                <>
                    <div style={{marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12}}>
                        <span style={{color: '#999'}}>
                            {i18n.uploadStats({
                                total: uploadTasks.length,
                                uploading: uploadingCount,
                                pending: pendingCount,
                                success: successCount,
                                error: errorCount,
                            })}
                        </span>
                        {isPaused ? (
                            <Button size="small" icon={<PlayCircleOutlined/>} onClick={() => setIsPaused(false)}>
                                {i18n.resume}
                            </Button>
                        ) : (
                            <Button size="small" icon={<PauseCircleOutlined/>} onClick={() => setIsPaused(true)}
                                    disabled={pendingCount === 0 && uploadingCount === 0}>
                                {i18n.pause}
                            </Button>
                        )}
                    </div>

                    <div style={{maxHeight: 400, overflowY: 'auto'}}>
                        {uploadTasks.map((task) => (
                            <div
                                key={task.uid}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '8px 0',
                                    borderBottom: '1px solid #f5f5f5',
                                }}
                            >
                                <div style={{flex: 1, minWidth: 0}}>
                                    <div style={{
                                        textDecoration: task.status === 'success' ? 'line-through' : undefined,
                                        color: task.status === 'error' ? '#ff4d4f' : undefined,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    }}>
                                        {task.file.name}
                                    </div>
                                    <div style={{marginTop: 4}}>
                                        <span style={{marginRight: 8, color: '#999'}}>{formatFileSize(task.file.size)}</span>
                                        {task.status === 'uploading' && (
                                            <Progress percent={task.progress} size="small"
                                                       style={{display: 'inline-block', width: 200}}/>
                                        )}
                                        {task.status === 'success' && <Tag color="success">{i18n.uploaded}</Tag>}
                                        {task.status === 'error' &&
                                            <Tag color="error">{task.errorMsg || i18n.uploadError}</Tag>}
                                        {task.status === 'pending' && <Tag>{i18n.pending}</Tag>}
                                    </div>
                                </div>
                                {(task.status === 'success' || task.status === 'error') && (
                                    <Button
                                        type="text"
                                        size="small"
                                        icon={<CloseOutlined/>}
                                        onClick={() => removeTask(task.uid)}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
