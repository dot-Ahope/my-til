# 개발 일지: Isaac ROS Visual SLAM 트러블슈팅

**날짜:** 2026년 1월 21일 (수)
**작성자:** Admin
**주제:** RealSense D455 기반 VIO 발산 및 오도메트리 튐 현상 해결

---

## 1. 오늘 겪은 일 (Issues Encountered)

### 1) 로봇 발사 현상 (VIO Divergence)
- **증상:** SLAM 실행 직후 로봇의 위치(`odom`)가 하늘이나 엉뚱한 방향으로 무한 가속(발산)하는 현상 발생.
- **원인:**
  - RealSense 드라이버의 IMU Frame ID(`camera_imu_optical_frame`)와 SLAM이 참조하는 Frame ID(`camera_gyro_optical_frame`) 불일치.
  - `unite_imu_method: 2` (Interpolation) 사용 시 타임스탬프 미세 오차로 인한 가속도 적분 오류.

### 2) 오도메트리 점프 (Odometry Jump)
- **증상:** 정지 상태에서 위치가 순간적으로 -1.15m 튀었다가 복구됨.
- **원인:** 잘못된 루프 결합(False Positive Loop Closure). 어두운 환경이나 노이즈로 인해 현재 위치를 과거의 엉뚱한 위치로 오인식.

### 3) 필터 폭주 (Filter Exploding)
- **증상:** 동적 장애물(사람)이 지나갈 때 순간 속도가 23m/s(약 82km/h)로 기록됨.
- **원인:**
  - `enable_localization_n_mapping: False` (Map-less 모드)로 인해 정적 배경(지도)의 지지를 받지 못함.
  - 해결을 위해 IMU 노이즈 파라미터를 강제로 낮췄으나(`1/10`), 시각 정보와의 수학적 모순(Conflict)이 커져 EKF 필터가 발산함.

---

## 2. 한 일 (Actions Taken)

### ✅ Frame ID 및 TF 불일치 해결
- **Static TF 발행:** `camera_infra1_optical_frame` -> `camera_gyro_optical_frame` 연결.
- **설정 변경:** `imu_frame` 파라미터를 실제 데이터에 맞춰 조정.

### ✅ IMU 데이터 처리 방식 변경
- **Interpolation 끄기:** `unite_imu_method`를 `2`에서 **`1` (Copy)**로 변경하여 Raw 데이터 사용 (타임스탬프 왜곡 방지).
- **FPS 조정:** 30FPS 테스트 후, 데이터 정밀도를 위해 90FPS로 복구하되 `Method 1`과 조합하여 안정화 시도.

### ✅ Loop Closure(점프) 방지 시도
- **파라미터 수정:** 존재하지 않는 `enable_loop_closure` 대신 **`enable_localization_n_mapping: False`**를 적용하여 순수 오도메트리 모드로 전환 시도. (-> 그러나 동적 장애물 취약점 발생)

### ✅ 데이터 분석 (Rosbag)
- **로그 분석:** `1768981195.97` 초 부근에서 선속도 23.01 m/s 기록 확인.
- **원인 규명:** IMU는 정지해 있으나 시각 정보가 움직이는 물체(사람)에 기만당했음을 확인함.

---

# Isaac ROS Visual SLAM 오도메트리 불안정성 분석

## 1. 문제 설명 (Issue Description)
- **증상**: 오도메트리(Odometry) 위치가 깜박이거나 예상치 못하게 튀는 현상 발생.
- **시나리오 1**: 작동 중 지속적인 위치 깜박임(Flickering).
- **시나리오 2**: 로봇이 정지해 있을 때 사람이 로봇 앞을 지나가면 위치가 크게 튐 (맵 없는 VIO 모드).

## 2. 분석 (Analysis)

### Case A: 루프 클로저(Loop Closure)로 인한 깜박임
- **관측**: 오도메트리가 먼 위치(예: -1.15m)로 튀었다가 즉시 원래대로 돌아옴.
- **원인**: **잘못된 루프 클로저 (False Positive Loop Closure)**. 시스템이 현재 시야를 잘못된 이전 위치와 부정확하게 매칭함.
- **증거**: 위치가 튀는 타임스탬프 전후로 `loop_closure_cloud` 토픽이 발행됨.

### Case B: 동적 장애물로 인한 튐 현상 (VIO 모드)
- **설정**: `enable_localization_n_mapping: False` (VIO 모드).
- **관측**: 로봇 정지 상태에서 사람이 지나감 -> 오도메트리가 높은 속도를 표시 (최대 약 1.15 m/s, 튜닝이 잘못된 경우 23 m/s까지 치솟음).
- **원인**: **정적 환경 가정(Static World Assumption) 위배**. VSLAM 알고리즘이 움직이는 사람(지배적인 시각 특징점)을 '정지한 환경'으로 인식하여, 상대적으로 로봇이 반대 방향으로 움직이고 있다고 잘못 판단함.
- **IMU 튜닝 실패**: 필터가 IMU를 더 신뢰하도록 강제하기 위해 `accel_noise_density`를 10배 줄였으나, 문제를 해결하는 대신 **필터 발산(Filter Divergence)**(속도가 23 m/s로 급증)을 초래함.

## 3. 결론 및 해결 방안 (Conclusion & Solutions)
- **파라미터 튜닝**: 단순히 노이즈 밀도(noise density)만 조절하는 것은 이러한 '의미론적(semantic)' 문제 해결에 효과적이지 않으며 위험함.
- **구조적 해결책**:
    1. **매핑 활성화 (Enable Mapping)**: 정적 지도를 사용하여 로봇이 배경과 움직이는 물체를 구별할 수 있도록 함.
    2. **시맨틱 마스킹 (Semantic Masking)**: AI(예: Segformer, YOLO)를 활용하여 SLAM으로 전달되는 시각 특징점에서 동적 객체(사람 등)를 마스킹하여 제외함.
    3. **모션 리젝션 (Motion Rejection)**: 동적 이상치(outlier)를 더 잘 걸러내도록 내부 VSLAM 파라미터를 튜닝함.

## 4. 내비게이션 통합 (Navigation Integration)
- 이 오도메트리를 내비게이션에 사용하려면 데이터의 견고성(robustness)이 필수적임.
- **계획**: Isaac VSLAM 출력(`/visual_slam/tracking/odometry`)을 Nav2 스택과 통합하고, VSLAM이 좌표 변환(`odom` -> `base_link`)을 올바르게 제공하는지 확인함.