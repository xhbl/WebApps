import { ref, type Ref } from 'vue'
import { getAudioUrl } from '@/api/words'
import { useWordsStore } from '@/stores/words'

// 创建单例 Audio 实例，防止多个播放重叠
const audio = new Audio()
const loadingWord = ref<string | null>(null)

// TTS 兜底函数
const speakTTS = (word: string) => {
  if ('speechSynthesis' in window) {
    // 如果有正在进行的语音，取消它
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel()
    }
    const msg = new SpeechSynthesisUtterance(word)
    msg.lang = 'en-US'
    const voices = window.speechSynthesis.getVoices()
    // 尝试寻找原生美式发音，否则使用默认
    const usVoice = voices.find((voice) => voice.lang === 'en-US' && voice.localService)
    const bestVoice = usVoice || voices.find((voice) => voice.lang === 'en-US')
    if (bestVoice) {
      msg.voice = bestVoice
    }
    window.speechSynthesis.speak(msg)
  }
}

const playAudio = (url: string, word: string, loadingWordRef: Ref<string | null>) => {
  try {
    audio.src = url
    // 当音频文件加载或播放失败时
    audio.onerror = () => {
      console.error('Audio playback failed, falling back to TTS.')
      speakTTS(word)
      loadingWordRef.value = null
    }
    // 当音频播放结束时
    audio.onended = () => {
      loadingWordRef.value = null
    }
    // 当音频可以播放时
    audio.oncanplay = () => {
      audio.play().catch(() => {
        // 播放被打断或失败，回退到 TTS
        speakTTS(word)
        loadingWordRef.value = null
      })
    }
  } catch {
    console.info('Failed to play audio URL, falling back to TTS.')
    speakTTS(word)
    loadingWordRef.value = null
  }
}

export function usePronunciation() {
  const wordsStore = useWordsStore()

  const play = async (word: string, audioUrl?: string) => {
    if (!word || loadingWord.value) return

    // 如果调用方没有传递 audioUrl，尝试从 Store 中查找
    // 这解决了部分组件调用 play 时遗漏 audioUrl 参数的问题
    if (!audioUrl) {
      const w = wordsStore.findWordByName(word)
      if (w?.audio_url) {
        audioUrl = w.audio_url
      }
    }

    // 停止任何当前正在播放的音频或语音
    audio.pause()
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel()
    }

    loadingWord.value = word

    if (audioUrl) {
      playAudio(audioUrl, word, loadingWord)
    } else {
      // 未提供 URL，尝试从 API 获取
      try {
        const response = await getAudioUrl(word)
        if (response.data.success && response.data.url) {
          // 关键修复：获取成功后，立即更新 Store 中的数据
          // 这样下次点击时，audioUrl 就有值了，不会再触发 API 请求
          const wordItem = wordsStore.findWordByName(word)
          if (wordItem) {
            wordItem.audio_url = response.data.url
          }
          playAudio(response.data.url, word, loadingWord)
        } else {
          // API 返回 success: false，回退到 TTS
          speakTTS(word)
          loadingWord.value = null
        }
      } catch {
        console.info('Failed to fetch audio URL, falling back to TTS.')
        // 网络错误或其他获取 URL 的问题，回退到 TTS
        speakTTS(word)
        loadingWord.value = null
      }
    }

    // 最后的检查，以防发生意外情况时释放锁
    setTimeout(() => {
      if (loadingWord.value === word) {
        loadingWord.value = null
      }
    }, 3500)
  }

  return {
    play,
    loadingWord,
  }
}
