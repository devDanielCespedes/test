import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import { downloadResource } from "../global/downloadResource.js";
import { getImovelIdByRegex } from "../global/getImovelIdByRegex.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pageUrl =
  "https://www.zapimoveis.com.br/imovel/venda-casa-de-condominio-3-quartos-com-piscina-gran-royalle-casa-branca-piedade-do-paraopeba-brumadinho-mg-270m2-id-2727383056/";

console.info("Pegando id do imovel na url");

const imovelId = getImovelIdByRegex({
  regex: /id-(\d+)\//,
  stringToApplyRegex: pageUrl,
});

console.info(`Imovel id: ${imovelId}`);
console.info("Criando diretórios para salvar os arquivos");

const imovelDir = path.join(__dirname, `imovel_${imovelId}`);
if (!fs.existsSync(imovelDir)) {
  fs.mkdirSync(imovelDir);
}

const imgsDir = path.join(imovelDir, "img");
if (!fs.existsSync(imgsDir)) {
  fs.mkdirSync(imgsDir);
}

const zapImoveisImgSubDirs = [
  "340w",
  "768w",
  "1080w",
  "200x200",
  "614x297",
  "870x707",
];

zapImoveisImgSubDirs.forEach((subDir) => {
  const imgSubDirs = path.join(imgsDir, subDir);
  if (!fs.existsSync(imgSubDirs)) {
    fs.mkdirSync(imgSubDirs);
  }
});

console.info("Diretórios criados com sucesso");

console.info("Iniciando captura da página");

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
  });
  console.info("Browser iniciado");
  const page = await browser.newPage();
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
  );

  await page.goto(pageUrl, { waitUntil: "networkidle2" });
  console.info("Página carregada");
  await page.waitForSelector(".carousel-photos--item");
  console.info("Elementos carregados");

  console.info("Extraindo recursos da página");
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

  const resourceMapping = {};

  const generateHash = (url) => {
    return crypto.createHash("md5").update(url).digest("hex");
  };

  console.info("Baixando recursos");
  const downloadPromises = resourceUrls.map(async (resourceUrl) => {
    try {
      const parsedUrl = new URL(resourceUrl, pageUrl);
      let fileName = path.basename(parsedUrl.pathname);

      const hash = generateHash(resourceUrl);
      const fileExtension = path.extname(fileName);
      fileName = `${path.basename(
        fileName,
        fileExtension
      )}_${hash}${fileExtension}`;
      fileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");

      if (
        fileName.endsWith(".jpg") ||
        fileName.endsWith(".jpeg") ||
        fileName.endsWith(".png") ||
        fileName.endsWith(".webp")
      ) {
        zapImoveisImgSubDirs.forEach(async (subDir) => {
          const destination = path.join(imgsDir, subDir, fileName);
          await downloadResource(parsedUrl.href, destination);
          resourceMapping[
            parsedUrl.href
          ] = `http://127.0.0.1:5500/zapImoveis/imovel_${imovelId}/img/${subDir}/${fileName}`;
        });
      }
    } catch (error) {
      console.error(`Failed to download ${resourceUrl}: ${error.message}`);
    }
  });

  await Promise.all(downloadPromises);

  console.info("Recursos baixados com sucesso");
  console.info("Modificando HTML para referenciar os recursos locais");
  let htmlContent = await page.content();
  for (const [originalUrl, localPath] of Object.entries(resourceMapping)) {
    htmlContent = htmlContent.replace(
      new RegExp(originalUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
      localPath
    );
  }

  console.info("Salvando HTML");
  const outputPath = path.join(imovelDir, `page.html`);
  fs.writeFileSync(outputPath, htmlContent);

  await browser.close();

  console.log(`Página capturada e salva como '${outputPath}'`);
})();
