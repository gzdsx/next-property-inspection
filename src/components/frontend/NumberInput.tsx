interface NumberInputProps {
    value: number;
    onChange: (value: number) => void;
    max?: number;
    min?: number;
}

export const NumberInput = ({value, onChange, max = 99, min = 1}: NumberInputProps) => {
    const handleIncrement = () => {
        if (value < max) {
            onChange(value + 1)
        }
    }

    const handleDecrement = () => {
        console.log("handleDecrement", value, min);
        if (value > min) {
            onChange(value - 1)
        }
    }

    return (
        <div style={{display: "flex", alignItems: "center", gap: "10px"}}>
            <button type="button" onClick={handleDecrement} className="sheet-select" style={{padding: "8px 12px"}}>-
            </button>
            <span style={{fontWeight: "bold"}}>{value}</span>
            <button type="button" onClick={handleIncrement} className="sheet-select" style={{padding: "8px 12px"}}>+
            </button>
        </div>
    );
};

export default NumberInput;