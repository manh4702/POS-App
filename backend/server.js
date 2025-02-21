const express = require('express');
const cors = require('cors');
const { createDbConnection } = require('./database');
const multer = require('multer');
const XLSX = require('xlsx');
const upload = multer({ storage: multer.memoryStorage() });

function setupServer(db) {
    const app = express();

    // Cấu hình CORS
    app.use(cors({
        origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
        credentials: true,
        exposedHeaders: ['Content-Disposition']
    }));

    // Middleware
    app.use(express.json());
    app.use((req, res, next) => {
        console.log(`${req.method} ${req.url}`);
        next();
    });

    // Thêm route này sau middleware và trước các routes khác
    app.get('/api/products', (req, res) => {
        db.all(`
            SELECT p.*, c.name as category_name 
            FROM products p 
            LEFT JOIN categories c ON p.category_id = c.id
        `, [], (err, rows) => {
            if (err) {
                console.error('Error fetching products:', err);
                res.status(500).json({ error: err.message });
                return;
            }
            res.json(rows);
        });
    });

    // API Routes
    // 1. Export/Import Routes (đặt trước các routes khác)
    app.get('/api/products/export', async (req, res) => {
        try {
            // 1. Lấy danh sách danh mục
            const categories = await new Promise((resolve, reject) => {
                db.all(`SELECT name FROM categories ORDER BY name`, [], (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows.map(row => row.name));
                });
            });

            // 2. Lấy danh sách sản phẩm
            const products = await new Promise((resolve, reject) => {
                db.all(`
                    SELECT 
                        p.name,
                        p.barcode,
                        p.retail_price,
                        p.wholesale_price,
                        c.name as category_name
                    FROM products p 
                    LEFT JOIN categories c ON p.category_id = c.id
                `, [], (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            });

            // 3. Format dữ liệu sản phẩm
            const formattedProducts = products.map(product => ({
                'Tên sản phẩm': product.name,
                'Mã vạch': product.barcode || '',
                'Giá lẻ': product.retail_price,
                'Giá sỉ': product.wholesale_price || '',
                'Danh mục': product.category_name
            }));

            // 4. Tạo workbook
            const wb = XLSX.utils.book_new();

            // 5. Tạo sheet sản phẩm
            const wsProducts = XLSX.utils.json_to_sheet(formattedProducts, {
                header: ['Tên sản phẩm', 'Mã vạch', 'Giá lẻ', 'Giá sỉ', 'Danh mục']
            });

            // 6. Thiết lập độ rộng cột cho sheet sản phẩm
            wsProducts['!cols'] = [
                { wch: 30 }, // Tên sản phẩm
                { wch: 15 }, // Mã vạch
                { wch: 15 }, // Giá lẻ
                { wch: 15 }, // Giá sỉ
                { wch: 20 }  // Danh mục
            ];

            // 7. Tạo data validation cho cột danh mục
            const range = {
                s: { r: 1, c: 4 },  // Bắt đầu từ hàng 1 (sau header), cột 4 (cột Danh mục)
                e: { r: 1000, c: 4 } // Kết thúc ở hàng 1000
            };

            if (!wsProducts['!validations']) wsProducts['!validations'] = [];
            wsProducts['!validations'].push({
                sqref: XLSX.utils.encode_range(range),
                type: 'list',
                formula1: `"${categories.join(',')}"`,
                showDropDown: true
            });

            // 8. Tạo sheet danh mục
            const formattedCategories = categories.map(name => ({ 'Tên danh mục': name }));
            const wsCategories = XLSX.utils.json_to_sheet(formattedCategories, {
                header: ['Tên danh mục']
            });

            // 9. Thiết lập độ rộng cột cho sheet danh mục
            wsCategories['!cols'] = [{ wch: 30 }];

            // 10. Thêm các sheet vào workbook
            XLSX.utils.book_append_sheet(wb, wsProducts, 'Danh sách sản phẩm');
            XLSX.utils.book_append_sheet(wb, wsCategories, 'Danh mục');

            // 11. Tạo buffer và gửi file
            const buffer = XLSX.write(wb, { 
                type: 'buffer', 
                bookType: 'xlsx',
                bookSST: false
            });

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename=products_and_categories.xlsx');
            res.send(buffer);
        } catch (error) {
            console.error('Export error:', error);
            res.status(500).json({ error: 'Failed to export data' });
        }
    });

    // 2. Products Routes
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

    // Import products from Excel
    app.post('/api/products/import', upload.single('file'), async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'Không tìm thấy file' });
            }

            console.log('Importing file:', req.file.originalname); // Log tên file

            const workbook = XLSX.read(req.file.buffer);
            console.log('Available sheets:', workbook.SheetNames); // Log danh sách sheets

            const results = { 
                categories: { success: 0, errors: [] },
                products: { success: 0, errors: [] }
            };

            // 1. Xử lý sheet danh mục trước
            if (workbook.SheetNames.includes('Danh mục')) {
                const categoriesSheet = workbook.Sheets['Danh mục'];
                const categories = XLSX.utils.sheet_to_json(categoriesSheet);
                console.log('Categories data:', categories); // Log dữ liệu danh mục

                for (const category of categories) {
                    try {
                        const name = category['Tên danh mục'];
                        if (!name) {
                            results.categories.errors.push('Tên danh mục không được trống');
                            continue;
                        }

                        // Kiểm tra danh mục đã tồn tại
                        const existingCategory = await new Promise((resolve, reject) => {
                            db.get('SELECT id FROM categories WHERE LOWER(name) = LOWER(?)', 
                                [name.trim()], 
                                (err, row) => {
                                    if (err) reject(err);
                                    else resolve(row);
                                });
                        });

                        if (!existingCategory) {
                            await new Promise((resolve, reject) => {
                                db.run('INSERT INTO categories (name) VALUES (?)', 
                                    [name.trim()], 
                                    function(err) {
                                        if (err) reject(err);
                                        else {
                                            results.categories.success++;
                                            resolve();
                                        }
                                    });
                            });
                        }
                    } catch (error) {
                        console.error('Error importing category:', error);
                        results.categories.errors.push(`Lỗi thêm danh mục "${category['Tên danh mục']}": ${error.message}`);
                    }
                }
            } else {
                console.log('No Categories sheet found');
            }

            // 2. Xử lý sheet sản phẩm
            if (workbook.SheetNames.includes('Danh sách sản phẩm')) {
                const productsSheet = workbook.Sheets['Danh sách sản phẩm'];
                const products = XLSX.utils.sheet_to_json(productsSheet);
                console.log('Products data:', products); // Log dữ liệu sản phẩm

                for (const product of products) {
                    try {
                        const {
                            'Tên sản phẩm': name,
                            'Mã vạch': barcode,
                            'Giá lẻ': retail_price,
                            'Giá sỉ': wholesale_price,
                            'Danh mục': category_name
                        } = product;

                        // Kiểm tra dữ liệu đầu vào
                        if (!name || name.trim() === '') {
                            results.products.errors.push('Tên sản phẩm không được trống');
                            continue;
                        }

                        if (!retail_price || isNaN(retail_price)) {
                            results.products.errors.push(`Giá lẻ không hợp lệ cho sản phẩm "${name}"`);
                            continue;
                        }

                        if (!category_name || category_name.trim() === '') {
                            results.products.errors.push(`Danh mục không được trống cho sản phẩm "${name}"`);
                            continue;
                        }

                        // Kiểm tra và lấy category_id
                        const category = await new Promise((resolve, reject) => {
                            db.get('SELECT id FROM categories WHERE LOWER(name) = LOWER(?)', 
                                [category_name.trim()], 
                                (err, row) => {
                                    if (err) reject(err);
                                    else resolve(row);
                                });
                        });

                        if (!category) {
                            results.products.errors.push(`Danh mục "${category_name}" không tồn tại cho sản phẩm "${name}"`);
                            continue;
                        }

                        // Kiểm tra sản phẩm đã tồn tại
                        const existingProduct = await new Promise((resolve, reject) => {
                            db.get('SELECT id FROM products WHERE LOWER(name) = LOWER(?)', 
                                [name.trim()], 
                                (err, row) => {
                                    if (err) reject(err);
                                    else resolve(row);
                                });
                        });

                        if (existingProduct) {
                            results.products.errors.push(`Sản phẩm "${name}" đã tồn tại`);
                            continue;
                        }

                        // Thêm sản phẩm mới
                        await new Promise((resolve, reject) => {
                            db.run(`
                                INSERT INTO products (name, barcode, retail_price, wholesale_price, category_id)
                                VALUES (?, ?, ?, ?, ?)
                            `, [name.trim(), barcode, retail_price, wholesale_price || null, category.id], 
                            function(err) {
                                if (err) {
                                    console.error('Error inserting product:', err);
                                    reject(err);
                                } else {
                                    results.products.success++;
                                    resolve();
                                }
                            });
                        });
                    } catch (error) {
                        console.error('Error importing product:', error);
                        results.products.errors.push(`Lỗi thêm sản phẩm "${product['Tên sản phẩm']}": ${error.message}`);
                    }
                }
            } else {
                console.log('No Products sheet found');
            }

            console.log('Import results:', results); // Log kết quả import
            res.json(results);
        } catch (error) {
            console.error('Import error:', error);
            res.status(500).json({ 
                error: 'Failed to import data',
                details: error.message,
                stack: error.stack
            });
        }
    });

    return app;
}

module.exports = setupServer; 