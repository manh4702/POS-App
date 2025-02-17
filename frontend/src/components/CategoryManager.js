import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, message, Popconfirm } from 'antd';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const CategoryManager = () => {
    const [categories, setCategories] = useState([]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [form] = Form.useForm();
    const [editingId, setEditingId] = useState(null);

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/categories`);
            setCategories(response.data);
        } catch (error) {
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

    const handleAddCategory = async (values) => {
        try {
            await axios.post(`${API_URL}/api/categories`, values);
            message.success('Category added successfully');
            setIsModalVisible(false);
            form.resetFields();
            fetchCategories();
        } catch (error) {
            message.error('Failed to add category');
        }
    };

    const handleDelete = async (id) => {
        try {
            const response = await axios.delete(`${API_URL}/api/categories/${id}`, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.data) {
                message.success('Category deleted successfully');
                fetchCategories();
            }
        } catch (error) {
            console.error('Delete error:', error.response || error);
            let errorMessage = 'Failed to delete category';
            
            if (error.response) {
                errorMessage = error.response.data?.error || errorMessage;
            } else if (error.request) {
                errorMessage = 'Could not connect to server';
            }
            
            message.error(errorMessage);
        }
    };

    const handleEdit = (record) => {
        form.setFieldsValue(record);
        setEditingId(record.id);
        setIsModalVisible(true);
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
        } catch (error) {
            console.error('Submit error:', error);
            message.error(`Failed to ${editingId ? 'update' : 'add'} category`);
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between mb-4">
                <h1 className="text-2xl font-bold">Categories</h1>
                <Button type="primary" onClick={() => setIsModalVisible(true)}>
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
                        label="Name"
                        rules={[{ required: true, message: 'Please input category name!' }]}
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

export default CategoryManager; 