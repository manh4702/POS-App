export const EXCEL_TEMPLATE = {
  headers: [
    { key: 'name', label: 'Tên sản phẩm' },
    { key: 'barcode', label: 'Mã vạch' },
    { key: 'retail_price', label: 'Giá lẻ' },
    { key: 'wholesale_price', label: 'Giá sỉ' },
    { key: 'category_name', label: 'Danh mục' }
  ],
  required: ['name', 'retail_price', 'category_name']
}; 