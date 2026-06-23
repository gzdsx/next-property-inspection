'use client';


import {Card, CardContent} from "@/components/ui/card";
import {Input} from "@/components/ui/input";
import {
    Field,
    FieldDescription,
    FieldGroup,
    FieldLabel,
    FieldLegend,
    FieldSeparator,
    FieldSet,
} from "@/components/ui/field"
import {Button} from "@/components/ui/button";
import {useEffect, useState} from "react";
import {apiGet, apiPut} from "@/lib/api";
import {toast} from "sonner";
import {Spinner} from "@/components/ui/spinner";
import {useSession} from "next-auth/react";

export default function Home() {
    const {data: session, update: updateSession} = useSession();
    const [companySubmiting, setCompanySubmiting] = useState(false);
    const [company, setCompany] = useState<any>({});
    const [currentUser, setCurrentUser] = useState<any>(session?.user || {});
    const [userSubmiting, setUserSubmiting] = useState(false);

    const handleSubmitCompany = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.nativeEvent.preventDefault();
        setCompanySubmiting(true);
        apiPut('/company', company).then(response => {
            toast.success('Company profile updated successfully');
        }).catch(reason => {
            toast.error('Company profile update failed');
        }).finally(() => {
            setCompanySubmiting(false);
        });
    }

    const fetchCompany = () => {
        apiGet('/company').then(response => {
            setCompany({...response});
        });
    }

    const handleSubmitUser = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.nativeEvent.preventDefault();
        setUserSubmiting(true);
        apiPut('/me/profile', currentUser).then(response => {
            toast.success('Profile updated successfully');
            updateSession({
                ...session?.user,
                ...response,
                updateAt: new Date().toISOString()
            })
        }).catch(reason => {
            toast.error('Profile update failed');
        }).finally(() => {
            setUserSubmiting(false);
        });
    }

    useEffect(() => {
        fetchCompany();
    }, []);

    return (
        <>
            <h2 className={'mb-4 font-bold'}>Company Profile</h2>
            <Card>
                <CardContent>
                    <form method={'post'} className={'flex flex-col gap-4'}>
                        <Field>
                            <FieldLabel>Company Name</FieldLabel>
                            <Input value={company.name || ''} name={'name'} className={'w-60!'} onChange={(e) => {
                                setCompany((prev: any) => ({...prev, name: e.target.value}));
                            }}/>
                        </Field>
                        <Field>
                            <FieldLabel>Telephone</FieldLabel>
                            <Input value={company.telephone || ''} name={'telephone'} className={'w-60!'}
                                   onChange={(e) => {
                                       setCompany((prev: any) => ({...prev, telephone: e.target.value}));
                                   }}/>
                        </Field>
                        <Field>
                            <FieldLabel>Address</FieldLabel>
                            <Input value={company.address || ''} name={'address'} className={'w-full max-w-140!'}
                                   onChange={(e) => {
                                       setCompany((prev: any) => ({...prev, address: e.target.value}));
                                   }}/>
                        </Field>
                        <div className={'mt-4'}>
                            <Button type={'button'} color={'primary'} className={'w-24'} onClick={handleSubmitCompany}
                                    disabled={companySubmiting}>
                                {companySubmiting ? <Spinner/> : 'Submit'}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
            <div className={'h-11'}></div>
            <h2 className={'mb-4 font-bold'}>My Profile</h2>
            <Card>
                <CardContent>
                    <form method={'post'} className={'flex flex-col gap-4'}>
                        <Field>
                            <FieldLabel>Name</FieldLabel>
                            <Input value={currentUser.name || ''} className={'w-60!'} onChange={(e) => {
                                setCurrentUser((prev: any) => ({...prev, name: e.target.value}));
                            }}/>
                        </Field>
                        <Field>
                            <FieldLabel>reference</FieldLabel>
                            <Input value={currentUser.reference || ''} className={'w-60!'}
                                   onChange={(e) => {
                                       setCurrentUser((prev: any) => ({...prev, reference: e.target.value}));
                                   }}/>
                        </Field>
                        <Field>
                            <FieldLabel>Telephone</FieldLabel>
                            <Input value={currentUser.phone_number || ''} className={'w-60!'}
                                   onChange={(e) => {
                                       setCurrentUser((prev: any) => ({...prev, phone_number: e.target.value}));
                                   }}/>
                        </Field>
                        <Field>
                            <FieldLabel>Email</FieldLabel>
                            <Input value={currentUser.email || ''} className={'w-full max-w-140!'}
                                   onChange={(e) => {
                                       setCurrentUser((prev: any) => ({...prev, email: e.target.value}));
                                   }}/>
                        </Field>
                        <div className={'mt-4'}>
                            <Button type={'button'} color={'primary'} className={'w-24'} onClick={handleSubmitUser}
                                    disabled={userSubmiting}>
                                {userSubmiting ? <Spinner/> : 'Submit'}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </>
    );
}