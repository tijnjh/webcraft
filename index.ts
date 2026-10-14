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

const reposToCheck = [
  "photo",
  "pdf",
  "film",
  "light",
  "word",
  "vector",
  "effect",
  "grid",
  "cad",
  "design",
  "deck",
  "sound",
  "fig",
];

const promises = [];

for (const r of reposToCheck) {
  const repo = r + "craft";

  promises.push(
    (async () => {
      const temp = await mkdtemp(resolve("assets", ".extract-"));
      const target = resolve("assets", repo);

      const response = await fetch(
        `https://api.github.com/repos/storytold/${repo}/releases/latest`,
        {
          headers: {
            Authorization: `Bearer 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`,
          },
        },
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
    })(),
  );
}

await Promise.all(promises);

let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>tijn.dev craft apps</title>
      <style>
    body {
      font-family: monospace;
      padding: 1rem;
      font-size: 1.25rem;
      background-color: #252525;
      max-width: 700px;
      margin-inline: auto;
    }

    * {
      margin: 0;
      padding: 0;
    }

    ul {
      list-style: none;
      display: flex;
      flex-direction: column;
      margin: 0;
    }

    a {
      color: dodgerblue;
      text-decoration: none;
      padding-block: .5rem;
      display: flex;
      gap: 1rem;
      align-items: center;
      img {
        height: 3rem;
        width: 3rem;
      }

      &:hover::before {
        content: "> "
      }
    }
  </style>
</head>
<body>
  
<ul>
`;

for (const app of reposToCheck) {
  html += `<li>
  <a href="https://${app}.craft.tijn.dev">
    <img src="https://getartcraft.com/images/apps/${app}craft/icon.webp"> 
    ${app}craft
  </a>
</li>
`;
}

html += `</ul>
</body>
</html>`;

await writeFile("./index.html", html);
