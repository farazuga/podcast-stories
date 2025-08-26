# Testing Documentation

This directory contains VidPOD testing documentation.

## Testing Framework

VidPOD uses **Puppeteer** as the primary end-to-end testing framework. All active test suites are based on Puppeteer for consistent browser automation and UI testing.

**Note**: Any Playwright artifacts found in the root `tests/` directory are legacy or experimental and are not part of the standard test suite. The canonical testing approach uses Puppeteer-based tests located in the `testing/` directory structure.