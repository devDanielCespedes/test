import path from "path";
import { fileURLToPath } from "url";
import { getImovelIdByRegex } from "../../global/getImovelIdByRegex.js";
import { capturePage, createDirectories } from "../../global/commonScript.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pageUrl =
  "https://www.vivareal.com.br/imovel/casa-2-quartos-sao-mateus-zona-leste-sao-paulo-com-garagem-78m2-aluguel-RS1250-id-2727844548/";

const imovelId = getImovelIdByRegex({
  regex: /id-(\d+)\//,
  stringToApplyRegex: pageUrl,
});

const vivaRealImgSubDirs = [
  "340w",
  "768w",
  "1080w",
  "200x200",
  "614x297",
  "870x707",
];

const { imgsDir, imovelDir } = createDirectories({
  imovelId,
  imgSubDirs: vivaRealImgSubDirs,
  dirName: __dirname,
});
capturePage({
  pageUrl,
  imgSubDirs: vivaRealImgSubDirs,
  imgsDir,
  imovelDir,
  waitForSelector: ".carousel-photos--item",
})
  .then((outputPath) => {
    console.log(`Página capturada e salva como '${outputPath}'`);
  })
  .catch((error) => {
    console.error(`Erro ao capturar a página: ${error.message}`);
  });
