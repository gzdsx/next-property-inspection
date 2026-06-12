'use client';

import {X} from "lucide-react";
import {useEffect, useRef, useState} from "react";

interface ModalCameraProps {
    onClose: () => void;
    onCapture: (dataUrl: string) => void;

}
const ModalCamera = ({onClose, onCapture}: ModalCameraProps) => {
    const videoPreviewRef = useRef<HTMLVideoElement>(null);
    const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

    const capturePhoto = () => {
        const video = videoPreviewRef.current;
        if (!video) return;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d')?.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        onCapture(dataUrl);
        closeCamera();
    };

    const openCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {facingMode: 'environment'}
            });
            setCameraStream(stream);
            setTimeout(() => {
                if (videoPreviewRef.current) {
                    videoPreviewRef.current.srcObject = stream;
                }
            }, 100);
        } catch {
            console.error('Failed to open camera');
        }
    };

    const closeCamera = () => {
        cameraStream?.getTracks().forEach(t => t.stop());
        onClose();
    };

    useEffect(() => {
        openCamera();
    }, []);

    return (
        <div className="fixed inset-0 z-150 bg-black flex flex-col">
            <div className="flex-1 relative overflow-hidden">
                <video ref={videoPreviewRef} autoPlay playsInline muted className="w-full h-full object-cover"/>
                <div className="absolute inset-0 border-4 border-white/20 pointer-events-none rounded-2xl m-4"/>
            </div>
            <div className="shrink-0 bg-black p-6 flex items-center justify-center gap-6">
                <button onClick={closeCamera} className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                    <X className="w-5 h-5 text-white"/>
                </button>
                <button
                    onClick={capturePhoto}
                    className="w-20 h-20 rounded-full bg-white border-4 border-white/30 flex items-center justify-center shadow-2xl active:scale-95 transition-transform"
                >
                    <div className="w-14 h-14 rounded-full bg-white"/>
                </button>
                <div className="w-12 h-12"/>
            </div>
        </div>
    );
};

export default ModalCamera;