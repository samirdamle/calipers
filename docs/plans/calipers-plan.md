# Calipers \- A JavaScript library to provide sizes and distances of HTML elements

Function name: `calipers(targetSelector, targetAnchor, sourceSelector, sourceAnchor, returnValues)`

Arguments:

| `argument` | `type` | `values` | `description` |
| :---- | :---- | :---- | :---- |
| `targetSelector` | `string` | `Any selector valid for querySelectorAll` | `Targets can be many, so querySelectorAll is used` |
| `targetAnchor` | `string` | `code` | `anchor of target` |
| | | `t` | `top edge` |
| | | `b` | `bottom edge` |
| | | `l` | `left edge` |
| | | `r` | `right edge` |
| | | `tl` | `top left corner` |
| | | `tc` | `top center point` |
| | | `tr` | `top right corner` |
| | | `cl` | `left center point` |
| | | `cc` | `center point` |
| | | `cr` | `right center point` |
| | | `bl` | `bottom left corner` |
| | | `bc` | `bottom center point` |
| | | `br` | `bottom right corner` |
| `sourceSelector` | `string` | `Any selector valid for querySelector or 'viewport' or 'window'` | `Source has to be single, so querySelector is used instead of querySelectorAll` |
| `sourceAnchor` | `string` | `code` | `anchor of source` |
| | | `t` | `top edge` |
| | | `b` | `bottom edge` |
| | | `l` | `left edge` |
| | | `r` | `right edge` |
| | | `tl` | `top left corner` |
| | | `tc` | `top center point` |
| | | `tr` | `top right corner` |
| | | `cl` | `left center point` |
| | | `cc` | `center point` |
| | | `cr` | `right center point` |
| | | `bl` | `bottom left corner` |
| | | `bc` | `bottom center point` |
| | | `br` | `bottom right corner` |
| `returnValues` | `string` | `code` | `specify what you want returned` |
| | |  | `To specify multiple, concatenate the letters e.g.  'xywh' 'xyd' 'da'` |
| | | `x` | `horizontal distance` |
| | | `y` | `vertical distance` |
| | | `w` | `width` |
| | | `h` | `height` |
| | | `d` | `diagonal distance` |
| | | `a` | `angle in degrees` |
| | | `r` | `angle in radians` |
| | | `z` | `z-index` |

Returns:
- array of objects with properties as requested in return values

