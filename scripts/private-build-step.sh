set -eu
phase="${1:?Supply a build phase}"
shift
case "$phase" in ""|*[!a-z0-9-]*) echo "Invalid build phase." >&2; exit 64 ;; esac
: "${GH_REPO:?}" "${GH_TOKEN:?}" "${STAGING_TAG:?}" "${RUNNER_TEMP:?}" "${GITHUB_WORKSPACE:?}"

if [ "$(gh release view "$STAGING_TAG" --repo "$GH_REPO" --json isDraft --jq .isDraft)" != true ]; then
  echo "::error::Private draft staging is required."
  exit 1
fi
log="$RUNNER_TEMP/$phase-${GITHUB_RUN_ATTEMPT:-1}.log"
cd "$GITHUB_WORKSPACE/source"
set +e
"$@" > "$log" 2>&1
result=$?
set -e

node - "$log" <<'NODE'
const fs = require("node:fs");
const path = process.argv[2];
let text = fs.readFileSync(path, "utf8");
for (const name of ["GH_TOKEN", "GITHUB_TOKEN"]) {
  const value = process.env[name];
  if (value) text = text.replaceAll(value, "[REDACTED]");
}
fs.writeFileSync(path, text);
NODE
if [ "$(gh release view "$STAGING_TAG" --repo "$GH_REPO" --json isDraft --jq .isDraft)" != true ]; then
  echo "::error::Staging is no longer private; refusing log upload."
  exit 1
fi
gh release upload "$STAGING_TAG" "$log" --repo "$GH_REPO" --clobber
if [ "$result" -ne 0 ]; then
  echo "::error::Build phase $phase failed (exit $result). Inspect its log in the private draft release."
  exit "$result"
fi
echo "Build phase $phase passed. Its log is retained in the private draft release."
