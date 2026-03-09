# Security Policy

## Supported Versions

We actively support the following versions with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it to us as follows:

1. **Do not** create a public GitHub issue
2. Email security concerns to: [your-email@example.com]
3. Include detailed information about the vulnerability
4. Allow reasonable time for us to respond and fix the issue

## Security Measures

This project implements several security measures:

- **Helmet**: Security headers for Express.js
- **Rate Limiting**: Prevents abuse and DoS attacks
- **Input Validation**: Sanitizes user inputs
- **CORS**: Configurable cross-origin resource sharing
- **Compression**: Reduces attack surface with smaller responses

## Best Practices

When deploying this application:

1. Use HTTPS in production
2. Set strong environment variables
3. Keep dependencies updated
4. Use a reverse proxy (nginx) in production
5. Monitor logs for suspicious activity
6. Regularly backup data

## Responsible Disclosure

We kindly ask that you:

- Give us reasonable time to fix the issue before public disclosure
- Avoid accessing or modifying user data
- Don't perform DoS attacks or degrade service performance
- Don't spam our systems with automated vulnerability scanners

Thank you for helping keep HTML-YuQL and our users safe!