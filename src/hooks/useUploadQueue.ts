// hooks/useUploadQueue.ts
import {useState, useRef, useCallback} from 'react';
import {apiPost} from "@/lib/api";

interface UseUploadQueueOptions {
    onSuccess?: () => void;  // 队列全部清空完成后的回调
    onError?: (error: Error) => void;
}

export function useUploadQueue({onSuccess, onError}: UseUploadQueueOptions) {
    const [isUploading, setIsUploading] = useState(false);
    const [successCount, setSuccessCount] = useState(0);

    // 使用 useRef 维护核心队列和锁，避免 React 异步渲染导致的数据错乱
    const queueRef = useRef<Blob[]>([]);
    const isProcessingRef = useRef(false);
    const fileIdRef = useRef<string>('');

    // 初始化这轮录制的唯一文件 ID
    const initQueue = useCallback((fileName: string) => {
        fileIdRef.current = crypto.randomUUID();
        queueRef.current = [];
        isProcessingRef.current = false;
        setSuccessCount(0);
        setIsUploading(false);
        return fileIdRef.current;
    }, []);

    // 核心：消费队列的 Worker 函数
    const processQueue = useCallback(async () => {
        // 如果正在处理，或者队列已经空了，直接拦截
        if (isProcessingRef.current || queueRef.current.length === 0) {
            if (queueRef.current.length === 0 && !isProcessingRef.current) {
                setIsUploading(false);
                onSuccess?.();
            }
            return;
        }

        // 上锁
        isProcessingRef.current = true;
        setIsUploading(true);

        // 取出最早进入队列的视频切片
        const chunk = queueRef.current.shift();

        if (chunk) {
            const formData = new FormData();
            formData.append('file', chunk);
            formData.append('file_id', fileIdRef.current);

            try {
                apiPost(`/file/chunk/upload`);
                setSuccessCount((prev) => prev + 1);
                // 💡 释放锁，并递归调用自身，继续消费下一个切片
                isProcessingRef.current = false;
                processQueue();
            } catch (error: any) {
                console.error('切片上传失败，正在尝试重新压入队首重试...', error);

                // 异常处理：把切片丢回队首，等待下一次消费
                queueRef.current.unshift(chunk);
                isProcessingRef.current = false;
                setIsUploading(false);

                onError?.(error);
                // 可以根据业务决定是否继续，这里选择延迟 3 秒后重试
                setTimeout(processQueue, 3000);
            }
        }
    }, [onSuccess, onError]);

    // 对外暴露：向队列中追加 Blob 的方法
    const pushToQueue = useCallback((blob: Blob) => {
        if (blob.size > 0) {
            queueRef.current.push(blob);
            // 每次有新数据来，都尝试去捅一下消费 Worker
            processQueue();
        }
    }, [processQueue]);

    // 对外暴露：获取当前队列剩余未传片数
    const getQueueLength = useCallback(() => queueRef.current.length, []);

    return {
        initQueue,
        pushToQueue,
        isUploading,
        successCount,
        getQueueLength,
        fileId: fileIdRef.current
    };
}