import React, { useState, useEffect } from "react";
import {
  Input,
  Button,
  Table,
  Space,
  InputNumber,
  message,
  List,
  Switch,
} from "antd";
import {
  BarcodeOutlined,
  DeleteOutlined,
  ArrowLeftOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import debounce from "lodash/debounce";
import { ScannerModal } from "../utils/barcodeScanner";

// const { Content } = Layout;
// const { Search } = Input;

const PaymentScreen = () => {
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState("");
  const [cartItems, setCartItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isScannerVisible, setScannerVisible] = useState(false);

  // Điều chỉnh kích thước tăng 20%
  const SIZES = {
    buttonHeight: "48px", // tăng từ 40px
    inputHeight: "42px", // tăng từ 35px
    padding: "24px", // tăng từ 20px
    borderRadius: "10px", // tăng từ 8px
    fontSize: {
      small: "20px",
      normal: "25px",
      large: "35px",
      xlarge: "40px",
    },
  };

  // Tính tổng tiền khi giỏ hàng thay đổi
  useEffect(() => {
    const newTotal = cartItems.reduce((sum, item) => {
      return (
        sum +
        item.quantity *
          (item.isWholesale ? item.wholesale_price : item.retail_price)
      );
    }, 0);
    setTotal(newTotal);
  }, [cartItems]);

  // Debounce search function
  const debouncedSearch = debounce(async (value) => {
    if (!value.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);
      console.log("Searching for:", value);
      const response = await api.get("/api/products/search", {
        params: { q: value },
      });
      console.log("Search response:", response.data);
      setSearchResults(response.data);
    } catch (error) {
      console.error("Search error:", error);
      message.error("Lỗi tìm kiếm sản phẩm");
    } finally {
      setIsSearching(false);
    }
  }, 300);

  // Handle search input change
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchText(value);

    // Nếu giá trị nhập vào có độ dài phù hợp với mã vạch (thường là 8-13 ký tự)
    if (value.length >= 8 && value.length <= 13 && /^\d+$/.test(value)) {
      // Thử tìm sản phẩm bằng mã vạch
      handleBarcodeInput(value).catch(() => {
        // Nếu không tìm thấy bằng mã vạch, tìm kiếm bình thường
        debouncedSearch(value);
      });
    } else {
      // Tìm kiếm bình thường
      debouncedSearch(value);
    }
  };

  // Xử lý khi chọn sản phẩm từ kết quả tìm kiếm
  const handleProductSelect = (product, useWholesale = false) => {
    const existingItem = cartItems.find((item) => item.id === product.id);

    if (existingItem) {
      const newQuantity = existingItem.quantity + 1;
      const isWholesale =
        useWholesale ||
        (existingItem.isWholesale &&
          product.wholesale_price &&
          newQuantity >= product.wholesale_qty);

      setCartItems(
        cartItems.map((item) =>
          item.id === product.id
            ? {
                ...item,
                quantity: newQuantity,
                isWholesale: isWholesale,
              }
            : item
        )
      );
    } else {
      setCartItems([
        ...cartItems,
        {
          ...product,
          quantity: 1,
          isWholesale: useWholesale,
        },
      ]);
    }

    setSearchText("");
    setSearchResults([]);
  };

  // Xử lý khi quét mã vạch
  const handleBarcodeInput = async (barcode) => {
    try {
      const response = await api.get(`/api/products/barcode/${barcode}`);
      if (response.data) {
        handleProductSelect(response.data);
        setSearchText(""); // Reset input
        return true;
      }
    } catch (error) {
      console.error("Barcode search error:", error);
      return false;
    }
  };

  // Thêm useEffect để focus vào input mã vạch khi component mount
  useEffect(() => {
    const barcodeInputElement = document.getElementById("barcode-input");
    if (barcodeInputElement) {
      barcodeInputElement.focus();
    }
  }, []);

  // Format tiền VND
  const formatVND = (price) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);
  };

  // Cột cho bảng giỏ hàng
  const columns = [
    {
      title: "Tên sản phẩm",
      dataIndex: "name",
      key: "name",
      width: "100px",
      render: (text) => (
        <span style={{ fontSize: SIZES.fontSize.normal, fontWeight: 500 }}>
          {text}
        </span>
      ),
    },
    {
      title: "Số lượng",
      dataIndex: "quantity",
      key: "quantity",
      width: 150,
      render: (_, record) => (
        <InputNumber
          min={1}
          value={record.quantity}
          onChange={(value) => {
            setCartItems(
              cartItems.map((item) =>
                item.id === record.id ? { ...item, quantity: value } : item
              )
            );
          }}
          style={{
            width: "100px",
            height: SIZES.inputHeight,
            fontSize: SIZES.fontSize.normal,
          }}
        />
      ),
    },
    {
      title: "Đơn giá",
      key: "price",
      width: "25%",
      render: (_, record) => (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
          }}
        >
          <span
            style={{
              fontSize: SIZES.fontSize.normal,
              color: record.isWholesale ? "#52c41a" : "#1890ff",
              fontWeight: 500,
            }}
          >
            {formatVND(
              record.isWholesale ? record.wholesale_price : record.retail_price
            )}
          </span>
          {record.wholesale_price && (
            <Switch
              checked={record.isWholesale}
              onChange={(checked) => {
                setCartItems(
                  cartItems.map((item) =>
                    item.id === record.id
                      ? { ...item, isWholesale: checked }
                      : item
                  )
                );
              }}
              style={{
                backgroundColor: record.isWholesale ? "#52c41a" : "#1890ff",
                width: "50px",
                height: "25px",
              }}
              className="custom-switch"
            />
          )}
        </div>
      ),
    },
    {
      title: "Thành tiền",
      key: "total",
      width: "20%",
      render: (_, record) => (
        <span
          style={{
            fontSize: SIZES.fontSize.normal,
            color: "#f5222d",
            fontWeight: 500,
          }}
        >
          {formatVND(
            record.quantity *
              (record.isWholesale
                ? record.wholesale_price
                : record.retail_price)
          )}
        </span>
      ),
    },
    {
      title: "",
      key: "action",
      width: "10%",
      render: (_, record) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined style={{ fontSize: SIZES.fontSize.normal }} />}
          onClick={() =>
            setCartItems(cartItems.filter((item) => item.id !== record.id))
          }
          style={{ padding: "8px" }}
        />
      ),
    },
  ];

  // const startScanner = () => {
  //   setScannerVisible(true);
  //   // Call the initScanner function from barcodeScanner.js
  // };

  // const stopScanner = () => {
  //   setScannerVisible(false);
  //   // Call the stopScanner function from barcodeScanner.js
  // };

  // Thêm hàm xử lý in hóa đơn
  const handlePrintInvoice = () => {
    const printContent = `
      <html>
        <head>
          <title>Hóa đơn thanh toán</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              max-width: 300px;
              margin: 0 auto;
              font-size: 12px;
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
            }
            .header h2 {
              margin: 0;
              padding: 0;
              font-size: 18px;
            }
            .items {
              margin: 20px 0;
              width: 100%;
            }
            .item-header {
              display: grid;
              grid-template-columns: 2fr 1fr 1fr 1fr;
              border-bottom: 1px dashed #000;
              padding-bottom: 5px;
              font-weight: bold;
            }
            .item {
              display: grid;
              grid-template-columns: 2fr 1fr 1fr 1fr;
              padding: 5px 0;
            }
            .item > div {
              padding: 2px 0;
            }
            .text-right {
              text-align: right;
            }
            .text-center {
              text-align: center;
            }
            .divider {
              border-top: 1px dashed #000;
              margin: 10px 0;
            }
            .total {
              margin-top: 20px;
              text-align: right;
              font-weight: bold;
              font-size: 14px;
            }
            .quantity {
              text-align: center;
            }
            .price {
              text-align: right;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>HÓA ĐƠN THANH TOÁN</h2>
            <p>${new Date().toLocaleString()}</p>
          </div>
          <div class="divider"></div>
          <div class="items">
            <div class="item-header">
              <div>Sản phẩm</div>
              <div class="quantity">SL</div>
              <div class="price">Đơn giá</div>
              <div class="price">T.Tiền</div>
            </div>
            ${cartItems
              .map(
                (item) => `
              <div class="item">
                <div>${item.name}</div>
                <div class="quantity">${item.quantity}</div>
                <div class="price">
                  ${formatVND(
                    item.isWholesale ? item.wholesale_price : item.retail_price
                  )}
                </div>
                <div class="price">
                  ${formatVND(
                    item.quantity *
                      (item.isWholesale
                        ? item.wholesale_price
                        : item.retail_price)
                  )}
                </div>
              </div>
            `
              )
              .join("")}
          </div>
          <div class="divider"></div>
          <div class="total">
            Tổng tiền: ${formatVND(total)}
          </div>
          <div class="divider"></div>
          <p class="text-center">Cảm ơn quý khách!</p>
        </body>
      </html>
    `;

    // Tạo cửa sổ in mới
    const printWindow = window.open("", "_blank");
    printWindow.document.write(printContent);
    printWindow.document.close();

    // In hóa đơn
    printWindow.print();

    // Đóng cửa sổ in sau khi hoàn thành
    printWindow.onafterprint = function () {
      printWindow.close();
      // Xóa giỏ hàng sau khi in
      setCartItems([]);
      message.success("Thanh toán thành công!");
    };
  };

  return (
    <div style={{ 
      padding: SIZES.padding, 
      background: '#f0f2f5', 
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh' // Thêm chiều cao 100% viewport
    }}>
      {/* Header */}
      <div style={{ 
        marginBottom: SIZES.padding, 
        display: 'flex', 
        alignItems: 'center',
        flexShrink: 0 // Ngăn header co lại
      }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate("/")}
          style={{
            // marginRight: "12px",
            height: SIZES.buttonHeight,
            fontSize: SIZES.fontSize.normal,
          }}
        >
          Quay lại
        </Button>
        <h1
          style={{
            margin: 0,
            fontSize: SIZES.fontSize.xlarge,
            flexGrow: 1,
            textAlign: "center",
          }}
        >
          Màn hình thanh toán
        </h1>
        <div style={{ width: SIZES.buttonHeight }}>
          {" "}
          {/* Đặt khoảng trống bằng với nút để cân bằng layout */}
        </div>
      </div>

      <div style={{ 
        display: 'flex', 
        gap: SIZES.padding,
        flex: 1,  // Cho phép khu vực nội dung mở rộng
        overflow: 'hidden' // Ngăn scroll ở container chính
      }}>
        {/* Main Content */}
        <div style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          gap: SIZES.padding,
          minWidth: 0, // Cho phép co lại khi cần
          overflow: 'hidden' // Ngăn scroll ở container con
        }}>
          {/* Search Bar */}
          <div style={{ 
            background: 'white', 
            padding: SIZES.padding,
            borderRadius: SIZES.borderRadius,
            boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
            position: 'relative',
            flexShrink: 0 // Ngăn search bar co lại
          }}>
            <Input
              placeholder="Tìm kiếm sản phẩm hoặc quét mã vạch..."
              value={searchText}
              onChange={handleSearchChange}
              style={{
                width: "100%",
                height: SIZES.inputHeight,
                fontSize: SIZES.fontSize.normal,
              }}
              suffix={
                <Button
                  type="text"
                  icon={
                    <BarcodeOutlined
                      style={{ fontSize: SIZES.fontSize.large }}
                    />
                  }
                  onClick={() => setScannerVisible(true)}
                />
              }
            />
            {/* Search Results Popup */}
            {searchText && (
              <div
                className="search-results-popup"
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  width: "100%",
                  background: "white",
                  borderRadius: "0 0 8px 8px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                  zIndex: 1000,
                  maxHeight: "400px",
                  overflowY: "auto",
                }}
              >
                <List
                  loading={isSearching}
                  dataSource={searchResults}
                  renderItem={(item) => (
                    <List.Item
                      className="search-item"
                      onClick={() => handleProductSelect(item)}
                      style={{
                        padding: "12px 16px",
                        cursor: "pointer",
                        transition: "all 0.3s",
                        borderBottom: "1px solid #f0f0f0",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.backgroundColor = "#f5f5f5")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor = "#fff")
                      }
                    >
                      <div style={{ width: "100%" }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <div>
                            <div
                              style={{
                                fontSize: "16px",
                                fontWeight: "bold",
                              }}
                            >
                              {item.name}
                            </div>
                            <div
                              style={{
                                fontSize: "14px",
                                color: "#666",
                                marginTop: "4px",
                              }}
                            >
                              {item.category_name}
                              {item.barcode && (
                                <span style={{ marginLeft: "8px" }}>
                                  Mã: {item.barcode}
                                </span>
                              )}
                            </div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div
                              style={{
                                fontSize: "16px",
                                fontWeight: "bold",
                                color: "#1890ff",
                              }}
                            >
                              {formatVND(item.retail_price)}
                            </div>
                            {item.wholesale_price && (
                              <Button
                                type="link"
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleProductSelect(item, true);
                                }}
                                style={{ padding: "0", height: "auto" }}
                              >
                                Thêm với giá sỉ:{" "}
                                {formatVND(item.wholesale_price)}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </List.Item>
                  )}
                  locale={{
                    emptyText: (
                      <div
                        style={{
                          fontSize: "14px",
                          padding: "12px 16px",
                        }}
                      >
                        {searchText
                          ? "Không tìm thấy sản phẩm"
                          : "Nhập từ khóa để tìm kiếm"}
                      </div>
                    ),
                  }}
                />
              </div>
            )}
          </div>

          {/* Shopping Cart */}
          <div style={{ 
            background: 'white', 
            padding: SIZES.padding,
            borderRadius: SIZES.borderRadius,
            boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden' // Quan trọng cho scroll trong bảng
          }}>
            <h2 style={{ 
              marginTop: 0, 
              fontSize: SIZES.fontSize.large,
              flexShrink: 0 // Ngăn tiêu đề co lại
            }}>Giỏ hàng</h2>
            
            <div style={{ flex: 1, overflow: 'auto' }}> {/* Wrapper cho bảng */}
              <Table
                columns={columns}
                dataSource={cartItems}
                pagination={false}
                rowKey="id"
                scroll={{ y: 'calc(100vh - 400px)' }} // Điều chỉnh chiều cao scroll
                style={{ 
                  width: '100%',
                  height: '100%'
                }}
              />
            </div>
          </div>
        </div>

        {/* Payment Summary */}
        <div style={{ 
          width: '360px',
          flexShrink: 0, // Ngăn phần thanh toán co lại
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ 
            background: 'white', 
            padding: SIZES.padding,
            borderRadius: SIZES.borderRadius,
            boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
            position: 'sticky',
            top: SIZES.padding // Giữ thanh toán luôn hiển thị
          }}>
            <h2
              style={{
                marginTop: 0,
                fontSize: SIZES.fontSize.large,
              }}
            >
              Thanh toán
            </h2>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: SIZES.padding,
                fontSize: SIZES.fontSize.normal,
              }}
            >
              <span>Tổng tiền:</span>
              <span style={{ fontWeight: "bold" }}>{formatVND(total)}</span>
            </div>
            <Space direction="vertical" style={{ width: "100%" }} size="middle">
              <Button
                type="primary"
                block
                style={{
                  height: SIZES.buttonHeight,
                  fontSize: SIZES.fontSize.normal,
                  background: cartItems.length === 0 ? "#d9d9d9" : "#27a2f0",
                  color: cartItems.length === 0 ? "#a0a0a0" : "white",
                  borderRadius: 8, // Bo góc mềm mại
                  transition: "all 0.3s ease-in-out",
                  cursor: cartItems.length === 0 ? "not-allowed" : "pointer",
                }}
                onClick={handlePrintInvoice}
                disabled={cartItems.length === 0} // Disable nút khi không có sản phẩm
              >
                Thanh toán
              </Button>
              <Button
                danger
                block
                style={{
                  height: SIZES.buttonHeight,
                  fontSize: SIZES.fontSize.normal,
                  // color: "white",
                  // backgroundColor: "#FF4D4F", // Màu đỏ nhẹ hơn để đồng bộ với thiết kế Antd
                  borderRadius: 8, // Bo góc mềm mại
                  transition: "all 0.3s ease-in-out",
                }}
                onClick={() => setCartItems([])}
              >
                Hủy đơn hàng
              </Button>
            </Space>
          </div>
        </div>
      </div>

      {/* Scanner Modal */}
      <ScannerModal
        isVisible={isScannerVisible}
        onCancel={() => setScannerVisible(false)}
        onDetected={handleBarcodeInput}
      />
    </div>
  );
};

export default PaymentScreen;
