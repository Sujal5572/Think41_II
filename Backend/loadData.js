require('dotenv').config(); // Load environment variables from .env file

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse');

// --- Import Mongoose Models ---
// Ensure these paths correctly point to your model files inside the 'models' subfolder
const User = require('./models/User');
const Product = require('./models/Product');
const DistributionCenter = require('./models/DistributionCenter');
const InventoryItem = require('./models/InventoryItem');
const Order = require('./models/Order');
const OrderItem = require('./models/OrderItem');
// If you uncommented Conversation/Message clearing, ensure they are imported:
// const Conversation = require('./models/Conversation'); 
// const Message = require('./models/Message');

// --- MongoDB Connection URI ---
// This uses the MONGODB_URL from your .env file
const MONGO_URI = process.env.MONGODB_URL;

// --- CSV File Paths ---
// *** IMPORTANT: CSV_DIR points to the current directory (Backend folder) ***
// This assumes your CSV files are directly inside your 'Backend' folder.
const CSV_DIR = __dirname; 

const csvFiles = {
    users: path.join(CSV_DIR, 'users.csv'),
    products: path.join(CSV_DIR, 'products.csv'),
    distributionCenters: path.join(CSV_DIR, 'distribution_centers.csv'),
    inventoryItems: path.join(CSV_DIR, 'inventory_items.csv'),
    orders: path.join(CSV_DIR, 'orders.csv'),
    orderItems: path.join(CSV_DIR, 'order_items.csv'),
};

// --- Mappings for CSV ID to MongoDB ObjectId ---
// These Maps store the _id of inserted documents, allowing us to link related data efficiently.
let userMap = new Map(); // Stores original CSV User ID -> MongoDB ObjectId
let productMap = new Map(); // Stores original CSV Product ID -> MongoDB ObjectId
let distributionCenterMap = new Map(); // Stores original CSV Distribution Center ID -> MongoDB ObjectId
let orderMap = new Map(); // Stores original CSV Order ID -> MongoDB ObjectId

// --- Helper function to parse CSV ---
// *** MODIFIED: Added a 'limit' parameter to control the number of records ***
async function parseCsv(filePath, limit = Infinity) { // Default to Infinity if no limit is passed
    return new Promise((resolve, reject) => {
        const records = [];
        fs.createReadStream(filePath)
            .pipe(parse({
                columns: true, // Treat the first row as headers
                skip_empty_lines: true // Ignore any empty lines in the CSV
            }))
            .on('data', (record) => records.push(record))
            .on('end', () => {
                // *** MODIFIED: Slice the records array to the specified limit ***
                const limitedRecords = records.slice(0, limit);
                console.log(`Finished parsing ${filePath}. Loaded ${limitedRecords.length} of ${records.length} total rows.`);
                resolve(limitedRecords);
            })
            .on('error', (err) => {
                console.error(`Error parsing ${filePath}:`, err);
                reject(err);
            });
    });
}

