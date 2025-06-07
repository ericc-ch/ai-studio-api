export async function findAsync<T>(
  array: Array<T>,
  predicate: (item: T) => Promise<boolean>,
) {
  const promises = array.map((element) => predicate(element))
  const results = await Promise.all(promises)
  const index = results.indexOf(true)

  return index === -1 ? undefined : array[index]
}
