VirtualScroll
=============

Modify ng-repeat to have virtual scrolling

Angular Module: net.enzey.virtual-scroll

Directive Name: nz-vs

### Usage:
* Add to an element that contains an ng-repeat.
* Some parent element MUST have overflow-x or overflow set to 'auto' or 'scroll'.

| directive params | description |
| -------- | ---------------- | ----------- |
| nz-vs-buffer | The amount of buffered elements that are rendered outside of the viewport. Default: 2 

## Current limitations:
* All repeated elements must have the same height (if virtual virtually scrolling) or width (if virtual horizontally scrolling). First element is used as reference, however array does not need to be initially populated or even exist.
* Only supports vertical virtual scrolling.
* Required JQuery.
