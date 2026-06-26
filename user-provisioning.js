// TrustMD User Provisioning - Multi-Tenant User Management
// Handles user creation, assignment, and management across organizations

// Browser-compatible version - requires will be handled by script loading order

class UserProvisioning {
    constructor(tenantManager, rbacManager, supabaseClient) {
        this.tenantManager = tenantManager;
        this.rbacManager = rbacManager || new RBACManager(supabaseClient);
        this.supabaseClient = supabaseClient;
        this.userCache = new Map();
    }

    // Multi-tenant user management
    async createUser(userData, tenantId, roleIds = [], createdBy = null) {
        try {
            const {
                email,
                name,
                password,
                department,
                location,
                phone,
                jobTitle
            } = userData;

            // Validate required fields
            if (!email || !name || !password) {
                throw new Error('Email, name, and password are required');
            }

            // Validate password strength
            this.validatePasswordStrength(password);

            // Sanitize user input to prevent XSS and injection attacks
            const sanitizedData = this.sanitizeUserData(userData);

            // Verify tenant exists and is active
            const tenant = await this.tenantManager.getTenant(tenantId);
            if (!tenant || tenant.status !== 'active') {
                throw new Error('Invalid or inactive tenant');
            }

            // Check user limits for tenant
            await this.checkUserLimits(tenantId);

            // Check if user already exists in tenant
            const existingUser = await this.getUserByEmail(sanitizedData.email, tenantId);
            if (existingUser) {
                throw new Error('User with this email already exists in this tenant');
            }

            // Create user in Supabase Auth
            const { data, error } = await this.supabaseClient.auth.admin.createUser({
                email: sanitizedData.email,
                password,
                email_confirm: false,
                user_metadata: {
                    tenant_id: tenantId,
                    department: sanitizedData.department,
                    location: sanitizedData.location,
                    phone: sanitizedData.phone,
                    job_title: sanitizedData.jobTitle,
                    created_by: createdBy,
                    created_via: 'tenant_admin'
                }
            });

            if (error) {
                throw new Error(`Failed to create user: ${error.message}`);
            }

            // Create user profile in tenant
            const userProfile = await this.supabaseClient.from('user_profiles').insert({
                id: data.user.id,
                tenant_id: tenantId,
                email: sanitizedData.email,
                name: sanitizedData.name,
                department: sanitizedData.department,
                location: sanitizedData.location,
                phone: sanitizedData.phone,
                job_title: sanitizedData.jobTitle,
                status: 'pending', // Requires email verification
                is_tenant_admin: false,
                created_by: createdBy,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }).select().single();

            if (userProfile.error) {
                throw new Error(`Failed to create user profile: ${userProfile.error.message}`);
            }

            // Assign roles to user
            const assignedRoles = [];
            for (const roleId of roleIds) {
                try {
                    const roleAssignment = await this.rbacManager.assignRole(
                        data.user.id,
                        roleId,
                        tenantId,
                        createdBy
                    );
                    assignedRoles.push(roleAssignment);
                } catch (error) {
                    console.warn(`Failed to assign role ${roleId}:`, error.message);
                }
            }

            // Send welcome notification
            await this.sendWelcomeNotification(userProfile.data, tenant, assignedRoles);

            // Log user creation
            await this.logUserEvent('user_created', {
                userId: data.user.id,
                tenantId,
                email,
                roles: assignedRoles.map(r => r.role_id),
                createdBy
            });

            // Cache user
            this.userCache.set(`${data.user.id}-${tenantId}`, userProfile.data);

            console.log(`User created successfully: ${email} in tenant ${tenantId}`);
            return {
                ...userProfile.data,
                roles: assignedRoles,
                auth: data.user
            };
        } catch (error) {
            console.error('Error creating user:', error);
            throw error;
        }
    }

    async updateUser(userId, tenantId, updates, requestingUserId) {
        try {
            // Verify user belongs to tenant and requester has permission
            const belongsToTenant = await this.verifyTenantMembership(userId, tenantId);
            if (!belongsToTenant) {
                throw new Error('User does not belong to this tenant');
            }

            const hasPermission = await this.rbacManager.hasPermission(
                requestingUserId,
                this.rbacManager.PERMISSIONS.USER_UPDATE,
                tenantId
            );

            if (!hasPermission) {
                throw new Error('Insufficient permissions to update user');
            }

            // Filter allowed updates
            const allowedUpdates = {};
            const {
                name,
                department,
                location,
                phone,
                jobTitle,
                status
            } = updates;

            if (name) allowedUpdates.name = name;
            if (department) allowedUpdates.department = department;
            if (location) allowedUpdates.location = location;
            if (phone) allowedUpdates.phone = phone;
            if (jobTitle) allowedUpdates.job_title = jobTitle;
            if (status) allowedUpdates.status = status;

            allowedUpdates.updated_at = new Date().toISOString();

            const user = await this.supabaseClient.from('user_profiles')
                .update(allowedUpdates)
                .eq('id', userId)
                .eq('tenant_id', tenantId)
                .select()
                .single();

            if (user.error) {
                throw new Error(`Failed to update user: ${user.error.message}`);
            }

            // Update cache
            const cacheKey = `${userId}-${tenantId}`;
            if (this.userCache.has(cacheKey)) {
                this.userCache.set(cacheKey, {
                    ...this.userCache.get(cacheKey),
                    ...allowedUpdates
                });
            }

            // Log user update
            await this.logUserEvent('user_updated', {
                userId,
                tenantId,
                updates: Object.keys(allowedUpdates),
                updatedBy: requestingUserId
            });

            return user.data;
        } catch (error) {
            console.error('Error updating user:', error);
            throw error;
        }
    }

