# TrustMD Deployment Guide

**Complete deployment guide for TrustMD Medical Compliance Logbook**

## 🚀 Quick Deployment

### **One-Click Deployment**
```bash
# Deploy to Vercel (recommended)
npm run deploy:vercel

# Deploy to Netlify
npm run deploy:netlify

# Deploy to AWS
npm run deploy:aws
```

---

## 🏗️ Deployment Architecture

### **Production Stack**
- **Frontend**: Vercel/Netlify (Static Hosting)
- **Backend**: Vercel Serverless Functions
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage
- **CDN**: Vercel Edge Network
- **DNS**: Cloudflare (optional)

### **Security & Performance**
- **HTTPS**: Automatic SSL certificates
- **CDN**: Global content delivery
- **Rate Limiting**: API protection
- **Monitoring**: Real-time error tracking
- **Backups**: Automated database backups

---

## 📋 Prerequisites

### **Domain & SSL**
- Custom domain name (optional)
- SSL certificate (auto-provided)
- DNS configuration access

### **Third-Party Services**
- **Supabase** account (database)
- **Vercel** account (hosting)
- **GitHub** account (CI/CD)

### **Environment Variables**
All required environment variables must be configured:

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Application Configuration
NODE_ENV=production
SESSION_TIMEOUT=1800000
MAX_CONCURRENT_SESSIONS=5
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX=100

# Security Configuration
JWT_SECRET=your_jwt_secret
ENCRYPTION_KEY=your_encryption_key
CORS_ORIGIN=https://your-domain.com

# Monitoring Configuration
SENTRY_DSN=your_sentry_dsn
ANALYTICS_ID=your_analytics_id
```

---

## 🌐 Vercel Deployment (Recommended)

### **1. Install Vercel CLI**
```bash
npm install -g vercel
```

### **2. Login to Vercel**
```bash
vercel login
```

### **3. Configure Project**
```bash
# Link project to Vercel
vercel link

# Configure project settings
vercel --prod
```

### **4. Deploy**
```bash
# Deploy to production
vercel --prod

# Deploy preview
vercel
```

### **5. Environment Variables**
```bash
# Set environment variables
vercel env add SUPABASE_URL
vercel env add SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add JWT_SECRET
vercel env add ENCRYPTION_KEY
```

### **Vercel Configuration**
Create `vercel.json`:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "api-server.js",
      "use": "@vercel/node"
    },
    {
      "src": "sw.js",
      "use": "@vercel/static"
    },
    {
      "src": "**/*",
      "use": "@vercel/static"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api-server.js"
    },
    {
      "src": "/(.*)",
      "dest": "/$1"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  },
  "functions": {
    "api-server.js": {
      "maxDuration": 30
    }
  }
}
```

---

## 🌊 Netlify Deployment

### **1. Install Netlify CLI**
```bash
npm install -g netlify-cli
```

### **2. Login to Netlify**
```bash
netlify login
```

### **3. Initialize Site**
```bash
netlify init
```

### **4. Deploy**
```bash
# Deploy to production
netlify deploy --prod

# Deploy preview
netlify deploy
```

### **5. Environment Variables**
```bash
# Set environment variables
netlify env:set SUPABASE_URL
netlify env:set SUPABASE_ANON_KEY
netlify env:set SUPABASE_SERVICE_ROLE_KEY
```

### **Netlify Configuration**
Create `netlify.toml`:
```toml
[build]
  publish = "dist"
  command = "npm run build"

[build.environment]
  NODE_ENV = "production"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/api-server"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    X-XSS-Protection = "1; mode=block"
    Referrer-Policy = "strict-origin-when-cross-origin"

[functions]
  directory = "netlify/functions"
```

---

## ☁️ AWS Deployment

### **1. Install AWS CLI**
```bash
npm install -g aws-cli
```

### **2. Configure AWS**
```bash
aws configure
```

### **3. S3 Bucket Setup**
```bash
# Create S3 bucket
aws s3 mb s3://trustmd-prod

# Enable static hosting
aws s3 website s3://trustmd-prod --index-document index.html

# Set bucket policy
aws s3api put-bucket-policy --bucket trustmd-prod --policy file://bucket-policy.json
```

### **4. CloudFront Distribution**
```bash
# Create CloudFront distribution
aws cloudfront create-distribution --distribution-config file://cloudfront-config.json
```

### **5. Lambda Functions**
```bash
# Deploy API server as Lambda
aws lambda create-function \
  --function-name trustmd-api \
  --runtime nodejs18.x \
  --handler api-server.handler \
  --zip-file fileb://deployment.zip
```

---

## 🗄️ Database Setup

### **Supabase Production Setup**
```bash
# Create new Supabase project
supabase projects create

# Get connection details
supabase status

# Run migrations
supabase db push

# Enable Row Level Security
supabase db push --include-auth
```

### **Database Configuration**
```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_documents ENABLE ROW LEVEL SECURITY;

-- Create production policies
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Tenants can view own data" ON tenants
  FOR ALL USING (tenant_id = auth.jwt()->> 'tenant_id');
```

