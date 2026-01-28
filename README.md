# 사다리 타기 (Ladder Draw)

랜덤 추첨을 위한 사다리 게임 웹 애플리케이션입니다.

## 데모

https://homura-rtzr.github.io/ladder-draw/

## 기능

- 참가자와 결과를 입력하면 랜덤 사다리 생성
- 사다리 경로 애니메이션
- 결과 공유 (Web Share API / 이미지 다운로드)
- 공유 링크를 통한 결과 복원
- 입력값 자동 저장 (localStorage)

## 실행

빌드 없이 정적 파일 서버로 실행:

```bash
python3 -m http.server
```

브라우저에서 `http://localhost:8000` 접속

## 기술 스택

- HTML5 Canvas
- Vanilla JavaScript (ES6+)
- CSS3

## 라이선스

MIT
