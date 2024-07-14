export const getImovelIdByRegex = ({ regex, stringToApplyRegex }) => {
  const match = stringToApplyRegex.match(regex);
  const imovelId = match[1];
  return imovelId;
};
