// TrustMD Database Migration System
// Comprehensive schema migration management with rollback capabilities

class MigrationRunner {
    constructor(supabaseClient, securityConfig) {
        this.supabaseClient = supabaseClient;
        this.securityConfig = securityConfig;
        this.isInitialized = false;
        this.migrationTable = 'schema_migrations';
        this.migrationsPath = './migrations';
        this.currentVersion = null;
    }

    // Initialize migration system
    async initialize() {
        try {
            // Create migration table if not exists
            await this.createMigrationTable();
            
            // Get current migration version
            await this.getCurrentVersion();
            
            this.isInitialized = true;
            console.log('Migration system initialized successfully');
            return true;
        } catch (error) {
            console.error('Failed to initialize migration system:', error);
            throw error;
        }
    }

    // Create migration tracking table
    async createMigrationTable() {
        try {
            const { error } = await this.supabaseClient.supabase.sql`
                CREATE TABLE IF NOT EXISTS ${this.supabaseClient.supabase.raw(this.migrationTable)} (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    version VARCHAR(255) NOT NULL UNIQUE,
                    description TEXT,
                    sql_up TEXT NOT NULL,
                    sql_down TEXT,
                    checksum VARCHAR(64) NOT NULL,
                    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    applied_by UUID REFERENCES users(id),
                    rollback_available BOOLEAN DEFAULT true,
                    execution_time_ms INTEGER,
                    status VARCHAR(20) DEFAULT 'applied' CHECK (status IN ('pending', 'applied', 'failed', 'rolled_back'))
                );
            `;

            if (error) {
                throw new Error(`Failed to create migration table: ${error.message}`);
            }

            console.log('Migration table created/verified successfully');
        } catch (error) {
            console.error('Error creating migration table:', error);
            throw error;
        }
    }

    // Get current migration version
    async getCurrentVersion() {
        try {
            const { data, error } = await this.supabaseClient.supabase
                .from(this.migrationTable)
                .select('version')
                .eq('status', 'applied')
                .order('applied_at', { ascending: false })
                .limit(1);

            if (error) {
                throw new Error(`Failed to get current version: ${error.message}`);
            }

            this.currentVersion = data && data.length > 0 ? data[0].version : null;
            console.log(`Current migration version: ${this.currentVersion || 'none'}`);
        } catch (error) {
            console.error('Error getting current version:', error);
            throw error;
        }
    }

    // Run pending migrations
    async runMigrations(targetVersion = null) {
        try {
            if (!this.isInitialized) {
                throw new Error('Migration system not initialized');
            }

            console.log('Starting migration process...');
            
            // Get all available migrations
            const availableMigrations = await this.getAvailableMigrations();
            
            // Filter migrations to run
            const migrationsToRun = this.filterMigrationsToRun(availableMigrations, targetVersion);
            
            if (migrationsToRun.length === 0) {
                console.log('No pending migrations to run');
                return { success: true, migrations: [], message: 'No pending migrations' };
            }

            console.log(`Found ${migrationsToRun.length} migrations to run`);
            
            // Run migrations in order
            const results = [];
            for (const migration of migrationsToRun) {
                const result = await this.runMigration(migration);
                results.push(result);
                
                if (!result.success) {
                    console.error(`Migration failed: ${migration.version}`, result.error);
                    throw new Error(`Migration ${migration.version} failed: ${result.error}`);
                }
            }

            // Update current version
            await this.getCurrentVersion();
            
            console.log('All migrations completed successfully');
            return { success: true, migrations: results };
        } catch (error) {
            console.error('Migration process failed:', error);
            throw error;
        }
    }

