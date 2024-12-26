const Offer = require("../../models/offerModel");
const Product = require("../../models/productModel");
const Category = require("../../models/categoryModel");

const loadOffer = async (req, res) => {
    try {
        const offer = await Offer.findById(req.params.id).populate("productId categoryId");
        res.status(200).render("admin/offerManagement");
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}
const createOffer = async (req, res) => {
    try {
        const { name, type, productId, categoryId, discountType, discountValue, startDate, endDate, description } = req.body;
        console.log(req.body);

        // Ensure discountValue is parsed correctly
        const discountValueParsed = parseInt(discountValue);  // Parse the discount value as a number

        const newOffer = await Offer.create({
            name,
            type,
            productId: type === 'product' ? productId : null,
            categoryId: type === 'category' ? categoryId : null,
            discountType,
            discountValue: discountValueParsed, // Store as number
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            description
        });

        // If the offer applies to a specific product
        if (type === "product") {
            const product = await Product.findById(productId);

            if (product) {
                // Calculate the discount
                let discountAmount;
                if (discountType === "percentage") {
                    discountAmount = (product.price * discountValueParsed) / 100;
                } else if (discountType === "fixed") {
                    discountAmount = discountValueParsed;
                }

                // Save the current offer price to prevOfferPrice (if there was an existing offer)
                if (!product.prevOfferPrice) {
                    product.prevOfferPrice = new Map();
                    product.prevOfferPrice.set('first',{
                        price: product.offerPrice
                    })
                    console.log('hihihi');
                    
                } else {
                    // Add the current offer to prevOfferPrice as the first value
                    product.prevOfferPrice.set(newOffer._id, {
                        discountType,
                        discountValue: discountType === "percentage" ? `${discountValueParsed}%` : `${discountValueParsed}`, // Keep as number here
                        price: (product.price - discountAmount).toFixed(2)
                    });
                    console.log('hihihi-2');

                }



                // Set the new offer price
                product.offerPrice = (product.price - discountAmount).toFixed(2);

                // Save the updated product
                await product.save();
            }
        }
        // If the offer applies to a category
        else if (type === "category") {
            const products = await Product.find({ category: categoryId });

            for (let product of products) {
                // Calculate the discount
                let discountAmount;
                if (discountType === "percentage") {
                    discountAmount = (product.price * discountValueParsed) / 100;
                } else if (discountType === "fixed") {
                    discountAmount = discountValueParsed;
                }

                // Save the current offer price to prevOfferPrice (if there was an existing offer)
                if (!product.prevOfferPrice) {
                    product.prevOfferPrice = new Map();
                }

                // Add the current offer to prevOfferPrice as the first value
                product.prevOfferPrice.set(newOffer._id, {
                    discountType,
                    discountValue: discountType === "percentage" ? `${discountValueParsed}%` : `${discountValueParsed}`, // Keep as number here
                    price: (product.price - discountAmount).toFixed(2)
                });

                // Set the new offer price
                product.offerPrice = (product.price - discountAmount).toFixed(2);

                // Save the updated product
                await product.save();
            }
        }

        res.status(200).json(newOffer);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Error creating offer', error });
    }
};




const getOffers = async (req, res) => {
    try {
        const offers = await Offer.find().populate("productId categoryId");
        res.status(200).json({ success: true, offers });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const specific = async (req, res) => {
    try {
        const id = req.params.id;
        const offer = await Offer.findById(id).populate("productId categoryId");
        res.status(200).json({ success: true, offer });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const updateOffer = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, type, productId, categoryId, discountType, discountValue, startDate, endDate, description } = req.body;

        // Find the existing offer to be updated
        const existingOffer = await Offer.findById(id);
        if (!existingOffer) return res.status(404).json({ message: 'Offer not found' });

        // If the offer applies to a specific product, update that product's prices and prevOfferPrice history
        if (type === 'product') {
            const product = await Product.findById(productId);
            if (product) {
                // Save the current offer details in prevOfferPrice history before updating
                const offerData = {
                    discountType,
                    discountValue,
                    price: product.offerPrice // Store the current offer price before applying new discount
                };

                // Add the offer to prevOfferPrice history
                if (!product.prevOfferPrice) product.prevOfferPrice = {}; // Initialize prevOfferPrice if it doesn't exist
                product.prevOfferPrice[existingOffer.id] = offerData;

                // Apply the new discount
                let newPrice;
                if (discountType === "percentage") {
                    newPrice = (product.price * (1 - discountValue / 100)).toFixed(2);
                } else if (discountType === "fixed") {
                    newPrice = (product.price - discountValue).toFixed(2);
                }

                // Update the product's offerPrice
                product.offerPrice = newPrice;

                // Save the updated product
                await product.save();
            }
        }
        // If the offer applies to a category, update all products in the category
        else if (type === 'category') {
            const products = await Product.find({ category: categoryId });
            for (let product of products) {
                // Save the current offer details in prevOfferPrice history before updating
                const offerData = {
                    discountType,
                    discountValue,
                    price: product.offerPrice // Store the current offer price before applying new discount
                };

                // Add the offer to prevOfferPrice history
                if (!product.prevOfferPrice) product.prevOfferPrice = {}; // Initialize prevOfferPrice if it doesn't exist
                product.prevOfferPrice[existingOffer.id] = offerData;

                // Apply the new discount
                let newPrice;
                if (discountType === "percentage") {
                    newPrice = (product.price * (1 - discountValue / 100)).toFixed(2);
                } else if (discountType === "fixed") {
                    newPrice = (product.price - discountValue).toFixed(2);
                }

                // Update the product's offerPrice
                product.offerPrice = newPrice;

                // Save the updated product
                await product.save();
            }
        }

        // Update the offer details in the Offer model
        const updatedOffer = await Offer.findByIdAndUpdate(id, {
            name,
            type,
            productId: type === 'product' ? productId : null,
            categoryId: type === 'category' ? categoryId : null,
            discountType,
            discountValue: parseInt(discountValue),
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            description
        }, { new: true });

        res.json(updatedOffer);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Error updating offer', error });
    }
};


const deleteOffer = async (req, res) => {
    try {
        const { id } = req.params;
        const offer = await Offer.findById(id);

        if (!offer) return res.status(404).json({ message: 'Offer not found' });

        // If the offer is for a specific product
        if (offer.type === 'product') {
            const product = await Product.findById(offer.productId);
            if (product) {
                // If the offer exists in prevOfferPrice, delete it
                if (product.prevOfferPrice && product.prevOfferPrice.has(offer._id)) {
                    product.prevOfferPrice.delete(offer._id);

                    // Get the last offer in prevOfferPrice (the most recent one)
                    const prevOfferEntries = Array.from(product.prevOfferPrice.values());
                    const lastOffer = prevOfferEntries.pop(); // Get the last entry

                    // If there was a previous offer, set the last offer's price as the current offerPrice
                    if (lastOffer) {
                        product.offerPrice = lastOffer.price;
                    } else {
                        // If no previous offers, reset to the original price
                        product.offerPrice = product.price;
                    }

                    // Save the updated product
                    await product.save();
                }
            }
        }
        // If the offer is for a category
        else if (offer.type === 'category') {
            const products = await Product.find({ category: offer.categoryId });

            for (let product of products) {
                // If the offer exists in prevOfferPrice, delete it
                if (product.prevOfferPrice && product.prevOfferPrice.has(offer._id)) {
                    product.prevOfferPrice.delete(offer._id);

                    // Get the last offer in prevOfferPrice (the most recent one)
                    const prevOfferEntries = Array.from(product.prevOfferPrice.values());
                    const lastOffer = prevOfferEntries.pop(); // Get the last entry

                    // If there was a previous offer, set the last offer's price as the current offerPrice
                    if (lastOffer) {
                        product.offerPrice = lastOffer.price;
                    } else {
                        // If no previous offers, reset to the original price
                        product.offerPrice = product.price;
                    }

                    // Save the updated product
                    await product.save();
                }
            }
        }

        // Delete the offer from the Offer collection
        const deletedOffer = await Offer.findByIdAndDelete(id);

        res.json(deletedOffer);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Error deleting offer', error });
    }
};



const getCategory = async (req, res) => {
    try {
        const categories = await Category.find({ isDeleted: false });
        res.json(categories);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching categories', error });
    }
}


const getProducts = async (req, res) => {
    try {
        const products = await Product.find({ isDeleted: false });
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching products', error });
    }
}


module.exports = {
    loadOffer,
    createOffer,
    getOffers,
    updateOffer,
    deleteOffer,
    getCategory,
    getProducts,
    specific,
}