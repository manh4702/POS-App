import React, { useState, useEffect, useRef } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, Select, message, Popconfirm, Space, Card, Checkbox, Divider } from 'antd';
import api from '../utils/api';
import { BarcodeOutlined, SearchOutlined, DownloadOutlined, PlusOutlined } from '@ant-design/icons';
import eventBus from '../utils/eventBus';
import JsBarcode from 'jsbarcode';
import { ScannerModal } from '../utils/barcodeScanner';

const ProductList = ({ categories, onCategoryChange }) => {
    const [products, setProducts] = useState([]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form] = Form.useForm();
    const [isScannerVisible, setScannerVisible] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [isAddCategoryModalVisible, setIsAddCategoryModalVisible] = useState(false);
    const [categoryForm] = Form.useForm();
    const [hasWholesale, setHasWholesale] = useState(false);

    useEffect(() => {
        // console.log('Categories:', categories); // Log categories to check
        fetchProducts();
    }, [categories]);

    useEffect(() => {
        // Lắng nghe sự kiện thay đổi categories
        const handleCategoriesChanged = () => {
            fetchProducts();
        };

        eventBus.on('categoriesChanged', handleCategoriesChanged);

        // Cleanup khi component unmount
        return () => {
            eventBus.off('categoriesChanged', handleCategoriesChanged);
        };
    }, []);

    const fetchProducts = async () => {
        try {
            const response = await api.get('/api/products');
            setProducts(response.data);
            setFilteredProducts(response.data);
        } catch (error) {
            message.error('Không thể lấy danh sách sản phẩm');
        }
    };

    const columns = [
        {
            title: 'Tên sản phẩm',
            dataIndex: 'name',
            key: 'name',
            sorter: (a, b) => a.name.localeCompare(b.name),
        },
        {
            title: 'Giá lẻ',
            dataIndex: 'retail_price',
            key: 'retail_price',
            render: (price) => formatVND(price),
            sorter: (a, b) => a.retail_price - b.retail_price,
        },
        {
            title: 'Giá sỉ',
            key: 'wholesale',
            render: (_, record) => {
                if (!record.wholesale_price) return 'Không có';
                return formatVND(record.wholesale_price);
            },
            sorter: (a, b) => (a.wholesale_price || 0) - (b.wholesale_price || 0),
        },
        {
            title: 'Danh mục',
            dataIndex: 'category_name',
            key: 'category_name',
            sorter: (a, b) => a.category_name.localeCompare(b.category_name),
            filters: categories.map(cat => ({
                text: cat.name,
                value: cat.id
            })),
            onFilter: (value, record) => record.category_id === value,
        },
        {
            title: 'Mã vạch',
            dataIndex: 'barcode',
            key: 'barcode',
            render: (barcode, record) => (
                <Space>
                    <span>{barcode}</span>
                    {barcode && (
                        <Button 
                            type="link" 
                            icon={<DownloadOutlined />}
                            onClick={() => downloadBarcode(barcode, record.name)}
                            title="Tải mã vạch"
                        />
                    )}
                </Space>
            ),
        },
        {
            title: 'Thao tác',
            key: 'actions',
            render: (_, record) => (
                <span className="space-x-2">
                    <Button type="link" onClick={() => handleEdit(record)}>
                        Sửa
                    </Button>
                    <Popconfirm
                        title="Xóa sản phẩm"
                        description="Bạn có chắc chắn muốn xóa sản phẩm này?"
                        onConfirm={() => handleDelete(record.id)}
                        okText="Có"
                        cancelText="Không"
                    >
                        <Button type="link" danger>
                            Xóa
                        </Button>
                    </Popconfirm>
                </span>
            ),
        }
    ];

    const handleEdit = (record) => {
        // Thiết lập hasWholesale dựa vào dữ liệu
        setHasWholesale(!!record.wholesale_price);
        
        // Set form values
        form.setFieldsValue({
            ...record,
            retail_price: record.retail_price,
            wholesale_price: record.wholesale_price,
            wholesale_qty: record.wholesale_qty,
            wholesale_unit: record.wholesale_unit || 'Thùng'
        });
        
        setEditingId(record.id);
        setIsModalVisible(true);
    };

    const handleDelete = async (id) => {
        try {
            const response = await api.delete(`/api/products/${id}`);
            if (response.data) {
                message.success('Xóa sản phẩm thành công');
                fetchProducts();
            }
        } catch (error) {
            console.error('Delete error:', error.response || error);
            const errorMessage = error.response?.data?.error || 'Không thể xóa sản phẩm';
            message.error(errorMessage);
        }
    };

    const checkProductName = async (name, excludeId = null) => {
        try {
            const response = await api.get(
                `/api/products/check-name/${encodeURIComponent(name)}${excludeId ? `?excludeId=${excludeId}` : ''}`
            );
            return response.data.exists;
        } catch (error) {
            console.error('Error checking product name:', error);
            return false;
        }
    };

    const checkBarcode = async (barcode, excludeId = null) => {
        if (!barcode) return false;
        try {
            const response = await api.get(
                `/api/products/check-barcode/${encodeURIComponent(barcode)}${excludeId ? `?excludeId=${excludeId}` : ''}`
            );
            return response.data.exists;
        } catch (error) {
            console.error('Error checking barcode:', error);
            return false;
        }
    };

    const handleSubmit = async (values) => {
        try {
            const formData = {
                ...values,
                name: values.name.trim(),
                barcode: values.barcode?.trim() || generateBarcode(),
                wholesale_price: hasWholesale ? values.wholesale_price : null
            };

            // Ensure category_id is included in formData
            if (!formData.category_id) {
                message.error('Vui lòng chọn danh mục!');
                return;
            }

            // Send formData to the API
            if (editingId) {
                const response = await api.put(`/api/products/${editingId}`, formData);
                if (response.data) {
                    message.success('Cập nhật sản phẩm thành công');
                    setIsModalVisible(false);
                    setEditingId(null);
                    form.resetFields();
                    fetchProducts();
                }
            } else {
                const response = await api.post('/api/products', formData);
                if (response.data) {
                    message.success('Thêm sản phẩm thành công');
                    setIsModalVisible(false);
                    form.resetFields();
                    fetchProducts();
                }
            }
        } catch (error) {
            console.error('Submit error:', error);
            const errorMessage = error.response?.data?.error || `Không thể ${editingId ? 'cập nhật' : 'thêm'} sản phẩm`;
            message.error(errorMessage);
        }
    };

    const handleBarcodeDetected = (code) => {
        form.setFieldValue('barcode', code);
        setScannerVisible(false);
    };

    useEffect(() => {
        let result = [...products];
        
        // Lọc theo category
        if (selectedCategory !== 'all' && selectedCategory !== null) {
            result = result.filter(item => item.category_id === selectedCategory);
        }

        // Lọc theo search text
        if (searchText) {
            const searchLower = searchText.toLowerCase();
            result = result.filter(item => 
                item.name.toLowerCase().includes(searchLower) ||
                (item.barcode && item.barcode.toLowerCase().includes(searchLower)) ||
                item.category_name.toLowerCase().includes(searchLower)
            );
        }

        setFilteredProducts(result);
    }, [products, selectedCategory, searchText]);

    // Hàm tạo mã vạch ngẫu nhiên
    const generateBarcode = () => {
        const prefix = '200'; // Prefix cho mã vạch của bạn
        const random = Math.floor(Math.random() * 1000000000).toString().padStart(9, '0');
        return prefix + random;
    };

    // Hàm tạo và tải mã vạch
    const downloadBarcode = (barcode, productName) => {
        const canvas = document.createElement('canvas');
        JsBarcode(canvas, barcode, {
            format: "CODE128",
            width: 2,
            height: 100,
            displayValue: true,
            fontSize: 20,
            margin: 10
        });

        // Tạo link tải
        const link = document.createElement('a');
        link.download = `barcode-${productName.replace(/\s+/g, '-')}.png`;
        link.href = canvas.toDataURL('image/png');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Thêm preview mã vạch trong form
    const BarcodePreview = ({ value }) => {
        const canvasRef = useRef(null);

        useEffect(() => {
            if (value && canvasRef.current) {
                try {
                    JsBarcode(canvasRef.current, value, {
                        format: "CODE128",
                        width: 1.5,
                        height: 50,
                        displayValue: true,
                        fontSize: 12,
                        margin: 5
                    });
                } catch (error) {
                    console.error('Error generating barcode preview:', error);
                }
            }
        }, [value]);

        return value ? <canvas ref={canvasRef} /> : null;
    };

    // Thêm hàm format tiền VND
    const formatVND = (price) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(price);
    };

    // Thêm hàm kiểm tra tên category
    const checkCategoryName = async (name) => {
        try {
            const response = await api.get(
                `/api/categories/check-name/${encodeURIComponent(name.trim())}`
            );
            return response.data.exists;
        } catch (error) {
            console.error('Error checking category name:', error);
            return false;
        }
    };

    // Thêm hàm xử lý thêm category
    const handleAddCategory = async (values) => {
        try {
            const response = await api.post('/api/categories', values);
            if (response.data) {
                message.success('Thêm danh mục thành công');
                setIsAddCategoryModalVisible(false);
                categoryForm.resetFields();
                
                // Cập nhật danh sách categories
                await onCategoryChange();
                
                // Đợi một chút để danh sách categories được cập nhật
                setTimeout(() => {
                    // Tự động chọn category vừa tạo
                    form.setFieldValue('category_id', response.data.id);
                }, 100);
            }
        } catch (error) {
            console.error('Error adding category:', error);
            if (error.response?.data?.error) {
                message.error(error.response.data.error);
            } else {
                message.error('Không thể thêm danh mục');
            }
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between mb-4">
                <h1 className="text-2xl font-bold">Quản lý sản phẩm</h1>
                <Button type="primary" onClick={() => {
                    setEditingId(null);
                    form.resetFields();
                    setIsModalVisible(true);
                }}>
                    Thêm sản phẩm
                </Button>
            </div>

            <Card className="mb-4">
                <div className="flex gap-4 items-center">
                    <div className="flex-1">
                        <Input
                            placeholder="Tìm kiếm theo tên, mã vạch hoặc danh mục"
                            prefix={<SearchOutlined />}
                            value={searchText}
                            onChange={e => setSearchText(e.target.value)}
                            allowClear
                        />
                    </div>
                    <div className="w-64">
                        <Select
                            placeholder="Lọc theo danh mục"
                            style={{ width: '100%' }}
                            allowClear
                            value={selectedCategory}
                            onChange={setSelectedCategory}
                            options={[
                                { value: 'all', label: 'Tất cả danh mục' },
                                ...categories.map(cat => ({
                                    value: cat.id,
                                    label: cat.name
                                }))
                            ]}
                        />
                    </div>
                </div>
            </Card>

            <div className="grid grid-cols-3 gap-4 mb-4">
                <Card>
                    <div className="text-center">
                        <div className="text-lg font-semibold">Tổng số sản phẩm</div>
                        <div className="text-2xl">{products.length}</div>
                    </div>
                </Card>
                <Card>
                    <div className="text-center">
                        <div className="text-lg font-semibold">Số danh mục</div>
                        <div className="text-2xl">{categories.length}</div>
                    </div>
                </Card>
                <Card>
                    <div className="text-center">
                        <div className="text-lg font-semibold">Kết quả tìm kiếm</div>
                        <div className="text-2xl">{filteredProducts.length}</div>
                    </div>
                </Card>
            </div>

            <Table 
                columns={columns} 
                dataSource={filteredProducts}
                rowKey="id"
                pagination={{
                    total: filteredProducts.length,
                    pageSize: 10,
                    showTotal: (total, range) => `${range[0]}-${range[1]} trên ${total} sản phẩm`,
                    showSizeChanger: true,
                    showQuickJumper: true
                }}
            />

            <Modal
                title={editingId ? "Sửa sản phẩm" : "Thêm sản phẩm mới"}
                open={isModalVisible}
                onCancel={() => {
                    setIsModalVisible(false);
                    setEditingId(null);
                    form.resetFields();
                }}
                footer={null}
            >
                <Form
                    form={form}
                    onFinish={handleSubmit}
                    layout="vertical"
                    initialValues={{ wholesale_unit: 'Thùng' }}
                >
                    <Form.Item
                        name="name"
                        label="Tên sản phẩm"
                        rules={[
                            { required: true, message: 'Vui lòng nhập tên sản phẩm!' },
                            {
                                validator: async (_, value) => {
                                    if (value) {
                                        const exists = await checkProductName(value, editingId);
                                        if (exists) {
                                            throw new Error('Tên sản phẩm đã tồn tại');
                                        }
                                    }
                                }
                            }
                        ]}
                    >
                        <Input />
                    </Form.Item>

                    <Form.Item
                        name="barcode"
                        label="Mã vạch"
                        rules={[
                            {
                                validator: async (_, value) => {
                                    if (value) {
                                        const exists = await checkBarcode(value, editingId);
                                        if (exists) {
                                            throw new Error('Mã vạch đã tồn tại');
                                        }
                                    }
                                }
                            }
                        ]}
                        help="Để trống để tự động tạo mã vạch"
                    >
                        <Space.Compact style={{ width: '100%' }}>
                            <Input />
                            <Button 
                                icon={<BarcodeOutlined />}
                                onClick={() => setScannerVisible(true)}
                            />
                        </Space.Compact>
                        <Form.Item noStyle shouldUpdate>
                            {({ getFieldValue }) => (
                                <BarcodePreview value={getFieldValue('barcode')} />
                            )}
                        </Form.Item>
                    </Form.Item>

                    <Form.Item
                        name="retail_price"
                        label="Giá lẻ (VND)"
                        rules={[
                            { required: true, message: 'Vui lòng nhập giá lẻ!' },
                            {
                                validator: (_, value) => {
                                    if (value < 0) {
                                        return Promise.reject('Giá không thể âm');
                                    }
                                    if (value % 1000 !== 0) {
                                        return Promise.reject('Giá phải là bội số của 1000đ');
                                    }
                                    return Promise.resolve();
                                }
                            }
                        ]}
                    >
                        <InputNumber
                            min={0}
                            step={1000}
                            style={{ width: '100%' }}
                            formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                            parser={value => value.replace(/\$\s?|(,*)/g, '')}
                            addonAfter="VND"
                        />
                    </Form.Item>

                    <Form.Item>
                        <Checkbox 
                            checked={hasWholesale}
                            onChange={(e) => setHasWholesale(e.target.checked)}
                        >
                            Có giá bán sỉ
                        </Checkbox>
                    </Form.Item>

                    {hasWholesale && (
                        <Form.Item
                            name="wholesale_price"
                            label="Giá sỉ (VND)"
                            rules={[
                                { required: true, message: 'Vui lòng nhập giá sỉ!' },
                                {
                                    validator: (_, value) => {
                                        if (value < 0) {
                                            return Promise.reject('Giá không thể âm');
                                        }
                                        if (value % 1000 !== 0) {
                                            return Promise.reject('Giá phải là bội số của 1000đ');
                                        }
                                        return Promise.resolve();
                                    }
                                }
                            ]}
                        >
                            <InputNumber
                                min={0}
                                step={1000}
                                style={{ width: '100%' }}
                                formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                parser={value => value.replace(/\$\s?|(,*)/g, '')}
                                addonAfter="VND"
                            />
                        </Form.Item>
                    )}

                    <Form.Item
                        name="category_id"
                        label="Danh mục"
                        rules={[{ required: true, message: 'Vui lòng chọn danh mục!' }]}
                    >
                        <Select
                            style={{ width: '100%' }}
                            dropdownRender={(menu) => (
                                <>
                                    {menu}
                                    <Divider style={{ margin: '8px 0' }} />
                                    <Button
                                        type="text"
                                        icon={<PlusOutlined />}
                                        onClick={() => setIsAddCategoryModalVisible(true)}
                                        style={{ width: '100%', textAlign: 'left' }}
                                    >
                                        Thêm danh mục mới
                                    </Button>
                                </>
                            )}
                        >
                            {categories.map(category => (
                                <Select.Option key={category.id} value={category.id}>
                                    {category.name}
                                </Select.Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item>
                        <Button type="primary" htmlType="submit">
                            {editingId ? 'Cập nhật' : 'Thêm mới'}
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>

            <ScannerModal 
                isVisible={isScannerVisible}
                onCancel={() => setScannerVisible(false)}
                onDetected={handleBarcodeDetected}
            />

            <Modal
                title="Thêm danh mục mới"
                open={isAddCategoryModalVisible}
                onCancel={() => {
                    setIsAddCategoryModalVisible(false);
                    categoryForm.resetFields();
                }}
                footer={null}
            >
                <Form
                    form={categoryForm}
                    onFinish={handleAddCategory}
                    layout="vertical"
                >
                    <Form.Item
                        name="name"
                        label="Tên danh mục"
                        rules={[
                            { required: true, message: 'Vui lòng nhập tên danh mục!' },
                            { whitespace: true, message: 'Tên danh mục không được trống!' },
                            {
                                validator: async (_, value) => {
                                    if (value) {
                                        const exists = await checkCategoryName(value);
                                        if (exists) {
                                            throw new Error('Tên danh mục đã tồn tại');
                                        }
                                    }
                                    return Promise.resolve();
                                }
                            }
                        ]}
                        validateTrigger={['onChange', 'onBlur']}
                    >
                        <Input />
                    </Form.Item>

                    <Form.Item>
                        <Button type="primary" htmlType="submit">
                            Thêm danh mục
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default ProductList; 