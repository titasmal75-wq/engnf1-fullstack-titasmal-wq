
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const User = require("../models/User");
const Ticket = require("../models/Ticket");
const TicketEvent = require("../models/TicketEvent");
const Resource = require("../models/Resource");


const connectDB = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is missing from .env file");
  }

  await mongoose.connect(process.env.MONGODB_URI);

  console.log("MongoDB connected successfully");
};


const caseInsensitive = {
  locale: "en",
  strength: 2,
};

const seedUsers = async () => {
  const users = [
    {
      name: "Admin Lead",
      email: "admin@triagesync.test",
      password: "Admin@123",
      role: "ADMIN",
    },
    {
      name: "Agent Demo",
      email: "user@triagesync.test",
      password: "User@123",
      role: "USER",
    },
  ];

  const result = [];

  for (const user of users) {
   
    const passwordHash = await bcrypt.hash(user.password, 10);

    const saved = await User.findOneAndUpdate(
      { email: user.email },
      {
        $setOnInsert: {
          name: user.name,
          email: user.email,
          passwordHash,
          role: user.role,
        },
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
        collation: caseInsensitive,
      }
    );

    result.push(saved);
  }

  console.log(`Users seeded: ${result.length}`);

  return result;
};


const seedResources = async () => {
  const resources = [
    {
      name: "Conference Room A",
      type: "ROOM",
      capacity: 20,
      description: "Main conference room",
      isActive: true,
    },
    {
      name: "Conference Room B",
      type: "ROOM",
      capacity: 10,
      description: "Small meeting room",
      isActive: true,
    },
    {
      name: "Computer Lab 1",
      type: "LAB",
      capacity: 40,
      description: "Computer laboratory",
      isActive: true,
    },
    {
      name: "Computer Lab 2",
      type: "LAB",
      capacity: 30,
      description: "Advanced programming laboratory",
      isActive: true,
    },
    {
      name: "Projector 1",
      type: "EQUIPMENT",
      capacity: 1,
      description: "HD multimedia projector",
      isActive: true,
    },
    {
      name: "Projector 2",
      type: "EQUIPMENT",
      capacity: 1,
      description: "Portable classroom projector",
      isActive: false,
    },
  ];

  const result = [];

  for (const resource of resources) {
    const saved = await Resource.findOneAndUpdate(
      { name: resource.name },
      {
        $setOnInsert: resource,
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
        collation: caseInsensitive,
      }
    );

    result.push(saved);
  }

  console.log(`Resources seeded: ${result.length}`);

  return result;
};


