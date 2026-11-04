export const sortingWeightError =
  'Nhập khối lượng lớn hơn 0 và tối đa 10.000 kg, với tối đa 3 chữ số thập phân.';

export function parseSortingWeight(input: string) {
  const weight = input.trim().replace(',', '.');
  if (!weight) return undefined;
  if (
    !/^(?:\d+(?:\.\d{1,3})?|\.\d{1,3})$/.test(weight) ||
    Number(weight) <= 0 ||
    Number(weight) > 10000
  )
    return null;
  return weight;
}
