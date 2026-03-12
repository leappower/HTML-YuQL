# Contributing

Thank you for your interest in contributing to HTML-YuQL! We welcome contributions from everyone.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/html-yuql.git`
3. Install dependencies: `npm install`
4. Create a feature branch: `git checkout -b feature/your-feature-name`

## Development Workflow

1. Make your changes
2. Run tests: `npm test`
3. Run linting: `npm run lint`
4. Build the project: `npm run build`
5. Commit your changes: `git commit -m "Add your commit message"`

## Code Style

- Use ESLint configuration for consistent code style
- Follow the EditorConfig settings
- Use single quotes for strings
- Add semicolons
- Use 2 spaces for indentation

## Testing

- Run the translation tests: `node test-translations-cli.js`
- Ensure all tests pass before submitting a PR
- Add tests for new features

## Pull Request Process

1. Update the CHANGELOG.md file with your changes
2. Ensure your PR description clearly describes the changes
3. Wait for review and address any feedback

## Adding Translations

When adding a new language:

1. Create a new JSON file in `assets/lang/`
2. Use the language code as filename (e.g., `fr.json` for French)
3. Include all required keys from existing translations
4. Test the new language thoroughly
5. Update the CHANGELOG.md

## Docker Development

For local development with Docker:

```bash
docker-compose up
```

This will start the development server with hot reloading.

## Reporting Issues

When reporting bugs, please include:

- Steps to reproduce
- Expected behavior
- Actual behavior
- Browser and OS information
- Node.js version

## License

By contributing to this project, you agree that your contributions will be licensed under the MIT License.