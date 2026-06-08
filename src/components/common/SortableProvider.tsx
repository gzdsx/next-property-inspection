'use client';

import React, {ReactNode} from 'react';
import {DragDropProvider} from '@dnd-kit/react';
import {isSortableOperation} from '@dnd-kit/react/sortable';

export interface SortableProviderProps {
    /** 子元素 */
    children: ReactNode;
    /** 排序变化回调 */
    onSortEnd?: (oldIndex: number, newIndex: number) => void;
    /** 自定义拖拽覆盖层渲染，接收拖拽元素的 index */
    renderOverlay?: (activeIndex: number) => ReactNode;
}

const SortableProvider = ({children, onSortEnd}: SortableProviderProps) => {

    return (
        <DragDropProvider
            onDragEnd={(event) => {
                const {canceled} = event;
                if (canceled) return;

                if (!isSortableOperation(event.operation)) return;

                const {source, target} = event.operation;
                if (!source || !target) return;

                const oldIndex = source.initialIndex;
                const newIndex = source.index;
                if (oldIndex === newIndex) return;

                setTimeout(() => {
                    onSortEnd?.(oldIndex, newIndex);
                }, 500);
            }}
        >
            {children}
        </DragDropProvider>
    );
};

export default SortableProvider;