    async deleteUser(userId, tenantId, requestingUserId) {
        try {
            // Verify permissions
            const hasPermission = await this.rbacManager.hasPermission(
                requestingUserId,
                this.rbacManager.PERMISSIONS.USER_DELETE,
                tenantId
            );

            if (!hasPermission) {
                throw new Error('Insufficient permissions to delete user');
            }

            // Soft delete with audit trail
            const result = await this.supabaseClient.from('user_profiles')
                .update({
                    status: 'deleted',
                    deleted_at: new Date().toISOString(),
                    deleted_by: requestingUserId,
                    updated_at: new Date().toISOString()
                })
                .eq('id', userId)
                .eq('tenant_id', tenantId);

            if (result.error) {
                throw new Error(`Failed to delete user: ${result.error.message}`);
            }

            // Remove user roles
            await this.supabaseClient.from('user_roles')
                .delete()
                .eq('user_id', userId)
                .eq('tenant_id', tenantId);

            // Remove from cache
            this.userCache.delete(`${userId}-${tenantId}`);

            // Log user deletion
            await this.logUserEvent('user_deleted', {
                userId,
                tenantId,
                deletedBy: requestingUserId
            });

            console.log(`User deleted successfully: ${userId} from tenant ${tenantId}`);
            return true;
        } catch (error) {
            console.error('Error deleting user:', error);
            throw error;
        }
    }

    async getTenantUsers(tenantId, filters = {}) {
        try {
            let query = this.supabaseClient.from('user_profiles')
                .select(`
                    *,
                    user_roles!inner(
                        role_id,
                        roles!inner(
                            id,
                            name,
                            description,
                            level,
                            permissions
                        )
                    )
                `)
                .eq('tenant_id', tenantId);

            // Apply filters
            if (filters.status) {
                query = query.eq('status', filters.status);
            } else {
                query = query.in('status', ['active', 'pending']); // Exclude deleted users by default
            }

            if (filters.role) {
                query = query.eq('user_roles.role_id', filters.role);
            }

            if (filters.department) {
                query = query.eq('department', filters.department);
            }

            if (filters.location) {
                query = query.eq('location', filters.location);
            }

            if (filters.search) {
                query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
            }

            // Apply ordering
            const orderBy = filters.orderBy || 'created_at';
            const orderDirection = filters.orderDirection || { ascending: false };
            query = query.order(orderBy, orderDirection);

            const users = await query;

            if (users.error) {
                throw new Error(`Failed to fetch users: ${users.error.message}`);
            }

            // Cache users
            users.data.forEach(user => {
                this.userCache.set(`${user.id}-${tenantId}`, user);
            });

            return users.data;
        } catch (error) {
            console.error('Error fetching tenant users:', error);
            throw error;
        }
    }

    async getUser(userId, tenantId) {
        try {
            const cacheKey = `${userId}-${tenantId}`;
            
            // Check cache first
            if (this.userCache.has(cacheKey)) {
                return this.userCache.get(cacheKey);
            }

            const user = await this.supabaseClient.from('user_profiles')
                .select(`
                    *,
                    user_roles!inner(
                        role_id,
                        assigned_at,
                        roles!inner(
                            id,
                            name,
                            description,
                            level,
                            permissions
                        )
                    )
                `)
                .eq('id', userId)
                .eq('tenant_id', tenantId)
                .single();

            if (user.error) {
                return null;
            }

            // Cache user
            this.userCache.set(cacheKey, user.data);

            return user.data;
        } catch (error) {
            console.error('Error fetching user:', error);
            return null;
        }
    }

    async getUserByEmail(email, tenantId) {
        try {
            const user = await this.supabaseClient.from('user_profiles')
                .select('*')
                .eq('email', email)
                .eq('tenant_id', tenantId)
                .single();

            return user.data || null;
        } catch (error) {
            console.error('Error fetching user by email:', error);
            return null;
        }
    }

    async assignRoles(userId, roleIds, tenantId, assignedBy) {
        try {
            // Verify permissions
            const hasPermission = await this.rbacManager.hasPermission(
                assignedBy,
                this.rbacManager.PERMISSIONS.USER_ASSIGN_ROLES,
                tenantId
            );

            if (!hasPermission) {
                throw new Error('Insufficient permissions to assign roles');
            }

            const assignments = [];
            for (const roleId of roleIds) {
                try {
                    const assignment = await this.rbacManager.assignRole(
                        userId,
                        roleId,
                        tenantId,
                        assignedBy
                    );
                    assignments.push(assignment);
                } catch (error) {
                    console.warn(`Failed to assign role ${roleId}:`, error.message);
                }
            }

            // Log role assignments
            await this.logUserEvent('roles_assigned', {
                userId,
                tenantId,
                roleIds,
                assignedBy
            });

            return assignments;
        } catch (error) {
            console.error('Error assigning roles:', error);
            throw error;
        }
    }

