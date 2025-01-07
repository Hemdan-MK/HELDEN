const User = require('../../models/userRegister');
const Order = require('../../models/orderModel');
const Product = require('../../models/productModel');
const Category = require('../../models/categoryModel');
const res = require('express/lib/response');
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");


const getDashboard = async (req, res) => {
    try {
        // Fetch total orders
        const totalOrders = await Order.countDocuments({
            status: { $in: ['Pending', 'Shipping', 'Completed'] },
            expiresAt: { $exists: false }
        });

        // Calculate total revenue
        const revenueResult = await Order.aggregate([
            { $match: { status: 'Completed' } },
            { $group: { _id: null, totalRevenue: { $sum: "$totalAmount" } } }
        ]);
        const totalRevenue = revenueResult[0]?.totalRevenue || 0;

        // Fetch top-selling products
        const topProducts = await Order.aggregate([
            { $match: { status: 'Completed' } },
            { $unwind: "$orderItems" },
            { $group: { _id: "$orderItems.productId", totalSold: { $sum: "$orderItems.quantity" } } },
            { $sort: { totalSold: -1 } },
            { $limit: 10 }
        ]);
        const topSellingProducts = await Product.populate(topProducts, { path: "_id", select: "name price" });

        // top-selling category
        const topSellingCategories = await Order.aggregate([
            { $unwind: "$orderItems" },
            {
                $lookup: {
                    from: "products", // Join with Products collection
                    localField: "orderItems.productId",
                    foreignField: "_id",
                    as: "productDetails"
                }
            },
            { $unwind: "$productDetails" },
            {
                $lookup: {
                    from: "categories", // Join with Categories collection
                    localField: "productDetails.category",
                    foreignField: "_id",
                    as: "categoryDetails"
                }
            },
            { $unwind: "$categoryDetails" },
            {
                $group: {
                    _id: "$categoryDetails._id", // Group by category ID
                    categoryName: { $first: "$categoryDetails.name" },
                    totalSold: { $sum: "$orderItems.quantity" }
                }
            },
            { $sort: { totalSold: -1 } },
            { $limit: 10 }
        ]);

        // top brands
        const topSellingBrands = await Order.aggregate([
            { $unwind: "$orderItems" },
            {
                $lookup: {
                    from: "products", // Join with Products collection
                    localField: "orderItems.productId",
                    foreignField: "_id",
                    as: "productDetails"
                }
            },
            { $unwind: "$productDetails" },
            {
                $group: {
                    _id: "$productDetails.brand", // Group by brand
                    totalSold: { $sum: "$orderItems.quantity" }
                }
            },
            { $sort: { totalSold: -1 } },
            { $limit: 10 },
            {
                $project: {
                    brand: "$_id",
                    totalSold: 1
                }
            }
        ]);


        // Fetch top category based on sales
        const categorySales = await Order.aggregate([
            { $match: { status: 'Completed' } },
            { $unwind: "$orderItems" },
            { $lookup: { from: "products", localField: "orderItems.productId", foreignField: "_id", as: "product" } },
            { $unwind: "$product" },
            { $group: { _id: "$product.category", totalSold: { $sum: "$orderItems.quantity" } } },
            { $sort: { totalSold: -1 } },
            { $limit: 1 }
        ]);
        const topCategory = categorySales.length > 0
            ? await Category.findById(categorySales[0]._id)
            : null;

        // Calculate total discount applied
        const variation = await Order.aggregate([
            { $match: { status: 'Completed', expiresAt: { $exists: false } } },
            { $unwind: "$orderItems" },
            {
                $project: {
                    totalAmount: 1,
                    productTotal: { $multiply: ["$orderItems.price", "$orderItems.quantity"] }
                }
            },
            {
                $group: {
                    _id: "$_id",
                    totalProductPrice: { $sum: "$productTotal" },
                    totalAmount: { $first: "$totalAmount" }
                }
            },
            {
                $project: {
                    orderDiscount: { $subtract: ["$totalProductPrice", "$totalAmount"] }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: "$orderDiscount" }
                }
            }
        ]);
        const overallDiscount = variation[0]?.total || 0;

        // Fetch sales data (daily, weekly, monthly)
        const calculateSales = (startDate, endDate) =>
            Order.aggregate([
                { $match: { createdAt: { $gte: startDate, $lt: endDate }, status: 'Completed' } },
                { $group: { _id: null, total: { $sum: "$totalAmount" } } }
            ]);

        const today = new Date();
        const startOfDay = new Date(today.setHours(0, 0, 0, 0));
        const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const startOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);

        const [dailySalesResult, weeklySalesResult, monthlySalesResult] = await Promise.all([
            calculateSales(startOfDay, new Date()),
            calculateSales(startOfWeek, new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000)),
            calculateSales(startOfMonth, startOfNextMonth)
        ]);

        const dailySales = dailySalesResult[0]?.total || 0;
        const weeklySales = weeklySalesResult[0]?.total || 0;
        const monthlySales = monthlySalesResult[0]?.total || 0;

        // Render the dashboard
        res.status(200).render("admin/dashboard", {
            admin: 'hemdan',
            totalOrders,
            totalRevenue,
            topSellingProducts,
            topSellingCategories,
            topCategory,
            overallDiscount,
            dailySales,
            weeklySales,
            monthlySales,
            topSellingBrands
        });
    } catch (error) {
        console.error("Error calculating dashboard stats:", error.message);
        res.status(500).send("Internal Server Error");
    }
};


