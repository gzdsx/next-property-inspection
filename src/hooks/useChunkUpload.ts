'use client';

import { useState, useRef } from 'react';
import pLimit from 'p-limit';
import { apiPost } from "@/lib/api";

interface UseChunkUploadOptions {
    chunkSize?: number;           // 每个分片的大小，默认 5MB
    maxConcurrentChunks?: number; // 单个文件内部【同时并发上传】的切片数上限
    saveDir?: string;
}

function getFileExtension(file: File): string {
    const filename = file.name;
    const lastDotIndex = filename.lastIndexOf('.');
    if (lastDotIndex === -1 || lastDotIndex === 0) return '';
    return filename.slice(lastDotIndex + 1).toLowerCase();
}

export function useChunkUpload(options: UseChunkUploadOptions = {}) {
    const { chunkSize = 5 * 1024 * 1024, maxConcurrentChunks = 3 } = options;
    const [uploadProgress, setUploadProgress] = useState<number>(0);
    const [uploadStatus, setUploadStatus] = useState<'pending' | 'uploading' | 'success' | 'error' | 'aborted'>('pending');

    // 用于追踪和精准取消正在上传的文件进程
    const abortControllers = useRef<Map<string, AbortController>>(new Map());

    /**
     * ⚡ 核心逻辑：并发切片上传单个文件
     */
    const uploadFile = async (file: File) => {
        const fileId = crypto.randomUUID();
        const totalChunks = Math.ceil(file.size / chunkSize);

        // 1. 为当前文件创建独立的信号控制器并注册到全局 Map，以便外部调用取消
        const controller = new AbortController();
        abortControllers.current.set(fileId, controller);

        // 2. 局部计数器：解决连续上传、多次上传时全局引用导致的进度条错乱 Bug
        let localUploadedChunks = 0;

        try {
            setUploadStatus('uploading');
            setUploadProgress(0); // 每次开始上传前，重置进度

            const limit = pLimit(maxConcurrentChunks);
            const chunkTasks = [];

            for (let i = 0; i < totalChunks; i++) {
                const start = i * chunkSize;
                const end = Math.min(start + chunkSize, file.size);
                const fileChunk = file.slice(start, end);

                // 将每个切片的上传包装成受控的并发任务
                const task = limit(async () => {
                    const formData = new FormData();
                    formData.append('file_id', fileId);
                    formData.append('chunk_index', i.toString());
                    formData.append('total_chunks', totalChunks.toString()); // ⚡ 顺手带上总片数，方便后端防御校验
                    formData.append('file', fileChunk); // 🚨 铁律：必须放在最后

                    // ⚡ 修复：必须把 signal 传进去，否则后端或前端取消时无法熔断连接
                    await apiPost(`/file/chunk/part`, formData, {
                        signal: controller.signal
                    });

                    // ⚡ 修复：原子化累加局部变量，精准控制当前文件进度
                    localUploadedChunks++;
                    setUploadProgress(Math.round((localUploadedChunks / totalChunks) * 100));
                });

                chunkTasks.push(task);
            }

            // ⚡ 真正万马奔腾：并发传输
            await Promise.all(chunkTasks);

            // ➡️ 步骤 3: 呼叫 Laravel 合体
            const response = await apiPost(`/file/chunk/merge`, {
                file_id: fileId,
                file_ext: getFileExtension(file),
                save_dir: options.saveDir || 'videos'
            }, {
                signal: controller.signal // 合并请求同样支持取消
            });

            setUploadStatus('success');
            // 假设你的 apiPost 返回的 AxiosResponse 或自定义格式中 data 包含结果
            return response.data?.url || response.url;

        } catch (error: any) {
            if (error.name === 'AbortError' || error.message === 'canceled') {
                setUploadStatus('aborted');
            } else {
                setUploadStatus('error');
            }
            throw error;
        } finally {
            // 善后处理：无论成功失败，从全局取消队列中移除
            abortControllers.current.delete(fileId);
        }
    };

    /**
     * ⚡ 暴露出一个一键取消所有当前正在上传任务的命令方法
     */
    const abortAll = () => {
        abortControllers.current.forEach((controller) => controller.abort());
        abortControllers.current.clear();
        setUploadStatus('aborted');
    };

    return {
        uploadFile,
        uploadProgress,
        uploadStatus,
        abortAll // 顺手丢出取消方法，方便 UI 绑定“取消上传”按钮
    };
}