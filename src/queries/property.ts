import {useMutation, UseMutationOptions, useQuery} from "@tanstack/react-query";
import {apiDelete, apiGet, apiPost, apiPut} from "@/lib/api";

export function usePropertyQuery(id: number | string) {
    return useQuery({
        queryKey: ['property', id],
        queryFn: () => apiGet(`/properties/${id}`),
        initialData: {}
    });
}

export function usePropertyListQuery(params?: any) {
    return useQuery({
        queryKey: ['properties', params],
        queryFn: () => apiGet(`/properties`, params),
        initialData: {
            total: 0,
            items: []
        }
    });
}

export function useDeletePropertyMutation(params: Omit<UseMutationOptions, 'mutationFn'>) {
    return useMutation({
        mutationFn: (id: any) => apiDelete(`/properties/${id}`),
        ...params
    });
}

export function useCreatePropertyMutation(params: Omit<UseMutationOptions, 'mutationFn'>) {
    return useMutation({
        mutationFn: (data: any) => apiPost(`/properties`, data),
        ...params
    });
}

export function useUpdatePropertyMutation(params: Omit<UseMutationOptions, 'mutationFn'>) {
    return useMutation({
        mutationFn: ({id, data}: any) => apiPut(`/properties/${id}`, data),
        ...params
    });
}