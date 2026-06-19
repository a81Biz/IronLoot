# Contributing to IronLoot

Thank you for your interest in contributing to IronLoot! We welcome contributions from everyone. This document outlines the process for contributing to our project.

## Code of Conduct
Please be respectful and considerate of others. We aim to foster an inclusive and welcoming community.

## How to Contribute

1.  **Fork the Repository**: Start by forking the repository to your GitHub account.
2.  **Clone the Repository**: Clone your fork to your local machine.
    ```bash
    git clone https://github.com/your-username/ironloot.git
    cd ironloot
    ```
3.  **Create a Branch**: Create a new branch for your feature or bug fix.
    ```bash
    git checkout -b feature/my-new-feature
    ```
4.  **Make Changes**: Implement your changes, ensuring you follow the coding standards.
5.  **Run Tests**: Run the test suite to ensure your changes don't break existing functionality.
    ```bash
    npm test
    npm run test:e2e
    ```
6.  **Commit Changes**: Commit your changes with clear and descriptive messages.
    ```bash
    git commit -m "feat: add new feature"
    ```
7.  **Push to GitHub**: Push your branch to your fork.
    ```bash
    git push origin feature/my-new-feature
    ```
8.  **Submit a Pull Request**: Open a Pull Request (PR) from your branch to the `main` branch of the original repository.

## Coding Standards
-   **Style**: We use [Prettier](https://prettier.io/) for code formatting. Run `npm run format` before committing.
-   **Linting**: We use [ESLint](https://eslint.org/). Run `npm run lint` to catch errors.
-   **Testing**: All new features must include unit and/or E2E tests.

## Reporting Bugs
If you find a bug, please open an issue on GitHub with a detailed description, steps to reproduce, and expected behavior.
