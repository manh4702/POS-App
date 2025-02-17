import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, message, Popconfirm } from 'antd';
import axios from 'axios';
import eventBus from '../utils/eventBus';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const CategoryList = ({ onCategoryChange }) => {
    const [categories, setCategories] = useState([]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form] = Form.useForm();

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/categories`);
            setCategories(response.data);
        } catch (error) {
            console.error('Error fetching categories:', error);
            message.error('Failed to fetch categories');
        }
    };

    const columns = [
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <span className="space-x-2">
                    <Button type="link" onClick={() => handleEdit(record)}>
                        Edit
                    </Button>
                    <Popconfirm
                        title="Delete Category"
                        description="Are you sure you want to delete this category?"
                        onConfirm={() => handleDelete(record.id)}
                        okText="Yes"
                        cancelText="No"
                    >
                        <Button type="link" danger>
                            Delete
                        </Button>
                    </Popconfirm>
                </span>
            ),
        }
    ];

    const handleEdit = (record) => {
        form.setFieldsValue(record);
        setEditingId(record.id);
        setIsModalVisible(true);
    };

    const handleDelete = async (id) => {
        try {
            await axios.delete(`${API_URL}/api/categories/${id}`);
            message.success('Category deleted successfully');
            fetchCategories();
            // Emit event khi có thay đổi
            eventBus.emit('categoriesChanged');
            onCategoryChange(); // Gọi callback để cập nhật categories
        } catch (error) {
            console.error('Delete error:', error);
            if (error.response?.data?.error) {
                message.error(error.response.data.error);
            } else {
                message.error('Failed to delete category');
            }
        }
    };

    const handleSubmit = async (values) => {
        try {
            if (editingId) {
                await axios.put(`${API_URL}/api/categories/${editingId}`, values);
                message.success('Category updated successfully');
            } else {
                await axios.post(`${API_URL}/api/categories`, values);
                message.success('Category added successfully');
            }
            setIsModalVisible(false);
            setEditingId(null);
            form.resetFields();
            fetchCategories();
            // Emit event khi có thay đổi
            eventBus.emit('categoriesChanged');
            onCategoryChange(); // Gọi callback để cập nhật categories
        } catch (error) {
            console.error('Submit error:', error);
            message.error('Failed to save category');
        }
    };

    // Thêm hàm kiểm tra tên category
    const checkCategoryName = async (name, excludeId = null) => {
        try {
            const response = await axios.get(
                `${API_URL}/api/categories/check-name/${encodeURIComponent(name.trim())}${excludeId ? `?excludeId=${excludeId}` : ''}`
            );
            return response.data.exists;
        } catch (error) {
            console.error('Error checking category name:', error);
            return false;
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between mb-4">
                <h1 className="text-2xl font-bold">Categories</h1>
                <Button type="primary" onClick={() => {
                    setEditingId(null);
                    form.resetFields();
                    setIsModalVisible(true);
                }}>
                    Add Category
                </Button>
            </div>

            <Table columns={columns} dataSource={categories} rowKey="id" />

            <Modal
                title={editingId ? "Edit Category" : "Add New Category"}
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
                >
                    <Form.Item
                        name="name"
                        label="Category Name"
                        rules={[
                            { required: true, message: 'Please input category name!' },
                            { whitespace: true, message: 'Category name cannot be empty!' },
                            {
                                validator: async (_, value) => {
                                    if (value) {
                                        const exists = await checkCategoryName(value);
                                        if (exists) {
                                            throw new Error('Category name already exists');
                                        }
                                    }
                                    return Promise.resolve();
                                }
                            }
                        ]}
                    >
                        <Input />
                    </Form.Item>

                    <Form.Item>
                        <Button type="primary" htmlType="submit">
                            {editingId ? 'Update Category' : 'Add Category'}
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default CategoryList; 