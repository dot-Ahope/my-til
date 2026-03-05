# Isaac ROS Visual SLAM 노드 미실행 진단 보고서

**날짜**: 2026-02-23  
**환경**: Jetson (aarch64) + Isaac ROS Docker (`run_dev.sh`) + RealSense D455F  
**현상**: `ros2 launch isaac_ros_visual_slam isaac_ros_visual_slam_realsense.launch.py` 실행 시 카메라 노드는 정상 실행되나, Visual SLAM 노드가 실행되지 않음

---

## 1. 문제 진단 과정 (원인 추적)

### 1단계: 현상 파악

사용자 보고: "카메라 노드는 실행되는데, Visual SLAM 노드가 실행이 안 된다."

이 현상은 두 가지 핵심 사실을 알려준다:

- ROS 2 launch 시스템 자체는 정상 동작
- `ComposableNodeContainer` 안의 `VisualSlamNode` 플러그인만 문제

### 2단계: Launch 파일 구조 분석

`isaac_ros_visual_slam_realsense.launch.py`를 읽어 3개의 노드를 확인:

| 노드 | 타입 | 결과 |
|---|---|---|
| `realsense_camera_node` | 독립 Node | 정상 실행 ✅ |
| `imu_tf_publisher` | 독립 Node | 정상 실행 ✅ |
| `visual_slam_node` | **ComposableNode** (컨테이너 내 플러그인) | 실패 ❌ |

**핵심 관찰**: 독립 Node들은 모두 성공하고, `ComposableNode`만 실패한다. 이는 **플러그인 로딩 실패** 패턴이다.

### 3단계: 토픽 네임스페이스 미스매치 가설 검증 (배제됨)

이전 터미널의 `ros2 topic list`에서 카메라 토픽이 `/camera/` prefix 없이 나왔다:

```
/infra1/image_rect_raw    ← /camera/ 없음?
/imu                      ← /camera/ 없음?
```

하지만 VSLAM 노드 remapping은 `/camera/infra1/image_rect_raw`를 기대한다.

**검증**: 이전 작업 기록 `TIL_2026_02_12_Isaac_VSLAM_IMU_Issue.md`를 확인한 결과, Docker 내부에서는 `/camera/` prefix가 정상적으로 붙어 있었다. 호스트에서 본 토픽 목록은 **별도의 RealSense 노드** 혹은 **DDS 미들웨어 불일치**로 인한 차이였다.

→ **토픽 미스매치는 원인이 아님** (배제)

### 4단계: 의존성 패키지 존재 여부 확인 (핵심 발견)

`package.xml`에서 빌드/런타임 의존성을 확인:

```xml
<depend>isaac_ros_nitros</depend>
<depend>isaac_ros_gxf</depend>
<depend>isaac_ros_managed_nitros</depend>
<depend>isaac_ros_nitros_image_type</depend>
```

그 다음, Docker 컨테이너 내에서 이 패키지들이 실제로 존재하는지 확인:

```bash
# 컨테이너 내 설치된 패키지 검색
ros2 pkg list | grep -i "nitros\|gxf\|managed"
```

**결과**: `isaac_ros_nitros_bridge_interfaces`만 나옴. **핵심 런타임 패키지 4개가 모두 누락**.

```bash
# 시스템 라이브러리 검색
find / -name "libisaac_ros_nitros.so"     → not found
find / -name "libgxf_isaac_optimizer.so"  → not found
```

### 5단계: 빌드는 왜 성공했는지 역추적

빌드 로그 (2월 19일)를 확인한 결과 **에러 없이 성공**. 이는:

- 빌드 시점에는 NITROS apt 패키지가 설치되어 있었음
- 이후 `run_dev.sh`로 컨테이너 재생성 시 apt 패키지가 소멸
- 빌드 산출물은 volume mount에 남아있으므로 `.so` 파일은 존재

### 6단계: 실패 메커니즘 확정

```
launch 실행
  → component_container 프로세스 시작 ✅
  → VisualSlamNode 플러그인 로드 (dlopen)
    → libvisual_slam_node.so 로드 시도
      → libisaac_ros_nitros.so 링크 필요 → 파일 없음 ❌
      → dlopen 실패 → 플러그인 로드 실패
  → component_container는 살아있지만 노드는 비어있음
  → 카메라 노드는 독립 프로세스 → 정상 실행 ✅
```

`component_container`는 플러그인 로드 실패 시 컨테이너 프로세스 자체를 종료하지 않고 **경고만 출력**한다. 따라서 "VSLAM 노드가 안 된다"는 현상이 발생한다.

---

## 2. 해결 방법 진단 과정

### 1단계: 누락 패키지의 설치 경로 확인

