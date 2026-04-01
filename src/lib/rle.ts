export function rleEncode(str: string): string {
  if (str.length === 0) return ''
  let result = ''
  let i = 0
  while (i < str.length) {
    const char = str[i]
    let count = 1
    while (i + count < str.length && str[i + count] === char) count++
    if (count >= 3) {
      result += `~${count}~${char}`
    } else {
      for (let j = 0; j < count; j++) result += char
    }
    i += count
  }
  return result
}

export function rleDecode(encoded: string): string {
  return encoded.replace(/~(\d+)~(.)/g, (_, count, char) =>
    char.repeat(Number(count)),
  )
}
