import extract from "extract-zip";
import {
  mkdtemp,
  readdir,
  rename,
  rm,
  unlink,
  writeFile,
} from "node:fs/promises";
import { resolve } from "node:path";
import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import express from "express";
import listing from "serve-index";
import { once } from "node:events";
import type { AddressInfo } from "node:net";

process.loadEnvFile();

const reposToCheck = [
  "photo",
  "vector",
  "film",
  "light",
  "pdf",
  "effect",
  "design",
  "fig",
  "word",
  "sound",
  "deck",
  "cad",
  "grid",
];

const verMap: Record<(typeof reposToCheck)[number], string> = {};

const promises = [];

const total = reposToCheck.length;
let done = 0;
const startTime = Date.now();
const elapsed = () => `${((Date.now() - startTime) / 1000).toFixed(1)}s`;
const log = (repo: string, msg: string) =>
  console.log(`[${elapsed()}] [${done}/${total}] ${repo}: ${msg}`);

console.log(`Updating ${total} repos...`);

for (const r of reposToCheck) {
  const repo = r + "craft";

  promises.push(
    (async () => {
      log(repo, "fetching latest release");
      const temp = await mkdtemp(resolve("assets", ".extract-"));
      const target = resolve("assets", repo);

      const response = await fetch(
        `https://api.github.com/repos/storytold/${repo}/releases/latest`,
        {
          headers: {
            Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          },
        },
      );

      const release: {
        tag_name: string;
        assets: Array<{
          name: string;
          browser_download_url: string;
        }>;
      } = await response.json();

      const ver = release.tag_name;
      verMap[repo] = ver;

      const assets = release.assets
        .filter((a) => a.name.includes("web"))
        .map((a) => a.browser_download_url);

      const downloadUrl = assets[0];

      if (!downloadUrl) {
        log(repo, `no web asset found in release ${ver}`);
        throw 0;
      }

      const filePath = `assets/${repo}.zip`;

      log(repo, `downloading ${ver}`);
      const { body }: any = await fetch(downloadUrl);
      const fileStream = createWriteStream(filePath);

      await pipeline(Readable.fromWeb(body), fileStream);

      try {
        log(repo, "extracting");
        await extract(filePath, { dir: temp });

        const entries = await readdir(temp, { withFileTypes: true });
        const root = entries[0];

        const source =
          entries.length === 1 && root?.isDirectory()
            ? resolve(temp, root.name)
            : temp;

        await rm(target, { recursive: true, force: true });
        await rename(source, target);
        await unlink(filePath);
      } finally {
        await rm(temp, { recursive: true, force: true });
      }

      done++;
      log(repo, `done (${ver})`);
    })(),
  );
}

await Promise.all(promises);

console.log(`[${elapsed()}] All repos updated, generating index.html...`);

const root = "assets";
const app = express();

app.use(
  listing(root, {
    icons: true,
    filter: (fileName) => fileName !== "index.html",
  }),
);

const server = app.listen(0, "127.0.0.1");
await once(server, "listening");

try {
  const { port } = server.address() as AddressInfo;

  const response = await fetch(`http://127.0.0.1:${port}/`, {
    headers: { accept: "text/html" },
  });

  if (!response.ok) throw new Error(`status ${response.status}`);

  await writeFile(`${root}/index.html`, await response.text());
  console.log(`[${elapsed()}] Wrote ${root}/index.html`);
} finally {
  server.close();
}
