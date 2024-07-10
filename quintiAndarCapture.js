// FUNCIONANDO OK

import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import fetch from "node-fetch";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Função para baixar recursos
async function downloadResource(resourceUrl, destination) {
  try {
    const response = await fetch(resourceUrl);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(destination, buffer);
  } catch (error) {
    console.error(`Failed to download ${resourceUrl}: ${error.message}`);
  }
}

const imgsDir = path.join(__dirname, "img");
if (!fs.existsSync(imgsDir)) {
  fs.mkdirSync(imgsDir);
}

const imgSourceDir = path.join(__dirname, "img_source");
if (!fs.existsSync(imgSourceDir)) {
  fs.mkdirSync(imgSourceDir);
}

const quintoAndarImgSubDirs = [
  "xsm",
  "sml",
  "med",
  "lrg",
  "xlg",
  "xxl",
  "1200x800",
];

quintoAndarImgSubDirs.forEach((subDir) => {
  const imgSubDirs = path.join(imgsDir, subDir);
  if (!fs.existsSync(imgSubDirs)) {
    fs.mkdirSync(imgSubDirs);
  }
});

const quintoAndarWebPagesDir = path.join(__dirname, "quintoAndarWebPages");
if (!fs.existsSync(quintoAndarWebPagesDir)) {
  fs.mkdirSync(quintoAndarWebPagesDir);
}

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
  });

  const page = await browser.newPage();
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
  );

  const pageUrl =
    "https://www.quintoandar.com.br/imovel/894333848/comprar/apartamento-1-quarto-paraiso-sao-paulo?from_route=%22house%20details%22&search_id=%228c31e995-3e3c-4f68-b2e6-f455faa8e6a3%22&search_rank=%7B%22sortMode%22%3A%22relevance%22%2C%22searchMode%22%3A%22list%22%2C%22resultsOrigin%22%3A%22search%22%7D";
  await page.goto(pageUrl, { waitUntil: "networkidle2" });

  // Espera elementos específicos para garantir que a página esteja totalmente carregada
  await page.waitForSelector("img"); // Espera todas as imagens serem carregadas

  // Extrair todos os recursos (CSS, JS, imagens)
  const resourceUrls = await page.evaluate(() => {
    const urls = [];
    document
      .querySelectorAll(
        'link[rel="stylesheet"], script[src], img[src], img[srcset]'
      )
      .forEach((element) => {
        if (element.href) {
          urls.push(element.href);
        } else if (element.src) {
          urls.push(element.src);
        } else if (element.srcset) {
          element.srcset.split(",").forEach((srcsetItem) => {
            const url = srcsetItem.trim().split(" ")[0];
            urls.push(url);
          });
        }
      });
    return urls;
  });

  // Mapeamento dos URLs dos recursos para seus novos caminhos locais
  const resourceMapping = {};

  // Baixar e salvar todos os recursos
  const downloadPromises = resourceUrls.map(async (resourceUrl) => {
    try {
      const parsedUrl = new URL(resourceUrl, pageUrl); // Tratar URLs relativos
      let fileName = path.basename(parsedUrl.pathname);

      // Substituir caracteres inválidos no nome do arquivo
      fileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");

      if (
        fileName.endsWith(".jpg") ||
        fileName.endsWith(".jpeg") ||
        fileName.endsWith(".png")
      ) {
        const destination = path.join(imgSourceDir, fileName);
        await downloadResource(parsedUrl.href, destination);

        quintoAndarImgSubDirs.forEach(async (subDir) => {
          const symlinkDestination = path.join(imgsDir, subDir, fileName);
          if (!fs.existsSync(symlinkDestination)) {
            fs.symlinkSync(destination, symlinkDestination);
          }
          resourceMapping[
            parsedUrl.href
          ] = `http://127.0.0.1:5500/img/${subDir}/${fileName}`;
        });
      }
    } catch (error) {
      console.error(`Failed to download ${resourceUrl}: ${error.message}`);
    }
  });

  await Promise.all(downloadPromises);

  const pattern = /\/imovel\/(\d+)\//;
  const match = pageUrl.match(pattern);
  const imovelId = match[1];

  // Modificar o HTML para referenciar os recursos locais
  let htmlContent = await page.content();

  // Substituir URLs antigos pelos novos caminhos locais
  for (const [originalUrl, localPath] of Object.entries(resourceMapping)) {
    htmlContent = htmlContent.replace(
      new RegExp(originalUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
      localPath
    );
  }
  const outputPath = path.join(
    quintoAndarWebPagesDir,
    `imovel_${imovelId}.html`
  );

  fs.writeFileSync(outputPath, htmlContent);

  await browser.close();

  console.log(`Página capturada e salva como '${outputPath}'`);
})();
