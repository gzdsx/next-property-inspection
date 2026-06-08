'use client';

import React, {createContext, useContext, useState, useCallback, useRef, useLayoutEffect} from 'react';
import {App, Spin} from "antd";
import Cookies from "js-cookie";
import {Order as OrderType} from "@/types";
import MediaLibrary, {MediaType} from "@/components/backend/MediaLibrary";
import ModalOrderProcessor from "@/components/backend/ModalOrderProcessor";

interface MediaLibraryOptions {
    multiple?: boolean;
    onSelect?: (medias: MediaType[]) => void;
}

interface AdminUser {
    id: number;
    name: string;
    email: string;
    avatar: string;
    role: string;
}


interface BackendAppContextType {
    mediaLibrary: {
        open: (options?: MediaLibraryOptions) => void;
        close: () => void;
    },
    administrator: AdminUser | null;
    orderProcessor: {
        open: (order: OrderType, callback?: (order: OrderType) => void) => void;
        close: () => void;
    },
    spinner: {
        show: (description?: string) => void;
        hide: () => void;
    }
}

const BackendAppContext = createContext<BackendAppContextType | undefined>(undefined);

export function BackendAppProvider({children}: { children: React.ReactNode }) {
    const [mediaLibraryOpen, setMediaLibraryOpen] = useState(false);
    const [mediaLibraryOptions, setMediaLibraryOptions] = useState<MediaLibraryOptions | null | undefined>(null);
    const [administrator, setAdministrator] = useState<AdminUser | null>(null);
    const [currentOrder, setCurrentOrder] = useState<OrderType | null>(null);
    const [orderProcessorVisible, setOrderProcessorVisible] = useState(false);

    const [isSpinnerShow, setIsSpinnerShow] = useState(false);
    const [spinnerDescription, setSpinnerDescription] = useState<string | undefined>(undefined);

    const orderProcessorCallbackRef = useRef<((order: OrderType) => void) | undefined>(undefined);

    useLayoutEffect(() => {
        (function () {
            try {
                const data = Cookies.get('adminUser');
                if (data) {
                    setAdministrator(JSON.parse(data));
                }
            } catch (e) {
                console.log(e);
            }
        })()
    }, []);

    const openMediaLibrary = useCallback((options?: MediaLibraryOptions) => {
        setMediaLibraryOpen(true);
        setMediaLibraryOptions(options);
    }, []);

    const closeMediaLibrary = useCallback(() => {
        setMediaLibraryOpen(false);
    }, []);

    const openOrderProcessor = useCallback((order: OrderType, callback?: (order: OrderType) => void) => {
        setCurrentOrder(order);
        setOrderProcessorVisible(true);
        orderProcessorCallbackRef.current = callback;
    }, []);

    const closeOrderProcessor = () => {
        setCurrentOrder(null);
        setOrderProcessorVisible(false);
        orderProcessorCallbackRef.current?.(currentOrder as OrderType);
        orderProcessorCallbackRef.current = undefined;
    }

    const showSpinner = useCallback((description?: string) => {
        setIsSpinnerShow(true);
        setSpinnerDescription(description);
    }, []);

    const hideSpinner = useCallback(() => {
        setIsSpinnerShow(false);
        setSpinnerDescription(undefined);
    }, []);

    return (
        <BackendAppContext.Provider value={{
            mediaLibrary: {
                open: openMediaLibrary,
                close: closeMediaLibrary,
            },
            administrator,
            orderProcessor: {
                open: openOrderProcessor,
                close: closeOrderProcessor,
            },
            spinner: {
                show: showSpinner,
                hide: hideSpinner,
            }
        }}>
            {children}
            {
                mediaLibraryOpen && (
                    <MediaLibrary
                        {...mediaLibraryOptions}
                        open={true}
                        onClose={closeMediaLibrary}
                    />
                )
            }
            {
                orderProcessorVisible && (
                    <ModalOrderProcessor
                        isOpen={true}
                        order={currentOrder}
                        onClose={closeOrderProcessor}
                    />
                )
            }
            {
                isSpinnerShow && <Spin fullscreen={true} description={spinnerDescription}/>
            }
        </BackendAppContext.Provider>
    )
}

export function useBackendApp() {
    const context = useContext(BackendAppContext);
    if (!context) {
        throw new Error('useBackendApp must be used inside BackendAppProvider');
    }
    return context;
}


export function useMediaLibrary() {
    const {mediaLibrary} = useBackendApp();
    return mediaLibrary;
}

export function useAdministrator() {
    const {administrator} = useBackendApp();
    return administrator;
}

export function useMessage() {
    const {message} = App.useApp();
    return message;
}

export function useModal() {
    const {modal} = App.useApp();
    return modal;
}

export function useNotification() {
    const {notification} = App.useApp();
    return notification;
}

export function useSpinner() {
    const {spinner} = useBackendApp();
    return spinner;
}

export function useOrderProcessor() {
    const {orderProcessor} = useBackendApp();
    return orderProcessor;
}