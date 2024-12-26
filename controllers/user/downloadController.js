const Order = require("../../models/orderModel"); // Import your order model
const User = require("../../models/userRegister");   // Import your user model
const Product = require("../../models/productModel"); // Import your product model
const Address = require('../../models/addressModel');

const PDFDocument = require("pdfkit");
const fs = require("fs");

// Route to generate the PDF receipt
const download = async (req, res) => {
    try {
        // Pass orderId to identify the order
        let orderId = req.session.orderId

        const shipping = req.session.shipping

        // Fetch order details
        const order = await Order.findById(orderId)
            .populate("userId") // Get user details
            .populate("orderItems.productId"); // Get product details

        if (!order) {
            return res.status(404).send("Order not found");
        }

        // Create PDF document
        const doc = new PDFDocument({ margin: 50 });
        const fileName = `invoice_${orderId}.pdf`;
        res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);
        res.setHeader("Content-Type", "application/pdf");
        doc.pipe(res);

        const mrp = req.session.mrp;
        const discount = order.totalAmount - mrp

        // Generate PDF invoice
        generateBeautifulInvoice(doc, order, shipping, discount);

        // Finalize the PDF
        doc.end();

        delete req.session.orderId;
        delete req.session.shipping;
        console.log('-------------------------------------------');
        console.log(req.session);



    } catch (error) {
        console.error(error);
        res.status(500).send("Error generating invoice PDF");
    }
};

// Function to generate a beautiful invoice with tables
function generateBeautifulInvoice(doc, order, shipping, discount) {
    // Header Section
    doc
        .fontSize(20)
        .fillColor("#444444")
        .text("Invoice", { align: "center" })
        .moveDown();

    doc
        .fontSize(12)
        .fillColor("#000000")
        .text(`Order ID: ${order._id}`)
        .text(`Order Date: ${order.createdAt.toDateString()}`)
        .text(`Payment Method: ${order.paymentMethod}`)
        .text(`Order Status: ${order.status}`)
        .moveDown();

    // Customer Information
    doc
        .fontSize(14)
        .fillColor("#444444")
        .text("Customer Details", { underline: true })
        .moveDown(0.5);

    doc
        .fontSize(12)
        .fillColor("#000000")
        .text(`Name: ${order.userId.name}`)
        .text(`Email: ${order.userId.email}`)
        .text(`Address: ${getFullAddress(order.userId.address)}`)
        .moveDown();

    // Product Table Header
    doc
        .fontSize(14)
        .fillColor("#444444")
        .text("Order Items", { underline: true })
        .moveDown(0.5);

    generateProductTable(doc, order.orderItems, shipping);

    // Total Amount
    doc
        .moveDown(2)
        .fontSize(14)
        .fillColor("#000000")
        .text(`Shipping cost : ₹${shipping}`, { align: "right" })
        .text(`Discount      : ₹${discount}`, { align: "right" })
        .text(`Total Amount  : ₹${order.totalAmount}`, { align: "right", bold: true });
}

// Function to generate product table
function generateProductTable(doc, orderItems, shipping) {
    const tableTop = doc.y;
    const itemSpacing = 25;

    // Table Header
    doc
        .fontSize(12)
        .fillColor("#000000")
        .text("Product Name", 50, tableTop, { bold: true })
        .text("Quantity", 250, tableTop, { bold: true })
        .text("Price", 350, tableTop, { bold: true })
        .text("Total", 450, tableTop, { bold: true });

    // Draw a line below the header
    doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

    // Table Rows
    let yPos = tableTop + itemSpacing;

    orderItems.forEach((item) => {
        const productName = item.productId.name || "Unknown Product";
        const quantity = item.quantity;
        const price = `₹${item.price.toFixed(2)}`;
        const total = `₹${(item.quantity * item.price).toFixed(2)}`;
        // Print row
        doc
            .fontSize(10)
            .fillColor("#000000")
            .text(productName, 50, yPos)
            .text(quantity, 250, yPos)
            .text(price, 350, yPos)
            .text(total, 450, yPos);

        // Add spacing between rows
        yPos += itemSpacing;

        // Draw a horizontal line after each row
        doc.moveTo(50, yPos - 10).lineTo(550, yPos - 10).stroke();
    });
}

// Helper to format address
function getFullAddress(addresses) {
    if (!addresses || addresses.length === 0) return "No Address Provided";
    const address = addresses[0];
    return `${address.houseName}, ${address.street}, ${address.city}, ${address.state}, ${address.pincode}`;
}


const frontDownload = async (req, res) => {
    const { orderId } = req.params;

    // Fetch the order details using orderId
    const order = await Order.findById(orderId).populate('orderItems.productId'); // Replace with your DB call

    if (!order) {
        return res.status(404).send('Order not found');
    }

    // Create a PDF document
    const doc = new PDFDocument({ margin: 40 });
    const filename = `Invoice-${orderId}.pdf`;

    // Set the response headers for downloading the PDF
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.setHeader('Content-Type', 'application/pdf');

    doc.pipe(res);

    // Header Section
    doc
        .fontSize(20)
        .fillColor('#003366') // Dark Blue
        .text('Invoice', { align: 'center' })
        .moveDown()
        .fontSize(12)
        .fillColor('black')
        .text(`Order ID: ${order._id}`, { align: 'left' })
        .text(`Status: ${order.status}`, { align: 'left' })
        .text(`Total Amount: Rs. ${order.totalAmount}`, { align: 'right' })
        .moveDown();

    // Add a horizontal line
    doc
        .moveTo(40, doc.y)
        .lineTo(570, doc.y)
        .stroke('#cccccc')
        .moveDown();

    // Add Table Header
    const headerY = doc.y; // Track header position
    doc
        .fontSize(14)
        .fillColor('white')
        .rect(40, headerY, 500, 25) // Table Header Background
        .fill('#003366') // Dark Blue Background
        .stroke()
        .fillColor('white')
        .text('Product Name', 50, headerY + 5, { width: 150 })
        .text('Quantity', 250, headerY + 5, { width: 100, align: 'center' })
        .text('Price (Rs.)', 400, headerY + 5, { width: 100, align: 'center' });

    doc.fillColor('black'); // Reset text color
    doc.moveDown(1.5);

    // Add Table Rows
    const rowHeight = 25;
    order.orderItems.forEach((item, index) => {
        const isEvenRow = index % 2 === 0;
        const rowY = doc.y;

        // Set alternating row background colors
        doc
            .rect(40, rowY, 500, rowHeight)
            .fill(isEvenRow ? '#f9f9f9' : '#ffffff')
            .stroke();

        // Add row content
        doc
            .fillColor('black')
            .text(item.productId.name, 50, rowY + 5, { width: 150, ellipsis: true })
            .text(item.quantity.toString(), 250, rowY + 5, { width: 100, align: 'center' })
            .text(item.price.toString(), 400, rowY + 5, { width: 100, align: 'center' });

        doc.y += rowHeight; // Move to the next row
    });

    // Footer Section
    doc.moveDown(2);
    doc
        .fontSize(12)
        .fillColor('#333333')
        .text('Thank you for your purchase!', { align: 'center' })
        .moveDown(0.5)
        .fontSize(10)
        .text('For any inquiries, please contact our support.', { align: 'center' });

    // Finalize the PDF and end the stream
    doc.end();
};


module.exports = {
    download,
    frontDownload
};