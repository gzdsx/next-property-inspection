import {Select} from "antd";
import {useTranslations} from "@/contexts/BackendLocaleContext";

interface UserStatusSelectProps {
    value?: string;
    onChange?: (value: string) => void;
    placeholder?: string;
    style?: React.CSSProperties;
    className?: string;
    extraOptions?: { label: string, value: string }[]
}

const UserStatusSelect = ({
                              value,
                              onChange,
                              placeholder,
                              style,
                              className,
                              extraOptions = []
                          }: UserStatusSelectProps) => {
    const {t} = useTranslations('users');

    return (
        <Select
            value={value}
            options={[
                ...extraOptions,
                {value: 'active', label: t('active')},
                {value: 'dormant', label: t('dormant')},
                {value: 'banned', label: t('banned')},
                {value: 'pending', label: t('pending')},
            ]}
            onChange={onChange}
            placeholder={placeholder || t('selectStatus')}
            style={style}
            className={className}
        />
    );
};

export default UserStatusSelect;
