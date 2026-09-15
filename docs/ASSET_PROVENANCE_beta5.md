# beta.5 전문 담당자 삽화

- 제작일: 2026-09-15
- 게임 파일: `dist/assets/portraits/staff-support.png`
- 내장 이미지 생성으로 새로 제작한 가상 성인 교직원. 실존 인물의 초상이나 외부 사진을 사용하지 않는다.
- 원본 크기: 1536×1024, 3열×2행, 각 셀 512×512. 주 에이전트가 생성 결과를 직접 확인한 뒤 원본 그대로 게임에 배치했다.
- 행 우선 배치: 오가은(영양), 문지호(특수), 장태식(시설), 배소연(방과후), 신혜원(학적), 유태오(정보).
- `staff-catalog.js`의 고유 셀과 `portraits.js`의 300%×200% 배경 위치로 명렬표·인물창·대화·학교톡에서 동일 인물을 표시한다.

## 생성 지시

Standalone portrait atlas for a Korean elementary classroom simulation game, not a webpage or screenshot. Exactly three equal columns and two equal rows, landscape 3:2, six equal square touching cells, no gutters or borders. Same pale warm gray-green paper-textured background in every cell.

Top-left: female Korean nutrition teacher in her early thirties, low bun, sage cardigan and pale blouse. Top-middle: male Korean special education teacher in his late thirties, wavy dark hair, thin glasses, mustard sweater. Top-right: male Korean facilities officer in his mid-fifties, salt-and-pepper hair, navy work vest and light shirt. Bottom-left: female Korean after-school instructor in her early forties, short curled hair, teal knit. Bottom-middle: female Korean registrar in her mid-forties, jaw-length straight hair, burgundy cardigan and rectangular glasses. Bottom-right: male Korean ICT teacher in his late twenties, parted dark hair and muted blue shirt.

Polished painterly storybook illustration, realistic school palette, clean restrained lines, chest-up portraits with consistent centering, eye line and crop, whole hairstyle visible, readable at small size. All six faces distinct. No text, logos, watermark, props or photorealism.

캐릭터의 발밑 그림자와 창가 채광은 Three의 기본 기하·재질로 표현한다. 일상 대화는 프로젝트를 위해 작성한 독창적인 가상 대본이다.
