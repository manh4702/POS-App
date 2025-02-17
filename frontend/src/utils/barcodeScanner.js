import React, { useEffect, useState } from 'react';
import { Modal, Button } from 'antd';
// import Quagga from '@ericblade/quagga2';

export const initScanner = async (container, onDetected) => {
    // ... initialization code
};

export const stopScanner = () => {
    // ... stop scanner code
};

export const ScannerModal = ({ isVisible, onCancel, onDetected }) => {
    // eslint-disable-next-line
    const [isScanning, setIsScanning] = useState(false);

    useEffect(() => {
        // ... scanner logic
    }, [isVisible]);

    return (
        <Modal
            title="Quét mã vạch"
            open={isVisible}
            onCancel={onCancel}
            footer={[
                <Button key="cancel" onClick={onCancel}>
                    Đóng
                </Button>
            ]}
            width={700}
            centered
            maskClosable={false}
            destroyOnClose={true}
        >
            <div id="scanner-container" style={{ width: '640px', height: '480px', margin: '0 auto', backgroundColor: '#000' }} />
        </Modal>
    );
}; 