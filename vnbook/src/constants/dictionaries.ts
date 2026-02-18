export interface ExternalDictConfig {
  name: string
  title: string
  url: string
  show: boolean
  margin?: string
}

export const EXTERNAL_DICTS: ExternalDictConfig[] = [
  {
    name: '牛津',
    title: '牛津高阶英汉双解词典',
    url: '../dict/oxford/?q={word}',
    show: true,
    margin: '0 10px', // 示例：'-50px 0 0 0' 可隐藏顶部导航栏
  },
  {
    name: '剑桥',
    title: '剑桥英汉双解词典',
    url: '../dict/cambridge/?q={word}',
    show: true,
    margin: '0 6px',
  },
]

export const ONLINE_DICTS: ExternalDictConfig[] = [
  {
    name: '韦氏在线',
    title: '韦氏在线词典',
    url: 'https://www.merriam-webster.com/dictionary/{word}',
    show: true,
    margin: '0',
  },
  {
    name: '自由词典',
    title: '自由在线词典',
    url: 'https://www.thefreedictionary.com/{word}',
    show: true,
    margin: '0',
  },
  {
    name: '维基词典',
    title: '维基在线词典',
    url: 'https://en.wiktionary.org/wiki/{word}',
    show: true,
    margin: '0',
  },
]
