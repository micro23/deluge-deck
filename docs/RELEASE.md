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

For a plugin release, build the single source-only egg with Python 3.14:

```sh
PYTHON=python3 npm run build:plugin
```

The build verifies the required entry points, versioned resources, package
metadata, egg contents, and Python source syntax under the build interpreter.
The output is written to `plugin/dist/`.
Install the pinned packaging tools first with
`python3 -m pip install -r plugin/build-requirements.txt` in a virtual environment.
Use that same environment's interpreter for `PYTHON`.

## CI expectations

Pull requests and pushes to `main` run tests, production checks, and one
plugin build with Python 3.14. The resulting artifact contains one egg and its
SHA-256 checksum. Separate Python 3.11–3.14 jobs download that exact artifact,
reject native extensions and bytecode, verify its checksum, and load all five
entry points using real Deluge 2.2 plugin base classes. Isolated RPC registrars
allow resource and lifecycle checks without a running daemon or GTK display.
These checks establish cross-version plugin loading, not end-to-end daemon or
Windows compatibility. Packaging tools and GitHub actions are pinned.

Deluge 2 disables Python-version filtering during egg discovery. The `py3.14`
filename suffix identifies the build interpreter; users do not need a different
egg for each supported Python version. Keep that standard setuptools filename
rather than merely renaming it. See [Deluge's plugin compatibility guide](https://deluge.readthedocs.io/en/latest/devguide/how-to/update-1.3-plugin.html).

Publishing a GitHub release runs the same checks against the release tag. The
tag must equal the package version, with an optional `v` prefix. After the build
and all load checks pass, a separate job verifies the checksum and attaches the
single egg and checksum using GitHub CLI. Builds and load checks have read-only
repository access; only the upload job has `contents: write`. It does not install
dependencies or execute repository code. Duplicate asset filenames fail rather
than replacing an existing download. Manual runs create CI artifacts only.

## Publishing checklist

1. Update `package.json` and `package-lock.json` together.
2. Add release notes to `CHANGELOG.md`.
3. Run the pre-release checks above.
4. Build the egg once with Python 3.14 and run the same-artifact loader checks.
5. Inspect the egg filename and contents.
6. Test standalone and hosted/plugin modes with a real Deluge instance.
7. Test login, daemon switching, add, remove-with-data, file priorities, and
   session expiry.
8. Commit the source and generated release artifact, then create a version tag.
9. Publish the GitHub release and wait for CI to attach the egg and checksum.
   Keep those filenames free for CI uploads and retain the CI artifacts.

Local builds may be published when CI is unavailable. Run the loader check
with the target Deluge/Python environment, verify package integrity and the
checksum, and state the build environment and any untested platforms in the
release notes. Do not include passwords, cookies, production paths, or
production configuration in logs or artifacts.

## Privacy checks before making a repository public

Scan both the current files and every branch and tag. Deleting a file from the
latest commit does not remove it from older commits or release artifacts.
With [Gitleaks](https://github.com/gitleaks/gitleaks) installed, run:

```sh
gitleaks git --log-opts=--all --redact
npm audit
```

Also scan an unpacked copy of the release egg, inspect image metadata, and search
for personal hostnames, email addresses, account names, and machine paths. A
credential scanner does not identify every kind of personal information.
Review Git author identities and remote release attachments separately.

Publish tracked source or a Git-generated source archive, rather than a ZIP of
the working directory. Ignored environments, browser captures, local Git
metadata, caches, and logs can contain private data. Keep any audit reports
containing actual private values outside the repository. Ignore rules prevent
accidental additions; they do not remove files that are already tracked.
