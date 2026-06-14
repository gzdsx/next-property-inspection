'use client';

import {createContext, useContext, useState} from "react";

interface ReportContextType {
    report: any,
    updateReport: (date: any) => void,
    clearReport: () => void
}

const ReportContext = createContext<ReportContextType>({
    report: null,
    updateReport: (data: any) => {
    },
    clearReport: () => {
    }
});

export function ReportProvider({children}: { children: React.ReactNode }) {
    const [report, setReport] = useState<any>(null);

    const updateReport = (data: any) => {
        setReport((prev: any) => ({...prev, ...data}));
    }

    const clearReport = () => {
        setReport(null);
    }

    return (
        <ReportContext.Provider value={{report, clearReport, updateReport}}>
            {children}
        </ReportContext.Provider>
    )
}

export function useReportContext() {
    const context = useContext(ReportContext);
    if (context === undefined) {
        throw new Error("useReportContext must be used within a ReportProvider");
    }
    return context;
}

export function useNewReport() {
    const {report, updateReport, clearReport} = useReportContext();
    return {report, updateReport, clearReport};
}