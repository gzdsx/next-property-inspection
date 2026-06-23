import {useMutation, UseMutationOptions, useQuery} from "@tanstack/react-query";
import {apiDelete, apiGet, apiPost, apiPut} from "@/lib/api";

export function useMaterialQuery(id: number | string) {
    return useQuery({
        queryKey: ['material', id],
        queryFn: () => apiGet(`/materials/${id}`),
        initialData: {},
        enabled: !!id,
    });
}

export function useMaterialListQuery(params?: any) {
    return useQuery({
        queryKey: ['materials', params],
        queryFn: () => apiGet(`/materials`, params),
        initialData: {
            total: 0,
            items: []
        },
    });
}

export function useCreateMaterialMutation(params: Omit<UseMutationOptions, 'mutationFn'>) {
    return useMutation({
        mutationFn: (data: any) => apiPost(`/materials`, data),
        ...params,
    });
}

export function useUpdateMaterialMutation(params: Omit<UseMutationOptions, 'mutationFn'>) {
    return useMutation({
        mutationFn: ({id, data}: any) => apiPut(`/materials/${id}`, data),
        ...params,
    });
}

export function useDeleteMaterialMutation(params: Omit<UseMutationOptions, 'mutationFn'>) {
    return useMutation({
        mutationFn: (id: any) => apiDelete(`/materials/${id}`),
        ...params,
    });
}
