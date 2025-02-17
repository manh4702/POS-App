const express = require('express');
const cors = require('cors');
const { createDbConnection } = require('./database');

function setupServer(db) {
    const app = express();

    // Cấu hình CORS
    app.use(cors({
        origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true
    }));

    // Middleware
    app.use(express.json());
    app.use((req, res, next) => {
        console.log(`${req.method} ${req.url}`);
        next();
    });

    // API Routes - Sắp xếp theo thứ tự từ cụ thể đến chung
    // 1. Products Routes
    // 1.1 Search products
    app.get('/api/products/search', (req, res) => {
        const searchTerm = req.query.q?.toLowerCase();
        if (!searchTerm) {
            return res.json([]);
        }

        const query = `
            SELECT p.*, c.name as category_name 
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE LOWER(p.name) LIKE ? 
               OR p.barcode LIKE ? 
               OR LOWER(c.name) LIKE ?
            ORDER BY 
                CASE 
                    WHEN LOWER(p.name) LIKE ? THEN 1
                    WHEN p.barcode = ? THEN 2
                    ELSE 3
                END,
                p.name
            LIMIT 10
        `;
        
        const params = [
            `%${searchTerm}%`,
            `%${searchTerm}%`,
            `%${searchTerm}%`,
            `${searchTerm}%`,
            searchTerm
        ];

        console.log('Search query:', query);
        console.log('Search params:', params);
        
        db.all(query, params, (err, rows) => {
            if (err) {
                console.error('Search error:', err);
                res.status(400).json({ error: err.message });
                return;
            }
            console.log('Search results:', rows);
            res.json(rows);
        });
    });

    // 1.2 Check product name
    app.get('/api/products/check-name/:name', (req, res) => {
        const name = req.params.name.trim().toLowerCase(); // Chuẩn hóa tên để so sánh
        const excludeId = req.query.excludeId;

        let query = 'SELECT id FROM products WHERE LOWER(name) = ?';
        let params = [name];

        if (excludeId) {
            query += ' AND id != ?';
            params.push(excludeId);
        }

        db.get(query, params, (err, row) => {
            if (err) {
                res.status(400).json({ error: err.message });
                return;
            }
            res.json({ exists: !!row });
        });
    });

    // 1.3 Check barcode
    app.get('/api/products/check-barcode/:barcode', (req, res) => {
        const barcode = req.params.barcode;
        const excludeId = req.query.excludeId;

        let query = 'SELECT id FROM products WHERE barcode = ?';
        let params = [barcode];

        if (excludeId) {
            query += ' AND id != ?';
            params.push(excludeId);
        }

        db.get(query, params, (err, row) => {
            if (err) {
                res.status(400).json({ error: err.message });
                return;
            }
            res.json({ exists: !!row });
        });
    });

    // 1.4 Get product by barcode
    app.get('/api/products/barcode/:barcode', (req, res) => {
        const barcode = req.params.barcode;
        db.get(`
            SELECT p.*, c.name as category_name 
            FROM products p 
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.barcode = ?
        `, [barcode], (err, row) => {
            if (err) {
                res.status(400).json({ error: err.message });
                return;
            }
            if (!row) {
                res.status(404).json({ error: 'Product not found' });
                return;
            }
            res.json(row);
        });
    });

    // 1.5 Get all products
    app.get('/api/products', (req, res) => {
        db.all(`
            SELECT p.*, c.name as category_name 
            FROM products p 
            LEFT JOIN categories c ON p.category_id = c.id
        `, [], (err, rows) => {
            if (err) {
                res.status(400).json({ error: err.message });
                return;
            }
            res.json(rows);
        });
    });

    // 1.6 Other product routes
    app.post('/api/products', async (req, res) => {
        const { name, retail_price, wholesale_price, category_id, barcode } = req.body;

        try {
            // Validate required fields
            if (!name || !retail_price || !category_id) {
                res.status(400).json({ error: 'Name, retail price and category are required' });
                return;
            }

            // Validate prices
            if (retail_price < 0) {
                res.status(400).json({ error: 'Retail price cannot be negative' });
                return;
            }

            if (wholesale_price && wholesale_price < 0) {
                res.status(400).json({ error: 'Wholesale price cannot be negative' });
                return;
            }

            const query = `
                INSERT INTO products (name, retail_price, wholesale_price, category_id, barcode)
                VALUES (?, ?, ?, ?, ?)
            `;

            db.run(query, 
                [name, retail_price, wholesale_price || null, category_id, barcode],
                function(err) {
                    if (err) {
                        res.status(400).json({ error: err.message });
                        return;
                    }
                    res.json({
                        id: this.lastID,
                        message: 'Product added successfully'
                    });
                }
            );
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    app.put('/api/products/:id', async (req, res) => {
        const { name, retail_price, wholesale_price, category_id, barcode } = req.body;
        const id = req.params.id;

        try {
            // Validate required fields
            if (!name || !retail_price || !category_id) {
                res.status(400).json({ error: 'Name, retail price and category are required' });
                return;
            }

            // Validate prices
            if (retail_price < 0) {
                res.status(400).json({ error: 'Retail price cannot be negative' });
                return;
            }

            if (wholesale_price && wholesale_price < 0) {
                res.status(400).json({ error: 'Wholesale price cannot be negative' });
                return;
            }

            // Update product
            const query = `
                UPDATE products 
                SET name = ?, 
                    retail_price = ?, 
                    wholesale_price = ?,
                    category_id = ?,
                    barcode = ?
                WHERE id = ?
            `;

            db.run(query, 
                [name, retail_price, wholesale_price || null, category_id, barcode, id],
                function(err) {
                    if (err) {
                        res.status(400).json({ error: err.message });
                        return;
                    }
                    if (this.changes === 0) {
                        res.status(404).json({ error: 'Product not found' });
                        return;
                    }
                    res.json({ 
                        message: 'Product updated successfully',
                        changes: this.changes 
                    });
                }
            );
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    app.delete('/api/products/:id', async (req, res) => {
        console.log('Delete request received for product:', req.params.id);
        const id = req.params.id;
        
        try {
            await new Promise((resolve, reject) => {
                db.run('DELETE FROM products WHERE id = ?', [id], function(err) {
                    if (err) reject(err);
                    else resolve(this);
                });
            });

            console.log('Product deleted successfully');
            return res.json({ message: 'Product deleted successfully' });
        } catch (error) {
            console.error('Error deleting product:', error);
            return res.status(500).json({ error: error.message });
        }
    });

    // 2. Categories Routes
    app.get('/api/categories', (req, res) => {
        db.all('SELECT * FROM categories', [], (err, rows) => {
            if (err) {
                console.error('Error fetching categories:', err);
                res.status(400).json({ error: err.message });
                return;
            }
            res.json(rows);
        });
    });

    app.post('/api/categories', async (req, res) => {
        const { name } = req.body;
        const trimmedName = name.trim();

        try {
            // Kiểm tra tên trùng lặp (không phân biệt hoa thường)
            const exists = await new Promise((resolve, reject) => {
                db.get('SELECT id FROM categories WHERE LOWER(name) = LOWER(?)', 
                    [trimmedName], 
                    (err, row) => {
                        if (err) reject(err);
                        else resolve(!!row);
                    }
                );
            });

            if (exists) {
                res.status(400).json({ error: 'Category name already exists' });
                return;
            }

            // Thêm category với tên gốc (giữ nguyên hoa thường)
            db.run('INSERT INTO categories (name) VALUES (?)',
                [trimmedName],
                function(err) {
                    if (err) {
                        res.status(400).json({ error: err.message });
                        return;
                    }
                    // Trả về thông tin category đầy đủ
                    db.get('SELECT * FROM categories WHERE id = ?', [this.lastID], (err, row) => {
                        if (err) {
                            res.status(400).json({ error: err.message });
                            return;
                        }
                        res.json(row);
                    });
                });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // Thêm endpoint xóa category
    app.delete('/api/categories/:id', async (req, res) => {
        console.log('Delete request received for category:', req.params.id);
        const id = req.params.id;
        
        try {
            // Kiểm tra xem category có đang được sử dụng không
            const row = await new Promise((resolve, reject) => {
                db.get('SELECT COUNT(*) as count FROM products WHERE category_id = ?', [id], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });
            
            if (row.count > 0) {
                console.log('Category in use, cannot delete');
                return res.status(400).json({ error: 'Category is being used by products' });
            }

            // Nếu không có sản phẩm nào sử dụng, thực hiện xóa
            await new Promise((resolve, reject) => {
                db.run('DELETE FROM categories WHERE id = ?', [id], function(err) {
                    if (err) reject(err);
                    else resolve(this);
                });
            });

            console.log('Category deleted successfully');
            return res.json({ message: 'Category deleted successfully' });
        } catch (error) {
            console.error('Error deleting category:', error);
            return res.status(500).json({ error: error.message });
        }
    });

    // Cập nhật endpoint update category
    app.put('/api/categories/:id', async (req, res) => {
        const id = req.params.id;
        const { name } = req.body;
        const trimmedName = name.trim();

        try {
            // Kiểm tra tên trùng lặp (không phân biệt hoa thường)
            const exists = await new Promise((resolve, reject) => {
                db.get('SELECT id FROM categories WHERE LOWER(name) = LOWER(?) AND id != ?', 
                    [trimmedName, id], 
                    (err, row) => {
                        if (err) reject(err);
                        else resolve(!!row);
                    }
                );
            });

            if (exists) {
                res.status(400).json({ error: 'Category name already exists' });
                return;
            }

            // Cập nhật với tên gốc (giữ nguyên hoa thường)
            db.run(
                'UPDATE categories SET name = ? WHERE id = ?',
                [trimmedName, id],
                function(err) {
                    if (err) {
                        res.status(400).json({ error: err.message });
                        return;
                    }
                    if (this.changes === 0) {
                        res.status(404).json({ error: 'Category not found' });
                        return;
                    }
                    res.json({ 
                        message: 'Category updated successfully',
                        category: { id, name: trimmedName }
                    });
                }
            );
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // Thêm endpoint kiểm tra tên category
    app.get('/api/categories/check-name/:name', (req, res) => {
        const name = req.params.name.trim();
        
        // Sử dụng LOWER() cho cả hai bên của phép so sánh
        db.get('SELECT id FROM categories WHERE LOWER(name) = LOWER(?)', [name], (err, row) => {
            if (err) {
                res.status(400).json({ error: err.message });
                return;
            }
            res.json({ exists: !!row });
        });
    });

    return app;
}

module.exports = setupServer; 