import React, { useState, useEffect } from 'react';
import { Tabs, Button } from 'antd';
import { ShopOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import ProductList from './components/ProductList';
import CategoryList from './components/CategoryList';
import api from './utils/api';
import './App.css';

const App = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('1');

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/categories');
      setCategories(response.data);
      setError(null);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setError('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  const openPaymentScreen = () => {
    navigate('/payment');
  };

  const items = [
    {
      key: '1',
      label: 'Quản lý sản phẩm',
      children: <ProductList 
        categories={categories} 
        onCategoryChange={fetchCategories} 
      />,
    },
    {
      key: '2',
      label: 'Quản lý danh mục',
      children: <CategoryList onCategoryChange={fetchCategories} />,
    }
  ];

  return (
    <div className="App">
      <div className="p-4">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h1 className="text-2xl font-bold">Quản lý cửa hàng</h1>
          <Button 
            type="primary"
            size="large"
            icon={<ShopOutlined />}
            onClick={openPaymentScreen}
            style={{ 
              height: '48px',
              fontSize: '16px',
              padding: '0 24px'
            }}
          >
            Màn hình thanh toán
          </Button>
        </div>
        <Tabs 
          items={items} 
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key)}
        />
      </div>
    </div>
  );
};

export default App;
