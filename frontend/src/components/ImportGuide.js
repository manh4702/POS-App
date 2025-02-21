import React from 'react';
import { Modal, Typography, Steps } from 'antd';
import { EXCEL_TEMPLATE } from '../utils/excelTemplate';

const { Title, Text } = Typography;

export const ImportGuide = ({ visible, onClose }) => {
  return (
    <Modal
      title="Hướng dẫn import dữ liệu"
      open={visible}
      onCancel={onClose}
      footer={null}
      width={700}
    >
      <Steps
        direction="vertical"
        items={[
          {
            title: 'Chuẩn bị file Excel',
            description: (
              <>
                <Text>File Excel cần có các cột sau:</Text>
                <ul>
                  {EXCEL_TEMPLATE.headers.map(header => (
                    <li key={header.key}>
                      <Text strong>{header.label}</Text>
                      {EXCEL_TEMPLATE.required.includes(header.key) && 
                        <Text type="danger"> (Bắt buộc)</Text>
                      }
                    </li>
                  ))}
                </ul>
              </>
            )
          },
          {
            title: 'Định dạng dữ liệu',
            description: (
              <>
                <Text>- Giá tiền: Số nguyên</Text>
                <br />
                <Text>- Danh mục: Phải tồn tại trong hệ thống</Text>
              </>
            )
          }
        ]}
      />
    </Modal>
  );
}; 