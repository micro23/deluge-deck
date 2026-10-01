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
metadata, egg contents, and Python source syntax under the build interpreter.
The output is written to `plugin/dist/`.
Install the pinned packaging tools first with
`python3 -m pip install -r plugin/build-requirements.txt` in a virtual environment.
Use that same environment's interpreter for `PYTHON`.

## CI expectations

Pull requests and pushes to `main` should run tests, production checks, and the
plugin build with Python 3.11, 3.12, 3.13, and 3.14. Each matrix job retains a
separate artifact containing its version-labelled egg and SHA-256 checksum.
Packaging tools and GitHub actions are pinned; update these pins deliberately.
Successful packaging does not establish runtime compatibility: test the target
Deluge/Python combination separately before publishing.

Publishing a GitHub release runs the same checks against the release tag. The
tag must equal the package version, with an optional `v` prefix. Only after all
matrix jobs pass does a separate job verify checksums and attach all four eggs
and their checksums using GitHub CLI. Builds have read-only repository access;
only the upload job has `contents: write`. It does not install dependencies or
execute repository code. Uploads preserve the egg's Python version and do not
overwrite existing assets; a duplicate filename fails instead of replacing a
previously published download.

Manual workflow runs create CI artifacts only. Python 3.9 is no longer used by
CI; users of older Deluge environments can build locally with their interpreter,
but should move to a supported Python runtime where possible.

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
9. Publish the GitHub release and wait for CI to attach the eggs and checksums.
   Keep those filenames free for CI uploads and retain the CI artifacts.

Local builds may be published when CI is unavailable. Match the egg's Python
major/minor to the target Deluge installation, verify package integrity and the
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
