'use client';

import React, {createContext, useContext, useState, useEffect, useCallback, ReactNode} from 'react';

export interface CartItem {
    product_id: number;
    title: string;
    thumbnail: string;
    price: number;
    quantity: number;
    sku_id?: number;
    sku_name?: string;
}

interface CartContextType {
    items: CartItem[];
    addItem: (item: CartItem) => void;
    removeItem: (productId: number, sku_id?: number) => void;
    updateQuantity: (productId: number, quantity: number, sku_id?: number) => void;
    clearCart: () => void;
    totalItems: number;
    totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'cart_items';

export function CartProvider({children}: { children: ReactNode }) {
    const [items, setItems] = useState<CartItem[]>([]);

    // Load from localStorage on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem(CART_STORAGE_KEY);
            if (stored) {
                // eslint-disable-next-line react-hooks/set-state-in-effect
                setItems(JSON.parse(stored));
            }
        } catch {
            // ignore
        }
    }, []);

    // Sync to localStorage on change
    useEffect(() => {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    }, [items]);

    const addItem = useCallback((newItem: CartItem) => {
        setItems(prev => {
            const key = (item: CartItem) => `${item.product_id}-${item.sku_id ?? 'default'}`;
            const newKey = key(newItem);
            const existing = prev.find(item => key(item) === newKey);
            if (existing) {
                return prev.map(item =>
                    key(item) === newKey
                        ? {...item, quantity: item.quantity + newItem.quantity}
                        : item
                );
            }
            return [...prev, newItem];
        });
    }, []);

    const removeItem = useCallback((productId: number, sku_id?: number) => {
        setItems(prev => prev.filter(item => {
            const matchSku = sku_id ? item.sku_id === sku_id : true;
            return !(item.product_id === productId && matchSku);
        }));
    }, []);

    const updateQuantity = useCallback((productId: number, quantity: number, sku_id?: number) => {
        if (quantity <= 0) {
            removeItem(productId, sku_id);
            return;
        }
        setItems(prev => prev.map(item => {
            const matchSku = sku_id ? item.sku_id === sku_id : true;
            return (item.product_id === productId && matchSku)
                ? {...item, quantity}
                : item;
        }));
    }, [removeItem]);

    const clearCart = useCallback(() => {
        setItems([]);
    }, []);

    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    return (
        <CartContext.Provider value={{items, addItem, removeItem, updateQuantity, clearCart, totalItems, totalPrice}}>
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
}
