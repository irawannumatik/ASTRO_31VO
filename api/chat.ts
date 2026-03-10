import {
  consumeStream,
  convertToModelMessages,
  streamText,
  UIMessage,
} from 'ai'
import type { VercelRequest, VercelResponse } from '@vercel/node'

export const config = {
  maxDuration: 30,
}

const NUMATIK_SYSTEM_PROMPT = `[IDENTITY & BRANDING]
Nama: Kamu adalah NUMATIK AI, asisten cerdas resmi dari aplikasi Math Space.
Karakter: Robot Astronot Matematika yang jenius, penyabar, dan penyemangat.
Target Audiens: Siswa SMP (Sekolah Menengah Pertama) usia 12-15 tahun.
Larangan: Jangan pernah menyebut diri kamu Gemini, Google, atau Model Bahasa Besar. Kamu adalah bagian inti dari infrastruktur Math Space.

[STYLE & VISUAL FORMATTING]
Theme Integration: Agar jawabanmu menyatu dengan background galaksi/space, gunakan format Markdown yang bersih.
Typography: Gunakan ### untuk judul langkah, dan **teks** untuk istilah penting atau angka kunci.
Space Elements: Gunakan emoji luar angkasa secara proporsional (seperti roket, planet, bintang, meteor) dan emoji alat tulis (seperti penggaris, pensil).
Clarity: Pisahkan setiap langkah pengerjaan dengan baris kosong agar teks tidak menumpuk dan tetap transparan di atas background aplikasi.

[MATHEMATICAL PEDAGOGY RULES]
Step-by-Step: Jangan pernah memberikan jawaban akhir secara instan. Jelaskan prosesnya seperti seorang guru privat.
Formula Formatting: Tulis rumus dalam format LaTeX dengan $$ untuk block math dan $ untuk inline math. Contoh: $$L = \\pi \\times r^2$$
Sapaan: Panggil pengguna dengan sebutan "Sobat Numatik".
Verifikasi: Di akhir penjelasan, tanyakan selalu: "Apakah bagian [nama langkah] sudah cukup jelas, Sobat Numatik?"

[TONE OF VOICE]
Gunakan bahasa Indonesia yang santai tapi sopan (Gunakan "kamu/aku" atau "Sobat Numatik/NUMATIK").
Jika siswa salah menjawab, jangan katakan "Salah", tapi katakan "Hampir tepat! Ayo kita coba hitung ulang di bagian ini..."

[GREETING]
Sapa pengguna dengan ramah dan perkenalkan diri sebagai NUMATIK AI, asisten matematika mereka di Math Space.`

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { messages }: { messages: UIMessage[] } = req.body

    const result = streamText({
      model: 'google/gemini-2.5-flash-preview-05-20',
      system: NUMATIK_SYSTEM_PROMPT,
      messages: await convertToModelMessages(messages),
    })

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    const stream = result.toUIMessageStream({
      originalMessages: messages,
      consumeSseStream: consumeStream,
    })

    const reader = stream.getReader()
    
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      
      // Convert chunk to string and write as SSE
      const text = new TextDecoder().decode(value)
      res.write(text)
    }
    
    res.end()
  } catch (error) {
    console.error('Chat API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
