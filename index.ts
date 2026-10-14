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
        font-size: 1.25rem;
        background-color: #252525;
      }

      @media (min-width: 768px) {
        body {
          margin-block: 4vw;
          padding: 1rem;
        }
        ul {
          grid-template-columns: 1fr 1fr 1fr 1fr !important;
        }
      }

      * {
        margin: 0;
        padding: 0;
      }

      ul {
        list-style: none;
        margin: 0;
        margin-inline: auto;
        display: grid;
        grid-template-columns: 1fr 1fr;
        max-width: 1280px;
        gap: 1px;
      }

      li {
        outline: 1px solid #444;
      }

      li > span {
        color: #ccc;
        padding: 0.5rem;
        display: block;
      }

      a {
        color: #ccc;
        background-color: #252525;
        text-decoration: none;
        display: flex;
        padding-bottom: 1rem;
        flex-direction: column;
        overflow: clip;

        .icon {
          height: 3rem;
          width: 3rem;
          margin-left: 1rem;
          margin-top: -1.5rem;
        }

        .icon,
        .hero {
          transition: scale 0.2s ease;

          transform-origin: bottom;
        }

        span {
          margin-left: 1rem;
          margin-top: 0.5rem;
        }

        .hero {
          width: 100%;
          object-fit: cover;
          height: 9rem;
          transform-origin: bottom;
        }

        &:hover {
          .icon {
            scale: 1.1;
          }

          .hero {
            scale: 1.1;
          }
        }
      }
  </style>
</head>
<body>
  
<ul>
`;

for (const app of reposToCheck) {
  html += `<li>
  <span>${reposToCheck.indexOf(app) + 1}</span>
  <a href="https://${app}.craft.tijn.dev">
    <img class="hero" src="https://getartcraft.com/images/apps/${app}craft/hero.webp"> 
    <img class="icon" src="https://getartcraft.com/images/apps/${app}craft/icon.webp"> 
    <span>${app}craft</span>
  </a>
</li>
`;
}

html += `</ul>
</body>
</html>`;

await writeFile("./index.html", html);
