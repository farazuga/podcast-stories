#!/bin/bash

echo "🧪 VidPOD Automated Testing Suite"
echo "================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if dependencies are installed
check_dependencies() {
    print_status "Checking dependencies..."
    
    cd backend
    if [ ! -d "node_modules" ]; then
        print_warning "Installing backend dependencies..."
        npm install
    fi
    
    # Install test dependencies if not present
    if ! npm list jest >/dev/null 2>&1; then
        print_warning "Installing test dependencies..."
        npm install --save-dev jest supertest @playwright/test
    fi
    
    cd ..
}

# Run API tests
run_api_tests() {
    print_status "Running API tests..."
    cd backend
    
    export NODE_ENV=test
    export JWT_SECRET=test-secret-key
    
    npm test
    API_TEST_EXIT_CODE=$?
    
    cd ..
    return $API_TEST_EXIT_CODE
}

# Run E2E tests
run_e2e_tests() {
    print_status "Running E2E tests..."
    
    # Install Playwright browsers if not present
    npx playwright install --with-deps
    
    npx playwright test
    E2E_TEST_EXIT_CODE=$?
    
    return $E2E_TEST_EXIT_CODE
}

# Run all tests
run_all_tests() {
    print_status "Starting full test suite..."
    
    check_dependencies
    
    # Run API tests
    if run_api_tests; then
        print_status "✅ API tests passed"
    else
        print_error "❌ API tests failed"
        exit 1
    fi
    
    # Run E2E tests
    if run_e2e_tests; then
        print_status "✅ E2E tests passed"
    else
        print_error "❌ E2E tests failed"
        exit 1
    fi
    
    print_status "🎉 All tests passed!"
}

# Parse command line arguments
case "$1" in
    "api")
        check_dependencies
        run_api_tests
        ;;
    "e2e")
        check_dependencies
        run_e2e_tests
        ;;
    "install")
        check_dependencies
        print_status "Dependencies installed"
        ;;
    *)
        run_all_tests
        ;;
esac