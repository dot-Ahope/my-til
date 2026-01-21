import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "My TIL",
  description: "Development Log",
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: '2026', link: '/2026/01/07-first-post' } // 상단 메뉴에 2026년 바로가기 추가
    ],

    sidebar: [
      // 2026년 그룹
      {
        text: '2026년 TIL',
        collapsed: false, // 처음부터 펼쳐 보일지 여부
        items: [
          // 1월 그룹
          {
            text: '1월',
            collapsed: false,
            items: [
              // 실제 글 목록
              { text: '07일 - 첫 번째 포스팅', link: '/2026/01/07-first-post' },
              { text: '08일 - TIL', link: '/2026/01/08-til' }
            ]
          },
          // 2월 그룹 (미리 만들어두거나 나중에 추가)
          {
            text: '2월',
            collapsed: true,
            items: []
          }
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/dot-Ahope' }
    ]
  }
})
