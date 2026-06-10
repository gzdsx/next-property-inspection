'use client';

import {createContext, useContext, useState} from "react";
import {DialogConfirmClient, DialogConfirmClientProps} from "@/components/frontend/DialogConfirmClient";
import {Spinner} from "@/components/ui/spinner";


interface AppContextProps {
    dialogConfirm: {
        open: (props?: DialogConfirmClientProps) => void;
        close: () => void;
    },
    spinner: {
        show: (description?: string) => void;
        hide: () => void;
    }
}

const AppContext = createContext<AppContextProps | null>(null);

export function AppProvider({children}: { children: React.ReactNode }) {
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [dialogConfirmProps, setDialogConfirmProps] = useState<any>({});

    const [isSpinnerOpen, setIsSpinnerOpen] = useState(false);
    const [spinnerDescription, setSpinnerDescription] = useState<string | null>(null);

    return (
        <AppContext.Provider value={{
            dialogConfirm: {
                open: (props?: DialogConfirmClientProps) => {
                    setDialogConfirmProps(props);
                    setIsConfirmOpen(true);
                },
                close: () => {
                    setDialogConfirmProps({});
                    setIsConfirmOpen(false);
                }
            },
            spinner: {
                show: (description?: string) => {
                    setSpinnerDescription(description || null);
                    setIsSpinnerOpen(true);
                },
                hide: () => {
                    setSpinnerDescription(null);
                    setIsSpinnerOpen(false);
                }
            }
        }}>
            {children}
            <DialogConfirmClient {...dialogConfirmProps} open={isConfirmOpen} onCancel={() => {
                setIsConfirmOpen(false);
                dialogConfirmProps.onCancel?.();
            }}/>
            {
                isSpinnerOpen && (
                    <div className={'absolute w-full h-full left-0 top-0 bg-black/50 flex flex-col gap-y-2 items-center justify-center z-50'}>
                        <Spinner className={'size-8'}/>
                        <p className={'text-white text-sm ml-2'}>{spinnerDescription}</p>
                    </div>
                )
            }
        </AppContext.Provider>
    )
}

export function useAppContext() {
    const context = useContext(AppContext);
    if (context === null) {
        throw new Error("useAppContext must be used within a AppProvider");
    }
    return context;
}

export function useConfirm() {
    const {dialogConfirm} = useAppContext();
    return dialogConfirm;
}

export function useSpinner() {
    const {spinner} = useAppContext();
    return spinner;
}