#!/usr/bin/env node
/**
 * Migration script to update existing users without phone field
 * Run this once: node src/scripts/migrate-phone-field.js
 */

import mongoose from "mongoose";
import { config } from "../config.js";
import { User } from "../models/User.js";

async function migratePhoneField() {
  try {
    console.log("🔄 Connecting to MongoDB...");
    await mongoose.connect(config.mongoUri);
    console.log("✅ Connected to MongoDB");

    console.log("\n🔍 Finding users without phone field...");
    const usersWithoutPhone = await User.find({ 
      $or: [
        { phone: { $exists: false } },
        { phone: null },
        { phone: "" }
      ]
    });

    console.log(`📊 Found ${usersWithoutPhone.length} users without phone`);

    if (usersWithoutPhone.length === 0) {
      console.log("✅ No migration needed - all users have phone field");
      await mongoose.disconnect();
      process.exit(0);
    }

    console.log("\n🔧 Updating users...");
    let updated = 0;
    for (const user of usersWithoutPhone) {
      // Generate a placeholder phone for users without one
      const placeholderPhone = user.role === "ADMIN" 
        ? `admin_${user._id}`
        : `user_${user._id}`;
      
      user.phone = placeholderPhone;
      await user.save();
      updated++;
      console.log(`  ✓ Updated ${user.role}: ${user.username || user.email} → ${placeholderPhone}`);
    }

    console.log(`\n✅ Migration complete! Updated ${updated} users`);
    console.log("\n📝 Note: These are placeholder phone numbers.");
    console.log("   Users should update their actual phone via profile settings.");

    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
    process.exit(0);
  } catch (err) {
    console.error("\n❌ Migration failed:", err.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

migratePhoneField();
