import { ref, type Ref } from 'vue'
import { getAudioUrl } from '@/api/words'

// Create a single Audio instance to prevent multiple playbacks from overlapping
const audio = new Audio()
const loadingWord = ref<string | null>(null)

// TTS fallback function
const speakTTS = (word: string) => {
  if ('speechSynthesis' in window) {
    // If there's a pending speech, cancel it
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel()
    }
    const msg = new SpeechSynthesisUtterance(word)
    msg.lang = 'en-US'
    const voices = window.speechSynthesis.getVoices()
    // Try to find a native US voice, otherwise use the default
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
    // When the audio file fails to load or play
    audio.onerror = () => {
      console.error('Audio playback failed, falling back to TTS.')
      speakTTS(word)
      loadingWordRef.value = null
    }
    // When audio playback finishes
    audio.onended = () => {
      loadingWordRef.value = null
    }
    // When audio can be played
    audio.oncanplay = () => {
      audio.play().catch(() => {
        // Playback was interrupted or failed, fallback to TTS
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
  const play = async (word: string, audioUrl?: string) => {
    if (!word || loadingWord.value) return
    // Stop any currently playing audio or speech
    audio.pause()
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel()
    }

    loadingWord.value = word

    if (audioUrl) {
      playAudio(audioUrl, word, loadingWord)
    } else {
      // No URL provided, try to fetch from API
      try {
        const response = await getAudioUrl(word)
        if (response.data.success && response.data.url) {
          playAudio(response.data.url, word, loadingWord)
        } else {
          // API returned success: false, so fallback to TTS
          speakTTS(word)
          loadingWord.value = null
        }
      } catch {
        console.info('Failed to fetch audio URL, falling back to TTS.')
        // Network error or other issue fetching the URL, fallback to TTS
        speakTTS(word)
        loadingWord.value = null
      }
    }

    // A final check to release the lock in case something unexpected happened
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