// Load Login Page

const getLoginPage = (req, res) => {
    try {
        if (req.session.admin) {
            return res.redirect('/admin/dashboard'); // Redirect if already logged in
        }
        return res.status(200).render('admin/login');
    } catch (error) {
        console.error('Error loading login page:', error);
        return res.status(500).send('Server error');
    }
};

// Handle Admin Login
const postLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find admin user by email and password
        const admin = await User.findOne({ email: email, password: password, role: 'admin' });
        if (admin) {
            req.session.admin = { id: admin._id, email: admin.email }; // Store only necessary info in session
            return res.redirect('/admin/dashboard');
        } else {
            return res.status(401).render('admin/login', { message: 'Invalid credentials' });
        }
    } catch (error) {
        console.error('Error during admin login:', error);
        return res.status(500).send('Server error');
    }
};

// Handle Logout
const logoutAdmin = (req, res) => {
    try {
        req.session.destroy((err) => {
            if (err) {
                console.error('Error during admin logout:', err);
                return res.status(500).send('Server error');
            }
            return res.redirect('/admin/login'); // Redirect to login after logout
        });
    } catch (error) {
        console.error('Error during admin logout:', error);
        return res.status(500).send('Server error');
    }
};



// Controller function to get sales data for the graph
const getSalesData = async (req, res) => {
    try {
        const dailySales = await Order.aggregate([
            {
                $match: { expiresAt: { $exists: false }, status: "Completed" }
            },
            {
                $project: {
                    day: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    totalAmount: 1
                }
            },
            {
                $group: {
                    _id: "$day",
                    sales: { $sum: "$totalAmount" }
                }
            },
            {
                $sort: { _id: 1 } // Sort by date in ascending order
            }
        ]);

        const weeklySales = await Order.aggregate([
            {
                $match: { expiresAt: { $exists: false }, status: "Completed" }
            },
            {
                $project: {
                    year: { $year: "$createdAt" },  // Extract year
                    week: { $isoWeek: "$createdAt" }, // Extract ISO week number
                    totalAmount: 1
                }
            },
            {
                $group: {
                    _id: { year: "$year", week: "$week" }, // Group by year and week
                    sales: { $sum: "$totalAmount" }
                }
            },
            {
                $project: {
                    _id: {
                        $concat: [
                            { $toString: "$_id.year" },
                            "-W",
                            { $toString: "$_id.week" }
                        ]
                    }, // Use this as the unique identifier
                    week: {
                        $concat: [
                            { $toString: "$_id.year" },
                            "-W",
                            { $toString: "$_id.week" }
                        ]
                    },
                    sales: 1
                }
            },
            {
                $sort: { week: 1 } // Sort by week in ascending order
            }
        ]);

        const monthlySales = await Order.aggregate([
            {
                $match: { expiresAt: { $exists: false }, status: "Completed" }
            },
            {
                $project: {
                    month: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
                    totalAmount: 1
                }
            },
            {
                $group: {
                    _id: "$month",
                    sales: { $sum: "$totalAmount" }
                }
            },
            {
                $sort: { _id: 1 } // Sort by month in ascending order
            }
        ]);

        // Send the data as a JSON response
        res.json({
            dailySales,
            weeklySales,
            monthlySales
        });

    } catch (err) {
        console.error('Error retrieving sales data:', err);
        res.status(500).json({ message: 'Error retrieving sales data', error: err });
    }
}


