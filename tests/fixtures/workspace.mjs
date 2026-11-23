import { build } from "esbuild";
const { outputFiles } = await build({
  stdin: {
    contents:
      "export * from './src/lib/storage/applicationBackup';export * from './src/lib/storage/index';export * from './src/lib/planner';export * from './src/lib/calendar';export * from './src/lib/storage/applicationRestore';export * from './src/lib/storage/restoreArchive'",
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  format: "cjs",
});

export class Folder {
  kind = "directory";
  children = new Map();
  permission = "granted";
  constructor(name) {
    this.name = name;
  }
  async queryPermission() {
    return this.permission;
  }
  async isSameEntry(other) {
    return this === other;
  }
  async resolve(other) {
    return this === other ? [] : null;
  }
  async *entries() {
    yield* this.children;
  }
  async getDirectoryHandle(name, { create } = {}) {
    if (!this.children.has(name) && create)
      this.children.set(name, new Folder(name));
    if (!this.children.has(name))
      throw new DOMException("Missing", "NotFoundError");
    return this.children.get(name);
  }
  async removeEntry(name) {
    this.children.delete(name);
  }
  async getFileHandle(name, { create } = {}) {
    if (!this.children.has(name) && create) {
      let blob = new Blob();
      this.children.set(name, {
        kind: "file",
        name,
        getFile: async () => blob,
        createWritable: async () => ({
          write: async (b) => {
            if (this.interrupt) throw Error("Interrupted");
            blob = this.corrupt ? new Blob(["truncated"]) : new Blob([b]);
          },
          close: async () => {},
          abort: async () => {},
        }),
      });
    }
    if (!this.children.has(name))
      throw new DOMException("Missing", "NotFoundError");
    return this.children.get(name);
  }
  async put(name, bytes) {
    const h = await this.getFileHandle(name, { create: true });
    await (await h.createWritable()).write(bytes);
  }
}
export function setup() {
  const root = new Folder("workspace"),
    other = new Folder("secondary"),
    handles = new Map(),
    ls = Object.create(null);
  Object.defineProperties(ls, {
    setItem: { configurable: true, value: (k, v) => (ls[k] = String(v)) },
    getItem: { value: (k) => ls[k] ?? null },
    removeItem: { value: (k) => delete ls[k] },
    length: { get: () => Object.keys(ls).length },
    key: { value: (i) => Object.keys(ls)[i] },
  });
  let picked = root;
  const db = {
    transaction: () => {
      const tx = {
        objectStore: () => ({
          delete: (k) => {
            handles.delete(k);
            queueMicrotask(() => tx.oncomplete?.());
          },
          put: (v, k) => {
            handles.set(k, v);
            queueMicrotask(() => tx.oncomplete?.());
          },
          get: (k) => {
            const r = { result: handles.get(k) };
            queueMicrotask(() => r.onsuccess());
            return r;
          },
        }),
      };
      return tx;
    },
    close() {},
  };
  const indexedDB = {
    open: () => {
      const r = { result: db };
      queueMicrotask(() => r.onsuccess());
      return r;
    },
  };
  const module = { exports: {} },
    apiWindow = { dispatchEvent() {}, showDirectoryPicker: async () => picked };
  new Function(
    "module",
    "localStorage",
    "indexedDB",
    "window",
    "navigator",
    outputFiles[0].text,
  )(module, ls, indexedDB, apiWindow, { locks: { request: (_, fn) => fn() } });
  return {
    api: module.exports,
    ls,
    root,
    other,
    connect: async (folder = root) => {
      picked = folder;
      return module.exports.selectWorkspaceDirectory();
    },
    secondary: async () => {
      picked = other;
      await module.exports.configureSecondaryBackup(true);
    },
  };
}
