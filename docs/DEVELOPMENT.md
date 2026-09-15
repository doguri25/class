# 개발·검증·배포 안내

## 프로젝트와 문서

교실 타이쿤은 dist의 HTML/CSS/ES 모듈을 직접 배포하는 정적 웹 게임이다. 현재 별도 빌드·서버·외부 AI·실제 학교 메시지 연동이 필요하지 않다. Three.js 등의 동봉 자산은 dist 안의 참조 경로를 유지한다.

- 최신 요구: PRD_v0.5.md. 기존 원안과 출처: PRD_v0.4.md.
- 실제 구현/미구현/검증: BETA_SCOPE.md.
- 버전 전체 이력: releases.json. 게임 최근 3개 이력: ../dist/release-info.js.
- 수정 규칙: ../AGENTS.md. 예전 *_SCOPE.md는 역사 문서로 보존한다.
- 개인정보, 실제 학생 명부, 플레이 저장, 토큰, .env, node_modules를 커밋하지 않는다.

## 로컬 수정과 검사

저장소를 받은 뒤 커밋 훅을 적용한다. 런타임 버전을 바꿀 때는 기존 검사를 다시 수행한다.

```sh
git config core.hooksPath .githooks
node --test --test-reporter=dot tests/*.test.mjs
node scripts/publish-docs.mjs --check
git diff --check
```

앱 연결 검사는 happy-dom이 있는 별도 검사 환경을 사용한다. 아래 MODULE_URI 자리에는 설치된 happy-dom/lib/index.js의 file URL을 넣는다. 기본 모델 검사에는 이 라이브러리가 필요하지 않다.

```sh
CLASSROOM_HAPPY_DOM_MODULE=MODULE_URI node tests/community-ui-flow.mjs
```

이 검사는 실제 앱 함수를 연결하지만 WebGL 렌더러를 대체한다. 시각·터치·성능 확인을 수행한 것처럼 보고하지 않는다. Sites 환경에서는 해당 실행 프로필의 브라우저/미리보기 허용 절차를 따른다.

## 문서 수정과 자동 버전

docs 원문을 수정한 다음 아래 순서로 출력물을 갱신한다. 이미 같은 미배포 릴리스의 버전을 올렸으면 release 명령을 다시 실행하지 않는다.

```sh
node scripts/release.mjs --next '실제로 바꾼 내용' '남은 검수 범위'
node scripts/publish-docs.mjs
node scripts/publish-docs.mjs --check
```

publish-docs는 PRD_v0.5·원안 v0.4·BETA_SCOPE·이 안내만 dist/docs에 복사하고, 최신 PRD를 목차 있는 dist/prd.html로 만든다. 사용자 저장이나 임의 디렉터리는 포함하지 않는다. 생성 파일은 직접 고치지 않는다. --check는 출력이 원문/버전과 다른지 읽기 전용으로 확인한다.

README, BETA_SCOPE, beta-notes의 현재 버전 설명을 갱신한다. 수정 파일을 확인해 필요한 파일만 stage하고 커밋한다. 커밋 훅이 누락된 버전을 보완하지만 검증·문서 갱신 자체를 대신하지 않는다.

## GitHub class 저장소 연결

연결 대상은 사용자가 만든 [doguri25/class](https://github.com/doguri25/class)이며 현재 공개 범위를 유지한다. beta.6 소스를 가져온 GitHub main은 f4896bb364c7e02c71b5bfd5918d37b615af44cf이고 Sites 쪽과 파일 트리는 같지만 커밋 이력이 다르다. 저장소를 새로 만들거나 README를 덮어쓰지 않는다. 토큰·비밀번호를 채팅에 붙이지 않는다.

1. 현재 GitHub main의 커밋과 트리를 다시 읽어 예상하지 않은 변경이 없는지 확인한다.
2. 현재 source tree와 바뀐 파일·모드를 비교한다. 기존 이미지 blob은 재사용하고 수정 파일만 전달한다.
3. 로컬 Git 인증이 준비된 환경은 github remote로 푸시한다. 네이티브 GitHub 도구만 가능한 환경은 Git 데이터 API로 동일 트리를 만들고 기존 원격 커밋을 부모로 새 커밋을 생성한다.
4. 트리 SHA를 로컬 HEAD의 tree와 대조하고 main을 강제 갱신 없이 앞으로 이동한다. 브랜치가 바뀌었거나 보호 규칙에 걸리면 재확인하며 임의 강제 푸시하지 않는다.
5. 최종 원격 main의 커밋·트리와 URL을 확인한다. Sites source commit과 GitHub commit을 별도로 기록한다.

```sh
git remote add github https://github.com/doguri25/class.git
git push github HEAD:refs/heads/main
git rev-parse --verify HEAD
git ls-remote github refs/heads/main
```

이미 github remote가 있으면 추가 명령을 반복하지 말고 대상부터 확인한다. 같은 이력의 일반 Git 푸시는 전체 커밋 SHA를 대조한다. 기존의 다른 이력을 보존하는 Git 데이터 API 경로는 로컬/원격의 전체 트리 SHA 일치와 원격 부모·브랜치 갱신을 모두 확인한다. 성공 응답 없이 완료로 표시하지 않는다. GitHub 인증 정보와 Sites의 저장소 한정 인증 정보는 서로 대체할 수 없다.

## 기존 실행 사이트 배포

기존 프로젝트의 .openai/hosting.json을 유지한다. Sites에서 현재 소유 권한·공개 범위를 확인하고, 기존 체크아웃과 프로젝트를 재사용한다. GitHub는 소스 공유 대상이며 저장소 생성만으로 현재 Sites 배포를 대신하지 않는다.

1. 검사·문서 출력·커밋 후 Sites 소스 브랜치로 푸시한다.
2. 푸시가 성공한 뒤 git rev-parse --verify HEAD의 전체 SHA를 기록한다.
3. 그 소스의 dist를 공식 포장 도구로 포장·검사한다. 원본 소스 전체나 자격 증명을 배포 자산에 넣지 않는다.
4. 정확한 SHA와 압축본으로 버전을 저장하고 현재 접근 범위를 보존하여 배포한다.
5. 배포 상태가 성공인지 확인하고 해당 응답의 실제 URL을 기록한다. 진행 중/실패는 성공으로 보고하지 않는다.

GitHub 자동 배포용 외부 워크플로와 자격 증명은 이 요청에서 임의 생성하지 않는다. 추가 연동이 필요하면 대상 서비스·공개 범위·승인 방법을 별도로 정한다.

## 릴리스 체크리스트

- 변경된 R/AC, 파일, 저장 영향과 실패 경로를 기록했는가.
- 모델 검사·문서 검사·요청 범위의 앱 연결 검사가 통과했는가.
- 실제 기기 검사 여부와 미구현/미검수 항목을 구분했는가.
- 원문과 dist 문서가 같고 현재 버전·최근 3개 이력이 맞는가.
- 개인 데이터·비밀·임시 결과가 staged 파일에 없는가.
- 커밋, GitHub 푸시, Sites 소스 푸시, 배포의 성공을 각각 확인했는가.
- 배포가 실패하면 저장된 버전 ID로 재개하고 중복 릴리스를 만들지 않는가.