    async removeRoles(userId, roleIds, tenantId, removedBy) {
        try {
            // Verify permissions
            const hasPermission = await this.rbacManager.hasPermission(
                removedBy,
                this.rbacManager.PERMISSIONS.USER_ASSIGN_ROLES,
                tenantId
            );

            if (!hasPermission) {
                throw new Error('Insufficient permissions to remove roles');
            }

            const removals = [];
            for (const roleId of roleIds) {
                try {
                    const removed = await this.rbacManager.removeRole(userId, roleId, tenantId);
                    if (removed) {
                        removals.push(roleId);
                    }
                } catch (error) {
                    console.warn(`Failed to remove role ${roleId}:`, error.message);
                }
            }

            // Log role removals
            await this.logUserEvent('roles_removed', {
                userId,
                tenantId,
                roleIds: removals,
                removedBy
            });

            return removals;
        } catch (error) {
            console.error('Error removing roles:', error);
            throw error;
        }
    }

    async activateUser(userId, tenantId, activatedBy) {
        try {
            const hasPermission = await this.rbacManager.hasPermission(
                activatedBy,
                this.rbacManager.PERMISSIONS.USER_UPDATE,
                tenantId
            );

            if (!hasPermission) {
                throw new Error('Insufficient permissions to activate user');
            }

            const result = await this.supabaseClient.from('user_profiles')
                .update({
                    status: 'active',
                    activated_at: new Date().toISOString(),
                    activated_by: activatedBy,
                    updated_at: new Date().toISOString()
                })
                .eq('id', userId)
                .eq('tenant_id', tenantId);

            if (result.error) {
                throw new Error(`Failed to activate user: ${result.error.message}`);
            }

            // Update cache
            const cacheKey = `${userId}-${tenantId}`;
            if (this.userCache.has(cacheKey)) {
                const user = this.userCache.get(cacheKey);
                user.status = 'active';
                user.activated_at = new Date().toISOString();
                user.activated_by = activatedBy;
                this.userCache.set(cacheKey, user);
            }

            await this.logUserEvent('user_activated', {
                userId,
                tenantId,
                activatedBy
            });

            return result.data;
        } catch (error) {
            console.error('Error activating user:', error);
            throw error;
        }
    }

    async deactivateUser(userId, tenantId, deactivatedBy) {
        try {
            // Verify permissions
            const hasPermission = await this.rbacManager.hasPermission(
                deactivatedBy,
                this.rbacManager.PERMISSIONS.USER_UPDATE,
                tenantId
            );

            if (!hasPermission) {
                throw new Error('Insufficient permissions to deactivate user');
            }

            // Check if user exists and is active
            const user = await this.getUser(userId, tenantId);
            if (!user) {
                throw new Error('User not found');
            }

            if (user.status === 'inactive') {
                throw new Error('User is already inactive');
            }

            // Begin deactivation process
            const deactivationResult = await this.performUserDeactivation(userId, tenantId, deactivatedBy, user);
            
            // Log deactivation
            await this.logUserEvent('user_deactivated', {
                userId,
                tenantId,
                deactivatedBy,
                previousStatus: user.status,
                newStatus: 'inactive',
                deactivationReason: 'admin_action',
                timestamp: new Date().toISOString()
            });

            // Send notification to user
            await this.sendDeactivationNotification(user, deactivatedBy);

            console.log(`User deactivated successfully: ${userId} from tenant ${tenantId}`);
            return deactivationResult;
        } catch (error) {
            console.error('Error deactivating user:', error);
            throw error;
        }
    }

    // Perform the actual deactivation process
    async performUserDeactivation(userId, tenantId, deactivatedBy, user) {
        try {
            // Revoke all active sessions
            await this.revokeUserSessions(userId, tenantId);

            // Remove from all active role assignments
            await this.removeAllUserRoles(userId, tenantId, deactivatedBy);

            // Update user profile to inactive
            const result = await this.supabaseClient.from('user_profiles')
                .update({
                    status: 'inactive',
                    deactivated_at: new Date().toISOString(),
                    deactivated_by: deactivatedBy,
                    deactivation_reason: 'admin_action',
                    updated_at: new Date().toISOString()
                })
                .eq('id', userId)
                .eq('tenant_id', tenantId);

            if (result.error) {
                throw new Error(`Failed to deactivate user: ${result.error.message}`);
            }

            // Update cache
            const cacheKey = `${userId}-${tenantId}`;
            if (this.userCache.has(cacheKey)) {
                const cachedUser = this.userCache.get(cacheKey);
                cachedUser.status = 'inactive';
                cachedUser.deactivated_at = new Date().toISOString();
                cachedUser.deactivated_by = deactivatedBy;
                this.userCache.set(cacheKey, cachedUser);
            }

            return result.data;
        } catch (error) {
            console.error('Error performing user deactivation:', error);
            throw error;
        }
    }

