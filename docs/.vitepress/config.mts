import { defineConfig } from 'vitepress'
import { generateSidebar } from 'vitepress-sidebar'

export default defineConfig({
  title: "My TIL",
  description: "Development Log",
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: '2026', link: '/2026/01/07-first-post' } // 상단 메뉴에 2026년 바로가기 추가
    ],

    sidebar: generateSidebar({
      documentRootPath: 'docs',    // 마크다운 파일이 있는 최상위 폴더
      collapsed: false,            // 사이드바 메뉴를 펼쳐서 표시
      capitalizeFirst: true,       // 폴더/파일명 첫 글자를 대문자로
      useTitleFromFileHeading: true, // 파일 내부의 # 제목을 메뉴명으로 사용
      useFolderTitleFromIndexFile: true, // 폴더 내 index.md 제목을 폴더명으로 사용
    }
  ),

    socialLinks: [
      { icon: 'github', link: 'https://github.com/dot-Ahope' }
    ]
  }
})
