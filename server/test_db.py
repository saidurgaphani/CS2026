import os
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
DATABASE_NAME = os.getenv("DATABASE_NAME", "InsightAI")

async def test_conn():
    print(f"Testing connection to: {MONGO_URI}")
    try:
        client = AsyncIOMotorClient(MONGO_URI, serverSelectionTimeoutMS=5000)
        await client.admin.command('ping')
        print("✅ Connection Successful!")
        db = client[DATABASE_NAME]
        cols = await db.list_collection_names()
        print(f"Collections in {DATABASE_NAME}: {cols}")
    except Exception as e:
        print(f"❌ Connection Failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_conn())
