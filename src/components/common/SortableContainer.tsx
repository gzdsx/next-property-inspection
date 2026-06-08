'use client';

import React, {Children, useState, useMemo, isValidElement, ReactNode} from 'react';
import {DragDropProvider, DragOverlay} from '@dnd-kit/react';
import {useSortable, isSortableOperation} from '@dnd-kit/react/sortable';

interface SortableItemProps {
    id: string;
    index: number;
    children: ReactNode;
}

function SortableItem({id, index, children}: SortableItemProps) {
    const {ref, isDragging} = useSortable({
        id,
        index,
        transition: {duration: 250, easing: 'ease'},
    });

    return (
        <div ref={ref} style={{
            opacity: isDragging ? 0.6 : 1,
            border: isDragging ? '1px dashed blue' : 'none',
            cursor: 'grab',
            borderRadius: 4
        }}>
            {children}
        </div>
    );
}

export interface SortableContainerProps {
    /** 子元素，每个直接子元素视为一个可排序项 */
    children: ReactNode;
    /** 排序变化回调 */
    onSortEnd?: (oldIndex: number, newIndex: number) => void;
}

const SortableContainer: React.FC<SortableContainerProps> = ({
                                                                 children,
                                                                 onSortEnd,
                                                             }) => {
    const [activeId, setActiveId] = useState<string | null>(null);

    const childArray = Children.toArray(children);
    const itemIds = useMemo(
        () => childArray.map(() => `sortable-` + crypto.randomUUID()),
        [childArray]
    );

    const activeIndex = activeId ? itemIds.indexOf(activeId) : -1;

    return (
        <DragDropProvider
            onDragEnd={(event) => {
                setActiveId(null);
                const {operation, canceled} = event;
                if (canceled) return;

                if (!isSortableOperation(operation)) return;

                const source = operation.source;
                if (!source || !operation.target) return;

                const oldIndex = source.initialIndex;
                const newIndex = source.index;

                if (oldIndex === -1 || oldIndex === newIndex) return;

                setTimeout(() => {
                    onSortEnd?.(oldIndex, newIndex);
                }, 500);
            }}
        >
            <>
                {childArray.map((child, index) => {
                    if (!isValidElement(child)) return child;
                    return (
                        <SortableItem key={`sortable-${itemIds[index]}`} id={`sortable-${itemIds[index]}`} index={index}>
                            {child}
                        </SortableItem>
                    );
                })}
            </>
            <DragOverlay>
                {activeId && activeIndex !== -1 ? childArray[activeIndex] : null}
            </DragOverlay>
        </DragDropProvider>
    );
};

export default SortableContainer;