const getCustomSalesData = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        // Basic validation for required dates
        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: "Start and End dates are required"
            });
        }

        // Convert strings to Date objects for comparison
        const startDateTime = new Date(startDate);
        const endDateTime = new Date(endDate);

        // Validate date objects are valid
        if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
            return res.status(400).json({
                success: false,
                message: "Invalid date format provided"
            });
        }

        // Check if start date is after end date
        if (startDateTime > endDateTime) {
            return res.status(400).json({
                success: false,
                message: "Start date cannot be later than end date"
            });
        }

        const customSales = await Order.aggregate([
            {
                $match: {
                    status: { $in: ['Pending', 'Shipping', 'Completed', 'Cancelled'] },
                    createdAt: {
                        $gte: startDateTime,
                        $lte: endDateTime
                    },
                    expiresAt: { $exists: false }
                }
            },
            {
                $project: {
                    day: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    totalAmount: 1
                }
            },
            {
                $group: {
                    _id: "$day",
                    sales: { $sum: "$totalAmount" }
                }
            },
            {
                $sort: { _id: 1 }
            }
        ]);

        res.json({
            success: true,
            customSales
        });
    } catch (err) {
        console.error("Error retrieving custom sales data:", err);
        res.status(500).json({
            success: false,
            message: "Error retrieving custom sales data",
            error: err.message
        });
    }
};


const pdf = async (req, res) => {
    try {
        // Fetch orders
        const orders = await Order.find({ status: { $in: ['Pending', 'Shipping', 'Completed', 'Cancelled'] } })
            .populate("userId")
            .populate("orderItems.productId");

        // Aggregate overall discount and revenue
        const [overallDiscount, revenueResult] = await Promise.all([
            Order.aggregate([
                {
                    $match: { expiresAt: { $exists: false } }
                },
                { $unwind: "$orderItems" },
                {
                    $project: {
                        totalAmount: 1,
                        productTotal: { $multiply: ["$orderItems.price", "$orderItems.quantity"] }
                    }
                },
                {
                    $group: {
                        _id: "$_id",
                        totalProductPrice: { $sum: "$productTotal" },
                        totalAmount: { $first: "$totalAmount" }
                    }
                },
                {
                    $project: {
                        orderDiscount: { $subtract: ["$totalProductPrice", "$totalAmount"] }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalDiscount: { $sum: "$orderDiscount" }
                    }
                }
            ]),
            Order.aggregate([
                { $match: { status: 'Completed' } },
                { $group: { _id: null, totalRevenue: { $sum: "$totalAmount" } } }
            ]),
        ]);

        const totalDiscount = overallDiscount.length > 0 ? overallDiscount[0].totalDiscount : 0;
        const totalRevenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;
        const totalSalesCount = orders.length; // Total sales count
        const totalOrderAmount = orders.reduce((sum, order) => sum + order.totalAmount, 0); // Total order amount

        // Setup PDF Document
        const doc = new PDFDocument({ margin: 30 });
        const filename = `sales_report_${Date.now()}.pdf`;

        // Set response headers
        res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
        res.setHeader("Content-Type", "application/pdf");

        doc.pipe(res);

        // Title
        doc.fontSize(18).text("Sales Report", { align: "center" });
        doc.moveDown();

        // Summary
        doc.fontSize(12).text(`Total Sales Count    : ${totalSalesCount}`, { align: "right" });
        doc.text(`Total Order Amount    : ₹${totalOrderAmount}`, { align: "right" });
        doc.text(`Total Discount        : ₹${totalDiscount}`, { align: "right" });
        doc.text(`Total Revenue         : ₹${totalRevenue}`, { align: "right" });
        doc.moveDown();

        // Table Configuration
        const startX = 50;
        let startY = 130;
        const rowHeight = 25;
        const columnWidths = [100, 100, 150, 100, 80];

        // Draw Table Header with Borders
        doc.font("Helvetica-Bold").fontSize(10);
        drawTableRow(doc, startX, startY, columnWidths, rowHeight, [
            "Order ID",
            "User",
            "Email",
            "Total Amount",
            "Status"
        ]);
        drawTableBorders(doc, startX, startY, columnWidths, rowHeight);

        startY += rowHeight;

        // Draw Table Rows
        doc.font("Helvetica").fontSize(9);

        orders.forEach((order, index) => {
            if (startY > 700) {
                doc.addPage();
                startY = 50;
                drawTableRow(doc, startX, startY, columnWidths, rowHeight, [
                    "Order ID",
                    "User",
                    "Email",
                    "Total Amount",
                    "Status"
                ]);
                drawTableBorders(doc, startX, startY, columnWidths, rowHeight);
                startY += rowHeight;
            }

            // Add row data
            drawTableRow(doc, startX, startY, columnWidths, rowHeight, [
                order._id.toString(),
                order.userId?.name || "Guest",
                order.userId?.email || "N/A",
                `₹${order.totalAmount}`,
                order.status
            ]);

            // Draw row borders
            drawTableBorders(doc, startX, startY, columnWidths, rowHeight);

            startY += rowHeight;
        });

        // Finalize the PDF
        doc.end();
    } catch (error) {
        console.error("Error generating PDF:", error);
        res.status(500).json({ error: "Failed to generate PDF" });
    }
};



