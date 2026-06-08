import {Checkbox} from 'antd';
import {useEffect, useState} from 'react';
import {apiGet} from "@/lib/backendApi";

interface CategoryNode {
    label: string;
    value: string;
    children?: CategoryNode[];
}

interface CategoryCheckboxGroupProps {
    taxonomy?: string;
    value?: string[];
    onChange?: (value: string[]) => void;
}

interface ServerCategory {
    id: number;
    name: string;
    slug: string;
    parent_id: number;
    children: ServerCategory[];
}

/**
 * 将原始分类数据转换为 Ant Design 友好的 Label/Value 格式
 * @param {Array} data 原始 JSON 数据
 * @returns {Array} 格式化后的数据
 */
function formatCategoryToOptions(data: ServerCategory[]) {
    return data.map((item: ServerCategory) => {
        const node:CategoryNode = {
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

/**
 * @param node
 * @param value
 * @param onChange
 * @param level
 * @constructor
 */

const CategoryItem = ({node, value, onChange, level = 0}: {
    node: CategoryNode;
    value: string[];
    onChange: (value: string[]) => void;
    level?: number;
}) => {
    const hasChildren = node.children && node.children.length > 0;

    const handleCheck = (checked: boolean, itemValue: string) => {
        let newValue = [...value];

        if (checked) {
            newValue.push(itemValue);
            // 选中父节点时，递归选中所有子节点
            if (hasChildren) {
                const collectChildren = (children: CategoryNode[]) => {
                    children.forEach(child => {
                        if (!newValue.includes(child.value)) {
                            newValue.push(child.value);
                        }
                        if (child.children) {
                            collectChildren(child.children);
                        }
                    });
                };
                collectChildren(node.children!);
            }
        } else {
            newValue = newValue.filter(v => v !== itemValue);
            // 取消父节点时，递归取消所有子节点
            if (hasChildren) {
                const removeChildren = (children: CategoryNode[]) => {
                    children.forEach(child => {
                        newValue = newValue.filter(v => v !== child.value);
                        if (child.children) {
                            removeChildren(child.children);
                        }
                    });
                };
                removeChildren(node.children!);
            }
        }

        onChange(newValue);
    };

    return (
        <div style={{marginLeft: level * 24}}>
            <Checkbox
                checked={value.includes(node.value)}
                onChange={(e) => handleCheck(e.target.checked, node.value)}
            >
                {node.label}
            </Checkbox>
            {hasChildren && (
                <div style={{marginTop: 4}}>
                    {node.children!.map(child => (
                        <CategoryItem
                            key={child.value}
                            node={child}
                            value={value}
                            onChange={onChange}
                            level={level + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export const CategoryCheckboxGroup = ({value = [], taxonomy = 'category', onChange}: CategoryCheckboxGroupProps) => {
    const [categoryData, setCategoryData] = useState<CategoryNode[]>([]);

    const handleChange = (newValue: string[]) => {
        onChange?.(newValue);
    };

    useEffect(() => {
        (async function () {
            const response = await apiGet(`/categories?taxonomy=${taxonomy}`);
            setCategoryData(formatCategoryToOptions(response.data.items));
        })();
    }, [taxonomy]);

    return (
        <div className={'max-h-60 overflow-y-auto'}>
            <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
                {categoryData.map(category => (
                    <CategoryItem
                        key={category.value}
                        node={category}
                        value={value}
                        onChange={handleChange}
                    />
                ))}
            </div>
        </div>
    );
};
