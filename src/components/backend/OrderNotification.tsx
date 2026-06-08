'use client';

import {useEchoPublic} from "@laravel/echo-react";
import {useEffect, useRef} from "react";

const OrderNotification = () => {
    // 1. 使用 useRef 存储音频实例，避免重复创建
    const audioRef = useRef<HTMLAudioElement>(null);

    const playNotification = () => {
        // 2. 播放音频逻辑
        if (audioRef.current){
            (audioRef.current as any).currentTime = 0; // 重置到开始位置
            audioRef.current.play().catch(err => {
                // 浏览器通常限制自动播放，需要用户点击过页面后才能生效
                console.warn('播放失败，可能需要用户先与页面交互:', err);
            });
        }
    };

    useEchoPublic('noodlebox', '.order.created', (data: any) => {
        console.log('order.created', data);
        playNotification();
    });

    useEffect(() => {
        const createAudio = () => {
            audioRef.current = new Audio('/ring.wav');
            //playNotification();
        }

        if (typeof window !== 'undefined') {
            window.addEventListener('click', createAudio);
        }
        return () => {
            window.removeEventListener('click', createAudio);
        }
    }, []);
    return null;
};

export default OrderNotification;