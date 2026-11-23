import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import {
  mkdtemp,
  mkdir,
  rm,
  readdir,
  readFile,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { build } from "esbuild";

const { outputFiles } = await build({
  entryPoints: ["src/lib/storage/index.ts"],
  bundle: true,
  format: "cjs",
  write: false,
});
const index = "qah:projects";
const manifest = (slug) => ({
  id: randomUUID(),
  slug,
  name: slug,
  type: "custom",
  version: "1.0",
  description: "Original description",
  createdAt: "2026-01-01T00:00:00Z",
  modifiedAt: "2026-01-01T00:00:00Z",
  tags: [],
  settings: { defaultExportFormat: "json" },
});

function directory(path) {
  async function check(name, create, isDir) {
    const dest = join(path, name);
    if (create && isDir) await mkdir(dest, { recursive: true });
    if (create && !isDir) await writeFile(dest, "", { flag: "a" });
    try {
      if ((await stat(dest)).isDirectory() !== isDir)
        throw new DOMException("Wrong kind", "TypeMismatchError");
    } catch (err) {
      if (err.code === "ENOENT")
        throw new DOMException("Missing", "NotFoundError");
      throw err;
    }
    return dest;
  }
  return {
    queryPermission: async () => "granted",
    getDirectoryHandle: async (name, opts) =>
      directory(await check(name, opts?.create, true)),
    getFileHandle: async (name, opts) => {
      const dest = await check(name, opts?.create, false);
      return {
        getFile: async () => ({
          size: (await stat(dest)).size,
          text: () => readFile(dest, "utf8"),
        }),
        createWritable: async () => ({
          write: (text) => writeFile(dest, text),
          close: async () => {},
        }),
      };
    },
    async *entries() {
      for (const e of await readdir(path, { withFileTypes: true }))
        if (e.isDirectory())
          yield [
            e.name,
            { ...directory(join(path, e.name)), kind: "directory" },
          ];
    },
  };
}
function profile() {
  const data = new Map(),
    queues = new Map();
  const locks = {
    request: (name, fn) => {
      const next = (queues.get(name) ?? Promise.resolve()).then(fn);
      queues.set(
        name,
        next.catch(() => {}),
      );
      return next;
    },
  };
  async function tab(root) {
    const module = { exports: {} },
      storage = {
        getItem: (k) => data.get(k) ?? null,
        setItem: (k, v) => data.set(k, v),
      };
    new Function(
      "module",
      "localStorage",
      "window",
      "indexedDB",
      "navigator",
      outputFiles[0].text,
    )(module, storage, { showDirectoryPicker: async () => root }, undefined, {
      locks,
    });
    if (root) await module.exports.selectWorkspaceDirectory();
    return module.exports;
  }
  return { data, tab };
}
async function fixture(t) {
  const path = await mkdtemp(join(tmpdir(), "qalat-create-"));
  t.after(() => rm(path, { recursive: true, force: true }));
  return path;
}
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");

test("workspace-only collision preserves manifest bytes, sibling files and browser index", async (t) => {
  const path = await fixture(t),
    dir = join(path, "projects", "film");
  const original = manifest("film");
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "project.json"), JSON.stringify(original) + "\n");
  await writeFile(join(dir, "other.bin"), Buffer.from([0, 25, 255]));
  const snapshot = async () =>
    Promise.all(
      (await readdir(dir))
        .sort()
        .map(async (n) => [n, sha(await readFile(join(dir, n)))]),
    );
  const before = await snapshot(),
    { tab, data } = profile(),
    api = await tab(directory(path));
  const error = await api
    .createProject({ ...manifest("film"), description: "Replacement" })
    .then(
      () => null,
      (e) => e,
    );
  assert.equal(
    sha(await readFile(join(dir, "project.json"))),
    before.find(([name]) => name === "project.json")[1],
  );
  assert.deepEqual(await snapshot(), before);
  assert.match(error?.message ?? "", /already exists/i);
  assert.equal(data.has(index), false);
  assert.deepEqual(
    await (await tab(directory(path))).readProjectManifest("film"),
    original,
  );
});
test("existing incomplete directory and denied workspace access reject without local fallback", async (t) => {
  const path = await fixture(t);
  const dir = join(path, "projects", "incomplete");
  await mkdir(dir, { recursive: true });
  const { tab, data } = profile();
  await assert.rejects(
    (await tab(directory(path))).createProject(manifest("incomplete")),
    /already exists/i,
  );
  assert.deepEqual(await readdir(dir), []);
  const denied = {
    ...directory(path),
    getDirectoryHandle: async () => {
      throw new DOMException("Permission denied", "NotAllowedError");
    },
  };
  await assert.rejects(
    (await tab(denied)).createProject(manifest("new")),
    /denied/i,
  );
  assert.equal(data.has(index), false);
});
test("concurrent tabs create once, preserve independent projects and reject repeated slugs or IDs", async (t) => {
  const path = await fixture(t);
  const { tab, data } = profile(),
    root = directory(path);
  const offline = await tab(),
    a = await tab(root),
    b = await tab(root);
  const old = manifest("offline");
  await offline.createProject(old);
  await assert.rejects(
    a.createProject({ ...old, slug: "changed" }),
    /already exists/i,
  );
  await assert.rejects(a.createProject(manifest(old.slug)), /already exists/i);
  assert.deepEqual(await readdir(path), []);
  const x = manifest("shared"),
    y = manifest("shared");
  const results = await Promise.allSettled([
    a.createProject(x),
    b.createProject(y),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  const winner = results[0].status === "fulfilled" ? x : y;
  await assert.rejects(b.createProject(winner), /already exists/i);
  await b.createProject(manifest("independent"));
  assert.equal(JSON.parse(data.get(index)).length, 3);
  assert.deepEqual(
    await (await tab(root)).readProjectManifest("shared"),
    winner,
  );
  assert.deepEqual(
    JSON.parse(
      await readFile(join(path, "projects", "shared", "project.json"), "utf8"),
    ),
    winner,
  );
});
