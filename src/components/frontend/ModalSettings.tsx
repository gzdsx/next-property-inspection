'use client';

import React, {useState} from "react";
import CloseIcon from "@/components/frontend/CloseIcon";

interface ModelSettingsProps {
    onClose: () => void;
    onSave: () => void;
}

const ModalSettings = ({onClose, onSave}: ModelSettingsProps) => {
    const [settingsCompanyName, setSettingsCompanyName] = useState('Irish PropTech Agency');
    const [settingsInspectorName, setSettingsInspectorName] = useState('Steven Smith');
    const [settingsPhone, setSettingsPhone] = useState('07701 068531');
    const [settingsEmail, setSettingsEmail] = useState('inspector@irishproptech.ie');
    const [settingsReference, setSettingsReference] = useState('035474');

    const handleSaveSettings = () => {
        onSave()
    }

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="glass-panel modal-card" onClick={(e) => e.stopPropagation()}
                 style={{maxWidth: "550px"}}>
                <div style={{
                    padding: "20px 24px",
                    borderBottom: "1px solid var(--panel-border)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                }}>
                    <h3 style={{margin: 0, fontSize: "1.2rem", fontWeight: "bold"}}>Organisation Settings</h3>
                    <button
                        onClick={onClose}
                        style={{
                            background: "transparent",
                            border: "none",
                            color: "var(--text-muted)",
                            cursor: "pointer"
                        }}
                    >
                        <CloseIcon/>
                    </button>
                </div>
                <div style={{
                    padding: "24px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "14px",
                    overflowY: "auto",
                    maxHeight: "400px"
                }}>
                    <div style={{display: "flex", flexDirection: "column", gap: "6px"}}>
                        <label style={{fontSize: "0.8rem", fontWeight: "bold", color: "var(--text-muted)"}}>Company
                            Name</label>
                        <input
                            type="text"
                            className="sheet-input"
                            value={settingsCompanyName}
                            onChange={e => setSettingsCompanyName(e.target.value)}
                        />
                    </div>
                    <div style={{display: "flex", flexDirection: "column", gap: "6px"}}>
                        <label style={{fontSize: "0.8rem", fontWeight: "bold", color: "var(--text-muted)"}}>Inspector
                            Name</label>
                        <input
                            type="text"
                            className="sheet-input"
                            value={settingsInspectorName}
                            onChange={e => setSettingsInspectorName(e.target.value)}
                        />
                    </div>
                    <div style={{display: "flex", flexDirection: "column", gap: "6px"}}>
                        <label style={{fontSize: "0.8rem", fontWeight: "bold", color: "var(--text-muted)"}}>Inspector
                            Phone</label>
                        <input
                            type="text"
                            className="sheet-input"
                            value={settingsPhone}
                            onChange={e => setSettingsPhone(e.target.value)}
                        />
                    </div>
                    <div style={{display: "flex", flexDirection: "column", gap: "6px"}}>
                        <label style={{fontSize: "0.8rem", fontWeight: "bold", color: "var(--text-muted)"}}>Inspector
                            Email</label>
                        <input
                            type="email"
                            className="sheet-input"
                            value={settingsEmail}
                            onChange={e => setSettingsEmail(e.target.value)}
                        />
                    </div>
                    <div style={{display: "flex", flexDirection: "column", gap: "6px"}}>
                        <label style={{fontSize: "0.8rem", fontWeight: "bold", color: "var(--text-muted)"}}>Reference
                            No.</label>
                        <input
                            type="text"
                            className="sheet-input"
                            value={settingsReference}
                            onChange={e => setSettingsReference(e.target.value)}
                        />
                    </div>
                </div>
                <div style={{
                    padding: "16px 24px",
                    borderTop: "1px solid var(--panel-border)",
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: "12px"
                }}>
                    <button type="button" onClick={onClose} className="sheet-select"
                            style={{padding: "10px 20px"}}>Close
                    </button>
                    <button type="button" onClick={handleSaveSettings} style={{
                        padding: "0 24px",
                        backgroundColor: "var(--primary)",
                        border: "none",
                        borderRadius: "8px",
                        color: "white",
                        fontWeight: "bold",
                        height: "38px",
                        cursor: "pointer"
                    }}>Save
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ModalSettings;