// Function to Draw a Row
function drawTableRow(doc, startX, startY, columnWidths, rowHeight, rowData) {
    let x = startX;

    rowData.forEach((text, index) => {
        doc.text(text, x + 5, startY + 8, {
            width: columnWidths[index] - 10,
            align: "left"
        });
        x += columnWidths[index];
    });
}

// Function to Draw Table Borders
function drawTableBorders(doc, startX, startY, columnWidths, rowHeight) {
    let x = startX;
    const endY = startY + rowHeight;

    // Draw horizontal lines (top and bottom borders)
    doc.moveTo(startX, startY).lineTo(startX + columnWidths.reduce((a, b) => a + b), startY).stroke();
    doc.moveTo(startX, endY).lineTo(startX + columnWidths.reduce((a, b) => a + b), endY).stroke();

    // Draw vertical lines (column separators)
    columnWidths.forEach((width) => {
        doc.moveTo(x, startY).lineTo(x, endY).stroke();
        x += width;
    });

    // Draw the last vertical line
    doc.moveTo(x, startY).lineTo(x, endY).stroke();
}

const excel = async (req, res) => {
    try {
        const orders = await Order.find({ status: { $in: ['Pending', 'Shipping', 'Completed', 'Cancelled'] } }).populate("userId").populate("orderItems.productId");

        // Aggregate overall discount and revenue
        const [overallDiscount, revenueResult] = await Promise.all([
            Order.aggregate([
                {
                    $match: { expiresAt: { $exists: false } }
                },
                { $unwind: "$orderItems" },
                {
                    $project: {
                        totalAmount: 1,
                        productTotal: { $multiply: ["$orderItems.price", "$orderItems.quantity"] }
                    }
                },
                {
                    $group: {
                        _id: "$_id",
                        totalProductPrice: { $sum: "$productTotal" },
                        totalAmount: { $first: "$totalAmount" }
                    }
                },
                {
                    $project: {
                        orderDiscount: { $subtract: ["$totalProductPrice", "$totalAmount"] }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalDiscount: { $sum: "$orderDiscount" }
                    }
                }
            ]),
            Order.aggregate([
                { $match: { status: 'Completed' } },
                { $group: { _id: null, totalRevenue: { $sum: "$totalAmount" } } }
            ]),
        ]);

        const totalDiscount = overallDiscount.length > 0 ? overallDiscount[0].totalDiscount : 0;
        const totalRevenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;
        const totalSalesCount = orders.length; // Total sales count
        const totalOrderAmount = orders.reduce((sum, order) => sum + order.totalAmount, 0); // Total order amount

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Sales Report");

        worksheet.columns = [
            { header: "Order ID", key: "id", width: 30 },
            { header: "User", key: "user", width: 20 },
            { header: "Email", key: "email", width: 25 },
            { header: "Total Amount", key: "total", width: 15 },
            { header: "Status", key: "status", width: 15 },
            { header: "Items", key: "items", width: 50 }
        ];

        // Add summary data at the top of the worksheet
        worksheet.addRow({
            id: "Total Sales Count",
            user: totalSalesCount,
            email: "Total Order Amount",
            total: `₹${totalOrderAmount}`,
            status: "Total Discount",
            items: `₹${totalDiscount}`
        });
        worksheet.addRow({
            id: "Total Revenue",
            user: `₹${totalRevenue}`,
            email: "",
            total: "",
            status: "",
            items: ""
        });

        orders.forEach(order => {
            worksheet.addRow({
                id: order._id.toString(),
                user: order.userId?.name || "Guest",
                email: order.userId?.email || "",
                total: order.totalAmount,
                status: order.status,
                items: order.orderItems
                    .map(item => `${item.productId?.name || "Product"} (x${item.quantity})`)
                    .join(", ")
            });
        });

        const filename = `sales_report_${Date.now()}.xlsx`;
        res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to generate Excel file" });
    }
};


