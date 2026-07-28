'use client';

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

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
        <AlertDialog open={props.open}>
            <AlertDialogContent className={'bg-black border-gray-600 z-999!'}>
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription>{message}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={()=>onCancel?.()}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={()=>{
                        onCancel?.();
                        onConfirm?.();
                    }}>Confirm</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};

export type {DialogConfirmClientProps};