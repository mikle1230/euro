// 客户端 API Token 存取：/api/parse-itinerary 的鉴权凭证。
// 服务端在 .env.local 配置 PARSE_API_TOKEN；前端把同样的值存到
// localStorage（设置弹窗里填入），请求时带 Authorization: Bearer <token>。
const TOKEN_KEY = 'euro-parse-token'

export function getApiToken() {
  if (typeof window === 'undefined') return ''
  try {
    return localStorage.getItem(TOKEN_KEY) || ''
  } catch { return '' }
}

export function setApiToken(token) {
  if (typeof window === 'undefined') return
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token.trim())
    else localStorage.removeItem(TOKEN_KEY)
  } catch { /* ignore */ }
}