// --- Main Data Loading Function ---
async function loadData() {
    // Define the limit for entries per CSV file
    const ENTRY_LIMIT = 150; 

    try {
        // Connect to MongoDB Atlas using the URI from .env
        await mongoose.connect(MONGO_URI);
        console.log('MongoDB connected for data loading!');

        // --- Clear existing collections (for clean re-imports during development) ---
        console.log('Clearing existing data...');
        await Promise.all([
            User.deleteMany({}),
            Product.deleteMany({}),
            DistributionCenter.deleteMany({}),
            InventoryItem.deleteMany({}),
            Order.deleteMany({}),
            OrderItem.deleteMany({}),
            // Optionally, clear chat history collections too if starting completely fresh
            // Conversation.deleteMany({}), 
            // Message.deleteMany({}),
        ]);
        console.log('Existing collections cleared.');

        // --- 1. Load Distribution Centers ---
        // Pass ENTRY_LIMIT to parseCsv
        console.log('Loading Distribution Centers...');
        const dcRecords = await parseCsv(csvFiles.distributionCenters, ENTRY_LIMIT);
        const distributionCentersToInsert = dcRecords.map(record => ({
            csvId: parseInt(record.id),
            name: record.name,
            latitude: parseFloat(record.latitude),
            longitude: parseFloat(record.longitude)
        }));
        const insertedDCs = await DistributionCenter.insertMany(distributionCentersToInsert);
        insertedDCs.forEach(doc => {
            distributionCenterMap.set(doc.csvId, doc._id); // Store mapping for later use
        });
        console.log(`Inserted ${insertedDCs.length} Distribution Centers.`);

        // --- 2. Load Products ---
        // Pass ENTRY_LIMIT to parseCsv
        console.log('Loading Products...');
        const productRecords = await parseCsv(csvFiles.products, ENTRY_LIMIT);
        const productsToInsert = productRecords.map(record => ({
            csvId: parseInt(record.id),
            cost: parseFloat(record.cost),
            category: record.category,
            name: record.name || 'Unnamed Product', // Fixed: provide default for missing name
            brand: record.brand || 'Unknown Brand', // Fixed: provide default for missing brand
            retailPrice: parseFloat(record.retail_price),
            department: record.department,
            sku: record.sku,
            csvDistributionCenterId: parseInt(record.distribution_center_id) // Temporarily store CSV ID of Distribution Center
        }));
        const insertedProducts = await Product.insertMany(productsToInsert);
        insertedProducts.forEach(doc => {
            productMap.set(doc.csvId, doc._id); // Store mapping for later use
        });
        console.log(`Inserted ${insertedProducts.length} Products.`);

        // --- Resolve Product DistributionCenter references (Optimized with Promise.all) ---
        // Update the Product documents to include the actual ObjectId reference concurrently.
        console.log('Resolving Product-DistributionCenter references...');
        const productUpdatePromises = insertedProducts.map(async (product) => {
            if (product.csvDistributionCenterId && distributionCenterMap.has(product.csvDistributionCenterId)) {
                product.distributionCenter = distributionCenterMap.get(product.csvDistributionCenterId);
                return product.save(); // Return the promise from save(), don't await here
            } else {
                 console.warn(`Warning: Distribution Center with CSV ID ${product.csvDistributionCenterId} not found for Product ${product.csvId}. Product may be missing DC reference.`);
                 return Promise.resolve(); // Return a resolved promise for products not updated
            }
        });
        await Promise.all(productUpdatePromises); // Wait for all concurrent product updates to finish
        console.log('Product references resolved.');


        // --- 3. Load Users ---
        // Pass ENTRY_LIMIT to parseCsv
        console.log('Loading Users...');
        const userRecords = await parseCsv(csvFiles.users, ENTRY_LIMIT);
        const usersToInsert = userRecords.map(record => ({
            csvId: parseInt(record.id),
            firstName: record.first_name,
            lastName: record.last_name,
            email: record.email,
            password: record.password || 'password_missing', // Fixed: provide default for missing password
            age: record.age ? parseInt(record.age) : undefined, // Handle potential empty/null values
            gender: record.gender,
            streetAddress: record.street_address,
            postalCode: record.postal_code,
            city: record.city,
            state: record.state,
            country: record.country,
            latitude: record.latitude ? parseFloat(record.latitude) : undefined,
            longitude: record.longitude ? parseFloat(record.longitude) : undefined,
            trafficSource: record.traffic_source
        }));
        const insertedUsers = await User.insertMany(usersToInsert);
        insertedUsers.forEach(doc => {
            userMap.set(doc.csvId, doc._id); // Store mapping for later use
        });
        console.log(`Inserted ${insertedUsers.length} Users.`);


        // --- 4. Load Inventory Items ---
        // Pass ENTRY_LIMIT to parseCsv
        // References Products and Distribution Centers, so they must be loaded first.
        console.log('Loading Inventory Items...');
        const inventoryRecords = await parseCsv(csvFiles.inventoryItems, ENTRY_LIMIT);
        const inventoryItemsToInsert = inventoryRecords.map(record => {
            const productId = productMap.get(parseInt(record.product_id));
            const distributionCenterId = distributionCenterMap.get(parseInt(record.distribution_center_id));

            if (!productId || !distributionCenterId) {
                console.warn(`Skipping inventory item ${record.id}: Product ID ${record.product_id} (${productId ? 'found' : 'not found'}) or DC ID ${record.distribution_center_id} (${distributionCenterId ? 'found' : 'not found'}) not found. Item will not be inserted.`);
                return null; // Skip this record if required references aren't found
            }

            return {
                csvId: parseInt(record.id),
                product: productId, // Use the MongoDB ObjectId
                distributionCenter: distributionCenterId, // Use the MongoDB ObjectId
                quantity: parseInt(record.quantity)
            };
        }).filter(item => item !== null); // Filter out any records that were skipped

        const insertedInventoryItems = await InventoryItem.insertMany(inventoryItemsToInsert);
        console.log(`Inserted ${insertedInventoryItems.length} Inventory Items.`);

        // --- 5. Load Orders ---
        // Pass ENTRY_LIMIT to parseCsv
        // References Users, so Users must be loaded first.
        console.log('Loading Orders...');
        const orderRecords = await parseCsv(csvFiles.orders, ENTRY_LIMIT);
        const ordersToInsert = orderRecords.map(record => {
            const userId = userMap.get(parseInt(record.user_id));
            if (!userId) {
                console.warn(`Skipping order ${record.order_id}: User ID ${record.user_id} not found. Order will not be inserted.`);
                return null;
            }
            return {
                csvOrderId: parseInt(record.order_id),
                user: userId, // Use the MongoDB ObjectId
                status: record.status,
                gender: record.gender,
                orderCreatedAt: record.created_at ? new Date(record.created_at) : undefined,
                returnedAt: record.returned_at ? new Date(record.returned_at) : undefined,
                shippedAt: record.shipped_at ? new Date(record.shipped_at) : undefined,
                deliveredAt: record.delivered_at ? new Date(record.delivered_at) : undefined,
                numOfItems: parseInt(record.num_of_item)
            };
        }).filter(item => item !== null); // Filter out any records that were skipped

        const insertedOrders = await Order.insertMany(ordersToInsert);
        insertedOrders.forEach(doc => {
            orderMap.set(doc.csvOrderId, doc._id); // Store mapping for later use
        });
        console.log(`Inserted ${insertedOrders.length} Orders.`);

        // --- 6. Load Order Items ---
        // Pass ENTRY_LIMIT to parseCsv
        // References Orders and Products, so they must be loaded first.
        console.log('Loading Order Items...');
        const orderItemRecords = await parseCsv(csvFiles.orderItems, ENTRY_LIMIT);
        const orderItemsToInsert = orderItemRecords.map(record => {
            const orderId = orderMap.get(parseInt(record.order_id));
            const productId = productMap.get(parseInt(record.product_id));

            if (!orderId || !productId) {
                console.warn(`Skipping order item ${record.id}: Order ID ${record.order_id} or Product ID ${record.product_id} not found. Order item will not be inserted.`);
                return null;
            }

            return {
                csvId: parseInt(record.id),
                order: orderId, // Use the MongoDB ObjectId
                product: productId, // Use the MongoDB ObjectId
                itemType: record.item_type,
                salePrice: parseFloat(record.sale_price)
            };
        }).filter(item => item !== null);

        const insertedOrderItems = await OrderItem.insertMany(orderItemsToInsert);
        console.log(`Inserted ${insertedOrderItems.length} Order Items.`);

        console.log('Data loading complete!');

    } catch (error) {
        // Catch any unhandled errors during the entire loading process
        console.error('An unhandled error occurred during data loading:', error);
    } finally {
        // Always disconnect from MongoDB, whether successful or not
        await mongoose.disconnect();
        console.log('MongoDB disconnected.');
    }
}

// Execute the main data loading function when the script runs
loadData();