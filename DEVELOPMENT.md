# TrustMD Development Guide

**Complete setup and development guide for TrustMD Medical Compliance Logbook**

## 🚀 Quick Start

### **Prerequisites**
- **Node.js** 12+ (recommended 18+)
- **npm** or **yarn** package manager
- **Git** for version control
- **VS Code** (recommended) with extensions
- **Supabase** account (for database/backend)

### **One-Command Setup**
```bash
# Clone and setup in one command
git clone <repository-url> TrustMD && cd TrustMD && npm install && npm run setup
```

---

## 📋 Detailed Setup

### **1. Clone Repository**
```bash
git clone <repository-url>
cd TrustMD
```

### **2. Install Dependencies**
```bash
# Using npm
npm install

# Using yarn
yarn install

# Using pnpm
pnpm install
```

### **3. Environment Configuration**
```bash
# Copy environment template
cp .env.example .env

# Edit environment variables
nano .env
```

**Required Environment Variables:**
```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Application Configuration
NODE_ENV=development
PORT=3000
SESSION_TIMEOUT=1800000
MAX_CONCURRENT_SESSIONS=5

# Security Configuration
JWT_SECRET=your_jwt_secret_here
ENCRYPTION_KEY=your_encryption_key_here

# Development Configuration
DEBUG=true
LOG_LEVEL=debug
```

### **4. Database Setup**
```bash
# Install Supabase CLI (if not installed)
npm install -g supabase

# Link to your Supabase project
supabase link --project-ref your-project-ref

# Run database migrations
supabase db push

# Seed development data
npm run seed
```

### **5. Start Development Server**
```bash
# Start with hot reload
npm run dev

# Or start without reload
npm start

# Or with debug mode
npm run dev:debug
```

---

## 🏗️ Project Structure

```
TrustMD/
├── README.md                    # Main project documentation
├── package.json                 # Dependencies and scripts
├── .env.example                # Environment template
├── .gitignore                  # Git ignore rules
├── config.js                   # Application configuration
├── script.js                   # Main application logic
├── api-server.js               # REST API endpoints
├── dev-server.js               # Development server
├── manifest.json               # PWA manifest
├── sw.js                      # Service worker
├── compliance-templates/        # State compliance templates
│   ├── state-templates/
│   │   ├── tier1/            # High complexity states
│   │   ├── tier2/            # High complexity states
│   │   ├── tier3/            # Medium complexity states
│   │   └── tier4/            # Standard complexity states
├── config/                     # Configuration files
│   ├── supabase-config.js
│   ├── validation-rules.json
│   └── security-config.json
├── utils/                      # Utility functions
│   ├── cache-manager.js
│   ├── enhanced-rbac-manager.js
│   ├── migration-runner.js
│   └── performance-monitor.js
├── docs/                       # Documentation
│   ├── API.md                  # API documentation
│   ├── DEVELOPMENT.md           # Development guide
│   └── DEPLOYMENT.md          # Deployment guide
├── tests/                      # Test files
├── sample-compliance-report-*.html # Sample reports
└── test-*.html                 # Test files
```

---

## 🛠️ Available Scripts

### **Development Scripts**
```bash
npm start              # Start development server on port 3000
npm run dev            # Start with hot reload
npm run dev:debug      # Start with debug logging
npm run dev:inspect    # Start with Node inspector
```

### **Build Scripts**
```bash
npm run build          # Build for production
npm run build:analyze  # Build with bundle analysis
npm run build:dev      # Build development version
```

### **Test Scripts**
```bash
npm test               # Run all tests
npm run test:backend   # Run backend tests
npm run test:frontend  # Run frontend tests
npm run test:e2e       # Run end-to-end tests
npm run test:watch     # Run tests in watch mode
npm run test:coverage  # Run tests with coverage
```

### **Linting & Formatting**
```bash
npm run lint           # Run ESLint
npm run lint:fix       # Fix linting issues
npm run format         # Format code with Prettier
npm run format:check   # Check code formatting
```

### **Database Scripts**
```bash
npm run db:migrate     # Run database migrations
npm run db:seed        # Seed development data
npm run db:reset       # Reset database
npm run db:backup      # Backup database
```

### **Utility Scripts**
```bash
npm run setup          # Initial project setup
npm run clean          # Clean build artifacts
npm run docs:serve     # Serve documentation locally
npm run analyze        # Analyze bundle size
```

---

## 🔧 Development Workflow

### **1. Feature Development**
```bash
# Create feature branch
git checkout -b feature/new-compliance-feature

# Make changes
# ... develop feature ...

# Run tests
npm test

# Lint code
npm run lint

# Commit changes
git add .
git commit -m "feat: add new compliance feature"

# Push branch
git push origin feature/new-compliance-feature
```

### **2. Code Quality**
```bash
# Run all quality checks
npm run check

# Individual checks
npm run lint          # Check code style
npm run test          # Run tests
npm run build         # Verify build works
```

### **3. Testing**
```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Test with coverage
npm run test:coverage
```

---

## 🧪 Testing Guide

### **Backend Testing**
```bash
# Run backend tests
npm run test:backend

# Test specific file
npm test -- --grep "authentication"

# Run with coverage
npm run test:backend -- --coverage
```

### **Frontend Testing**
```bash
# Run frontend tests
npm run test:frontend

# Run in watch mode
npm run test:frontend -- --watch

# Run specific component
npm test -- --testNamePattern="ComplianceDashboard"
```

