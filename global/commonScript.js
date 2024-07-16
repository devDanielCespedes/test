import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { downloadResource } from "../global/downloadResource.js";

export const createDirectories = ({
  imovelId,
  imgSubDirs,
  dirName,
  additionalDirCallback,
}) => {
  console.info("Criando diretórios para salvar os arquivos");

  const imovelDir = path.join(dirName, `imovel_${imovelId}`);
  if (!fs.existsSync(imovelDir)) {
    fs.mkdirSync(imovelDir);
  }

  const imgsDir = path.join(imovelDir, "img");
  if (!fs.existsSync(imgsDir)) {
    fs.mkdirSync(imgsDir);
  }

  const resourcesDir = path.join(imovelDir, "resources");
  if (!fs.existsSync(resourcesDir)) {
    fs.mkdirSync(resourcesDir);
  }

  imgSubDirs.forEach((subDir) => {
    const imgSubDirs = path.join(imgsDir, subDir);
    if (!fs.existsSync(imgSubDirs)) {
      fs.mkdirSync(imgSubDirs);
    }
  });

  const additionalDir = additionalDirCallback
    ? additionalDirCallback(dirName)
    : {};

  console.info("Diretórios criados com sucesso");

  return { imovelDir, imgsDir, additionalDir };
};

export const capturePage = async ({
  pageUrl,
  imgSubDirs,
  imgsDir,
  imovelDir,
  waitForSelector,
  additionalDir,
  fileCallback,
  imovelId,
}) => {
  console.info("Iniciando captura da página");
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  console.info("Browser iniciado");
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
  );
  console.info(`Acessando página: ${pageUrl}`);
  await page.goto(pageUrl, { waitUntil: "networkidle2" });
  await page.screenshot({ path: "screenshot.png", fullPage: true });

  console.info(`Aguardando Seletor: ${waitForSelector}`);
  await page.waitForSelector(waitForSelector);
  await page.screenshot({ path: "screenshot.png", fullPage: true });

  console.info(`Aguardando Seletor: [data-testid="house-main-info"]`);
  await page.waitForSelector('[data-testid="house-main-info"]', {
    timeout: 60000,
  });

  await page.screenshot({ path: "screenshot.png", fullPage: true });

  await page.waitForSelector(".MediaImage_styledImage__D11Ov");

  console.info("Elementos carregados");

  console.info("Extraindo recursos da página");

  const resourceUrls = await page.evaluate(() => {
    const urls = [];
    document
      .querySelectorAll(
        'link[rel="stylesheet"], script[src], img[src], img[srcset], img[data-src], img[data-srcset], a[href]'
      )
      .forEach((element) => {
        if (element.href && !element.href.startsWith("data:")) {
          urls.push(element.href);
        } else if (element.src && !element.src.startsWith("data:")) {
          urls.push(element.src);
        } else if (element.srcset) {
          element.srcset.split(",").forEach((srcsetItem) => {
            const url = srcsetItem.trim().split(" ")[0];
            if (!url.startsWith("data:")) {
              urls.push(url);
            }
          });
        } else if (
          element.dataset.src &&
          !element.dataset.src.startsWith("data:")
        ) {
          urls.push(element.dataset.src);
        } else if (element.dataset.srcset) {
          element.dataset.srcset.split(",").forEach((srcsetItem) => {
            const url = srcsetItem.trim().split(" ")[0];
            if (!url.startsWith("data:")) {
              urls.push(url);
            }
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
      const parsedUrl = new URL(resourceUrl, pageUrl); // Tratar URLs relativos
      let fileName = path.basename(parsedUrl.pathname);

      // Substituir caracteres inválidos no nome do arquivo
      fileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");

      if (
        fileName.endsWith(".jpg") ||
        fileName.endsWith(".jpeg") ||
        fileName.endsWith(".png") ||
        fileName.endsWith(".webp")
      ) {
        for (const subDir of imgSubDirs) {
          const destination = path.join(imgsDir, subDir, fileName);
          await downloadResource(parsedUrl.href, destination);
          resourceMapping[
            `${parsedUrl.origin}${parsedUrl.pathname}`
          ] = `http://127.0.0.1:5500/${imovelDir}/imovel_${imovelId}/img/${subDir}/${fileName}`;
        }
      } else {
        const destination = path.join(imovelDir, "resources", fileName);
        await downloadResource(parsedUrl.href, destination);
        resourceMapping[
          `${parsedUrl.origin}${parsedUrl.pathname}`
        ] = `./resources/${fileName}`;
      }

      console.log(
        "resourceMapping[parsedUrl.href]",
        resourceMapping[`${parsedUrl.origin}${parsedUrl.pathname}`],
        "resourceMapping",
        resourceMapping,
        "parsedUrl.href",
        parsedUrl.href
      );
    } catch (error) {
      console.error(`Failed to download ${resourceUrl}: ${error.message}`);
    }
  });

  await Promise.all(downloadPromises);

  console.info("Recursos baixados com sucesso");
  console.info("Modificando HTML para referenciar os recursos locais");

  let htmlContent = await page.content();

  // Remover todos os scripts e substituir por old-script
  htmlContent = htmlContent.replace(
    /<script([^>]*)src="([^"]*)"([^>]*)><\/script>/gi,
    '<old-script$1old-src="$2"$3 style="display:none;"></old-script>'
  );

  // Substituir scripts inline
  htmlContent = htmlContent.replace(
    /<script([^>]*)>([\s\S]*?)<\/script>/gi,
    '<old-script$1 style="display:none;">$2</old-script>'
  );

  for (const [originalUrl, localPath] of Object.entries(resourceMapping)) {
    const regex = new RegExp(
      originalUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "g"
    );
    htmlContent = htmlContent.replace(regex, localPath);
  }

  // Função para substituir URLs nos atributos srcset e data-srcset
  const replaceSrcsetUrls = (match, p1) => {
    const srcsetUrls = p1.split(",").map((url) => {
      const [urlPath, size] = url.trim().split(" ");
      if (urlPath.startsWith("/")) {
        const newUrlPath = `http://127.0.0.1:5500/quintoAndar/imovel_${imovelId}${urlPath}`;
        return `${newUrlPath} ${size}`;
      }
      return url;
    });
    return `srcset="${srcsetUrls.join(", ")}"`;
  };

  // Adicionar URL base para as imagens nos atributos src, srcset, data-src, data-srcset
  const attributes = ["src", "data-src", "href"];
  for (const attribute of attributes) {
    const regex = new RegExp(`${attribute}="([^"]+)"`, "g");
    htmlContent = htmlContent.replace(regex, (match, p1) => {
      if (p1.startsWith("/")) {
        const newUrlPath = `http://127.0.0.1:5500/quintoAndar/imovel_${imovelId}${p1}`;
        return `${attribute}="${newUrlPath}"`;
      }
      return match;
    });
  }

  // Adicionar URL base para as imagens no atributo srcset
  const srcsetRegex = /srcset="([^"]+)"/g;
  htmlContent = htmlContent.replace(srcsetRegex, replaceSrcsetUrls);

  // Adicionar URL base para as imagens no atributo data-srcset
  const dataSrcsetRegex = /data-srcset="([^"]+)"/g;
  htmlContent = htmlContent.replace(dataSrcsetRegex, replaceSrcsetUrls);

  // Baixar e embutir CSS inline
  const cssUrls = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map(
      (link) => link.href
    );
  });

  const cssPromises = cssUrls.map(async (cssUrl) => {
    try {
      const response = await fetch(cssUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const cssContent = await response.text();
      htmlContent = htmlContent.replace(
        new RegExp(
          `<link[^>]*href="${cssUrl.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
          )}"[^>]*>`,
          "g"
        ),
        `<style>${cssContent}</style>`
      );
    } catch (error) {
      console.error(`Failed to download CSS ${cssUrl}: ${error.message}`);
    }
  });

  await Promise.all(cssPromises);

  console.info("Salvando HTML");
  const outputPath = path.join(imovelDir, `page.html`);
  fs.writeFileSync(outputPath, htmlContent);

  await browser.close();
  return outputPath;
};