const modalFilter = async (req, res) => {
    try {
        const { filterType, startDate, endDate } = req.body;

        let matchStage = {
            status: {
                $in: ['Pending', 'Shipping', 'Completed', 'Cancelled']
            },
            expiresAt: { $exists: false }
        };
        const today = new Date();

        // Function to validate and parse dates
        function parseValidDate(date, isEndDate = false) {
            const parsedDate = new Date(date);
            console.log('Parsed date:', parsedDate);

            if (isNaN(parsedDate)) {
                console.log('Invalid date detected');
                return null;
            }

            // Set time to start or end of day
            if (isEndDate) {
                parsedDate.setHours(23, 59, 59, 999);
            } else {
                parsedDate.setHours(0, 0, 0, 0);
            }

            return parsedDate;
        }

        // Adjust date ranges based on filter type
        if (filterType === "daily") {
            matchStage.createdAt = {
                $gte: new Date(today.setHours(0, 0, 0, 0)),
                $lt: new Date(today.setHours(23, 59, 59, 999)),
            };
        } else if (filterType === "weekly") {
            const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
            matchStage.createdAt = { $gte: startOfWeek };
        } else if (filterType === "monthly") {
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            matchStage.createdAt = { $gte: startOfMonth };
        } else if (filterType === "yearly") {
            const startOfYear = new Date(today.getFullYear(), 0, 1);
            matchStage.createdAt = { $gte: startOfYear };
        } else if (filterType === "custom") {
            console.log('Custom date range:', { startDate, endDate });

            const validStartDate = parseValidDate(startDate, false);
            const validEndDate = parseValidDate(endDate, true);

            console.log('Processed dates:', {
                validStartDate,
                validEndDate
            });

            if (!validStartDate || !validEndDate) {
                return res.status(400).json({
                    message: "Invalid date format",
                    details: {
                        startDate: validStartDate ? "valid" : "invalid",
                        endDate: validEndDate ? "valid" : "invalid"
                    }
                });
            }

            matchStage.createdAt = {
                $gte: validStartDate,
                $lte: validEndDate
            };
        }

        // Pagination
        const page = parseInt(req.query.page) || 1;
        const limit = 5;
        const skip = (page - 1) * limit;

        const ordTable = await Order.find(matchStage)
            .populate("userId", "name email")
            .populate("orderItems.productId");

        // Aggregation pipeline
        // 
        const orders = await Order.aggregate([
            {
                $match: matchStage
            },
            { $sort: { createdAt: -1 } }, // Sort by creation date
            { $skip: skip }, // Skip for pagination
            { $limit: limit }, // Limit for pagination
            // Lookup for populating user details
            {
                $lookup: {
                    from: 'users',             // 'users' is the collection name for users
                    localField: 'userId',      // Local field in 'Order' collection
                    foreignField: '_id',       // Foreign field in 'Users' collection
                    as: 'userDetails'          // Alias for the populated data
                }
            },
            { $unwind: '$userDetails' }, // Unwind the 'userDetails' array (because $lookup returns an array)
            {
                $project: {
                    _id: 1,
                    userName: '$userDetails.name',
                    email: '$userDetails.email',
                    totalAmount: 1,
                    status: 1,
                    createdAt: 1
                }
            }
        ]);


        // Total count and revenue
        const summary = await Order.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: null,
                    totalSales: { $sum: 1 },
                    totalRevenue: { $sum: "$totalAmount" },
                },
            },
        ]);

        const totalSales = summary[0]?.totalSales || 0;
        const totalRevenue = summary[0]?.totalRevenue || 0;

        // Total pages
        const totalOrders = await Order.countDocuments(matchStage);
        const totalPages = Math.ceil(totalOrders / limit);

        res.json({
            ordTable,
            orders,
            totalSales,
            totalRevenue,
            totalPages,
        });
    } catch (error) {
        console.error("Error fetching sales data:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};



const modalPdf = async (req, res) => {
    try {
        const { filterType, startDate, endDate } = req.query;

        let matchStage = {
            status: {
                $in: ['Pending', 'Shipping', 'Completed', 'Cancelled']
            },
            expiresAt: { $exists: false }
        };

        const today = new Date();

        // Function to validate and parse dates
        function parseValidDate(date, isEndDate = false) {
            const parsedDate = new Date(date);
            console.log('Parsed date:', parsedDate);

            if (isNaN(parsedDate)) {
                console.log('Invalid date detected');
                return null;
            }

            // Set time to start or end of day
            if (isEndDate) {
                parsedDate.setHours(23, 59, 59, 999);
            } else {
                parsedDate.setHours(0, 0, 0, 0);
            }

            return parsedDate;
        }

        // Handle filters
        if (filterType === "daily") {
            matchStage.createdAt = {
                $gte: new Date(today.setHours(0, 0, 0, 0)),
                $lt: new Date(today.setHours(23, 59, 59, 999)),
            };
        } else if (filterType === "weekly") {
            const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
            matchStage.createdAt = { $gte: startOfWeek };
        } else if (filterType === "monthly") {
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            matchStage.createdAt = { $gte: startOfMonth };
        } else if (filterType === "yearly") {
            const startOfYear = new Date(today.getFullYear(), 0, 1);
            matchStage.createdAt = { $gte: startOfYear };
        } else if (filterType === "custom") {
            console.log('Custom date range:', { startDate, endDate });

            const validStartDate = parseValidDate(startDate, false);
            const validEndDate = parseValidDate(endDate, true);

            console.log('Processed dates:', {
                validStartDate,
                validEndDate
            });

            if (!validStartDate || !validEndDate) {
                return res.status(400).json({
                    message: "Invalid date format",
                    details: {
                        startDate: validStartDate ? "valid" : "invalid",
                        endDate: validEndDate ? "valid" : "invalid"
                    }
                });
            }

            matchStage.createdAt = {
                $gte: validStartDate,
                $lte: validEndDate
            };
        }


        // Fetch filtered orders
        const orders = await Order.find(matchStage)
            .populate("userId", "name email")
            .populate("orderItems.productId");



        // Generate PDF Document
        const doc = new PDFDocument({ margin: 30 });
        const filename = `sales_report_${Date.now()}.pdf`;

        // Set response headers
        res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
        res.setHeader("Content-Type", "application/pdf");

        doc.pipe(res);

        // Title
        doc.fontSize(18).text("Sales Report", { align: "center" });
        doc.moveDown();

        // Table Setup
        const startX = 50;
        let startY = 130;
        const rowHeight = 25;
        const columnWidths = [100, 100, 150, 100, 80]; // Column widths

        // Table Header
        doc.font("Helvetica-Bold").fontSize(10);
        drawTableRow(doc, startX, startY, columnWidths, rowHeight, [
            "Order ID",
            "User",
            "Email",
            "Total Amount",
            "Status"
        ]);
        drawTableBorders(doc, startX, startY, columnWidths, rowHeight);
        startY += rowHeight;

        // Table Rows
        doc.font("Helvetica").fontSize(9);
        orders.forEach((order) => {
            if (startY > 700) {
                doc.addPage();
                startY = 50;
                drawTableRow(doc, startX, startY, columnWidths, rowHeight, [
                    "Order ID",
                    "User",
                    "Email",
                    "Total Amount",
                    "Status"
                ]);
                drawTableBorders(doc, startX, startY, columnWidths, rowHeight);
                startY += rowHeight;
            }

            drawTableRow(doc, startX, startY, columnWidths, rowHeight, [
                order._id.toString(),
                order.userId.name || "Guest",
                order.userId?.email || "N/A",
                `₹${order.totalAmount}`,
                order.status
            ]);
            drawTableBorders(doc, startX, startY, columnWidths, rowHeight);
            startY += rowHeight;
        });

        // Finalize PDF
        doc.end();
    } catch (error) {
        console.error("Error generating PDF:", error);
        res.status(500).json({ message: "Failed to generate PDF" });
    }
};
const modalExcel = async (req, res) => {
    try {
        const { filterType, startDate, endDate } = req.query;

        // Reuse the same logic for filtering sales
        let matchStage = {
            status: {
                $in: ['Pending', 'Shipping', 'Completed', 'Cancelled']
            },
            expiresAt: { $exists: false }
        };

        // Handle filters based on the filterType
        if (filterType === "daily") {
            const today = new Date();
            matchStage.createdAt = {
                $gte: new Date(today.setHours(0, 0, 0, 0)),
                $lt: new Date(today.setHours(23, 59, 59, 999)),
            };
        } else if (filterType === "weekly") {
            const today = new Date();
            const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
            matchStage.createdAt = { $gte: startOfWeek };
        } else if (filterType === "monthly") {
            const today = new Date();
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            matchStage.createdAt = { $gte: startOfMonth };
        } else if (filterType === "yearly") {
            const today = new Date();
            const startOfYear = new Date(today.getFullYear(), 0, 1);
            matchStage.createdAt = { $gte: startOfYear };
        } else if (filterType === "custom") {
            const validStartDate = new Date(startDate);
            const validEndDate = new Date(endDate);
            matchStage.createdAt = { $gte: validStartDate, $lte: validEndDate };
        }

        const orders = await Order.find(matchStage).sort({ createdAt: -1 });

        const users = await User.find({ _id: { $in: orders.map(order => order.userId) } });

        // Generate Excel Workbook
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Sales Report");

        // Add Header
        worksheet.columns = [
            { header: "Order ID", key: "_id", width: 30 },
            { header: "User", key: "user", width: 30 },
            { header: "Email", key: "email", width: 30 },
            { header: "Total Amount", key: "totalAmount", width: 20 },
            { header: "Status", key: "status", width: 20 },
            { header: "Date", key: "createdAt", width: 20 },
        ];

        // Add Rows
        orders.forEach((order) => {
            const user = users.find((user) => user._id.toString() === order.userId.toString());
            worksheet.addRow({
                _id: order._id,
                user: user ? user.name : "Guest", // Fetch user data manually
                email: user ? user.email : "N/A", // Fetch user data manually
                totalAmount: `₹${order.totalAmount}`,
                status: order.status,
                createdAt: new Date(order.createdAt).toLocaleDateString(),
            });
        });

        // Send File
        res.setHeader(
            "Content-Disposition",
            "attachment; filename=sales_report.xlsx"
        );
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error("Error generating Excel:", error);
        res.status(500).send("Internal Server Error");
    }
};


module.exports = {
    getDashboard,         // GET: /admin/dashboard
    getLoginPage,         // GET: /admin/login
    postLogin,            // POST: /admin/login
    logoutAdmin,          // POST: /admin/logout
    getSalesData,
    getCustomSalesData,
    pdf,
    excel,
    modalFilter,
    modalPdf,
    modalExcel
};
