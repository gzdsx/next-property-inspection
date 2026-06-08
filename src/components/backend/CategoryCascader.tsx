'use client';

import {Cascader} from 'antd';
import {useEffect, useState} from "react";
import {apiGet} from "@/lib/backendApi";

interface Option {
    value: string;
    label: string;
    children?: Option[];
}

interface CategoryCascaderProps {
    value?: string[];
    onChange?: (value: string[]) => void;
    placeholder?: string;
    taxonomy?: string;
    multiple?: boolean;
    extraOptions?: { label: string, value: string }[]
}

interface ServerCategoryType {
    id: number;
    name: string;
    children: ServerCategoryType[];
}

/**
 * 将原始分类数据转换为 Ant Design 友好的 Label/Value 格式
 * @param {Array} data 原始 JSON 数据
 * @returns {Array} 格式化后的数据
 */
function formatCategoryToOptions(data: ServerCategoryType[]) {
    return data.map((item: ServerCategoryType) => {
        const node: Option = {
            label: item.name,
            value: item.id.toString(), // 如果你需要以 slug 作为值，这里改为 item.slug
        };

        // 如果存在子节点且子节点数组不为空，则递归处理
        if (item.children && item.children.length > 0) {
            node.children = formatCategoryToOptions(item.children);
        }

        return node;
    });
}

export const CategoryCascader = ({
                                     value = [],
                                     onChange,
                                     placeholder = '请选择分类',
                                     taxonomy = 'category',
                                     extraOptions = []
                                 }: CategoryCascaderProps) => {
    const [categooryOptions, setCategooryOptions] = useState<Option[]>([]);

    useEffect(() => {
        (async function () {
            try {
                const response = await apiGet('/categories', {taxonomy});
                setCategooryOptions([...extraOptions, ...formatCategoryToOptions(response.data.items)]);
            } catch (e: unknown) {
                console.error(e);
            }
        })();
    }, [taxonomy])

    return (
        <Cascader
            options={categooryOptions}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            expandTrigger="hover"
            changeOnSelect={true}
        />
    );
};
