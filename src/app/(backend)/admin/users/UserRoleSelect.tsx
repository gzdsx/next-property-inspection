'use client';

import {useEffect, useState} from 'react';
import {Select} from 'antd';
import {apiGet} from '@/lib/backendApi';
import {useTranslations} from '@/contexts/BackendLocaleContext';

interface RoleSelectProps {
    value?: string;
    onChange?: (value: string) => void;
    placeholder?: string;
    style?: React.CSSProperties;
    className?: string;
    extraOptions?: { label: string, value: string }[]
}

const UserRoleSelect = ({
                            value,
                            onChange,
                            placeholder,
                            style,
                            className,
                            extraOptions = []
                        }: RoleSelectProps) => {
    const {t} = useTranslations('users');
    const [roles, setRoles] = useState<{ value: string, label: string }[]>(extraOptions);
    const [loading, setLoading] = useState(true);


    useEffect(() => {
        apiGet('/roles').then(response => {
            const serverRoles = (response.data.items || []).map((role: { id: string, name: string }) => ({
                value: role.id,
                label: role.name
            }));
            setRoles(([]) => [...extraOptions, ...serverRoles]);
        }).catch(() => {
            setRoles([]);
        }).finally(() => {
            setLoading(false);
        });
    }, []);

    return (
        <Select
            value={value}
            options={roles}
            onChange={onChange}
            loading={loading}
            placeholder={placeholder || t('selectRole')}
            style={style}
            className={className}
        />
    );
};

export default UserRoleSelect;
