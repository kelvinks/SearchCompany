# 프로젝트 복원 절차 (Antigravity 용)

이 문서는 다른 PC에서 Antigravity를 통해 프로젝트를 원활하게 복원하기 위한 가이드입니다. 

새 PC에서 이 프로젝트의 압축을 해제한 후, Antigravity에게 다음과 같이 요청해주세요:

---

**Antigravity에게 전달할 프롬프트 예시:**

> "현재 폴더에 있는 프로젝트 복원을 도와줘. 
> 이 프로젝트는 Next.js 기반의 웹 애플리케이션 프론트엔드가 포함되어 있어.
> 다음 절차대로 진행해줘:
> 1. `frontend` 폴더로 이동해줘.
> 2. `npm install` 명령어를 실행해서 필요한 패키지(`node_modules`)를 설치해줘.
> 3. 설치가 완료되면 `npm run dev`를 실행해서 개발 서버가 정상적으로 구동되는지 확인해줘."

---

### 수동 복원 참고 사항
직접 복원하시려면 터미널을 열고 다음 명령어를 순서대로 실행하세요:
```bash
cd frontend
npm install
npm run dev
```
