# 12일 - TIL: ROS 2 Humble & Gazebo Fortress on WSL2 Troubleshooting

## 📝 오늘 배운 점
- ign gazebo --render-engine ogre shapes.sdf로 wsl에서 gazebo fortress 모델 로드 가능
- 핵심은 **"WSL의 그래픽 번역 능력"**과 "Gazebo의 요구 수준" 사이의 미스매치

## 🤖 프로젝트 진행 (ROS2 / Navigation)
- 
- 

## 🐛 트러블슈팅

### 1. 근본적인 이유: "번역기(WSL)"가 최신 언어를 못 알아들음
*   WSL(Windows Subsystem for Linux)은 리눅스 프로그램이 그래픽 카드(GPU)를 쓸 때, **중간 번역기(Mesa / D3D12)**를 거쳐서 윈도우로 화면을 보내줌
    *   기본 설정 (Ogre 2): Gazebo Fortress는 기본적으로 ogre2라는 최신 렌더링 엔진을 씁니다. 이 친구는 **최신 그래픽 문법(OpenGL 3.3+ 이상의 고급 기능, 그림자 처리 등)**을 사용해 화려한 그래픽을 보여주려 함
    *   문제점: WSL의 번역기가 이 ogre2가 보내는 복잡하고 최신인 명령어를 완벽하게 해석하지 못하거나, 일부를 놓쳐버립니다. 그래서 결과물이 "검은 화면"으로 나오는 것
    *   해결책 (Ogre 1): 사용자가 선택한 ogre는 **구형 엔진(1.x 버전)**입니다. 아주 기초적이고 단순한 그래픽 명령어만 사용합니다. WSL 번역기가 이 단순한 명령어는 아주 완벽하게 해석할 수 있기 때문에 화면이 잘 나오는 것
### 2. 장단점
*   **장점**
    *   **1**  WSL 환경에서 매우 안정적으로 돌아갑니다.
    *   **2**  그래픽 관련 오류(크래시, 블랙 스크린 등)가 거의 없습니다.
    *   **3**  검은 화면, 텍스처 깨짐 등 골치 아픈 문제가 사라집니다.
*   **단점**
    *   **1**  그래픽 품질이 조금 떨어집니다. (조명이 덜 자연스럽거나, 재질감이 덜 사실적일 수 있음)
    *   **2**  최신 그래픽 효과(그림자, 반사 등)를 사용할 수 없습니다.

## 📚 읽어볼 자료
- [Gazebo Fortress Migration Guide](https://gazebosim.org/api/gazebo/6.0/migration_from_ignition.html)
