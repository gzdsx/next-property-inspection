import { Spin } from "antd";
import { LoadingOutlined } from "@ant-design/icons";

export default function Loading() {
    return (
        <div
            style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                minHeight: "60vh",
            }}
        >
            <Spin
                indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />}
            />
        </div>
    );
}