    // Get available migrations
    async getAvailableMigrations() {
        try {
            // In a real implementation, this would read from migration files
            // For now, return predefined critical migrations for Phase 8
            
            const migrations = [
                {
                    version: '2024_01_20_001_enable_rls',
                    description: 'Enable Row Level Security on all tenant-specific tables',
                    sql_up: `
                        -- Enable RLS on all tenant tables
                        ALTER TABLE users ENABLE ROW LEVEL SECURITY;
                        ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
                        ALTER TABLE compliance_templates ENABLE ROW LEVEL SECURITY;
                        ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
                        ALTER TABLE consistency_issues ENABLE ROW LEVEL SECURITY;
                        ALTER TABLE evidence_vault ENABLE ROW LEVEL SECURITY;
                        ALTER TABLE risk_assessments ENABLE ROW LEVEL SECURITY;
                        ALTER TABLE compliance_reports ENABLE ROW LEVEL SECURITY;
                    `,
                    sql_down: `
                        -- Disable RLS (rollback)
                        ALTER TABLE users DISABLE ROW LEVEL SECURITY;
                        ALTER TABLE documents DISABLE ROW LEVEL SECURITY;
                        ALTER TABLE compliance_templates DISABLE ROW LEVEL SECURITY;
                        ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;
                        ALTER TABLE consistency_issues DISABLE ROW LEVEL SECURITY;
                        ALTER TABLE evidence_vault DISABLE ROW LEVEL SECURITY;
                        ALTER TABLE risk_assessments DISABLE ROW LEVEL SECURITY;
                        ALTER TABLE compliance_reports DISABLE ROW LEVEL SECURITY;
                    `
                },
                {
                    version: '2024_01_20_002_add_encryption_support',
                    description: 'Add encryption support for sensitive data',
                    sql_up: `
                        -- Enable pgcrypto extension
                        CREATE EXTENSION IF NOT EXISTS pgcrypto;
                        
                        -- Add encrypted columns for sensitive data
                        ALTER TABLE users ADD COLUMN IF NOT EXISTS email_encrypted BYTEA;
                        ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_encrypted BYTEA;
                        ALTER TABLE users ADD COLUMN IF NOT EXISTS name_encrypted BYTEA;
                        
                        ALTER TABLE consistency_issues ADD COLUMN IF NOT EXISTS title_encrypted BYTEA;
                        ALTER TABLE consistency_issues ADD COLUMN IF NOT EXISTS description_encrypted BYTEA;
                        
                        ALTER TABLE compliance_templates ADD COLUMN IF NOT EXISTS content_encrypted BYTEA;
                        ALTER TABLE compliance_templates ADD COLUMN IF NOT EXISTS requirements_encrypted BYTEA;
                    `,
                    sql_down: `
                        -- Remove encrypted columns (rollback)
                        ALTER TABLE users DROP COLUMN IF EXISTS email_encrypted;
                        ALTER TABLE users DROP COLUMN IF EXISTS phone_encrypted;
                        ALTER TABLE users DROP COLUMN IF EXISTS name_encrypted;
                        
                        ALTER TABLE consistency_issues DROP COLUMN IF EXISTS title_encrypted;
                        ALTER TABLE consistency_issues DROP COLUMN IF EXISTS description_encrypted;
                        
                        ALTER TABLE compliance_templates DROP COLUMN IF EXISTS content_encrypted;
                        ALTER TABLE compliance_templates DROP COLUMN IF EXISTS requirements_encrypted;
                    `
                },
                {
                    version: '2024_01_20_003_create_rls_policies',
                    description: 'Create comprehensive RLS policies for tenant isolation',
                    sql_up: `
                        -- Create tenant context function
                        CREATE OR REPLACE FUNCTION get_current_tenant_id()
                        RETURNS UUID AS $$
                        DECLARE
                            tenant_subdomain TEXT;
                            tenant_id UUID;
                        BEGIN
                            tenant_subdomain := current_setting('app.current_tenant', true);
                            SELECT id INTO tenant_id FROM tenants WHERE subdomain = tenant_subdomain AND status = 'active';
                            RETURN tenant_id;
                        END;
                        $$ LANGUAGE plpgsql SECURITY DEFINER;
                        
                        -- Create tenant read policy
                        CREATE POLICY "tenant_read_policy" ON users
                        FOR SELECT USING (
                            tenant_id IN (
                                SELECT id FROM tenants 
                                WHERE subdomain = current_setting('app.current_tenant', true)
                            )
                        );
                        
                        -- Create tenant write policy
                        CREATE POLICY "tenant_write_policy" ON users
                        FOR INSERT WITH CHECK (
                            tenant_id IN (
                                SELECT id FROM tenants 
                                WHERE subdomain = current_setting('app.current_tenant', true)
                            )
                        );
                    `,
                    sql_down: `
                        -- Drop RLS policies (rollback)
                        DROP POLICY IF EXISTS "tenant_read_policy" ON users;
                        DROP POLICY IF EXISTS "tenant_write_policy" ON users;
                        
                        -- Drop functions
                        DROP FUNCTION IF EXISTS get_current_tenant_id();
                    `
                },
                {
                    version: '2024_01_20_004_add_backup_infrastructure',
                    description: 'Create backup and recovery infrastructure',
                    sql_up: `
                        -- Create backup metadata table
                        CREATE TABLE IF NOT EXISTS backup_metadata (
                            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                            backup_type TEXT NOT NULL CHECK (backup_type IN ('full', 'incremental')),
                            backup_size BIGINT NOT NULL,
                            backup_path TEXT NOT NULL,
                            checksum TEXT NOT NULL,
                            encryption_enabled BOOLEAN DEFAULT true,
                            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                            completed_at TIMESTAMP WITH TIME ZONE,
                            status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
                            error_message TEXT,
                            tables_included TEXT[],
                            tenant_id UUID REFERENCES tenants(id)
                        );
                        
                        -- Create backup restore log table
                        CREATE TABLE IF NOT EXISTS backup_restore_log (
                            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                            backup_id UUID REFERENCES backup_metadata(id),
                            restore_type TEXT NOT NULL CHECK (restore_type IN ('full', 'partial', 'table')),
                            status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
                            started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                            completed_at TIMESTAMP WITH TIME ZONE,
                            error_message TEXT,
                            tables_restored TEXT[],
                            tenant_id UUID REFERENCES tenants(id)
                        );
                    `,
                    sql_down: `
                        -- Drop backup tables (rollback)
                        DROP TABLE IF EXISTS backup_restore_log;
                        DROP TABLE IF EXISTS backup_metadata;
                    `
                },
                {
                    version: '2024_01_20_005_enhance_rbac_security',
                    description: 'Enhance RBAC tables with security features',
                    sql_up: `
                        -- Enable RLS on RBAC tables
                        ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
                        ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
                        ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
                        ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
                        
                        -- Add role expiration support
                        ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;
                        ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);
                        
                        -- Create RBAC policies
                        CREATE POLICY "tenant_role_access" ON roles
                        FOR ALL USING (
                            tenant_id IN (
                                SELECT id FROM tenants 
                                WHERE subdomain = current_setting('app.current_tenant', true)
                            )
                        );
                    `,
                    sql_down: `
                        -- Drop RBAC policies and columns (rollback)
                        DROP POLICY IF EXISTS "tenant_role_access" ON roles;
                        
                        ALTER TABLE user_roles DROP COLUMN IF EXISTS expires_at;
                        ALTER TABLE user_roles DROP COLUMN IF EXISTS created_by;
                        
                        ALTER TABLE roles DISABLE ROW LEVEL SECURITY;
                        ALTER TABLE permissions DISABLE ROW LEVEL SECURITY;
                        ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;
                        ALTER TABLE role_permissions DISABLE ROW LEVEL SECURITY;
                    `
                }
            ];

            return migrations;
        } catch (error) {
            console.error('Error getting available migrations:', error);
            throw error;
        }
    }

