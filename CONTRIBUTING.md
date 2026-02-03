# Contributing to HarborMesh

Thank you for your interest in contributing to HarborMesh! This document
provides guidelines and instructions for contributing.

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Process](#development-process)
4. [Coding Standards](#coding-standards)
5. [Testing](#testing)
6. [Documentation](#documentation)
7. [Submitting Changes](#submitting-changes)
8. [Community](#community)

## Code of Conduct

This project and everyone participating in it is governed by our
[Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected
to uphold this code. Please report unacceptable behavior to
conduct@3d3d.ca.

## Getting Started

### Prerequisites

- Node.js 20+ and npm 10+
- Python 3.11+ (for backend)
- Rust 1.75+ (for Tauri)
- Git 2.40+

### Setting Up Development Environment

```bash
# Clone the repository
git clone https://github.com/3d3d-ca/harbormesh.git
cd harbormesh

# Install frontend dependencies
cd app
npm install

# Install backend dependencies (when available)
cd ../backend
pip install -r requirements.txt

# Set up pre-commit hooks
pre-commit install
```

### Development Modes

HarborMesh supports multiple development modes:

```bash
# Frontend-only development (mock data)
cd app && npm run dev

# Full stack development (requires backend)
docker compose up -d

# Hardware integration testing (requires NMEA devices)
npm run dev:hardware
```

## Development Process

### Issue Tracking

1. **Search existing issues** before creating a new one
2. **Use issue templates** for bug reports and feature requests
3. **Label issues appropriately** (bug, enhancement, documentation, etc.)
4. **Link related issues** using keywords (fixes, closes, relates to)

### Branch Naming Convention

We follow the GitFlow branching model:

- `main` - Production-ready code
- `develop` - Development branch
- `feature/*` - New features
- `bugfix/*` - Bug fixes
- `hotfix/*` - Emergency production fixes
- `release/*` - Release preparation

### Commit Messages

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

Types:
- `feat` - A new feature
- `fix` - A bug fix
- `docs` - Documentation only changes
- `style` - Changes that do not affect the meaning of the code (white-space, formatting, etc.)
- `refactor` - A code change that neither fixes a bug nor adds a feature
- `perf` - A code change that improves performance
- `test` - Adding missing tests or correcting existing tests
- `chore` - Changes to the build process or auxiliary tools

Example:
```
feat(navigation): add offline chart caching

Implement MBTiles caching for offline chart rendering
using service workers and IndexedDB.

Closes #123
```

## Coding Standards

### TypeScript

- Use TypeScript strict mode
- Prefer interfaces over types for object shapes
- Use discriminated unions for state machines
- Avoid `any` - use `unknown` and type guards instead

```typescript
// Good
interface Vessel {
  id: string;
  name: string;
  type: VesselType;
}

// Bad
interface Vessel {
  id: any;
  name: any;
  type: any;
}
```

### React Components

Follow the [SOLID principles](https://en.wikipedia.org/wiki/SOLID):

1. **S**ingle Responsibility - One component, one purpose
2. **O**pen/Closed - Extend via props, not modification
3. **L**iskov Substitution - Components are interchangeable
4. **I**nterface Segregation - Small, focused props
5. **D**ependency Inversion - Depend on abstractions, not concretions

```typescript
// Good - Single responsibility
function VesselCard({ vessel }: { vessel: Vessel }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{vessel.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <VesselStats vessel={vessel} />
      </CardContent>
    </Card>
  );
}

// Bad - Multiple responsibilities
function VesselCardWithActionsAndStatsAndForm({ vessel }: { vessel: Vessel }) {
  // Too many responsibilities
}
```

### Error Handling

- Use error boundaries for React components
- Implement proper error boundaries for async operations
- Log errors with context for debugging
- Provide user-friendly error messages

```typescript
// Good
try {
  await saveVessel(vessel);
} catch (error) {
  logger.error('Failed to save vessel', { vesselId: vessel.id, error });
  toast.error('Failed to save vessel. Please try again.');
}
```

### Performance

- Use React.memo() for expensive components
- Implement code splitting with lazy loading
- Optimize bundle size with tree shaking
- Use useMemo and useCallback appropriately

## Testing

### Test Requirements

- All new features must include tests
- Bug fixes must include regression tests
- Minimum 85% code coverage
- Tests must pass in CI before merge

### Test Structure

```
src/
  components/
    Button/
      Button.tsx
      Button.test.tsx
      Button.stories.tsx
  lib/
    utils.ts
    utils.test.ts
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- utils.test.ts
```

### Test Best Practices

- Use meaningful test descriptions
- Follow the Arrange-Act-Assert pattern
- Mock external dependencies
- Test edge cases and error conditions

```typescript
describe('VesselStore', () => {
  it('should add a new vessel', () => {
    // Arrange
    const store = createVesselStore();
    const newVessel = createMockVessel();
    
    // Act
    store.addVessel(newVessel);
    
    // Assert
    expect(store.vessels).toHaveLength(1);
    expect(store.vessels[0].id).toBe(newVessel.id);
  });
});
```

## Documentation

### Code Documentation

- Use JSDoc for public APIs
- Document complex algorithms
- Include examples in documentation
- Update documentation with code changes

```typescript
/**
 * Calculates the distance between two geographic points using the Haversine formula.
 *
 * @param point1 - The first geographic point
 * @param point2 - The second geographic point
 * @returns The distance in meters
 *
 * @example
 * ```typescript
 * const distance = calculateDistance(
 *   { latitude: 44.6501, longitude: -63.5746 },
 *   { latitude: 40.7128, longitude: -74.0060 }
 * );
 * console.log(distance); // ~850000 (meters)
 * ```
 */
export function calculateDistance(point1: GeoPosition, point2: GeoPosition): number {
  // Implementation
}
```

### README Updates

- Keep README up to date
- Include setup instructions
- Document configuration options
- Provide usage examples

## Submitting Changes

### Pull Request Process

1. **Create a feature branch** from `develop`
2. **Make your changes** following coding standards
3. **Add tests** for new functionality
4. **Update documentation** as needed
5. **Run the full test suite** locally
6. **Create a pull request** with a clear description
7. **Address review feedback** promptly
8. **Squash and merge** when approved

### Pull Request Template

```markdown
## Description
Brief description of the changes

## Type of Change
- [ ] Bug fix (non-breaking change)
- [ ] New feature (non-breaking change)
- [ ] Breaking change (fix or feature that causes existing functionality to change)
- [ ] Documentation update

## Testing
Describe how the changes were tested

## Screenshots (if applicable)
Add screenshots to help explain the changes

## Checklist
- [ ] My code follows the style guidelines
- [ ] I have performed a self-review of my code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
```

## Community

### Communication Channels

- **GitHub Discussions** - General questions and ideas
- **GitHub Issues** - Bug reports and feature requests
- **Discord** - Real-time chat with developers
- **Email** - Private inquiries: info@3d3d.ca

### Recognition

Contributors are recognized in:
- [CONTRIBUTORS.md](CONTRIBUTORS.md)
- Release notes
- Project documentation

---

## Legal

By contributing to HarborMesh, you agree that:

1. Your contributions are licensed under the AGPLv3 license
2. You have the right to license your contributions
3. Your contributions do not violate any third-party rights
4. You agree to the [Privacy Policy](PRIVACY.md)

For commercial licensing, contact licensing@3d3d.ca.
