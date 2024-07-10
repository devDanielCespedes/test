// ainda n funcionou

import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import fetch from "node-fetch";
import crypto from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Função para baixar recursos
async function downloadResource(resourceUrl, destination) {
  try {
    const response = await fetch(resourceUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(destination, buffer);
  } catch (error) {
    console.error(`Failed to download ${resourceUrl}: ${error.message}`);
  }
}

const resourcesDir = path.join(__dirname, "resources");
if (!fs.existsSync(resourcesDir)) {
  fs.mkdirSync(resourcesDir);
}

const chavesNaMaoWebPagesDir = path.join(__dirname, "chavesNaMaoWebPages");
if (!fs.existsSync(chavesNaMaoWebPagesDir)) {
  fs.mkdirSync(chavesNaMaoWebPagesDir);
}

const chavesNaMaoImgs = path.join(__dirname, "imn");
if (!fs.existsSync(chavesNaMaoImgs)) {
  fs.mkdirSync(chavesNaMaoImgs);
}

const quintoAndarImgSubDirs = ["0640X0480", "0320x0200"];

quintoAndarImgSubDirs.forEach((subDir) => {
  const imgSubDirs = path.join(imgsDir, subDir);
  if (!fs.existsSync(imgSubDirs)) {
    fs.mkdirSync(imgSubDirs);
  }
});

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
  });

  const page = await browser.newPage();
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
  );

  const pageUrl =
    "https://www.chavesnamao.com.br/imovel/galpao-a-venda-sp-bauru-vila-santa-ines-430m2-RS550000/id-14715753/";

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

  console.log("resourceUrls", resourceUrls);

  // Mapeamento dos URLs dos recursos para seus novos caminhos locais
  const resourceMapping = {};

  // Função para gerar um hash MD5 a partir da URL
  const generateHash = (url) => {
    return crypto.createHash("md5").update(url).digest("hex");
  };

  // Baixar e salvar todos os recursos
  const downloadPromises = resourceUrls.map(async (resourceUrl) => {
    try {
      const parsedUrl = new URL(resourceUrl, pageUrl); // Tratar URLs relativos
      let fileName = path.basename(parsedUrl.pathname);

      // Adicionar um hash ao nome do arquivo para garantir unicidade
      const hash = generateHash(resourceUrl);
      const fileExtension = path.extname(fileName);
      fileName = `${path.basename(
        fileName,
        fileExtension
      )}_${hash}${fileExtension}`;

      // Substituir caracteres inválidos no nome do arquivo
      fileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");

      const destination = path.join(resourcesDir, fileName);
      await downloadResource(parsedUrl.href, destination);

      resourceMapping[parsedUrl.href] = `./resources/${fileName}`;
    } catch (error) {
      console.error(`Failed to download ${resourceUrl}: ${error.message}`);
    }
  });

  await Promise.all(downloadPromises);

  const regex = /id-(\d+)\//;
  const match = pageUrl.match(regex);
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
    chavesNaMaoWebPagesDir,
    `imovel_${imovelId}.html`
  );

  fs.writeFileSync(outputPath, htmlContent);

  await browser.close();

  console.log(`Página capturada e salva como '${outputPath}'`);
})();

{
  /* <picture id="ssrImage"><img src="https://www.chavesnamao.com.br/imn/0640X0480/N/imoveis/206418/14715753/sp-bauru-vila-santa-ines-barracao-galpao-deposito-a-venda-64b8092a-1.jpg" alt="Barracão à venda, 430 m² por R$ 550.000,00 - Vila Santa Inês - Bauru/SP" width="640" height="480"></picture> */
}

{
  /* <picture disabled=""><img src="https://www.chavesnamao.com.br/imn/0320x0200/N/imoveis/206418/14715753/sp-bauru-vila-santa-ines-barracao-galpao-deposito-a-venda-64b8092a-2.jpg" alt="Barracão à venda, 430 m² por R$ 550.000,00 - Vila Santa Inês - Bauru/SP" width="320" height="200"></picture> */
}
