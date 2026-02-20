# 🤖 vSLAM Rover Project Milestones

## 📅 Project Overview
- **Goal**: Visual SLAM 기반의 자율주행 로버 구축 및 네비게이션 구현
- **Hardware**: [Your Rover Platform], Jetson Board, Depth Camera, IMU
- **Software**: ROS 2 (Humble/Foxy), Isaac ROS / RTAB-Map / ORB-SLAM3 (Select One)

---

## 🚀 Phase 1: System Bring-up (Hardware & Low-Level)
로봇이 물리적으로 구동되고, 모든 센서 데이터가 OS 레벨에서 정상적으로 들어오는지 확인하는 단계입니다.

### 1.1 Hardware Setup
- [v] 로버 프레임 조립 및 모터/구동부 결선
- [ ] 전원 분배 보드(PDB) 및 배터리 시스템 구축 (Jetson/MCU 전원 분리 권장)
- [ ] 메인 컴퓨터(Jetson) 및 MCU(STM32/Arduino) 장착

### 1.2 Low-Level Control (Firmware)
- [ ] 모터 드라이버 연동 및 PWM 제어 테스트
- [ ] 휠 엔코더(Encoder) 데이터 리딩 및 적산 테스트
- [ ] PID 제어 구현 (목표 속도 추종 확인)
- [ ] **Interface**: MCU ↔ Jetson 통신 (UART/USB) 프로토콜 정의 및 구현 (`micro-ROS` or Serial)

### 1.3 Sensor Driver Setup
- [ ] Camera Driver 설치 및 RGB/Depth 스트리밍 확인 (`ros2 topic hz`)
- [ ] IMU Driver 설치 및 가속도/자이로 데이터 수신 확인
- [ ] Lidar (옵션) 드라이버 설치

> **✅ Success Criteria**
> * 키보드(Teleop)로 로봇을 제어하여 부드럽게 주행할 수 있다.
> * `/camera/image_raw`, `/imu/data` 토픽이 끊김 없이 발행된다.

---

## 📐 Phase 2: Calibration & TF Setup
vSLAM 성능의 80%를 결정하는 정밀 셋업 단계입니다.

### 2.1 Sensor Calibration
- [ ] Camera Intrinsic Calibration (Checkerboard 이용)
- [ ] IMU Calibration (Allan Variance Test, Noise/Bias 파라미터 추출)
- [ ] **Extrinsic Calibration**: Camera ↔ IMU 간의 변환 행렬($T_{ic}$) 산출

### 2.2 Robot Modeling (URDF)
- [ ] URDF(xacro) 파일 작성 (`base_link`, `camera_link`, `imu_link`, `wheel_link`)
- [ ] `robot_state_publisher` 설정 및 정적 TF 브로드캐스팅
- [ ] 실제 로봇 치수와 URDF 상의 치수 오차 검증

> **✅ Success Criteria**
> * RViz 상에서 로봇 모델이 정상적으로 렌더링 된다.
> * 로봇을 손으로 들고 움직였을 때, 센서 데이터(화면)와 TF 움직임이 일치한다.

---

## 🗺️ Phase 3: Visual Odometry & SLAM
실제 위치 추정 및 지도 작성을 수행합니다.

### 3.1 Visual Odometry (VO)
- [ ] vSLAM 패키지 설치 (Isaac ROS Visual SLAM 등) 및 의존성 해결
- [ ] VO 단독 실행 테스트: 로봇 이동 시 `odom` → `base_link` TF가 부드럽게 이어지는지 확인
- [ ] **Tuning**: 특징점(Feature) 추적 소실 시 복구(Relocalization) 파라미터 조정

### 3.2 Mapping & Loop Closure
- [ ] 실내 환경 주행을 통한 2D Occupancy Grid Map / 3D PointCloud Map 작성
- [ ] Loop Closure(회귀 인식) 동작 확인 및 맵 최적화
- [ ] 작성된 맵 저장 (`ros2 run nav2_map_server map_saver_cli`)

> **✅ Success Criteria**
> * 로봇이 사각형 궤적(예: 2m x 2m)을 주행하고 원점으로 돌아왔을 때, Odometry 오차가 허용 범위(예: < 5cm) 이내이다.
> * 생성된 지도가 실제 벽/장애물의 위치와 일치한다.

---

## 🧭 Phase 4: Autonomous Navigation (Nav2)
작성된 지도를 기반으로 경로를 생성하고 주행합니다.

### 4.1 Nav2 Configuration
- [ ] Navigation2 패키지 설치 및 런치 파일 구성
- [ ] **Costmap**: Global/Local Costmap 레이어 설정 (Inflation Radius, Obstacle Layer)
- [ ] **AMCL**: 맵 기반 위치 추정(Localization) 튜닝

### 4.2 Planner & Controller Tuning
- [ ] Path Planning (Global Planner) 알고리즘 선정 (NavFn / Smac)
- [ ] Path Tracking (Local Planner) 알고리즘 선정 (DWB / MPPI / TEB)
- [ ] 회전 반경, 최대 속도/가속도 제한 등 로봇 물리 한계(Constraints) 설정

> **✅ Success Criteria**
> * RViz에서 '2D Nav Goal' 지정 시, 동적/정적 장애물을 회피하여 목적지에 도착한다.
> * 주행 중 로봇이 진동하거나 경로를 이탈하지 않는다.

---

## 🛠️ Phase 5: Optimization & Field Test
실제 환경에서의 안정성을 확보합니다.

### 5.1 System Optimization
- [ ] CPU/GPU 리소스 모니터링 및 병목 구간 개선
- [ ] 네트워크 대역폭 최적화 (QoS 설정 등)

### 5.2 Robustness Test
- [ ] 조명 변화 테스트 (어두운 곳, 강한 역광)
- [ ] 바닥 재질 변화 테스트 (미끄러짐 발생 시 EKF 퓨전 성능 확인)
- [ ] 장시간 구동 테스트 (메모리 누수 및 발열 체크)

> **✅ Success Criteria**
> * 다양한 환경 변수 하에서도 SLAM tracking이 유실(Lost)되지 않고 복구된다.