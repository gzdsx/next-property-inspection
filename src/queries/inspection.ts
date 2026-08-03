import {useMutation, UseMutationOptions, useQuery} from "@tanstack/react-query";
import {apiDelete, apiGet, apiPost, apiPut} from "@/lib/api";

export function useInspectionQuery(id: number | string) {
    return useQuery({
        queryKey: ['inspection', id],
        queryFn: () => apiGet(`/inspections/${id}`),
        initialData: {},
        enabled: !!id
    });
}

export function useInspectionListQuery(params?: any) {
    return useQuery({
        queryKey: ['inspections', params],
        queryFn: () => apiGet(`/inspections`, params),
        initialData: {
            total: 0,
            items: []
        }
    });
}

export function useDeleteInspectionMutation(params: Omit<UseMutationOptions, 'mutationFn'>) {
    return useMutation({
        mutationFn: (id: any) => apiDelete(`/inspections/${id}`),
        ...params
    });
}

export function useCreateInspectionMutation(params: Omit<UseMutationOptions, 'mutationFn'>) {
    return useMutation({
        mutationFn: (data: any) => apiPost(`/inspections`, data),
        ...params
    });
}

export function useUpdateInspectionMutation(params: Omit<UseMutationOptions, 'mutationFn'>) {
    return useMutation({
        mutationFn: ({id, data}: any) => apiPut(`/inspections/${id}`, data),
        ...params
    });
}