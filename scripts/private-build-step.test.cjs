const { test } = require("node:test");
const assert = require("node:assert/strict");
const { mkdtemp, mkdir, readFile, rm } = require("node:fs/promises");
const { spawnSync } = require("node:child_process");
const { join } = require("node:path");
const { tmpdir } = require("node:os");

for (const [scenario, commandStatus, draft] of [
  ["success", 0, "true"],
  ["failure", 42, "true"],
  ["published-staging", 0, "false"],
]) {
  test(`private build logs and exit status: ${scenario}`, async () => {
    const root = await mkdtemp(join(tmpdir(), "cosmosbuild-private-log-"));
    try {
      await mkdir(join(root, "source"));
      const uploaded = join(root, "uploaded.log");
      const bash =
        process.platform === "win32"
          ? join(process.env.ProgramFiles, "Git", "bin", "bash.exe")
          : "bash";
      const result = spawnSync(
        bash,
        [
          "--noprofile",
          "--norc",
          "-c",
          `gh() {
            case "$1 $2" in
              "release view") printf '%s\\n' "$DRAFT_STATE" ;;
              "release upload") cp "$4" "$UPLOAD_DEST" ;;
              *) return 1 ;;
            esac
          }
          export -f gh
          bash "$HELPER" unit-test bash -c 'echo "private-source-sentinel $GH_TOKEN"; echo "private-error-sentinel $GITHUB_TOKEN" >&2; exit "$CASE_STATUS"'`,
        ],
        {
          encoding: "utf8",
          timeout: 15_000,
          windowsHide: true,
          env: {
            ...process.env,
            GH_REPO: "fixture/downloads",
            GH_TOKEN: "fake-gh-secret",
            GITHUB_TOKEN: "fake-github-secret",
            STAGING_TAG: "fixture-draft",
            RUNNER_TEMP: root,
            GITHUB_WORKSPACE: root,
            HELPER: join(__dirname, "private-build-step.sh"),
            UPLOAD_DEST: uploaded,
            DRAFT_STATE: draft,
            CASE_STATUS: String(commandStatus),
          },
        },
      );
      assert.equal(result.status, draft === "true" ? commandStatus : 1, result.stderr);
      assert.doesNotMatch(result.stdout + result.stderr, /private-source-sentinel|private-error-sentinel|fake-gh-secret|fake-github-secret/);
      if (draft === "true") {
        const log = await readFile(uploaded, "utf8");
        assert.match(log, /private-source-sentinel \[REDACTED\]/);
        assert.match(log, /private-error-sentinel \[REDACTED\]/);
        assert.doesNotMatch(log, /fake-gh-secret|fake-github-secret/);
      } else {
        await assert.rejects(readFile(uploaded), { code: "ENOENT" });
        assert.match(result.stdout, /Private draft staging is required/);
      }
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
}