    // Revoke all active user sessions
    async revokeUserSessions(userId, tenantId) {
        try {
            // Remove from authentication sessions table
            await this.supabaseClient.from('user_sessions')
                .delete()
                .eq('user_id', userId)
                .eq('tenant_id', tenantId);

            // Remove from refresh tokens table
            await this.supabaseClient.from('refresh_tokens')
                .delete()
                .eq('user_id', userId);

            console.log(`User sessions revoked for user: ${userId}`);
        } catch (error) {
            console.error('Error revoking user sessions:', error);
            // Don't throw error - continue with deactivation
        }
    }

    // Remove all user roles during deactivation
    async removeAllUserRoles(userId, tenantId, removedBy) {
        try {
            // Get all user roles
            const { data: userRoles, error } = await this.supabaseClient
                .from('user_roles')
                .select('*')
                .eq('user_id', userId)
                .eq('tenant_id', tenantId);

            if (error) {
                throw new Error(`Failed to fetch user roles: ${error.message}`);
            }

            // Remove each role assignment
            for (const roleAssignment of userRoles) {
                try {
                    await this.rbacManager.removeRole(userId, roleAssignment.role_id, tenantId);
                    await this.logUserEvent('role_removed_during_deactivation', {
                        userId,
                        tenantId,
                        roleId: roleAssignment.role_id,
                        removedBy,
                        timestamp: new Date().toISOString()
                    });
                } catch (roleError) {
                    console.warn(`Failed to remove role ${roleAssignment.role_id}:`, roleError.message);
                }
            }

            console.log(`All roles removed for user: ${userId}`);
        } catch (error) {
            console.error('Error removing user roles:', error);
            // Don't throw error - continue with deactivation
        }
    }

    // Send deactivation notification to user
    async sendDeactivationNotification(user, deactivatedBy) {
        try {
            const notification = {
                user_id: user.id,
                tenant_id: user.tenant_id,
                title: 'Account Deactivated',
                message: `Your TrustMD account has been deactivated by an administrator. If you believe this is an error, please contact your practice administrator.`,
                type: 'account_deactivation',
                priority: 'high',
                read: false,
                created_at: new Date().toISOString()
            };

            await this.supabaseClient.from('notifications').insert(notification);

            // Send email notification (if email service is available)
            if (this.emailService) {
                await this.emailService.sendEmail({
                    to: user.email,
                    subject: 'TrustMD Account Deactivated',
                    template: 'account_deactivated',
                    data: {
                        userName: user.name,
                        deactivatedDate: new Date().toLocaleDateString(),
                        contactEmail: 'support@trustmd.com'
                    }
                });
            }

            console.log(`Deactivation notification sent to user: ${user.email}`);
        } catch (error) {
            console.error('Error sending deactivation notification:', error);
            // Don't throw error - deactivation is complete
        }
    }

    // Reactivate a previously deactivated user
    async reactivateUser(userId, tenantId, reactivatedBy) {
        try {
            // Verify permissions
            const hasPermission = await this.rbacManager.hasPermission(
                reactivatedBy,
                this.rbacManager.PERMISSIONS.USER_UPDATE,
                tenantId
            );

            if (!hasPermission) {
                throw new Error('Insufficient permissions to reactivate user');
            }

            // Check if user exists and is inactive
            const user = await this.getUser(userId, tenantId);
            if (!user) {
                throw new Error('User not found');
            }

            if (user.status !== 'inactive') {
                throw new Error('User is not inactive');
            }

            // Perform reactivation
            const reactivationResult = await this.performUserReactivation(userId, tenantId, reactivatedBy, user);
            
            // Log reactivation
            await this.logUserEvent('user_reactivated', {
                userId,
                tenantId,
                reactivatedBy,
                previousStatus: user.status,
                newStatus: 'active',
                reactivationReason: 'admin_action',
                timestamp: new Date().toISOString()
            });

            // Send notification to user
            await this.sendReactivationNotification(user, reactivatedBy);

            console.log(`User reactivated successfully: ${userId} from tenant ${tenantId}`);
            return reactivationResult;
        } catch (error) {
            console.error('Error reactivating user:', error);
            throw error;
        }
    }

