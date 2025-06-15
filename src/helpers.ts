export const getAlphabetLetter = (index: number): string => {
  let result = "";
  index += 1;

  while (index > 0) {
    index--;
    const charCode = (index % 26) + 65;
    result = String.fromCharCode(charCode) + result;
    index = Math.floor(index / 26);
  }

  return result;
};
