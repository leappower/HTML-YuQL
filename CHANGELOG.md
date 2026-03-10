# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Docker containerization with multi-stage build
- Docker Compose for local development
- ESLint configuration for code quality
- EditorConfig for consistent coding style
- GitHub Actions CI/CD pipeline
- Environment variable configuration
- Comprehensive translation testing CLI
- Security enhancements (Helmet, rate limiting)
- Compression middleware
- Health check endpoint
- Modular JavaScript architecture
- Multi-language support (22 languages)

### Fixed
- Translation system bugs and inconsistencies
- JSON file corruption issues
- Language switching functionality
- Missing translation keys
- Language initialization bug where user preferences were overridden on page load
- JavaScript syntax errors and ESLint code quality issues
- Translation completeness issues across all 22 languages
- Placeholder translations in Korean and Arabic for certification and customization sections
- All remaining placeholder translations across all languages using zh-CN as reference

### Changed
- Enhanced server.js with production-ready features
- Improved translation manager with caching and fallbacks
- Modularized main.js for better maintainability

### Security
- Added Helmet for security headers
- Implemented rate limiting
- Added CORS configuration