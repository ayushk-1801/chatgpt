// Legacy database connection file - use new service instead
import { ensureDbConnection } from '@/services/database';

// Maintain backward compatibility
export default ensureDbConnection;

// Export the new service for migration
export { databaseService, ensureDbConnection } from '@/services/database'; 