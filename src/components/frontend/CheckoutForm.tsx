'use client';

import React from 'react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import * as z from 'zod';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {Button} from '@/components/ui/button';
import {RadioGroup, RadioGroupItem} from '@/components/ui/radio-group';
import {Label} from '@/components/ui/label';
import {FormControl, FormField, FormItem, FormLabel, FormMessage, Form} from '@/components/ui/form';
import {Loader2} from 'lucide-react';
import {useTranslations} from '@/contexts/LocaleContext';
import {useCart} from '@/contexts/CartContext';

interface CheckoutFormProps {
    onSubmit: (values: any) => Promise<void>;
    submitting?: boolean;
}

export default function CheckoutForm({onSubmit, submitting}: CheckoutFormProps) {
    const {t} = useTranslations('ecommerce');
    const {totalPrice} = useCart();

    const formSchema = z.object({
        name: z.string().min(1, t('checkout.nameRequired')),
        phone_number: z.string().min(1, t('checkout.phoneRequired')),
        address: z.string().min(1, t('checkout.addressRequired')),
        city: z.string(),
        postal_code: z.string(),
        payment_method: z.string(),
    });

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            payment_method: 'wechat',
            name: '大师兄',
            phone_number: '13888888888',
            address: '中国北京市东城区东直门街道',
            city: '北京',
            postal_code: '100000',
        },
    });

    const handleSubmit = async (values: z.infer<typeof formSchema>) => {
        await onSubmit(values);
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                {/* Shipping Info */}
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('checkout.shippingInfo')}</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="name"
                        render={({field}) => (
                            <FormItem>
                                <FormLabel>{t('checkout.name')}</FormLabel>
                                <FormControl>
                                    <Input placeholder={t('checkout.name')} className="h-11" {...field} />
                                </FormControl>
                                <FormMessage/>
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="phone_number"
                        render={({field}) => (
                            <FormItem>
                                <FormLabel>{t('checkout.phone')}</FormLabel>
                                <FormControl>
                                    <Input placeholder={t('checkout.phone')} className="h-11" {...field} />
                                </FormControl>
                                <FormMessage/>
                            </FormItem>
                        )}
                    />
                </div>

                <FormField
                    control={form.control}
                    name="address"
                    render={({field}) => (
                        <FormItem>
                            <FormLabel>{t('checkout.address')}</FormLabel>
                            <FormControl>
                                <Textarea rows={2} placeholder={t('checkout.address')} className="resize-none" {...field} />
                            </FormControl>
                            <FormMessage/>
                        </FormItem>
                    )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="city"
                        render={({field}) => (
                            <FormItem>
                                <FormLabel>{t('checkout.city')}</FormLabel>
                                <FormControl>
                                    <Input placeholder={t('checkout.city')} className="h-11" {...field} />
                                </FormControl>
                                <FormMessage/>
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="postal_code"
                        render={({field}) => (
                            <FormItem>
                                <FormLabel>{t('checkout.zipCode')}</FormLabel>
                                <FormControl>
                                    <Input placeholder={t('checkout.zipCode')} className="h-11" {...field} />
                                </FormControl>
                                <FormMessage/>
                            </FormItem>
                        )}
                    />
                </div>

                {/* Payment Method */}
                <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-4">{t('checkout.paymentMethod')}</h3>
                <FormField
                    control={form.control}
                    name="payment_method"
                    render={({field}) => (
                        <FormItem>
                            <FormControl>
                                <RadioGroup value={field.value} onValueChange={field.onChange}
                                            className="space-y-3">
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="wechat" id="wechat"/>
                                        <Label htmlFor="wechat"
                                               className="text-sm cursor-pointer">{t('product.wechatPay')}</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="alipay" id="alipay"/>
                                        <Label htmlFor="alipay"
                                               className="text-sm cursor-pointer">{t('product.alipay')}</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="bank" id="bank"/>
                                        <Label htmlFor="bank"
                                               className="text-sm cursor-pointer">{t('product.bankPay')}</Label>
                                    </div>
                                </RadioGroup>
                            </FormControl>
                            <FormMessage/>
                        </FormItem>
                    )}
                />

                {/* Submit */}
                <Button
                    type="submit"
                    size="lg"
                    disabled={submitting}
                    className="w-full h-12 text-base mt-4"
                >
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    {t('checkout.placeOrder')} · ¥{totalPrice.toFixed(2)}
                </Button>
            </form>
        </Form>
    );
}
