'use client';

import {
    Dialog, DialogClose,
    DialogContent,
    DialogDescription, DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog";
import {Button} from "antd";

interface DialogConfirmClientProps {
    open?: boolean;
    title?: string;
    message: string;
    onConfirm?: () => void;
    onCancel?: () => void;
}

export const DialogConfirmClient = (props: DialogConfirmClientProps) => {
    const {title = 'Are you absolutely sure?', message, onConfirm, onCancel} = props;
    return (
        <Dialog open={props.open} onOpenChange={(open) => {
            if (!open) onCancel?.();
        }}>
            <DialogTrigger>Open</DialogTrigger>
            <DialogContent className={'bg-black border-gray-500'}>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>
                        {message}
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outlined">Cancel</Button>
                    </DialogClose>
                    <Button type={'primary'} variant="solid" onClick={() => {
                        onConfirm?.();
                        onCancel?.();
                    }}>Confirm</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export type {DialogConfirmClientProps};