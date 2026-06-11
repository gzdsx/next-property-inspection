'use client';

import ReactPlayer from "react-player";
import {useRouter} from 'next/navigation';

interface VideoPlayerProps {
    src: string;
    currentSourceId: string | number;
    sources: any[];
    poster: string;
}

const VideoPlayer = ({src, currentSourceId = 0, sources = [], poster}: VideoPlayerProps) => {
    const router = useRouter();
    return (
        <ReactPlayer
            src={src}
            playing
            controls
            preload={'auto'}
            playsInline
            style={{width: '100%', height: '100%'}}
            onEnded={() => {
                const index = sources.findIndex(source => source.id === currentSourceId);
                if (index < sources.length - 1) {
                    router.push(`/video/${sources[index + 1].vid}`);
                }
            }}
            poster={poster}
        />
    );
};

export default VideoPlayer;