    // Filter migrations to run
    filterMigrationsToRun(availableMigrations, targetVersion) {
        try {
            let migrationsToRun = availableMigrations;
            
            // If we have a current version, filter out already applied migrations
            if (this.currentVersion) {
                const currentIndex = availableMigrations.findIndex(m => m.version === this.currentVersion);
                if (currentIndex !== -1) {
                    migrationsToRun = availableMigrations.slice(currentIndex + 1);
                }
            }
            
            // If target version specified, stop at that version
            if (targetVersion) {
                const targetIndex = migrationsToRun.findIndex(m => m.version === targetVersion);
                if (targetIndex !== -1) {
                    migrationsToRun = migrationsToRun.slice(0, targetIndex + 1);
                }
            }
            
            return migrationsToRun;
        } catch (error) {
            console.error('Error filtering migrations:', error);
            throw error;
        }
    }

    // Run a single migration
    async runMigration(migration) {
        try {
            console.log(`Running migration: ${migration.version}`);
            const startTime = Date.now();
            
            // Calculate checksum
            const checksum = await this.calculateChecksum(migration.sql_up);
            
            // Check if migration already exists
            const existing = await this.getMigration(migration.version);
            if (existing && existing.status === 'applied') {
                console.log(`Migration ${migration.version} already applied`);
                return { success: true, version: migration.version, skipped: true };
            }
            
            // Start transaction
            const { data, error } = await this.supabaseClient.supabase.rpc('run_migration', {
                p_version: migration.version,
                p_description: migration.description,
                p_sql_up: migration.sql_up,
                p_sql_down: migration.sql_down || null,
                p_checksum: checksum
            });

            if (error) {
                throw new Error(`Migration execution failed: ${error.message}`);
            }

            const executionTime = Date.now() - startTime;
            console.log(`Migration ${migration.version} completed in ${executionTime}ms`);
            
            return { 
                success: true, 
                version: migration.version, 
                executionTime,
                appliedAt: new Date().toISOString()
            };
        } catch (error) {
            console.error(`Migration ${migration.version} failed:`, error);
            return { 
                success: false, 
                version: migration.version, 
                error: error.message 
            };
        }
    }

