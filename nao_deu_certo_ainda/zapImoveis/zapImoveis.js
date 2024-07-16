import path from "path";
import { fileURLToPath } from "url";
import { getImovelIdByRegex } from "../../global/getImovelIdByRegex.js";
import { capturePage, createDirectories } from "../../global/commonScript.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pageUrl =
  "https://www.zapimoveis.com.br/imovel/venda-casa-de-condominio-3-quartos-com-piscina-gran-royalle-casa-branca-piedade-do-paraopeba-brumadinho-mg-270m2-id-2727383056/";

const imovelId = getImovelIdByRegex({
  regex: /id-(\d+)\//,
  stringToApplyRegex: pageUrl,
});

const zapImoveisImgSubDirs = [
  "340w",
  "768w",
  "1080w",
  "200x200",
  "614x297",
  "870x707",
];

const { imgsDir, imovelDir } = createDirectories({
  imovelId,
  imgSubDirs: zapImoveisImgSubDirs,
  dirName: __dirname,
});

capturePage({
  pageUrl,
  imgSubDirs: zapImoveisImgSubDirs,
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
