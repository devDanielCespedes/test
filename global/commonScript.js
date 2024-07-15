import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { downloadResource } from "../global/downloadResource.js";

export const createDirectories = ({ imovelId, imgSubDirs, dirName }) => {
  console.info("Criando diretórios para salvar os arquivos");

  const imovelDir = path.join(dirName, `imovel_${imovelId}`);
  if (!fs.existsSync(imovelDir)) {
    fs.mkdirSync(imovelDir);
  }

  const imgsDir = path.join(imovelDir, "img");
  if (!fs.existsSync(imgsDir)) {
    fs.mkdirSync(imgsDir);
  }

  imgSubDirs.forEach((subDir) => {
    const imgSubDirs = path.join(imgsDir, subDir);
    if (!fs.existsSync(imgSubDirs)) {
      fs.mkdirSync(imgSubDirs);
    }
  });
  console.info("Diretórios criados com sucesso");

  return { imovelDir, imgsDir };
};

export const capturePage = async ({
  pageUrl,
  imgSubDirs,
  imgsDir,
  imovelDir,
  waitForSelector,
}) => {
  console.info("Iniciando captura da página");
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  console.info("Browser iniciado");
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
  );
  console.info(`Acessando página: ${pageUrl}`);
  await page.goto(pageUrl, { waitUntil: "networkidle2" });
  console.info(`Aguardando Seletor: ${waitForSelector}`);
  await page.waitForSelector(waitForSelector);
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
  console.info("Recursos extraídos com sucesso");
  const resourceMapping = {};
  const generateHash = (url) =>
    crypto.createHash("md5").update(url).digest("hex");
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

      // Replace invalid characters in the file name
      fileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");

      if (
        fileName.endsWith(".jpg") ||
        fileName.endsWith(".jpeg") ||
        fileName.endsWith(".png") ||
        fileName.endsWith(".webp") ||
        fileName.endsWith(".svg") ||
        fileName.endsWith(".gif") ||
        fileName.endsWith(".ico")
      ) {
        imgSubDirs.forEach(async (subDir) => {
          const destination = path.join(imgsDir, subDir, fileName);
          await downloadResource(parsedUrl.href, destination);
          resourceMapping[
            parsedUrl.href
          ] = `http://127.0.0.1:5500/${imovelDir}/img/${subDir}/${fileName}`;
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
  return outputPath;
};
