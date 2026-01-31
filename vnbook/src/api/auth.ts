import request from './request'
import type { LoginRequest, LoginResponse, ApiResponse, NonceResponse } from '@/types'

/**
 * SHA-256 哈希函数（纯JavaScript实现，兼容所有环境）
 * 基于FIPS 180-4标准实现
 */
async function sha256(message: string): Promise<string> {
  // SHA-256 constants (first 32 bits of fractional parts of cube roots of first 64 primes)
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]

  // Helper functions
  const rightRotate = (value: number, amount: number) => {
    return (value >>> amount) | (value << (32 - amount))
  }

  // Convert string to UTF-8 bytes array
  const encoder = new TextEncoder()
  const data = encoder.encode(message)

  // Calculate message length in bits
  const msgLenBits = data.length * 8

  // Padding: append bit '1' to message
  const paddedLen = Math.ceil((data.length + 9) / 64) * 64
  const padded = new Uint8Array(paddedLen)
  padded.set(data)
  padded[data.length] = 0x80

  // Append message length as 64-bit big-endian integer
  const view = new DataView(padded.buffer)
  view.setUint32(paddedLen - 4, msgLenBits & 0xffffffff, false)
  view.setUint32(paddedLen - 8, Math.floor(msgLenBits / 0x100000000), false)

  // Initialize hash values (first 32 bits of fractional parts of square roots of first 8 primes)
  let h0 = 0x6a09e667
  let h1 = 0xbb67ae85
  let h2 = 0x3c6ef372
  let h3 = 0xa54ff53a
  let h4 = 0x510e527f
  let h5 = 0x9b05688c
  let h6 = 0x1f83d9ab
  let h7 = 0x5be0cd19

  // Process message in 512-bit chunks
  for (let chunkStart = 0; chunkStart < padded.length; chunkStart += 64) {
    const w = new Uint32Array(64)

    // Copy chunk into first 16 words w[0..15] of message schedule array
    for (let i = 0; i < 16; i++) {
      const offset = chunkStart + i * 4
      w[i] =
        ((padded[offset] || 0) << 24) |
        ((padded[offset + 1] || 0) << 16) |
        ((padded[offset + 2] || 0) << 8) |
        (padded[offset + 3] || 0)
    }

    // Extend the first 16 words into remaining 48 words w[16..63]
    for (let i = 16; i < 64; i++) {
      const w15 = w[i - 15]!
      const w2 = w[i - 2]!
      const s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)
      const s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10)
      w[i] = (w[i - 16]! + s0 + w[i - 7]! + s1) >>> 0
    }

    // Initialize working variables
    let a = h0,
      b = h1,
      c = h2,
      d = h3
    let e = h4,
      f = h5,
      g = h6,
      h = h7

    // Compression function main loop
    for (let i = 0; i < 64; i++) {
      const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)
      const ch = (e & f) ^ (~e & g)
      const temp1 = (h + S1 + ch + K[i]! + w[i]!) >>> 0
      const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)
      const maj = (a & b) ^ (a & c) ^ (b & c)
      const temp2 = (S0 + maj) >>> 0

      h = g
      g = f
      f = e
      e = (d + temp1) >>> 0
      d = c
      c = b
      b = a
      a = (temp1 + temp2) >>> 0
    }

    // Add compressed chunk to current hash value
    h0 = (h0 + a) >>> 0
    h1 = (h1 + b) >>> 0
    h2 = (h2 + c) >>> 0
    h3 = (h3 + d) >>> 0
    h4 = (h4 + e) >>> 0
    h5 = (h5 + f) >>> 0
    h6 = (h6 + g) >>> 0
    h7 = (h7 + h) >>> 0
  }

  // Produce the final hash value as hex string
  const toHex = (n: number) => n.toString(16).padStart(8, '0')
  return (
    toHex(h0) + toHex(h1) + toHex(h2) + toHex(h3) + toHex(h4) + toHex(h5) + toHex(h6) + toHex(h7)
  )
}

/**
 * 获取登录Nonce
 */
export const getNonce = (username: string) => {
  return request.get<NonceResponse>('/getnonce.php', {
    params: { uname: username },
    headers: {
      'X-No-Loading': 'true',
    },
  })
}

/**
 * 检查登录状态
 */
export const checkLogin = () => {
  return request.get<LoginResponse>('/dologin.php', {
    params: { act: 'check' },
  })
}

/**
 * 用户登录（使用Nonce双重哈希）
 */
export const login = async (data: LoginRequest) => {
  // 1. 获取nonce
  const nonceResp = await getNonce(data.uname)
  if (nonceResp.data.success !== true || !nonceResp.data.nonce) {
    throw new Error('Failed to get login nonce')
  }

  const nonce = nonceResp.data.nonce

  // 2. 计算双重哈希: Hash(Hash(password) + nonce)
  const hash1 = await sha256(data.pass)
  const hash2 = await sha256(hash1 + nonce)

  // 3. 提交验证
  const params = new URLSearchParams()
  params.append('uname', data.uname)
  params.append('response', hash2)
  params.append('keepme', data.remember ? '1' : '0')

  return request.post<LoginResponse>('/dologin.php', params, {
    params: { act: 'logon' },
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  })
}

/**
 * 注销登录
 */
export const logout = () => {
  return request.get<ApiResponse>('/dologin.php', {
    params: { act: 'logout' },
  })
}

/**
 * 修改用户信息
 */
export const updateUserInfo = (data: {
  oldpass?: string
  newpass?: string
  newpass2?: string
  dispname?: string
  cfg?: Record<string, unknown>
}) => {
  const formData = new FormData()
  if (data.oldpass) formData.append('upassold', data.oldpass)
  if (data.newpass) formData.append('upassnew', data.newpass)
  if (data.dispname) formData.append('dname', data.dispname)
  if (data.cfg) formData.append('cfg', JSON.stringify(data.cfg))

  return request.post<ApiResponse>('/usermod.php', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
}
