# Private Apple Silicon engineering candidates

The manual **Build unverified Apple Silicon candidate** workflow uses standard
public-repository runners. Application source remains in the separate private
repository; no source checkout, build cache, logs or candidate files are
published as public Actions artifacts.

Maintainers must configure `COSMOSBUILD_SOURCE_READ_KEY` as an Actions secret
using a dedicated **read-only** deploy key on the source repository, plus the
public `COSMOSBUILD_GITHUB_CLIENT_ID` repository variable. Restrict write access
to this repository: trusted workflows can use this key. Revoke the deploy key
and remove the secret when this build route is no longer needed.

Dispatch only from `main`, supply the full immutable source commit and accept
the pinned emulator terms. Each run uses a new draft release. The workflow
checks that the draft is inaccessible anonymously before building; logs and
outputs stay in that draft. Do not publish it while a build is running. Failed
phases report a nonzero exit and retain their log privately, with known GitHub
token values redacted. Logs always include the command exit status, even for
silent commands, so an empty-log upload cannot turn successful staging into a
failed workflow. Rerun the whole workflow, not only failed jobs.

All six SDKs are qualified on native ARM Linux, and five optional language
packs are exported. The Mac job assembles an unsigned DMG but **does not run the
full Mac runtime or connected onboarding smoke tests**: the standard Mac runner
has 7 GB RAM, below CosmosBuild's unchanged 8 GB minimum. The DMG is labelled
`UNVERIFIED`; it is not an approved public release.

Before publication, verify installation, language selection/import, generation,
tests, preview, restart persistence and real onboarding on an Apple Silicon Mac
with at least 8 GB RAM (16 GB recommended). Supply the optional ISO files in a
folder and use **Use downloaded language packs**. Complete signing/notarization
and redistribution/source-notice review separately. Local verification does not
certify Azure deployment or authentication.

Successful runs delete the intermediate appliance archive. Draft candidate
files and logs do not expire automatically; maintainers should remove obsolete
drafts after inspection.