---

## 🔒 Security Configuration

### **HTTPS & SSL**
- Automatic SSL certificates (Vercel/Netlify)
- HSTS headers enabled
- Secure cookie configuration

### **CORS Configuration**
```javascript
// Production CORS settings
const corsOptions = {
  origin: ['https://your-domain.com', 'https://www.your-domain.com'],
  credentials: true,
  optionsSuccessStatus: 200
};
```

### **Security Headers**
```javascript
// Production security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

---

## 📊 Monitoring & Logging

### **Error Tracking**
```bash
# Install Sentry
npm install @sentry/node

# Configure Sentry
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV
});
```

### **Performance Monitoring**
```bash
# Install analytics
npm install @vercel/analytics

# Configure analytics
import { Analytics } from '@vercel/analytics/react';

<Analytics />
```

### **Logging**
```javascript
// Production logging
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

---

## 🚀 CI/CD Pipeline

### **GitHub Actions**
Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run tests
        run: npm test
        
      - name: Build
        run: npm run build
        
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
```

---

## 🔧 Environment Management

### **Development Environment**
```bash
# Development deployment
npm run deploy:dev

# Environment variables
NODE_ENV=development
DEBUG=true
LOG_LEVEL=debug
```

### **Staging Environment**
```bash
# Staging deployment
npm run deploy:staging

# Environment variables
NODE_ENV=staging
DEBUG=false
LOG_LEVEL=info
```

### **Production Environment**
```bash
# Production deployment
npm run deploy:prod

# Environment variables
NODE_ENV=production
DEBUG=false
LOG_LEVEL=error
```

---

## 📈 Performance Optimization

### **Frontend Optimization**
```bash
# Build with optimization
npm run build:optimize

# Analyze bundle size
npm run analyze

# Enable compression
npm run build:compress
```

### **Backend Optimization**
```bash
# Enable caching
npm run start:cache

# Optimize database queries
npm run db:optimize

# Monitor performance
npm run monitor
```

### **CDN Configuration**
```javascript
// Cache headers
app.use(express.static('public', {
  maxAge: '1y',
  etag: true,
  lastModified: true
}));
```

---

## 🔄 Rollback Procedures

### **Quick Rollback**
```bash
# Vercel rollback
vercel rollback [deployment-url]

# Netlify rollback
netlify deploy --prod --site-id [site-id] --dir [previous-build]

# Manual rollback
git checkout [previous-commit]
npm run build
npm run deploy:prod
```

### **Database Rollback**
```bash
# Supabase rollback
supabase db reset

# Migration rollback
supabase db push --rollback
```

---

## 📋 Deployment Checklist

### **Pre-Deployment**
- [ ] All tests passing
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Security headers configured
- [ ] SSL certificates valid
- [ ] Backup procedures tested
- [ ] Monitoring configured

### **Post-Deployment**
- [ ] Application accessible
- [ ] API endpoints responding
- [ ] Database connectivity verified
- [ ] Error tracking working
- [ ] Performance metrics collected
- [ ] Security scans passed
- [ ] User acceptance testing

---

## 🆘 Troubleshooting

### **Common Issues**

#### **Build Failures**
```bash
# Clear cache
npm cache clean --force
rm -rf node_modules package-lock.json
npm install

# Check dependencies
npm ls
npm audit
```

#### **Database Connection**
```bash
# Test connection
npm run db:test

# Check credentials
echo $SUPABASE_URL
echo $SUPABASE_ANON_KEY
```

#### **Environment Variables**
```bash
# List environment variables
vercel env ls
netlify env:list

# Test locally
npm run start:prod
```

#### **Performance Issues**
```bash
# Analyze bundle
npm run analyze

# Monitor performance
npm run monitor

# Check logs
vercel logs
netlify logs
```

---

## 📞 Support & Monitoring

### **Monitoring Services**
- **Vercel Analytics**: Performance metrics
- **Sentry**: Error tracking
- **Supabase Dashboard**: Database monitoring
- **Uptime Robot**: Availability monitoring

### **Alert Configuration**
```javascript
// Production alerts
const alerts = {
  errorRate: 0.01, // 1% error rate threshold
  responseTime: 2000, // 2 second response time
  uptime: 0.999, // 99.9% uptime
  diskUsage: 0.8 // 80% disk usage
};
```

### **Emergency Contacts**
- **DevOps**: devops@trustmd.com
- **Security**: security@trustmd.com
- **Support**: support@trustmd.com

---

## 📊 Cost Optimization

### **Hosting Costs**
- **Vercel Pro**: $20/month
- **Supabase Pro**: $25/month
- **Domain**: $12/year
- **Monitoring**: $26/month (Sentry)
- **Total**: ~$83/month

### **Optimization Tips**
- Use CDN caching
- Optimize images
- Minimize JavaScript bundles
- Enable compression
- Monitor usage patterns

---

**Last Updated**: January 15, 2024
**Deployment Version**: v1.0.0
**Node Version**: 18.0.0+
