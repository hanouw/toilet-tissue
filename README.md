# 🧻 급똥 레이서: 휴지를 지켜라! (Toilet Rush)

초특급 B급 감성 괄약근 방어 경쟁 액션 게임. 장애물과 물웅덩이를 피하고 몬스터로부터 휴지를 지키며 변기까지 골인하세요!

![Game Preview](https://img.shields.io/badge/Toilet--Rush-B--Grade%20Fun-ffeb3b?style=for-the-badge)
![Vite](https://img.shields.io/badge/Vite-v8.0.0-00e5ff?style=for-the-badge)
![Deploy](https://img.shields.io/badge/Deploy-Vercel-success?style=for-the-badge)

---

## 🎮 게임 특징
- **8종의 크레이지 스테이지**: 단순 장애물부터 물웅덩이, 바람 부는 구역, 번개 스파크, 어머니의 방청소 시야 등 기상천외한 난이도의 8개 맵 수록!
- **스킨 상점**: 3겹 데코, 로열 골드, 딸기향 엠보싱, 할아버지 신문지, 사이버 네온 등 각각의 속도 특징을 지닌 B급 화장지 스킨 해금!
- **코믹 사운드**: 오실레이터 주파수를 조절하여 스크립트로 자체 합성된 방구, 물 내려가는 소리, 찢어지는 소리 재생 (리소스 다운로드 불필요!).
- **실시간 고스트 라이벌 배틀**: 전 세계 1등 유저의 실제 플레이 궤적(Ghost)이 화면에 투명하게 출력되어 매치 레이싱을 펼칠 수 있습니다.

---

## 🛠️ GitHub Actions DB 설정 방법
이 게임은 별도의 서버 데이터베이스 없이 **GitHub Issues**와 **GitHub Actions**를 DB 삼아 전 세계 실시간 랭킹과 고스트 경로를 저장합니다.

본인의 저장소에 연동하여 실시간 글로벌 랭킹을 활성화하려면 아래 단계를 따라주세요:

1. **설정 파일 수정**:
   - `src/config.js` 파일을 열고 본인의 GitHub 아이디와 레포지토리명으로 변경합니다.
     ```javascript
     export const GITHUB_REPO = "본인아이디/저장소이름";
     ```
2. **저장소 권한 설정 (GitHub Settings)**:
   - 본인의 GitHub 레포지토리 페이지로 이동합니다.
   - **Settings** -> **Actions** -> **General**로 이동합니다.
   - 하단의 **Workflow permissions** 섹션에서 **Read and write permissions**를 활성화하고 Save를 클릭합니다. (Actions가 `leaderboard.json` 파일에 커밋을 푸시할 수 있도록 허용하는 용도입니다.)
3. **배포**:
   - Vercel에 레포지토리를 연결해 배포하면 끝! 이제 전 세계 유저가 올린 점수들이 자동으로 랭킹에 동기화됩니다.

---

## 💻 로컬 개발
의존성 패키지를 설치한 후 개발 서버를 켭니다:
```bash
npm install
npm run dev
```

Vercel 프로덕션 번들 빌드 확인:
```bash
npm run build
```
