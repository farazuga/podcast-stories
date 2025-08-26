# VidPOD Testing Quick Reference

*Fast access guide for running tests and debug commands*

## 📋 Quick Command List

### 🚀 Main Test Commands
```bash
npm test                    # Run complete test suite
npm run test:all           # Same as npm test
npm run test:e2e           # End-to-end browser tests
npm run test:api           # Backend API tests
npm run test:integration   # Integration workflow tests
```

### 👥 Role-Specific Tests
```bash
npm run test:admin         # Admin functionality tests
npm run test:teacher       # Teacher workflow tests
npm run test:student       # Student experience tests
```

### 📂 Feature-Specific Tests
```bash
npm run test:csv           # CSV import/export tests
```

### 🔧 Debug & Verification
```bash
npm run debug:deployment   # Check if changes are deployed
npm run debug:database     # Verify database connection
npm run debug:auth         # Debug authentication issues
npm run verify:all         # Run all verification checks
```

---

## 🎯 How to Access Test Commands

### Method 1: NPM Scripts (Recommended)
```bash
# View all available test scripts
npm run

# Run specific test
npm run test:admin
```

### Method 2: Direct Node Execution
```bash
# Navigate to project directory
cd /path/to/podcast-stories

# Run test directly
node testing/e2e/comprehensive-test-suite.js
node testing/debug/check-deployment.js
```

### Method 3: Package.json Reference
```bash
# View all scripts defined in package.json
cat package.json | grep -A 20 "scripts"
```

---

## 📍 Where to Find Test Files

### Directory Structure
```
testing/
├── e2e/              # Browser automation tests
├── api/              # Backend API tests  
├── integration/      # Full workflow tests
├── debug/            # Debug & troubleshooting tools
├── data/             # Test data files
├── archived/         # Legacy test files
└── utils/            # Test helper utilities
```

### Key Test Files
- **Complete Testing**: `testing/e2e/comprehensive-test-suite.js`
- **Admin Tests**: `testing/e2e/comprehensive-admin-test.js`
- **API Tests**: `testing/api/test-all-fixes-final.js`
- **Debug Tools**: `testing/debug/check-deployment.js`

---

## 🚀 Quick Start Guide

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Full Test Suite
```bash
npm test
```

### 3. Debug Common Issues
```bash
# Check if your changes are deployed
npm run debug:deployment

# Verify database connection
npm run debug:database

# Test authentication
npm run debug:auth
```

### 4. Test Specific Features
```bash
# Test admin functionality
npm run test:admin

# Test CSV import
npm run test:csv

# Test API endpoints
npm run test:api
```

---

## ⚡ Most Common Commands

| Task | Command | Description |
|------|---------|-------------|
| **Full Test** | `npm test` | Run all tests |
| **Check Deployment** | `npm run debug:deployment` | Verify changes are live |
| **Test Admin** | `npm run test:admin` | Admin panel testing |
| **Test API** | `npm run test:api` | Backend endpoint testing |
| **Debug Auth** | `npm run debug:auth` | Fix login issues |

---

## 🔍 Finding Specific Tests

### By Feature Area
```bash
# Navigation tests
find testing/ -name "*nav*" -type f

# Authentication tests  
find testing/ -name "*auth*" -o -name "*login*" -type f

# CSV tests
find testing/ -name "*csv*" -type f

# Admin tests
find testing/ -name "*admin*" -type f
```

### By Test Type
```bash
# All E2E tests
ls testing/e2e/

# All Debug tools
ls testing/debug/

# All API tests
ls testing/api/
```

---

## 📖 Detailed Documentation

For comprehensive testing information, see:
- **[TESTING_GUIDE.md](./TESTING_GUIDE.md)** - Complete testing documentation
- **[testing/README.md](./testing/README.md)** - Testing directory overview
- **Package.json** - All available npm scripts

---

## 🆘 Troubleshooting

### Test Won't Run?
1. Check if you're in the project directory
2. Ensure dependencies are installed: `npm install`
3. Verify the script exists: `npm run`

### Can't Find a Test?
1. Check the testing directory structure: `ls testing/`
2. Search for test files: `find testing/ -name "*keyword*"`
3. Review the TESTING_GUIDE.md for complete list

### Need Help?
1. View all available scripts: `npm run`
2. Check the comprehensive guide: `cat TESTING_GUIDE.md`
3. Look at debug tools: `ls testing/debug/`

---

*Quick Reference - Last Updated: January 2025*