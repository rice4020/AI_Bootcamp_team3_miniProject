import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

async function initDb() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is missing in .env');
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL);

  console.log('Starting DB initialization...');

  try {
    // Drop old tables to clean up
    console.log('Dropping old snake_case tables if they exist...');
    await sql`DROP TABLE IF EXISTS food_trucks CASCADE`;
    await sql`DROP TABLE IF EXISTS truck_menus CASCADE`;
    await sql`DROP TABLE IF EXISTS users CASCADE`;

    // 1. Create "User" table
    await sql`
      CREATE TABLE IF NOT EXISTS "User" (
        "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        "username" VARCHAR(50) UNIQUE NOT NULL,
        "password" VARCHAR(255) NOT NULL,
        "name" VARCHAR(50) NOT NULL,
        "phone" VARCHAR(20),
        "email" VARCHAR(100) UNIQUE NOT NULL,
        "role" VARCHAR(20) DEFAULT 'customer' NOT NULL,
        "isActive" BOOLEAN DEFAULT true NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `;
    console.log('✅ "User" table created');

    // 2. Create "FoodTruck" table
    await sql`
      CREATE TABLE IF NOT EXISTS "FoodTruck" (
        "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        "ownerId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
        "truckName" VARCHAR(100) NOT NULL,
        "menu" TEXT,
        "priceInfo" TEXT,
        "stock" INTEGER DEFAULT 0,
        "status" VARCHAR(20) DEFAULT 'inactive' NOT NULL,
        "latitude" NUMERIC(10, 6),
        "longitude" NUMERIC(10, 6),
        "notice" TEXT,
        "photoUrl" TEXT,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `;
    
    // Create index for FoodTruck location
    await sql`CREATE INDEX IF NOT EXISTS idx_truck_location ON "FoodTruck"("latitude", "longitude")`;
    console.log('✅ "FoodTruck" table and index created');

    // 3. Create "SnsAnnouncement" table
    await sql`
      CREATE TABLE IF NOT EXISTS "SnsAnnouncement" (
        "id" SERIAL PRIMARY KEY,
        "truckId" UUID NOT NULL REFERENCES "FoodTruck"("id") ON DELETE CASCADE,
        "locationName" VARCHAR(255) NOT NULL,
        "menuInfo" VARCHAR(255) NOT NULL,
        "promptStyle" VARCHAR(50) NOT NULL,
        "generatedContent" TEXT NOT NULL,
        "editedContent" TEXT NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `;
    console.log('✅ "SnsAnnouncement" table created');

    // 4. Create "Event" table
    await sql`
      CREATE TABLE IF NOT EXISTS "Event" (
        "id" SERIAL PRIMARY KEY,
        "title" VARCHAR(150) NOT NULL,
        "location" VARCHAR(255) NOT NULL,
        "startDate" DATE NOT NULL,
        "endDate" DATE NOT NULL,
        "scale" VARCHAR(50) NOT NULL,
        "latitude" NUMERIC(10, 6),
        "longitude" NUMERIC(10, 6),
        "description" TEXT,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `;
    console.log('✅ "Event" table created');

    // 5. Create "WeatherForecast" table
    await sql`
      CREATE TABLE IF NOT EXISTS "WeatherForecast" (
        "id" SERIAL PRIMARY KEY,
        "region" VARCHAR(100) NOT NULL,
        "forecastDate" DATE NOT NULL,
        "temperature" NUMERIC(4, 1) NOT NULL,
        "skyStatus" VARCHAR(50) NOT NULL,
        "rainProbability" INTEGER NOT NULL,
        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `;
    console.log('✅ "WeatherForecast" table created');

    // 6. Create "Spot" table
    await sql`
      CREATE TABLE IF NOT EXISTS "Spot" (
        "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        "name" VARCHAR(150) NOT NULL,
        "address" VARCHAR(255) NOT NULL,
        "latitude" NUMERIC(10, 6) NOT NULL,
        "longitude" NUMERIC(10, 6) NOT NULL,
        "rulesDescription" TEXT,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `;
    console.log('✅ "Spot" table created');

    console.log('🎉 DB Initialization completed successfully!');
  } catch (error) {
    console.error('❌ DB Initialization failed:', error);
  }
}

initDb();
