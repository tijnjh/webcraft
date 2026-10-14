import extract from "extract-zip";
import { mkdtemp, readdir, rename, rm, unlink } from "node:fs/promises";
import { resolve } from "node:path";
import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";

const reposToCheck = ["wordcraft"];

for (const repo of reposToCheck) {
  const temp = await mkdtemp(resolve("assets", ".extract-"));
  const target = resolve("assets", repo);

  const response = await fetch(
    `https://api.github.com/repos/storytold/${repo}/releases/latest`,
  );

  const release: {
    assets: Array<{
      name: string;
      browser_download_url: string;
    }>;
  } = await response.json();

  const assets = release.assets
    .filter((a) => a.name.includes("web"))
    .map((a) => a.browser_download_url);

  const downloadUrl = assets[0];

  if (!downloadUrl) throw 0;

  const filePath = `assets/${repo}.zip`;

  const { body }: any = await fetch(downloadUrl);
  const fileStream = createWriteStream(filePath);

  await pipeline(Readable.fromWeb(body), fileStream);

  try {
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
}
