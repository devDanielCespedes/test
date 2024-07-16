import path from "path";
import { fileURLToPath } from "url";
import { getImovelIdByRegex } from "../../global/getImovelIdByRegex.js";
import { capturePage, createDirectories } from "../../global/commonScript.js";
import fs from "fs";
import { downloadResource } from "../../global/downloadResource.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pageUrl =
  "https://www.lopes.com.br/imovel/REO918051/venda-apartamento-3-quartos-sao-paulo-jardim-paulista?listFrom=sugerido&listPosition=3";

const imovelId = getImovelIdByRegex({
  regex: /https:\/\/www\.lopes\.com\.br\/imovel\/([A-Z]{3}\d+)/,
  stringToApplyRegex: pageUrl,
});

const lopesImoveisImgSubDirs = [imovelId];

const additionalDirCallback = (lopesImovelBasePath) => {
  const assetsDir = path.join(lopesImovelBasePath, "assets/svgs");
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }
  return assetsDir;
};

const { imgsDir, imovelDir, additionalDir } = createDirectories({
  imovelId,
  imgSubDirs: lopesImoveisImgSubDirs,
  dirName: __dirname,
  additionalDirCallback,
});

const handleSvgFiles = async ({
  parsedUrl,
  fileName,
  fileExtension,
  svgDir,
  resourceMapping,
}) => {
  if (fileExtension === ".svg") {
    console.log("fileExtension === .svg", fileExtension === ".svg");
    console.log("file extension handle", fileExtension);
    const destination = path.join(svgDir, fileName);
    await downloadResource(parsedUrl.href, destination);
    resourceMapping[parsedUrl.href] = destination;
    return true; // Skip further processing for this file
  }
  return false; // Continue with normal processing
};

capturePage({
  pageUrl,
  imgSubDirs: lopesImoveisImgSubDirs,
  imgsDir,
  imovelDir,
  waitForSelector: "img",
  additionalDir,
  fileCallback: handleSvgFiles,
})
  .then((outputPath) => {
    console.log(`Página capturada e salva como '${outputPath}'`);
  })
  .catch((error) => {
    console.error(`Erro ao capturar a página: ${error.message}`);
  });
