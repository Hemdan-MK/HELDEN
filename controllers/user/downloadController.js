const Order = require("../../models/orderModel");
const User = require("../../models/userRegister");
const Product = require("../../models/productModel");
const Address = require('../../models/addressModel');
const PDFDocument = require("pdfkit");

// Shared color scheme and styling
const STYLES = {
    colors: {
        primary: '#003366',    // Dark Blue
        secondary: '#666666',  // Dark Gray
        accent: '#FF6B6B',     // Coral
        background: '#F8F9FA', // Light Gray
        text: '#333333'        // Dark Gray for text
    },
    fonts: {
        header: 24,
        subheader: 16,
        normal: 12,
        small: 10
    }
};

// Main download controller (previously 'download')
const download = async (req, res) => {
    try {
        let orderId = req.session.orderId;
        const shipping = req.session.shipping;

        const order = await Order.findById(orderId)
            .populate("userId")
            .populate("orderItems.productId");

        if (!order) {
            return res.status(404).send("Order not found");
        }

        const doc = new PDFDocument({ margin: 50 });
        const fileName = `invoice_${orderId}.pdf`;
        res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);
        res.setHeader("Content-Type", "application/pdf");
        doc.pipe(res);

        const mrp = req.session.mrp;
        const discount = order.totalAmount - mrp;

        generateInvoice(doc, order, shipping, discount);

        doc.end();

        delete req.session.orderId;
        delete req.session.shipping;

    } catch (error) {
        console.error(error);
        res.status(500).send("Error generating invoice PDF");
    }
};

// Front download controller
const frontDownload = async (req, res) => {
    try {
        const { orderId } = req.params;
        
        const order = await Order.findById(orderId)
            .populate("userId")
            .populate("orderItems.productId");

        if (!order) {
            return res.status(404).send("Order not found");
        }

        const doc = new PDFDocument({ margin: 50 });
        const fileName = `invoice_${orderId}.pdf`;
        res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);
        res.setHeader("Content-Type", "application/pdf");
        doc.pipe(res);

        // Use default shipping and discount if not provided
        const shipping = 100;
        const discount = calculateDiscount(order);

        generateInvoice(doc, order, shipping, discount);

        doc.end();

    } catch (error) {
        console.error(error);
        res.status(500).send("Error generating invoice PDF");
    }
};

// Unified invoice generation function
function generateInvoice(doc, order, shipping, discount) {
    const { colors, fonts } = STYLES;

    // Header Section with Logo Space
    doc.rect(50, 50, 500, 100)
       .fill(colors.primary);

    doc.fontSize(fonts.header)
       .fillColor('white')
       .text('INVOICE', 275, 80, { align: 'center' })
       .fontSize(fonts.normal)
       .text(`Date: ${order.createdAt.toLocaleDateString()}`, 275, 110, { align: 'center' });

    // Order Information
    doc.fontSize(fonts.normal)
       .fillColor(colors.text)
       .text(`Order ID: ${order._id}`, 50, 170)
       .text(`Payment Method: ${order.paymentMethod}`, 50, 190)
       .text(`Order Status: ${order.status}`, 50, 210);

    // Customer Details Section
    doc.rect(50, 240, 500, 100)
       .fill(colors.background);

    doc.fontSize(fonts.subheader)
       .fillColor(colors.primary)
       .text('Customer Details', 70, 255)
       .fontSize(fonts.normal)
       .fillColor(colors.text);

    if (order.userId) {
        doc.text(`Name: ${order.userId.name}`, 70, 280)
           .text(`Email: ${order.userId.email}`, 70, 300)
           .text(`Address: ${getFullAddress(order.userId.address)}`, 70, 320);
    }

    // Products Table
    const tableTop = 380;
    generateProductTable(doc, order.orderItems, tableTop);

    // Summary Section
    const summaryY = doc.y + 30;
    generateSummarySection(doc, order, shipping, discount, summaryY);

    // Footer
    generateFooter(doc);
}

// Helper function for product table
function generateProductTable(doc, orderItems, startY) {
    const { colors, fonts } = STYLES;

    // Table Header
    doc.rect(50, startY, 500, 30)
       .fill(colors.primary);

    doc.fillColor('white')
       .fontSize(fonts.normal)
       .text('Product Name', 70, startY + 10)
       .text('Quantity', 280, startY + 10)
       .text('Price', 380, startY + 10)
       .text('Total', 480, startY + 10);

    let currentY = startY + 30;

    // Table Rows
    orderItems.forEach((item, index) => {
        const rowHeight = 30;
        doc.rect(50, currentY, 500, rowHeight)
           .fill(index % 2 === 0 ? colors.background : 'white');

        doc.fillColor(colors.text)
           .fontSize(fonts.small)
           .text(item.productId.name || 'Unknown Product', 70, currentY + 10, { width: 200 })
           .text(item.quantity.toString(), 280, currentY + 10)
           .text(`₹${item.price.toFixed(2)}`, 380, currentY + 10)
           .text(`₹${(item.quantity * item.price).toFixed(2)}`, 480, currentY + 10);

        currentY += rowHeight;
    });

    doc.y = currentY + 10;
}

// Helper function for summary section
function generateSummarySection(doc, order, shipping, discount, summaryY) {
    const { colors, fonts } = STYLES;

    doc.rect(300, summaryY, 250, 100)
       .fill(colors.background);

    doc.fontSize(fonts.normal)
       .fillColor(colors.primary)
       .text('Order Summary', 320, summaryY + 10)
       .fillColor(colors.text);

    const subtotal = calculateSubtotal(order.orderItems);

    doc.text(`Subtotal: ₹${subtotal.toFixed(2)}`, 320, summaryY + 35)
       .text(`Shipping: ₹${shipping.toFixed(2)}`, 320, summaryY + 55)
       .text(`Discount: -₹${discount.toFixed(2)}`, 320, summaryY + 75);

    doc.rect(300, summaryY + 110, 250, 40)
       .fill(colors.primary);

    doc.fillColor('white')
       .fontSize(fonts.subheader)
       .text(`Total Amount: ₹${order.totalAmount.toFixed(2)}`, 320, summaryY + 120);
}

// Helper function for footer
function generateFooter(doc) {
    const { colors, fonts } = STYLES;
    const footerY = doc.page.height - 100;

    doc.fontSize(fonts.small)
       .fillColor(colors.secondary)
       .text('Thank you for your business!', 50, footerY, { align: 'center' })
       .text('For any queries, please contact our support team.', 50, footerY + 20, { align: 'center' })
       .text(`Generated on: ${new Date().toLocaleString()}`, 50, footerY + 40, { align: 'center' });
}

// Helper function for address formatting
function getFullAddress(addresses) {
    if (!addresses || addresses.length === 0) return "No Address Provided";
    const address = addresses[0];
    return `${address.houseName}, ${address.street}, ${address.city}, ${address.state}, ${address.pincode}`;
}

// Helper function to calculate subtotal
function calculateSubtotal(orderItems) {
    return orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

// Helper function to calculate discount
function calculateDiscount(order) {
    const subtotal = calculateSubtotal(order.orderItems);
    return subtotal * 0.1; // 10% discount - adjust as needed
}

module.exports = {
    download,
    frontDownload
};