const ticketData = [
  {
    externalId: "DEMO-001",
    subject: "Payment deducted but order not confirmed",
    body: "My payment was deducted but my order is pending.",
    category: "BILLING",
    autoCategory: "BILLING",
    priority: "URGENT",
    isReviewed: true,
  },
  {
    externalId: "DEMO-002",
    subject: "Incorrect invoice amount",
    body: "The invoice contains an incorrect amount.",
    category: "BILLING",
    autoCategory: "BILLING",
    priority: "HIGH",
    isReviewed: true,
  },
  {
    externalId: "DEMO-003",
    subject: "Refund not received",
    body: "I have not received my refund.",
    category: "BILLING",
    autoCategory: "BILLING",
    priority: "MEDIUM",
  },
  {
    externalId: "DEMO-004",
    subject: "Application crashes",
    body: "Application crashes after login.",
    category: "BUG",
    autoCategory: "BUG",
    priority: "HIGH",
    isReviewed: true,
  },
  {
    externalId: "DEMO-005",
    subject: "Dashboard loading problem",
    body: "Dashboard keeps loading indefinitely.",
    category: "BUG",
    autoCategory: "BUG",
    priority: "MEDIUM",
  },
  {
    externalId: "DEMO-006",
    subject: "Search functionality broken",
    body: "Search does not return expected results.",
    category: "BUG",
    autoCategory: "BUG",
    priority: "LOW",
  },
  {
    externalId: "DEMO-007",
    subject: "Add dark mode",
    body: "Please add dark mode functionality.",
    category: "FEATURE_REQUEST",
    autoCategory: "FEATURE_REQUEST",
    priority: "LOW",
  },
  {
    externalId: "DEMO-008",
    subject: "PDF report export",
    body: "Please allow downloading reports as PDF.",
    category: "FEATURE_REQUEST",
    autoCategory: "FEATURE_REQUEST",
    priority: "MEDIUM",
  },
  {
    externalId: "DEMO-009",
    subject: "Add notifications",
    body: "Please add real-time notifications.",
    category: "FEATURE_REQUEST",
    autoCategory: "FEATURE_REQUEST",
    priority: "HIGH",
  },
  {
    externalId: "DEMO-010",
    subject: "Cannot reset password",
    body: "Password reset link is not working.",
    category: "LOGIN",
    autoCategory: "LOGIN",
    priority: "URGENT",
  },
  {
    externalId: "DEMO-011",
    subject: "Account locked",
    body: "My account is locked unexpectedly.",
    category: "LOGIN",
    autoCategory: "LOGIN",
    priority: "HIGH",
  },
  {
    externalId: "DEMO-012",
    subject: "OTP not received",
    body: "I am not receiving the login OTP.",
    category: "LOGIN",
    autoCategory: "LOGIN",
    priority: "MEDIUM",
  },
  {
    externalId: "DEMO-013",
    subject: "Delivery delayed",
    body: "My delivery has not arrived.",
    category: "DELIVERY",
    autoCategory: "DELIVERY",
    priority: "LOW",
  },
  {
    externalId: "DEMO-014",
    subject: "Wrong delivery address",
    body: "My package is going to the wrong address.",
    category: "DELIVERY",
    autoCategory: "DELIVERY",
    priority: "HIGH",
  },
  {
    externalId: "DEMO-015",
    subject: "XSS security testing ticket",
    body: '<script>alert("XSS Test")</script><img src=x onerror=alert("XSS")>',
    category: "BUG",
    autoCategory: "BUG",
    priority: "HIGH",
  },
];


const seedTickets = async () => {
  const result = [];

  for (const ticket of ticketData) {
    const saved = await Ticket.findOneAndUpdate(
      { externalId: ticket.externalId },
      {
        $setOnInsert: {
          ...ticket,
          status: "OPEN",
          assigneeId: null,
          isReviewed: ticket.isReviewed ?? false,
          isHumanOverride: false,
        },
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
      }
    );

    result.push(saved);
  }

  console.log(`Tickets seeded: ${result.length}`);

  return result;
};


const seedTicketEvents = async (tickets, users) => {
  const admin = users.find((user) => user.role === "ADMIN");

  if (!admin) {
    throw new Error("Admin user not found");
  }

  let count = 0;

  for (const ticket of tickets) {
    const event = {
      ticketId: ticket._id,
      field: "status",
      oldValue: null,
      newValue: "OPEN",
      actor: admin.email,
    };

    await TicketEvent.updateOne(
      {
        ticketId: ticket._id,
        field: event.field,
        newValue: event.newValue,
        actor: event.actor,
      },
      {
        $setOnInsert: event,
      },
      {
        upsert: true,
      }
    );

    count++;
  }

  console.log(`Ticket events seeded: ${count}`);
};


const seedDatabase = async () => {
  try {
    await connectDB();

    console.log("\nStarting database seeding...\n");

    // Ensure database indexes are initialized
    await User.init();
    await Ticket.init();
    await Resource.init();
    await TicketEvent.init();

    const users = await seedUsers();

    await seedResources();

    const tickets = await seedTickets();

    await seedTicketEvents(tickets, users);

   
    console.log("Database seeding completed!");
   

  } catch (error) {
    console.error("\nDatabase seeding failed:", error);

    process.exitCode = 1;

  } finally {
    await mongoose.disconnect();
    console.log("MongoDB disconnected");
  }
};

seedDatabase();
