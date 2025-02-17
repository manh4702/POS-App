import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    },
    timeout: 5000,
    withCredentials: true
});

// Thêm interceptors để xử lý lỗi
api.interceptors.response.use(
    response => response,
    error => {
        // Log chi tiết lỗi
        console.error('API Error:', {
            config: error.config,
            response: error.response,
            message: error.message
        });

        // Xử lý các lỗi cụ thể
        if (error.response) {
            // Lỗi từ server
            console.error('Server error:', error.response.data);
        } else if (error.request) {
            // Lỗi không có response
            console.error('No response from server');
        } else {
            // Lỗi khác
            console.error('Error:', error.message);
        }

        return Promise.reject(error);
    }
);

export default api; 