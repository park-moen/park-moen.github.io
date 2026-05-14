---
title: "Code TIL"
description: "CSS position 속성을 정리한 TIL 글"
pubDate: 2020-08-11T16:42:09+09:00
updatedDate: 2020-08-11T18:39:20+09:00
slug: "2020/08/11/HTML-CSS"
tags: ["HTML", "CSS", "TIL"]
---

# CSS

## Position

`position` 속성은 `static`, `absolute`, `relative`, `fixed`, `sticky` 5가지 값을 가질 수 있다.
`position` 속성의 기본값은 `static`이다.

| 값         | 의미                                                                            | 기본값   |
| ---------- | ------------------------------------------------------------------------------- | -------- |
| `static`   | `top`, `bottom`, `right`, `left` 값을 가질 수 없는 normal flow이다.             | `static` |
| `absolute` | 부모의 `position` 값을 기준으로 콘텐츠가 위치하는 방식                          |          |
| `relative` | 자신을 기준으로 좌표를 지정하는 방식                                            |          |
| `fixed`    | 뷰포트를 기준으로 좌표를 가지며, 따로 스크롤이 되지 않고 뷰포트에 고정되는 방식 |          |

```txt
position: absolute

absolute 값을 사용하면 normal flow에 있던 요소가 화면의 위로 뜨는 현상이 발생한다.
값을 지정하지 않으면 콘텐츠가 있는 위치에 배치된다.
top, bottom, right, left 값을 가질 수 있다.

상자의 경우 absolute 값을 사용한 영역은 위로 뜨면서 상자가 겹쳐 보이는 현상이 발생한다.
text의 경우 겹쳐 보이지 않고 옆으로 배치된다.

absolute 값은 static 값이 아닌 position 속성의 모든 값
(absolute, relative, fixed, sticky)을 가진 HTML 구조상의 부모를 기준으로 배치된다.
만약 HTML 구조상의 부모 값에 position 속성이 존재하지 않으면 최상위 요소(html 요소)를 기준으로 한다.
보일 때는 body를 기준으로 보이지만, 정확하게는 최상위 요소를 기준으로 한다.
```

```txt
position: relative

자신을 기준으로 좌표를 지정한다.
좌표를 지정해서 콘텐츠가 움직여 보이지만,
정확하게는 콘텐츠의 위치는 normal flow의 위치에 존재하며 콘텐츠만 다른 곳으로 이동해 보인다.
```
