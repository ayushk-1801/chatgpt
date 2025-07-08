import mongoose from 'mongoose';
import { config } from '@/config';
import { DatabaseError } from '@/lib/errors';

class DatabaseService {
  private static instance: DatabaseService;
  private isConnected = false;

  private constructor() {}

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      await mongoose.connect(config.database.uri, config.database.options);
      this.isConnected = true;
      console.log('✅ Database connected successfully');
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      throw new DatabaseError('Failed to connect to database', { error });
    }
  }

  async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await mongoose.disconnect();
      this.isConnected = false;
      console.log('✅ Database disconnected successfully');
    } catch (error) {
      console.error('❌ Database disconnection failed:', error);
      throw new DatabaseError('Failed to disconnect from database', { error });
    }
  }

  getConnectionStatus(): boolean {
    return this.isConnected && mongoose.connection.readyState === 1;
  }

  async healthCheck(): Promise<boolean> {
    try {
      if (!this.isConnected) {
        return false;
      }
      
      await mongoose.connection.db.admin().ping();
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }
}

export const databaseService = DatabaseService.getInstance();

// Helper function for API routes
export async function ensureDbConnection(): Promise<void> {
  await databaseService.connect();
} 