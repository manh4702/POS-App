const { Database } = require('@journeyapps/sqlcipher');
const path = require('path');
const fs = require('fs');
const electron = require('electron');

// Lấy đường dẫn userData của app
const userDataPath = (electron.app || electron.remote.app).getPath('userData');
// Tạo thư mục data trong userData
const dataDir = path.join(userDataPath, 'data');
const dbPath = path.join(dataDir, 'database.sqlite');

// Tạo database connection
const createDbConnection = () => {
    return new Promise((resolve, reject) => {
        try {
            // Log để debug
            console.log('User Data Path:', userDataPath);
            console.log('Database Path:', dbPath);

            // Tạo thư mục data nếu chưa tồn tại
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }

            // Tạo kết nối database
            const db = new Database(dbPath);
            console.log('Connected to SQLite database at:', dbPath);
            
            // Khởi tạo các bảng
            initializeTables(db);
            resolve(db);
        } catch (error) {
            console.error('Error opening database:', error);
            console.error('Error details:', {
                userDataPath,
                dataDir,
                dbPath,
                error: error.message,
                stack: error.stack
            });
            reject(error);
        }
    });
};

// Khởi tạo các bảng
function initializeTables(db) {
    try {
        // Tạo bảng categories
        db.prepare(`CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE
        )`).run();

        // Tạo bảng products
        db.prepare(`CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            barcode TEXT UNIQUE,
            retail_price REAL NOT NULL,
            wholesale_price REAL,
            wholesale_qty INTEGER,
            wholesale_unit TEXT,
            category_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (category_id) 
                REFERENCES categories (id) 
                ON DELETE RESTRICT 
                ON UPDATE CASCADE
        )`).run();

        console.log('Database tables initialized successfully');
    } catch (error) {
        console.error('Error initializing tables:', error);
        throw error;
    }
}

// Thêm hàm để xóa và tạo lại database
async function resetDatabase(db) {
    try {
        db.prepare('DROP TABLE IF EXISTS products').run();
        db.prepare('DROP TABLE IF EXISTS categories').run();
        initializeTables(db);
        console.log('Database reset successfully');
    } catch (error) {
        console.error('Error resetting database:', error);
        throw error;
    }
}

module.exports = { createDbConnection, resetDatabase }; 