    // Calculate checksum for migration SQL
    async calculateChecksum(sql) {
        try {
            const crypto = require('crypto');
            return crypto.createHash('sha256').update(sql).digest('hex');
        } catch (error) {
            console.error('Error calculating checksum:', error);
            throw error;
        }
    }

    // Get migration record
    async getMigration(version) {
        try {
            const { data, error } = await this.supabaseClient.supabase
                .from(this.migrationTable)
                .select('*')
                .eq('version', version)
                .single();

            if (error && error.code !== 'PGRST116') {
                throw new Error(`Failed to get migration: ${error.message}`);
            }

            return data;
        } catch (error) {
            console.error('Error getting migration:', error);
            throw error;
        }
    }

    // Rollback migration
    async rollbackMigration(version) {
        try {
            console.log(`Rolling back migration: ${version}`);
            
            const migration = await this.getMigration(version);
            if (!migration) {
                throw new Error(`Migration ${version} not found`);
            }
            
            if (!migration.sql_down) {
                throw new Error(`Migration ${version} does not support rollback`);
            }
            
            if (!migration.rollback_available) {
                throw new Error(`Rollback not available for migration ${version}`);
            }
            
            // Execute rollback SQL
            const { error } = await this.supabaseClient.supabase.sql`
                ${this.supabaseClient.supabase.raw(migration.sql_down)}
            `;

            if (error) {
                throw new Error(`Rollback failed: ${error.message}`);
            }
            
            // Update migration status
            await this.supabaseClient.supabase
                .from(this.migrationTable)
                .update({ 
                    status: 'rolled_back',
                    rolled_back_at: new Date().toISOString()
                })
                .eq('version', version);
            
            // Update current version
            await this.getCurrentVersion();
            
            console.log(`Migration ${version} rolled back successfully`);
            return { success: true, version, rolledBackAt: new Date().toISOString() };
        } catch (error) {
            console.error(`Rollback failed for migration ${version}:`, error);
            throw error;
        }
    }

    // Get migration status
    async getMigrationStatus() {
        try {
            const { data, error } = await this.supabaseClient.supabase
                .from(this.migrationTable)
                .select('*')
                .order('applied_at', { ascending: false });

            if (error) {
                throw new Error(`Failed to get migration status: ${error.message}`);
            }

            const applied = data.filter(m => m.status === 'applied');
            const failed = data.filter(m => m.status === 'failed');
            const rolledBack = data.filter(m => m.status === 'rolled_back');

            return {
                currentVersion: this.currentVersion,
                totalMigrations: data.length,
                appliedMigrations: applied.length,
                failedMigrations: failed.length,
                rolledBackMigrations: rolledBack.length,
                lastMigration: applied.length > 0 ? applied[0] : null,
                migrations: data
            };
        } catch (error) {
            console.error('Error getting migration status:', error);
            throw error;
        }
    }

    // Validate database state
    async validateDatabaseState() {
        try {
            const issues = [];
            
            // Check if migration table exists
            const { data: tableExists } = await this.supabaseClient.supabase
                .from('information_schema.tables')
                .select('table_name')
                .eq('table_name', this.migrationTable)
                .single();

            if (!tableExists) {
                issues.push('Migration table does not exist');
            }
            
            // Check for duplicate migration versions
            const { data: duplicates } = await this.supabaseClient.supabase
                .from(this.migrationTable)
                .select('version, COUNT(*) as count')
                .group('version')
                .having('count', 'gt', 1);

            if (duplicates && duplicates.length > 0) {
                issues.push(`Duplicate migration versions: ${duplicates.map(d => d.version).join(', ')}`);
            }
            
            // Check for failed migrations
            const { data: failed } = await this.supabaseClient.supabase
                .from(this.migrationTable)
                .select('version')
                .eq('status', 'failed');

            if (failed && failed.length > 0) {
                issues.push(`Failed migrations: ${failed.map(f => f.version).join(', ')}`);
            }
            
            return {
                isValid: issues.length === 0,
                issues,
                recommendation: issues.length === 0 ? 'Database state is valid' : 'Fix identified issues before proceeding'
            };
        } catch (error) {
            console.error('Error validating database state:', error);
            throw error;
        }
    }

    // Get system status
    getStatus() {
        return {
            initialized: this.isInitialized,
            currentVersion: this.currentVersion,
            migrationTable: this.migrationTable,
            migrationsPath: this.migrationsPath
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MigrationRunner;
}
