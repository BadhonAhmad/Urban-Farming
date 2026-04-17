const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...\n");

  // ─── Clean up in reverse FK order ────────────────────────────────────
  console.log("Cleaning existing data...");
  await prisma.plantTracking.deleteMany();
  await prisma.communityPost.deleteMany();
  await prisma.order.deleteMany();
  await prisma.rentalBooking.deleteMany();
  await prisma.produce.deleteMany();
  await prisma.sustainabilityCert.deleteMany();
  await prisma.rentalSpace.deleteMany();
  await prisma.vendorProfile.deleteMany();
  await prisma.user.deleteMany();
  console.log("All existing data cleared.\n");

  const hash = (pw) => bcrypt.hash(pw, 10);

  // ─── 1. Admins ───────────────────────────────────────────────────────
  console.log("Creating admins...");
  const admins = [];
  for (let i = 1; i <= 3; i++) {
    const admin = await prisma.user.create({
      data: {
        name: `Admin ${i}`,
        email: `admin${i}@urbanfarm.com`,
        password: await hash("Admin@1234"),
        role: "ADMIN",
        status: "ACTIVE",
      },
    });
    admins.push(admin);
  }
  console.log(`  Created ${admins.length} admins.`);

  // ─── 2. Vendors ──────────────────────────────────────────────────────
  console.log("Creating vendors...");
  const vendorData = [
    { name: "Rahim Khan", farmName: "Green Valley Farm", farmLocation: "Dhaka" },
    { name: "Fatema Begum", farmName: "Organic Bliss", farmLocation: "Chattogram" },
    { name: "Kamal Hossain", farmName: "Urban Greens BD", farmLocation: "Sylhet" },
    { name: "Nusrat Jahan", farmName: "Fresh Harvest Co", farmLocation: "Rajshahi" },
    { name: "Arif Rahman", farmName: "EcoSprout Farms", farmLocation: "Khulna" },
    { name: "Taslima Akter", farmName: "Nature's Basket", farmLocation: "Barishal" },
    { name: "Shafiq Islam", farmName: "Rooftop Organics", farmLocation: "Rangpur" },
    { name: "Mita Das", farmName: "CityCrop Solutions", farmLocation: "Mymensingh" },
    { name: "Jamal Uddin", farmName: "PureEarth Produce", farmLocation: "Comilla" },
    { name: "Sabrina Chowdhury", farmName: "GreenPatch Express", farmLocation: "Gazipur" },
  ];

  const vendors = [];
  for (let i = 0; i < vendorData.length; i++) {
    const v = vendorData[i];
    const user = await prisma.user.create({
      data: {
        name: v.name,
        email: `vendor${i + 1}@urbanfarm.com`,
        password: await hash("Vendor@1234"),
        role: "VENDOR",
        status: "ACTIVE",
        vendorProfile: {
          create: {
            farmName: v.farmName,
            farmLocation: v.farmLocation,
            certificationStatus: "APPROVED",
            sustainabilityCert: {
              create: {
                certifyingAgency: i % 2 === 0 ? "Bangladesh Organic" : "GlobalGAP BD",
                certificationDate: new Date("2025-01-15"),
                expiryDate: new Date("2027-01-15"),
                documentUrl: `https://certs.urbanfarm.com/vendor${i + 1}.pdf`,
              },
            },
          },
        },
      },
      include: { vendorProfile: { include: { sustainabilityCert: true } } },
    });
    vendors.push(user);
  }
  console.log(`  Created ${vendors.length} vendors with profiles and certs.`);

  // ─── 3. Customers ────────────────────────────────────────────────────
  console.log("Creating customers...");
  const customerNames = [
    "Tanvir Ahmed", "Lima Sultana", "Imran Hossain", "Ruma Khatun", "Pranto Deb",
  ];
  const customers = [];
  for (let i = 0; i < customerNames.length; i++) {
    const customer = await prisma.user.create({
      data: {
        name: customerNames[i],
        email: `customer${i + 1}@urbanfarm.com`,
        password: await hash("Customer@1234"),
        role: "CUSTOMER",
        status: "ACTIVE",
      },
    });
    customers.push(customer);
  }
  console.log(`  Created ${customers.length} customers.`);

  // ─── 4. Produce (100 items, 10 per vendor) ──────────────────────────
  console.log("Creating produce...");
  const produceNames = [
    ["Tomatoes", "Spinach", "Carrots", "Basil", "Lettuce", "Peppers", "Cucumber", "Beans", "Kale", "Mint"],
    ["Strawberries", "Blueberries", "Bananas", "Papaya", "Guava", "Lemon", "Mango", "Pineapple", "Watermelon", "Jackfruit"],
    ["Rosemary", "Thyme", "Cilantro", "Parsley", "Oregano", "Turmeric", "Ginger", "Lemongrass", "Saffron", "Bay Leaf"],
    ["Sunflower Seeds", "Pumpkin Seeds", "Chia Seeds", "Flax Seeds", "Sesame Seeds", "Mustard Seeds", "Cumin Seeds", "Fenugreek", "Coriander Seeds", "Hemp Seeds"],
    ["Organic Fertilizer", "Coco Coir Block", "Grow Bags", "Seedling Tray", "Pruning Shears", "Watering Can", "Plant Support Stakes", "Neem Oil Spray", "Vermicompost", "Perlite Mix"],
    ["Cherry Tomatoes", "Baby Spinach", "Purple Carrots", "Thai Basil", "Romaine Lettuce", "Jalapeno Peppers", "Mini Cucumber", "Green Beans", "Red Kale", "Peppermint"],
    ["Dragon Fruit", "Passion Fruit", "Star Fruit", "Lychee", "Rambutan", "Avocado", "Pomegranate", "Fig", "Sapodilla", "Tamarind"],
    ["Dill", "Sage", "Chives", "Fennel", "Curry Leaves", "Cardamom", "Black Pepper", "Clove", "Nutmeg", "Cinnamon"],
    ["Alfalfa Seeds", "Quinoa Seeds", "Amaranth Seeds", "Moringa Seeds", "Basil Seeds", "Wheatgrass Seeds", "Radish Seeds", "Bok Choy Seeds", "Zucchini Seeds", "Eggplant Seeds"],
    ["Drip Irrigation Kit", "pH Test Kit", "Compost Bin", "Garden Gloves", "Hand Trowel", "Plant Labels", "Mini Greenhouse", "Spray Bottle", "Soil Moisture Meter", " pruning Saw"],
  ];
  const categories = ["VEGETABLES", "FRUITS", "HERBS", "SEEDS", "TOOLS"];

  const allProduce = [];
  for (let v = 0; v < vendors.length; v++) {
    const vendorProfile = vendors[v].vendorProfile;
    for (let p = 0; p < 10; p++) {
      const catIdx = Math.floor(v / 2);
      const produce = await prisma.produce.create({
        data: {
          vendorId: vendorProfile.id,
          name: produceNames[v][p],
          description: `Fresh ${produceNames[v][p].toLowerCase()} from ${vendorProfile.farmName}`,
          price: (Math.floor(Math.random() * 451) + 50),
          category: categories[catIdx >= categories.length ? categories.length - 1 : catIdx],
          availableQuantity: Math.floor(Math.random() * 191) + 10,
          certificationStatus: "APPROVED",
        },
      });
      allProduce.push(produce);
    }
  }
  console.log(`  Created ${allProduce.length} produce items.`);

  // ─── 5. Rental Spaces (10, one per vendor) ───────────────────────────
  console.log("Creating rental spaces...");
  const sizes = ["5sqm", "10sqm", "15sqm", "20sqm", "25sqm", "8sqm", "12sqm", "18sqm", "30sqm", "50sqm"];
  const locations = [
    "Rooftop Block-A Dhaka", "Balcony Chattogram Central", "Community Garden Sylhet",
    "Backyard Rajshahi East", "Terrace Khulna South", "Farm Plot Barishal North",
    "Rooftop Rangpur Main", "Vertical Garden Mymensingh", "Greenhouse Comilla",
    "Open Plot Gazipur Industrial",
  ];
  const rentalSpaces = [];
  for (let i = 0; i < vendors.length; i++) {
    const space = await prisma.rentalSpace.create({
      data: {
        vendorId: vendors[i].vendorProfile.id,
        location: locations[i],
        size: sizes[i],
        pricePerDay: (Math.floor(Math.random() * 16) + 5) * 100,
        isAvailable: true,
      },
    });
    rentalSpaces.push(space);
  }
  console.log(`  Created ${rentalSpaces.length} rental spaces.`);

  // ─── 6. Orders (10, status=DELIVERED) ────────────────────────────────
  console.log("Creating orders...");
  const orders = [];
  for (let i = 0; i < 10; i++) {
    const customer = customers[i % customers.length];
    const produce = allProduce[Math.floor(Math.random() * allProduce.length)];
    const quantity = Math.floor(Math.random() * 5) + 1;
    const totalPrice = Number(produce.price) * quantity;

    const order = await prisma.order.create({
      data: {
        userId: customer.id,
        produceId: produce.id,
        vendorId: produce.vendorId,
        quantity,
        totalPrice,
        status: "DELIVERED",
      },
    });
    orders.push(order);
  }
  console.log(`  Created ${orders.length} orders.`);

  // ─── 7. Rental Bookings (5, status=CONFIRMED) ────────────────────────
  console.log("Creating rental bookings...");
  const bookings = [];
  for (let i = 0; i < 5; i++) {
    const customer = customers[i];
    const space = rentalSpaces[i];
    const startDate = new Date(2026, 4, 1 + i * 3);
    const endDate = new Date(2026, 4, 5 + i * 3);
    const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    const totalPrice = Number(space.pricePerDay) * days;

    const booking = await prisma.rentalBooking.create({
      data: {
        userId: customer.id,
        rentalSpaceId: space.id,
        startDate,
        endDate,
        status: "CONFIRMED",
        totalPrice,
      },
    });
    bookings.push(booking);
  }
  console.log(`  Created ${bookings.length} rental bookings.`);

  // ─── 8. Community Posts (5) ──────────────────────────────────────────
  console.log("Creating community posts...");
  const postData = [
    { title: "Best soil mix for rooftop farming?", content: "I've been using a blend of coco coir, vermicompost, and perlite. Has anyone tried adding bone meal for better yields?" },
    { title: "My tomato harvest this season", content: "Grew 15kg of cherry tomatoes on my 10sqm rooftop! Sharing some tips on pruning and staking that worked for me." },
    { title: "Pest control without chemicals", content: "Neem oil spray has been a game changer for aphid control. Mix 5ml neem oil with 1L water and spray every 3 days." },
    { title: "Looking for organic seeds in Dhaka", content: "Can anyone recommend a reliable source for organic vegetable seeds in the Dhaka area? Looking for heirloom varieties." },
    { title: "Hydroponics vs soil: my experience", content: "After 6 months of running both systems side by side, here's what I learned about yield, cost, and maintenance." },
  ];
  const authors = [...customers.slice(0, 3), vendors[0], vendors[1]];
  const posts = [];
  for (let i = 0; i < postData.length; i++) {
    const post = await prisma.communityPost.create({
      data: {
        userId: authors[i].id,
        title: postData[i].title,
        postContent: postData[i].content,
      },
    });
    posts.push(post);
  }
  console.log(`  Created ${posts.length} community posts.`);

  // ─── 9. Plant Tracking (5) ───────────────────────────────────────────
  console.log("Creating plant tracking entries...");
  const plantNames = ["Cherry Tomato", "Thai Basil", "Green Chili", "Mint", "Lettuce"];
  const stages = ["SEEDLING", "VEGETATIVE", "FLOWERING", "FRUITING", "HARVEST"];
  const healthStatuses = ["HEALTHY", "HEALTHY", "NEEDS_WATER", "HEALTHY", "DISEASED"];
  const plants = [];
  for (let i = 0; i < 5; i++) {
    const plant = await prisma.plantTracking.create({
      data: {
        userId: customers[i].id,
        rentalSpaceId: rentalSpaces[i].id,
        plantName: plantNames[i],
        growthStage: stages[i],
        healthStatus: healthStatuses[i],
        notes: i === 2 ? "Needs watering soon" : i === 4 ? "Some yellowing on lower leaves" : null,
      },
    });
    plants.push(plant);
  }
  console.log(`  Created ${plants.length} plant tracking entries.`);

  // ─── Summary ─────────────────────────────────────────────────────────
  console.log("\n--- Seed Summary ---");
  console.log(`  Admins:        ${admins.length}`);
  console.log(`  Vendors:       ${vendors.length}`);
  console.log(`  Customers:     ${customers.length}`);
  console.log(`  Produce:       ${allProduce.length}`);
  console.log(`  Rental Spaces: ${rentalSpaces.length}`);
  console.log(`  Orders:        ${orders.length}`);
  console.log(`  Bookings:      ${bookings.length}`);
  console.log(`  Posts:         ${posts.length}`);
  console.log(`  Plant Records: ${plants.length}`);
  console.log("\nSeeding complete!");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
