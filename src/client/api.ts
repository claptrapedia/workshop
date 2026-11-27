export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: init?.body instanceof FormData ? init.headers : { 'Content-Type': 'application/json', ...init?.headers },
  })
  const text = await response.text()
  const body = text ? (JSON.parse(text) as { error?: string }) : {}
  if (!response.ok) throw new Error(body.error || response.statusText)
  return body as T
}
