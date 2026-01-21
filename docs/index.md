---
#레이아웃 설정 (vitepress 기본 홈 사용)
layout: home

hero: # hero란 : 페이지 최상단에 위치한 큰 배너 영역
  title: My TIL # title이란 : 배너에서 
  tagline: Today I Learned
  image: /logo.png
  actions:
    - text: home
      link: /guide/
      type: primary
    - text: GitHub
      link:

features:
  - title: 🤖 ROS2 & Navigation
    details: 로봇 운영체제, SLAM, Nav2, 시뮬레이션 관련 학습 기록
    icon: 🤖
  - title: ⚡ Embedded & Jetson
    details: NVIDIA Jetson, STM32, 센서 제어 및 하드웨어 인터페이스
    icon: ⚡
  - title: 🐧 Linux & DevOps
    details: Ubuntu 시스템 관리, Docker, 자동화 스크립트 정리
    icon: 🐧
---