### **E2E Testing**
```bash
# Run E2E tests
npm run test:e2e

# Run specific test
npm run test:e2e -- --spec "login.spec.js"

# Run with headed browser
npm run test:e2e -- --headed
```

### **Manual Testing**
```bash
# Open test files in browser
open test-backend.html
open test-phase1-fixes.html
```

---

## 🐛 Debugging

### **Backend Debugging**
```bash
# Start with debug mode
npm run dev:debug

# Use Node inspector
npm run dev:inspect

# Debug specific file
node --inspect-brk script.js
```

### **Frontend Debugging**
```bash
# Start with source maps
npm run dev:debug

# Debug in browser
# Open Chrome DevTools
# Use debugger statements in code
```

### **Database Debugging**
```bash
# Check database connection
npm run db:check

# View database logs
supabase logs

# Access database directly
supabase db shell
```

---

## 📊 Performance Monitoring

### **Development Monitoring**
```bash
# Start with performance monitoring
npm run dev:profile

# Analyze bundle size
npm run analyze

# Monitor memory usage
npm run dev:memory
```

### **Performance Metrics**
- **Response Time**: Target <2s
- **Bundle Size**: Target <1MB
- **Memory Usage**: Target <512MB
- **CPU Usage**: Target <70%

---

## 🔒 Security Development

### **Security Best Practices**
```bash
# Run security audit
npm audit

# Fix security issues
npm audit fix

# Check for vulnerabilities
npm run security:check
```

### **Environment Security**
- Never commit `.env` files
- Use strong secrets in production
- Enable HTTPS in production
- Implement proper CORS policies

### **Code Security**
- Validate all inputs
- Sanitize user data
- Use parameterized queries
- Implement proper authentication

---

## 🚀 Deployment

### **Development Deployment**
```bash
# Build for development
npm run build:dev

# Deploy to staging
npm run deploy:staging

# Deploy to preview
npm run deploy:preview
```

### **Production Deployment**
```bash
# Build for production
npm run build

# Deploy to production
npm run deploy:prod

# Verify deployment
npm run deploy:verify
```

---

## 📝 Code Style Guide

### **JavaScript Standards**
- Use **ES6+** features
- Follow **Airbnb** style guide
- Use **JSDoc** comments
- Implement **error handling**

### **File Naming**
- Use **kebab-case** for files
- Use **PascalCase** for classes
- Use **camelCase** for variables
- Use **UPPER_SNAKE_CASE** for constants

### **Code Organization**
- Group related functions
- Use clear function names
- Implement proper error handling
- Add comprehensive comments

---

## 🔧 VS Code Setup

### **Recommended Extensions**
```json
{
  "recommendations": [
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "ms-vscode.vscode-json",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-node-azure-pack",
    "ms-vscode-remote.remote-containers",
    "ms-vscode.vscode-typescript-next"
  ]
}
```

### **VS Code Settings**
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "emmet.includeLanguages": {
    "javascript": "javascriptreact"
  }
}
```

---

## 📚 Learning Resources

### **Documentation**
- [TrustMD API Documentation](./API.md)
- [Supabase Documentation](https://supabase.com/docs)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

### **Tutorials**
- [Getting Started with TrustMD](https://docs.trustmd.com/getting-started)
- [Building Compliance Features](https://docs.trustmd.com/tutorials/compliance)
- [Security Best Practices](https://docs.trustmd.com/security)

### **Community**
- [TrustMD Discord](https://discord.gg/trustmd)
- [GitHub Discussions](https://github.com/trustmd/trustmd/discussions)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/trustmd)

---

## 🤝 Contributing

### **Pull Request Process**
1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Ensure all tests pass
5. Submit pull request
6. Address review feedback

### **Code Review Checklist**
- [ ] Code follows style guide
- [ ] Tests are included
- [ ] Documentation is updated
- [ ] Security is considered
- [ ] Performance is tested

### **Release Process**
1. Update version numbers
2. Update changelog
3. Create release tag
4. Deploy to production
5. Update documentation

---

## 🆘 Troubleshooting

### **Common Issues**

#### **Port Already in Use**
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 npm start
```

#### **Database Connection Issues**
```bash
# Check Supabase connection
npm run db:check

# Reset database
npm run db:reset

# Check environment variables
echo $SUPABASE_URL
```

#### **Module Not Found**
```bash
# Clear node_modules
rm -rf node_modules package-lock.json
npm install

# Clear npm cache
npm cache clean --force
```

#### **Build Errors**
```bash
# Clean build artifacts
npm run clean

# Rebuild
npm run build

# Check for missing dependencies
npm ls
```

### **Getting Help**
- Check [GitHub Issues](https://github.com/trustmd/trustmd/issues)
- Join [Discord Community](https://discord.gg/trustmd)
- Email [support@trustmd.com](mailto:support@trustmd.com)

---

## 📈 Performance Tips

### **Development Performance**
- Use **SSD** for faster I/O
- Increase **Node.js memory limit**
- Enable **hot module replacement**
- Use **source maps** for debugging

### **Code Performance**
- Implement **lazy loading**
- Use **code splitting**
- Optimize **database queries**
- Enable **caching strategies**

---

**Last Updated**: January 15, 2024
**Node Version**: 18.0.0+
**NPM Version**: 8.0.0+
