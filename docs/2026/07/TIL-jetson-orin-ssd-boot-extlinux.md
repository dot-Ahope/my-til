# TIL: Windows에서 WSL2로 Jetson Orin SSD의 extlinux.conf 수정하기

> 2026-07-24

## 문제 상황

- Jetson Orin의 부팅 순서가 SD카드 우선으로 되어 있고, rootfs로 플래싱한 NVMe SSD를 장착해도 부팅되지 않음
- 원인: SSD의 `extlinux.conf`에 루트 파티션이 `root=/dev/mmcblk0p1`(SD카드)로 지정되어 있음
- 목표: `root=/dev/nvme0n1p1`(NVMe SSD)로 수정
- 제약: 리눅스 PC 없이 **Windows PC에서** SSD의 ext4 파일시스템에 접근해야 함

## 핵심 지식

### Windows에서 ext4에 읽기/쓰기로 접근하는 방법

| 방법 | 비용 | 읽기/쓰기 | 비고 |
|---|---|---|---|
| **WSL2 `wsl --mount`** | 무료 | O | Win10 21H2+ / Win11, 채택한 방법 |
| Paragon Linux File Systems for Windows | 유료(체험판) | O | 탐색기에서 바로 접근, 가장 간편 |
| DiskInternals Linux Reader | 무료 | 읽기 전용 | 수정 불가 |
| Ext2Fsd | 무료 | △ | 개발 중단, 최신 ext4에서 손상 위험 → 비추천 |

- `wsl --mount`는 USB 플래시 드라이브(이동식 디스크)는 지원하지 않지만, NVMe SSD를 UASP 방식 USB 외장 케이스에 넣으면 대부분 고정 디스크로 인식되어 사용 가능

### Jetson SSD의 파티션 구조

- SDK Manager로 플래싱된 디스크는 파티션이 15개가량 존재
- **rootfs = APP 파티션**: ext4, 디스크에서 압도적으로 큰 파티션, 보통 1번
- FAT32 파티션(예: 10번)은 EFI(ESP) 파티션
- 확정 방법: 마운트했을 때 `/boot/extlinux/extlinux.conf`가 존재하면 rootfs

## 작업 절차

### 1. 디스크 번호 확인 (관리자 PowerShell)

```powershell
GET-CimInstance -query "SELECT * from Win32_DiskDrive"
Get-Partition -DiskNumber 2
```

### 2. WSL에 디스크 마운트

```powershell
wsl --mount \\.\PHYSICALDRIVE2 --partition 1
```

- 마운트 위치: `/mnt/wsl/PHYSICALDRIVE2p1` (모든 WSL 배포판에서 공유됨)

### 3. WSL 진입 및 파티션 확인

```bash
wsl          # 기본 배포판(Ubuntu-24.04)으로 진입
lsblk -f     # sdd = Jetson SSD, sdd1(ext4) = rootfs, sdd10(FAT32) = ESP
```

### 4. 수동 마운트 및 수정

```bash
mkdir -p /mnt/jetson
mount /dev/sdd1 /mnt/jetson

# 백업
cp /mnt/jetson/boot/extlinux/extlinux.conf /mnt/jetson/boot/extlinux/extlinux.conf.bak

# 수정
sed -i 's|root=/dev/mmcblk0p1|root=/dev/nvme0n1p1|' /mnt/jetson/boot/extlinux/extlinux.conf

# 확인
grep root= /mnt/jetson/boot/extlinux/extlinux.conf
```

수정 결과:

```
APPEND ${cbootargs} root=/dev/nvme0n1p1 rw rootwait rootfstype=ext4 ...
```

### 5. 안전한 분리

```bash
umount /mnt/jetson
sync
exit
```

```powershell
wsl --unmount \\.\PHYSICALDRIVE2
# 실패 시 (umount + sync를 마쳤다면 안전):
wsl --shutdown
```

## 트러블슈팅 기록

1. **마운트 지점이 비어 있음** — `wsl --mount`가 성공 메시지를 냈는데 `/mnt/wsl/PHYSICALDRIVE2p1`이 빈 디렉터리였음. 정상 마운트라면 최소 `lost+found`는 보여야 한다. `lsblk -f`로 디스크(`sdd`)가 WSL VM에 붙어 있는 것을 확인하고 수동 마운트로 해결. 디스크 자체가 안 보이면 `wsl --unmount` → `wsl --shutdown` → `wsl --mount ... --bare`로 재시도.

2. **`special device /dev/ssd1 does not exist`** — 단순 오타. `ssd1`이 아니라 `sdd1`.

3. **`wsl --unmount` 실패 (Invalid argument)** — WSL 안에서 파티션이 아직 마운트된 상태였기 때문. WSL 안에서 `umount` + `sync` 후 재시도하거나 `wsl --shutdown`으로 강제 분리.

## 다른 방법

- 구동가능한 리눅스 PC에 해당 ssd를 연결한 후, 간단하게 파일시스템에 접근하여, **extlinux.conf** 파일 수정.
