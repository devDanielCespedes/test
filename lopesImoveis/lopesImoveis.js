import path from "path";
import { fileURLToPath } from "url";
import { getImovelIdByRegex } from "../global/getImovelIdByRegex.js";
import { capturePage, createDirectories } from "../global/commonScript.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pageUrl =
  "https://www.lopes.com.br/imovel/REO496459/venda-apartamento-3-quartos-sao-paulo-jardim-america?listFrom=sugerido&listPosition=1";

const imovelId = getImovelIdByRegex({
  regex: /https:\/\/www\.lopes\.com\.br\/imovel\/([A-Z]{3}\d+)/,
  stringToApplyRegex: pageUrl,
});

const lopesImoveisImgSubDirs = [imovelId];

const { imgsDir, imovelDir } = createDirectories({
  imovelId,
  imgSubDirs: lopesImoveisImgSubDirs,
  dirName: __dirname,
});

const modifyHtmlForLopes = (htmlContent, imovelDir) => {
  const logoPath = path.join(imovelDir, "img/REO835156/default_logo.svg");
  return htmlContent.replace("/assets/svgs/default_logo.svg", logoPath);
};

capturePage({
  pageUrl,
  imgSubDirs: lopesImoveisImgSubDirs,
  imgsDir,
  imovelDir,
  waitForSelector: "img",
  modifyHtmlForLopes,
})
  .then((outputPath) => {
    console.log(`Página capturada e salva como '${outputPath}'`);
  })
  .catch((error) => {
    console.error(`Erro ao capturar a página: ${error.message}`);
  });
