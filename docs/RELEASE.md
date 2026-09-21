# Deluge Deck release procedure

## Source of truth

`package.json` contains the release version. Do not hand-edit a second release
version in the React app, server, or plugin metadata:

- Vite imports the package version for the UI.
- The server reads it for `/api/health`.
- `plugin/setup.py` reads it when building the egg.
- Installed plugin metadata supplies the runtime WebUI resource version.

## Pre-release checks

Run from a clean checkout:

```sh
npm ci
npm test
npm run check
npm run verify:release
git diff --check
```

For a plugin release, build with the Python major/minor used by the target
Deluge installation:

```sh
PYTHON=python3 npm run build:plugin
```

The build verifies the required entry points, versioned resources, package
metadata, and egg contents. The output is written to `plugin/dist/`.

## CI expectations

Pull requests and pushes to `main` should run tests, production checks, and the
plugin build. The workflow currently builds the distributable egg with Python
3.9; test the target Deluge/Python combination separately before publishing.

## Publishing checklist

1. Update `package.json` and `package-lock.json` together.
2. Add release notes to `CHANGELOG.md`.
3. Run the pre-release checks above.
4. Build the egg using the target Python runtime.
5. Inspect the egg filename and contents.
6. Test standalone and hosted/plugin modes with a real Deluge instance.
7. Test login, daemon switching, add, remove-with-data, file priorities, and
   session expiry.
8. Commit the source and generated release artifact, then create a version tag.
9. Publish the egg with a checksum and retain the CI artifact.

Never publish a Mac-built egg for a Windows Deluge installation without testing
the target Python ABI. Do not include passwords, cookies, production paths, or
production configuration in logs or artifacts.