```bash
rosdep resolve isaac_ros_nitros
# → ros-humble-isaac-ros-nitros (apt 패키지)

rosdep resolve isaac_ros_gxf
# → ros-humble-isaac-ros-gxf

rosdep resolve isaac_ros_managed_nitros
# → ros-humble-isaac-ros-managed-nitros

rosdep resolve isaac_ros_nitros_image_type
# → ros-humble-isaac-ros-nitros-image-type
```

4개 모두 **apt 패키지로 제공**되며, rosdep으로 resolve 가능함을 확인했다.

### 2단계: rosdep install 명령이 이미 절차에 포함됨을 확인

사용자의 실행 절차:

```bash
rosdep update && rosdep install --from-paths ${ISAAC_ROS_WS}/src/isaac_ros_visual_slam/isaac_ros_visual_slam --ignore-src -y
```

이 명령은 `--from-paths`에 지정된 경로의 `package.xml`을 읽어 의존성을 설치한다. **이론적으로 NITROS 패키지도 설치되어야 한다.**

### 3단계: rosdep install이 실패한 이유 추론

가능한 원인 두 가지:

| 원인 | 설명 |
|---|---|
| **A. rosdep 키 미등록** | Isaac ROS의 rosdep 키가 기본 rosdep DB에 없으면 resolve 실패 → skip |
| **B. apt 소스 미설정** | NVIDIA apt 저장소가 컨테이너에 설정되어 있지 않으면 패키지를 찾을 수 없음 |

현재 `rosdep resolve`가 성공하므로 키는 등록되어 있으나, **`apt-get install` 단계에서 실패**했을 가능성이 높다 — 이는 `rosdep install -y`가 에러를 무시하고 넘어가는 경우 발생한다.

### 4단계: 부차적 이슈 발견

NVIDIA의 Hawk 예제 launch 파일과 비교한 결과:

| 항목 | Realsense launch (현재) | Hawk launch (NVIDIA 예제) |
|---|---|---|
| 컨테이너 타입 | `component_container` (단일 스레드) | `component_container_mt` (멀티 스레드) |
| IMU 사용 | ✅ (200Hz + 100Hz) | ✅ |

단일 스레드 컨테이너에서 IMU(200Hz) + 스테레오(90Hz) = ~290 콜백/초가 직렬 처리되면 타임스탬프 지터가 발생할 수 있다.

---

## 3. 다음 단계

### 즉시 실행 (Docker 컨테이너 내부)

```bash
# 1. 컨테이너 진입
cd ${ISAAC_ROS_WS}/src/isaac_ros_common && ./scripts/run_dev.sh

# 2. NITROS 런타임 의존성 설치
sudo apt-get update && sudo apt-get install -y \
  ros-humble-isaac-ros-nitros \
  ros-humble-isaac-ros-gxf \
  ros-humble-isaac-ros-managed-nitros \
  ros-humble-isaac-ros-nitros-image-type

# 3. 설치 확인
ros2 pkg list | grep -i nitros

# 4. VSLAM 재실행
ros2 launch isaac_ros_visual_slam isaac_ros_visual_slam_realsense.launch.py
```

### apt install이 실패하는 경우

```bash
# NVIDIA apt 저장소 확인
cat /etc/apt/sources.list.d/*.list | grep nvidia

# 저장소가 없으면 추가 후 재시도
# 또는 소스 빌드로 전환:
cd ${ISAAC_ROS_WS}/src
git clone https://github.com/NVIDIA-ISAAC-ROS/isaac_ros_nitros.git
git clone https://github.com/NVIDIA-ISAAC-ROS/isaac_ros_gxf.git
cd ${ISAAC_ROS_WS}
colcon build --packages-up-to isaac_ros_visual_slam
```

### 영구 해결 (컨테이너 재생성에 대비)

`run_dev.sh`가 참조하는 Dockerfile 또는 `.isaac_ros_common-config`에 패키지 설치를 추가하여 컨테이너가 재생성될 때마다 자동으로 설치되게 한다.

### VSLAM 실행 확인 후

`isaac_ros_visual_slam_realsense.launch.py`의 `component_container`를 `component_container_mt`로 변경하여 멀티스레드 콜백 처리를 활성화한다:

```python
# 변경 전
executable='component_container',

# 변경 후
executable='component_container_mt',
```

---

## 요약

| 항목 | 내용 |
|---|---|
| **근본 원인** | NITROS/GXF 런타임 라이브러리가 Docker 컨테이너 재생성 시 소멸 |
| **누락 패키지** | `isaac_ros_nitros`, `isaac_ros_gxf`, `isaac_ros_managed_nitros`, `isaac_ros_nitros_image_type` |
| **실패 증상** | `component_container`가 `VisualSlamNode` 플러그인 dlopen 실패 → 노드 미로드 |
| **해결** | Docker 내부에서 apt install 또는 소스 빌드로 NITROS 패키지 재설치 |
| **부차 이슈** | `component_container` → `component_container_mt` 변경 권장 |
