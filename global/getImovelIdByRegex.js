export const getImovelIdByRegex = ({ regex, stringToApplyRegex }) => {
  console.info("Pegando id do imovel na url");
  const match = stringToApplyRegex.match(regex);
  const imovelId = match[1];
  console.info(`Imovel id: ${imovelId}`);
  return imovelId;
};
