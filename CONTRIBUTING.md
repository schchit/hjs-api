# Contributing Guide

Thank you for your interest in contributing to the HJS project! We welcome all forms of contributions, including but not limited to:

- Bug reports
- Feature suggestions
- Documentation improvements
- Code contributions

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)
- [Contributing Code](#contributing-code)
- [Style Guidelines](#style-guidelines)
- [Development Setup](#development-setup)
- [Pull Request Process](#pull-request-process)
- [Community](#community)

---

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to `conduct@humanjudgment.org`.

---

## Getting Started

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/your-username/hjs-api.git
   cd hjs-api
   ```
3. Set up the development environment (see [Development Setup](#development-setup))
4. Create a branch for your work:
   ```bash
   git checkout -b your-feature-name
   ```

---

## Reporting Bugs

### Before Submitting a Bug Report

- Check the [Issues](https://github.com/schchit/hjs-api/issues) to see if the problem has already been reported
- Ensure you're running the latest version
- Try to isolate the problem

### How to Submit a Good Bug Report

A good bug report includes:

- **Clear title**: Briefly describe the issue
- **Steps to reproduce**: List the exact steps to trigger the bug
- **Expected behavior**: What you expected to happen
- **Actual behavior**: What actually happened
- **Environment details**:
  - Node.js version
  - npm version
  - Database version
  - Operating system
- **Screenshots** or **logs** if applicable

Create a bug report by opening a new issue and using the "Bug report" template.

---

## Suggesting Features

We welcome feature suggestions! Before submitting:

1. Check if the feature has already been suggested in [Issues](https://github.com/schchit/hjs-api/issues)
2. Consider whether the feature aligns with the project's [neutrality principles](NEUTRALITY.md)
3. Think about how the feature would benefit other users

When submitting a feature suggestion, please include:

- **Clear description** of the feature
- **Use case** explaining why it's needed
- **Proposed implementation** (if you have ideas)
- **Alternatives** you've considered

---

## Contributing Code

### Finding an Issue to Work On

Look for issues labeled:
- `good first issue` - Great for newcomers
- `help wanted` - We'd love assistance with these
- `bug` - Something that needs fixing
- `enhancement` - New features or improvements

Comment on the issue to let others know you're working on it.

### Making Changes

1. Create a branch from `main`:
   ```bash
   git checkout -b your-feature-name
   ```

2. Make your changes, following our [style guidelines](#style-guidelines)

3. Test your changes locally:
   ```bash
   npm test
   ```

4. Commit your changes with a clear message:
   ```bash
   git commit -m "type: brief description of changes"
   ```
   
   Use conventional commit types:
   - `feat:` - New feature
   - `fix:` - Bug fix
   - `docs:` - Documentation changes
   - `style:` - Code style changes (formatting, etc.)
   - `refactor:` - Code refactoring
   - `test:` - Adding or updating tests
   - `chore:` - Maintenance tasks

5. Push to your fork:
   ```bash
   git push origin your-feature-name
   ```

---

## Style Guidelines

### Code Style

- Use 2 spaces for indentation (no tabs)
- Follow the existing ESLint configuration
- Use meaningful variable and function names
- Add comments for complex logic
- Keep functions focused and small

### JavaScript Guidelines

- Use `const` for values that won't change
- Use `let` for values that will change
- Use arrow functions where appropriate
- Use template literals for string concatenation
- Use async/await for asynchronous operations

### Documentation Style

- Use clear, concise language
- Include code examples where helpful
- Keep line length under 80 characters for readability
- Use Markdown formatting appropriately

### Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

Example:
```
feat(api): add support for merkle anchoring

- Add new anchor type 'merkle' to immutability field
- Update validation logic
- Add example to documentation

Closes #123
```

---

## Development Setup

### Prerequisites

- Node.js 18 or higher
- npm 9 or higher
- PostgreSQL 14 or higher
- Git

### Local Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create environment file:
   ```bash
   cp .env.example .env
   ```

3. Edit `.env` with your database connection string:
   ```
   DATABASE_URL=postgresql://user:password@localhost:5432/hjs_dev
   PORT=3000
   API_BASE=http://localhost:3000
   ```

4. Set up the database:
   ```bash
   # Create database if needed
   createdb hjs_dev

   # Run migrations
   psql -d hjs_dev -f migrations/init.sql
   psql -d hjs_dev -f migrations/003_add_anchor_fields.sql
   ```

5. Start the development server:
   ```bash
   node index.js
   ```

6. Run tests:
   ```bash
   npm test
   ```

### Docker Setup (Optional)

If you have Docker and Docker Compose installed:

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

---

## Pull Request Process

1. Ensure your code follows the style guidelines
2. Update documentation if necessary
3. Add tests for new functionality
4. Make sure all tests pass
5. Ensure your branch is up to date with `main`:
   ```bash
   git remote add upstream https://github.com/schchit/hjs-api.git
   git fetch upstream
   git rebase upstream/main
   ```
6. Push to your fork and submit a Pull Request
7. In your PR description, include:
   - What changes you made
   - Why you made them
   - Any issues resolved (use "Fixes #123" syntax)
   - Screenshots for UI changes

### Review Process

- At least one maintainer will review your PR
- Address review comments by pushing additional commits
- Once approved, a maintainer will merge your PR

---

## Community

- **GitHub Issues**: For bug reports and feature requests
- **Discussions**: For questions and community conversations
- **Discord/Slack**: (Link if available)

---

## Recognition

Contributors will be recognized in:
- The project's README
- Release notes
- Our thanks page

---

## Thank You!

Your contributions help make HJS better for everyone. We appreciate your time and effort!

---

**© 2026 Human Judgment Systems Foundation Ltd.**  
This document is licensed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
```