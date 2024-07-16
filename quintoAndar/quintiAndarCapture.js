import path from "path";
import { fileURLToPath } from "url";
import { getImovelIdByRegex } from "../global/getImovelIdByRegex.js";
import { capturePage, createDirectories } from "../global/commonScript.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pageUrl =
  "https://www.quintoandar.com.br/imovel/894538464/comprar/apartamento-3-quartos-guapira-sao-paulo?from_route=%22search_results%22&house_tags=newAd&search_id=%221becee17-3e3f-4a72-bcde-1d3b5d07e5e9%22&search_rank=%7B%22sortMode%22%3A%22relevance%22%2C%22searchMode%22%3A%22list%22%2C%22resultsOrigin%22%3A%22search%22%2C%22rank%22%3A1%2C%22personalization%22%3Afalse%7D";

const imovelId = getImovelIdByRegex({
  regex: /\/imovel\/(\d+)\//,
  stringToApplyRegex: pageUrl,
});

const quintoAndarImgSubDirs = [
  "xsm",
  "sml",
  "med",
  "lrg",
  "xlg",
  "xxl",
  "1200x800",
];

const { imgsDir, imovelDir } = createDirectories({
  imovelId,
  imgSubDirs: quintoAndarImgSubDirs,
  dirName: __dirname,
});

capturePage({
  pageUrl,
  imgSubDirs: quintoAndarImgSubDirs,
  imgsDir,
  imovelDir,
  waitForSelector: ".MediaImage_styledImage__D11Ov",
  imovelId,
})
  .then((outputPath) => {
    console.log(`Página capturada e salva como '${outputPath}'`);
  })
  .catch((error) => {
    console.error(`Erro ao capturar a página: ${error.message}`);
  });
