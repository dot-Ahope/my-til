# 09일 - TIL: ROS 2 Humble & Gazebo Fortress on WSL2 Troubleshooting

## 📝 오늘 배운 점
- WSL 환경에서 Gazebo 시뮬레이션 실행 시 렌더링 엔진(Ogre)과 OpenGL 버전 호환성이 매우 중요하다.
- ROS 2 패키지 버전과 시스템에 설치된 Gazebo 버전(GZ vs IGN) 불일치 시 마이그레이션 방법.

## 🤖 프로젝트 진행 (ROS2 / Navigation)
- `nav2_gps_waypoint_follower_demo` 패키지의 `gazebo_gps_world.launch.py` 정상 구동 성공.
- WSL2 + ROS 2 Humble 환경에서 Gazebo Fortress 연동 환경 구축 완료.

## 🐛 트러블슈팅

### 1. 실행 명령어 버전 불일치 (Version Mismatch)
*   **증상:** `ros2 launch ...` 실행 시 `gz: command not found` 에러.
*   **원인:** 데모 코드가 최신 Gazebo(Garden/Harmonic) 기준(`gz`)이나, 시스템은 Fortress(`ign`) 설치됨.
*   **해결:** Launch 파일 내 `gz sim` -> `ign gazebo` 변경 및 관련 리소스 경로 환경변수(`IGN_GAZEBO_RESOURCE_PATH`) 추가.

### 2. 렌더링 크래시 및 블랙 스크린 (Rendering Issues in WSL2)
*   **증상 1 (Crash):** 실행 즉시 `Ogre::UnimplementedException` 발생.
    *   **해결:** `LIBGL_ALWAYS_SOFTWARE=1` 설정 및 GUI 렌더 엔진을 `ogre`(v1)로 변경.
*   **증상 2 (Server Segfault):** 서버 프로세스(`ign-3`)가 `signal 11`로 종료.
    *   **해결:** 서버 렌더 엔진도 `ogre`로 강제 (`--render-engine-server ogre`) 및 SDF 파일 내 센서 플러그인 설정 변경.
*   **증상 3 (Black Screen):** 실행은 되나 화면이 검게 나옴.
    *   **해결:** Software Rendering 시 OpenGL 버전 문제를 해결하기 위해 Override 설정 추가.
    ```python
    "MESA_GL_VERSION_OVERRIDE": "3.3",
    "MESA_GLSL_VERSION_OVERRIDE": "330"
    ```

## 📚 읽어볼 자료
- [Gazebo Fortress Migration Guide](https://gazebosim.org/api/gazebo/6.0/migration_from_ignition.html)