    // Perform the actual reactivation process
    async performUserReactivation(userId, tenantId, reactivatedBy, user) {
        try {
            // Update user profile to active
            const result = await this.supabaseClient.from('user_profiles')
                .update({
                    status: 'active',
                    reactivated_at: new Date().toISOString(),
                    reactivated_by: reactivatedBy,
                    reactivation_reason: 'admin_action',
                    deactivated_at: null,
                    deactivated_by: null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', userId)
                .eq('tenant_id', tenantId);

            if (result.error) {
                throw new Error(`Failed to reactivate user: ${result.error.message}`);
            }

            // Update cache
            const cacheKey = `${userId}-${tenantId}`;
            if (this.userCache.has(cacheKey)) {
                const cachedUser = this.userCache.get(cacheKey);
                cachedUser.status = 'active';
                cachedUser.reactivated_at = new Date().toISOString();
                cachedUser.reactivated_by = reactivatedBy;
                cachedUser.deactivated_at = null;
                cachedUser.deactivated_by = null;
                this.userCache.set(cacheKey, cachedUser);
            }

            return result.data;
        } catch (error) {
            console.error('Error performing user reactivation:', error);
            throw error;
        }
    }

    // Send reactivation notification to user
    async sendReactivationNotification(user, reactivatedBy) {
        try {
            const notification = {
                user_id: user.id,
                tenant_id: user.tenant_id,
                title: 'Account Reactivated',
                message: `Your TrustMD account has been reactivated by an administrator. You can now log in and access your account.`,
                type: 'account_reactivation',
                priority: 'medium',
                read: false,
                created_at: new Date().toISOString()
            };

            await this.supabaseClient.from('notifications').insert(notification);

            // Send email notification (if email service is available)
            if (this.emailService) {
                await this.emailService.sendEmail({
                    to: user.email,
                    subject: 'TrustMD Account Reactivated',
                    template: 'account_reactivated',
                    data: {
                        userName: user.name,
                        reactivatedDate: new Date().toLocaleDateString(),
                        loginUrl: 'https://app.trustmd.com/login'
                    }
                });
            }

            console.log(`Reactivation notification sent to user: ${user.email}`);
        } catch (error) {
            console.error('Error sending reactivation notification:', error);
            // Don't throw error - reactivation is complete
        }
    }

    async verifyTenantMembership(userId, tenantId) {
        try {
            const user = await this.supabaseClient.from('user_profiles')
                .select('id')
                .eq('id', userId)
                .eq('tenant_id', tenantId)
                .single();

            return user.data !== null;
        } catch (error) {
            console.error('Error verifying tenant membership:', error);
            return false;
        }
    }

    async checkUserLimits(tenantId) {
        try {
            // Check rate limiting for user creation attempts
            await this.checkUserCreationRate(tenantId);

            const tenant = await this.tenantManager.getTenant(tenantId);
            if (!tenant) return;

            const planLimits = this.tenantManager.getPlanLimits(tenant.plan);
            
            if (planLimits.maxUsers === -1) return; // Unlimited users

            const currentUsers = await this.supabaseClient.from('user_profiles')
                .select('count', { count: 'exact' })
                .eq('tenant_id', tenantId)
                .in('status', ['active', 'pending']);

            const userCount = currentUsers.data?.[0]?.count || 0;

            if (userCount >= planLimits.maxUsers) {
                throw new Error(`User limit reached for ${tenant.plan} plan (${planLimits.maxUsers})`);
            }
        } catch (error) {
            console.error('Error checking user limits:', error);
        }
    }

    // Rate limiting for user creation to prevent enumeration attacks
    async checkUserCreationRate(tenantId, createdBy = null) {
        try {
            const rateLimitKey = `user_creation:${tenantId}:${createdBy || 'anonymous'}`;
            const windowMs = 3600000; // 1 hour window
            const maxAttempts = 10; // Maximum 10 user creations per hour

            // Check if rate limiting table exists, create if not
            const { data: rateLimitData, error: rateLimitError } = await this.supabaseClient
                .from('rate_limits')
                .select('attempts, last_attempt, window_start')
                .eq('key', rateLimitKey)
                .single();

            if (rateLimitError && rateLimitError.code === 'PGRST116') {
                // Table doesn't exist, create it
                await this.supabaseClient.from('rate_limits').insert({
                    key: rateLimitKey,
                    attempts: 1,
                    last_attempt: new Date().toISOString(),
                    window_start: new Date().toISOString()
                });
                return;
            }

            const now = new Date();
            const lastAttempt = new Date(rateLimitData?.last_attempt || 0);
            const windowStart = new Date(rateLimitData?.window_start || 0);
            const currentWindowStart = new Date(now.getTime() - (now.getTime() % windowMs));

            // Reset counter if window has expired
            let attempts = rateLimitData?.attempts || 0;
            if (currentWindowStart > windowStart) {
                attempts = 1;
            } else {
                attempts = (rateLimitData?.attempts || 0) + 1;
            }

            // Update rate limit record
            await this.supabaseClient.from('rate_limits')
                .upsert({
                    key: rateLimitKey,
                    attempts,
                    last_attempt: now.toISOString(),
                    window_start: currentWindowStart.toISOString()
                })
                .eq('key', rateLimitKey);

            // Check if rate limit exceeded
            if (attempts > maxAttempts) {
                throw new Error(`Rate limit exceeded. Maximum ${maxAttempts} user creation attempts per ${windowMs / 3600000} hour(s). Please try again later.`);
            }

        } catch (error) {
            console.error('Error checking user creation rate:', error);
            // Don't throw error for rate limiting to avoid exposing system internals
            if (error.message.includes('Rate limit exceeded')) {
                throw error;
            }
        }
    }

    async sendWelcomeNotification(user, tenant, roles) {
        try {
            const notification = {
                user_id: user.id,
                tenant_id: tenant.id,
                title: 'Welcome to TrustMD',
                message: `Your account has been created for ${tenant.name}. You have been assigned ${roles.length} role(s).`,
                type: 'welcome',
                priority: 'medium',
                read: false,
                created_at: new Date().toISOString()
            };

            await this.supabaseClient.from('notifications').insert(notification);
        } catch (error) {
            console.error('Error sending welcome notification:', error);
        }
    }

    async logUserEvent(action, eventData) {
        try {
            const auditLog = {
                user_id: eventData.userId || null,
                tenant_id: eventData.tenantId,
                action,
                resource: 'user',
                resource_id: eventData.userId,
                details: eventData,
                timestamp: new Date().toISOString()
            };

            await this.supabaseClient.from('audit_logs').insert(auditLog);
        } catch (error) {
            console.error('Error logging user event:', error);
        }
    }

    async getUserStats(tenantId, filters = {}) {
        try {
            const [
                totalUsers,
                activeUsers,
                pendingUsers,
                inactiveUsers,
                recentLogins
            ] = await Promise.all([
                this.supabaseClient.from('user_profiles')
                    .select('count', { count: 'exact' })
                    .eq('tenant_id', tenantId),
                this.supabaseClient.from('user_profiles')
                    .select('count', { count: 'exact' })
                    .eq('tenant_id', tenantId)
                    .eq('status', 'active'),
                this.supabaseClient.from('user_profiles')
                    .select('count', { count: 'exact' })
                    .eq('tenant_id', tenantId)
                    .eq('status', 'pending'),
                this.supabaseClient.from('user_profiles')
                    .select('count', { count: 'exact' })
                    .eq('tenant_id', tenantId)
                    .eq('status', 'inactive'),
                this.supabaseClient.from('audit_logs')
                    .select('count', { count: 'exact' })
                    .eq('tenant_id', tenantId)
                    .eq('action', 'user_login')
                    .gte('timestamp', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
            ]);

            const stats = {
                tenantId,
                total: totalUsers.data?.[0]?.count || 0,
                active: activeUsers.data?.[0]?.count || 0,
                pending: pendingUsers.data?.[0]?.count || 0,
                inactive: inactiveUsers.data?.[0]?.count || 0,
                recentLogins: recentLogins.data?.[0]?.count || 0,
                lastUpdated: new Date().toISOString()
            };

            return stats;
        } catch (error) {
            console.error('Error fetching user stats:', error);
            throw error;
        }
    }

    // Cache management
    clearCache() {
        this.userCache.clear();
    }

    // Bulk operations
    async bulkCreateUsers(usersData, tenantId, createdBy) {
        try {
            // Verify permissions
            const hasPermission = await this.rbacManager.hasPermission(
                createdBy,
                this.rbacManager.PERMISSIONS.USER_CREATE,
                tenantId
            );

            if (!hasPermission) {
                throw new Error('Insufficient permissions to create users');
            }

            // Verify tenant exists and is active
            const tenant = await this.tenantManager.getTenant(tenantId);
            if (!tenant || tenant.status !== 'active') {
                throw new Error('Invalid or inactive tenant');
            }

            // Check tenant user limits
            await this.checkUserLimits(tenantId);

            const results = [];
            const errors = [];
            const createdUsers = [];

            // Process users in batches to avoid overwhelming the system
            const batchSize = 10;
            for (let i = 0; i < usersData.length; i += batchSize) {
                const batch = usersData.slice(i, i + batchSize);
                
                for (const userData of batch) {
                    try {
                        // Validate and sanitize user data
                        const sanitizedData = this.sanitizeUserData(userData);
                        
                        // Check if user already exists
                        const existingUser = await this.getUserByEmail(sanitizedData.email, tenantId);
                        if (existingUser) {
                            errors.push({
                                user: sanitizedData.email,
                                error: 'User with this email already exists in this tenant'
                            });
                            continue;
                        }

                        // Create user with enhanced error handling
                        const userResult = await this.createUserInternal(sanitizedData, tenantId, createdBy);
                        
                        if (userResult.success) {
                            createdUsers.push(userResult.user);
                            results.push({ 
                                success: true, 
                                user: userResult.user,
                                email: sanitizedData.email 
                            });
                        } else {
                            errors.push({
                                user: sanitizedData.email,
                                error: userResult.error
                            });
                            results.push({ 
                                success: false, 
                                email: sanitizedData.email,
                                error: userResult.error 
                            });
                        }
                    } catch (error) {
                        errors.push({
                            user: userData.email || 'unknown',
                            error: error.message
                        });
                        results.push({ 
                            success: false, 
                            email: userData.email || 'unknown',
                            error: error.message 
                        });
                    }
                }

                // Small delay between batches to prevent rate limiting
                if (i + batchSize < usersData.length) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }

            // Log bulk operation
            await this.logUserEvent('bulk_users_created', {
                tenantId,
                createdBy,
                totalUsers: usersData.length,
                successfulUsers: createdUsers.length,
                failedUsers: errors.length,
                timestamp: new Date().toISOString()
            });

            console.log(`Bulk user creation completed: ${createdUsers.length}/${usersData.length} successful`);

            return {
                success: errors.length === 0,
                results,
                createdUsers,
                errors,
                summary: {
                    total: usersData.length,
                    successful: createdUsers.length,
                    failed: errors.length
                }
            };
        } catch (error) {
            console.error('Error in bulk user creation:', error);
            throw error;
        }
    }

    // Internal user creation method for bulk operations
    async createUserInternal(userData, tenantId, createdBy) {
        try {
            // Validate password strength
            this.validatePasswordStrength(userData.password);

            // Create user in Supabase Auth
            const { data, error } = await this.supabaseClient.auth.admin.createUser({
                email: userData.email,
                password: userData.password,
                email_confirm: false,
                user_metadata: {
                    tenant_id: tenantId,
                    department: userData.department,
                    location: userData.location,
                    phone: userData.phone,
                    job_title: userData.jobTitle,
                    created_by: createdBy,
                    created_via: 'bulk_import'
                }
            });

            if (error) {
                return { success: false, error: `Failed to create user: ${error.message}` };
            }

            // Create user profile in tenant
            const userProfile = await this.supabaseClient.from('user_profiles').insert({
                id: data.user.id,
                tenant_id: tenantId,
                email: userData.email,
                name: userData.name,
                department: userData.department,
                location: userData.location,
                phone: userData.phone,
                job_title: userData.jobTitle,
                status: 'pending',
                is_tenant_admin: false,
                created_by: createdBy,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }).select().single();

            if (userProfile.error) {
                return { success: false, error: `Failed to create user profile: ${userProfile.error.message}` };
            }

            return { 
                success: true, 
                user: {
                    id: data.user.id,
                    email: userData.email,
                    name: userData.name,
                    status: 'pending'
                }
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Bulk update users
    async bulkUpdateUsers(updates, tenantId, requestingUserId) {
        try {
            // Verify permissions
            const hasPermission = await this.rbacManager.hasPermission(
                requestingUserId,
                this.rbacManager.PERMISSIONS.USER_UPDATE,
                tenantId
            );

            if (!hasPermission) {
                throw new Error('Insufficient permissions to update users');
            }

            const results = [];
            const errors = [];
            const updatedUsers = [];

            for (const update of updates) {
                try {
                    // Validate update data
                    const sanitizedUpdate = this.sanitizeUserData(update.updates);
                    
                    // Update user profile
                    const result = await this.updateUser(update.userId, tenantId, sanitizedUpdate, requestingUserId);
                    
                    if (result) {
                        updatedUsers.push({ userId: update.userId, ...result });
                        results.push({ 
                            success: true, 
                            userId: update.userId,
                            updated: result 
                        });
                    } else {
                        errors.push({
                            userId: update.userId,
                            error: 'Failed to update user'
                        });
                        results.push({ 
                            success: false, 
                            userId: update.userId,
                            error: 'Failed to update user' 
                        });
                    }
                } catch (error) {
                    errors.push({
                        userId: update.userId,
                        error: error.message
                    });
                    results.push({ 
                        success: false, 
                        userId: update.userId,
                        error: error.message 
                    });
                }
            }

            // Log bulk operation
            await this.logUserEvent('bulk_users_updated', {
                tenantId,
                requestingUserId,
                totalUpdates: updates.length,
                successfulUpdates: updatedUsers.length,
                failedUpdates: errors.length,
                timestamp: new Date().toISOString()
            });

            console.log(`Bulk user update completed: ${updatedUsers.length}/${updates.length} successful`);

            return {
                success: errors.length === 0,
                results,
                updatedUsers,
                errors,
                summary: {
                    total: updates.length,
                    successful: updatedUsers.length,
                    failed: errors.length
                }
            };
        } catch (error) {
            console.error('Error in bulk user update:', error);
            throw error;
        }
    }

    // Bulk deactivate users
    async bulkDeactivateUsers(userIds, tenantId, deactivatedBy) {
        try {
            // Verify permissions
            const hasPermission = await this.rbacManager.hasPermission(
                deactivatedBy,
                this.rbacManager.PERMISSIONS.USER_UPDATE,
                tenantId
            );

            if (!hasPermission) {
                throw new Error('Insufficient permissions to deactivate users');
            }

            const results = [];
            const errors = [];
            const deactivatedUsers = [];

            for (const userId of userIds) {
                try {
                    // Deactivate user
                    await this.deactivateUser(userId, tenantId, deactivatedBy);
                    
                    deactivatedUsers.push(userId);
                    results.push({ 
                        success: true, 
                        userId,
                        deactivated: true 
                    });
                } catch (error) {
                    errors.push({
                        userId,
                        error: error.message
                    });
                    results.push({ 
                        success: false, 
                        userId,
                        error: error.message 
                    });
                }
            }

            // Log bulk operation
            await this.logUserEvent('bulk_users_deactivated', {
                tenantId,
                deactivatedBy,
                totalUsers: userIds.length,
                successfulDeactivations: deactivatedUsers.length,
                failedDeactivations: errors.length,
                timestamp: new Date().toISOString()
            });

            console.log(`Bulk user deactivation completed: ${deactivatedUsers.length}/${userIds.length} successful`);

            return {
                success: errors.length === 0,
                results,
                deactivatedUsers,
                errors,
                summary: {
                    total: userIds.length,
                    successful: deactivatedUsers.length,
                    failed: errors.length
                }
            };
        } catch (error) {
            console.error('Error in bulk user deactivation:', error);
            throw error;
        }
    }

    // Bulk assign roles
    async bulkAssignRoles(assignments, tenantId, assignedBy) {
        try {
            // Verify permissions
            const hasPermission = await this.rbacManager.hasPermission(
                assignedBy,
                this.rbacManager.PERMISSIONS.USER_ASSIGN_ROLES,
                tenantId
            );

            if (!hasPermission) {
                throw new Error('Insufficient permissions to assign roles');
            }

            const results = [];
            const errors = [];
            const assignedRoles = [];

            for (const assignment of assignments) {
                try {
                    // Assign role to user
                    const roleAssignment = await this.rbacManager.assignRole(
                        assignment.userId,
                        assignment.roleId,
                        tenantId,
                        assignedBy
                    );
                    
                    assignedRoles.push({ 
                        userId: assignment.userId, 
                        roleId: assignment.roleId, 
                        assignment: roleAssignment 
                    });
                    results.push({ 
                        success: true, 
                        userId: assignment.userId,
                        roleId: assignment.roleId,
                        assigned: roleAssignment 
                    });
                } catch (error) {
                    errors.push({
                        userId: assignment.userId,
                        roleId: assignment.roleId,
                        error: error.message
                    });
                    results.push({ 
                        success: false, 
                        userId: assignment.userId,
                        roleId: assignment.roleId,
                        error: error.message 
                    });
                }
            }

            // Log bulk operation
            await this.logUserEvent('bulk_roles_assigned', {
                tenantId,
                assignedBy,
                totalAssignments: assignments.length,
                successfulAssignments: assignedRoles.length,
                failedAssignments: errors.length,
                timestamp: new Date().toISOString()
            });

            console.log(`Bulk role assignment completed: ${assignedRoles.length}/${assignments.length} successful`);

            return {
                success: errors.length === 0,
                results,
                assignedRoles,
                errors,
                summary: {
                    total: assignments.length,
                    successful: assignedRoles.length,
                    failed: errors.length
                }
            };
        } catch (error) {
            console.error('Error in bulk role assignment:', error);
            throw error;
        }
    }

    // Validate password strength according to OWASP guidelines
    validatePasswordStrength(password) {
        const minLength = 12;
        const maxLength = 128;
        
        // Check minimum length
        if (password.length < minLength) {
            throw new Error(`Password must be at least ${minLength} characters long`);
        }
        
        // Check maximum length
        if (password.length > maxLength) {
            throw new Error(`Password cannot exceed ${maxLength} characters`);
        }
        
        // Check for character requirements
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
        
        // Check character diversity
        const uniqueChars = new Set(password).size;
        if (uniqueChars < password.length * 0.6) {
            throw new Error('Password must contain more unique characters');
        }
        
        // Check for common patterns
        const commonPatterns = [
            /123456/, /password/i, /qwerty/i, /abc123/i,
            /admin/i, /letmein/i, /welcome/i
        ];
        
        for (const pattern of commonPatterns) {
            if (pattern.test(password)) {
                throw new Error('Password cannot contain common patterns');
            }
        }
        
        // Check for sequential characters
        const sequentialPattern = /(.)\1{2,}/.test(password);
        if (sequentialPattern) {
            throw new Error('Password cannot contain sequential characters');
        }
        
        // Check for keyboard patterns
        const keyboardPatterns = [
            /qwerty/i, /asdf/i, /zxcv/i, /1234/i
        ];
        
        for (const pattern of keyboardPatterns) {
            if (pattern.test(password)) {
                throw new Error('Password cannot contain keyboard patterns');
            }
        }
        
        // Ensure all character types are present
        if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
            throw new Error('Password must contain uppercase letters, lowercase letters, numbers, and special characters');
        }
        
        return true;
    }

    // Sanitize user input to prevent XSS and injection attacks
    sanitizeUserData(userData) {
        const sanitized = { ...userData };
        
        // Sanitize string fields
        const stringFields = ['name', 'department', 'location', 'phone', 'jobTitle'];
        
        for (const field of stringFields) {
            if (sanitized[field]) {
                // Remove HTML tags and encode special characters
                sanitized[field] = this.sanitizeString(sanitized[field]);
            }
        }
        
        // Email needs special handling
        if (sanitized.email) {
            sanitized.email = this.sanitizeEmail(sanitized.email);
        }
        
        return sanitized;
    }

    // Sanitize string input
    sanitizeString(input) {
        if (typeof input !== 'string') return input;
        
        return input
            .trim()
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<[^>]*>/g, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'");
    }

    // Sanitize email input
    sanitizeEmail(email) {
        if (typeof email !== 'string') return email;
        
        return email
            .toLowerCase()
            .trim()
            .replace(/[<>]/g, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '');
    }
}

// Export for use in backend
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UserProvisioning;
} else {
    window.UserProvisioning = UserProvisioning;
}
